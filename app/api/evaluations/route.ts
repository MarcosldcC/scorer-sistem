import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { config } from '@/lib/config'
import { calculateTotalScore, getMaxPossibleScore, RUBRICS } from '@/lib/rubrics'

export const dynamic = 'force-dynamic'

async function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    return jwt.verify(token, config.jwt.secret) as any
  } catch {
    return null
  }
}

// Helper to convert legacy area code to areaId
async function getAreaIdFromCode(tournamentId: string, areaCode: string) {
  const area = await prisma.tournamentArea.findFirst({
    where: {
      tournamentId,
      code: areaCode
    }
  })
  
  if (!area) {
    throw new Error(`Área '${areaCode}' não encontrada no torneio`)
  }
  
  return area.id
}

// POST /api/evaluations - Create or update evaluation
export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { teamId, area, scores, comments, evaluationTime, penalties = [] } = await request.json()

    if (!teamId || !area || !scores || evaluationTime === undefined) {
      return NextResponse.json(
        { error: 'Dados obrigatórios não fornecidos' },
        { status: 400 }
      )
    }

    // Get team with tournament info
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        tournament: true
      }
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Equipe não encontrada' },
        { status: 404 }
      )
    }

    // Verify tournament access
    if (team.tournament.schoolId !== user.schoolId && user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Convert legacy area code to areaId
    const areaId = await getAreaIdFromCode(team.tournament.id, area)
    
    // Get area info
    const tournamentArea = await prisma.tournamentArea.findUnique({
      where: { id: areaId }
    })

    if (!tournamentArea) {
      return NextResponse.json(
        { error: 'Área de avaliação não encontrada' },
        { status: 404 }
      )
    }

    // Check if user can evaluate this area (backward compatibility with legacy areas array)
    const hasAccess = user.isAdmin || 
                      user.role === 'platform_admin' || 
                      user.role === 'school_admin' ||
                      user.areas.includes(area)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Usuário não autorizado para avaliar esta área' },
        { status: 403 }
      )
    }

    // Calculate total score based on scoring type
    let totalScore = 0
    let maxPossibleScore = 0

    if (tournamentArea.scoringType === 'rubric') {
      totalScore = calculateTotalScore(scores)
      const rubric = RUBRICS[area as keyof typeof RUBRICS]
      if (rubric) {
        maxPossibleScore = getMaxPossibleScore(rubric)
      }
    } else if (tournamentArea.scoringType === 'performance') {
      // For performance, sum all scores
      totalScore = (scores as any[]).reduce((sum, s) => sum + (s.score || 0), 0)
      maxPossibleScore = totalScore // Will be calculated properly later
    } else {
      // Mixed scoring
      totalScore = calculateTotalScore(scores)
      const rubric = RUBRICS[area as keyof typeof RUBRICS]
      if (rubric) {
        maxPossibleScore = getMaxPossibleScore(rubric)
      }
    }
    
    // Apply penalties
    let finalScore = totalScore
    for (const penalty of penalties) {
      finalScore += penalty.points
    }

    // Ensure score is not negative
    finalScore = Math.max(0, finalScore)

    // Create or update evaluation
    const evaluation = await prisma.evaluation.upsert({
      where: {
        tournamentId_teamId_areaId_evaluatedById_round: {
          tournamentId: team.tournament.id,
          teamId,
          areaId,
          evaluatedById: user.id,
          round: 1 // Default to round 1 for backward compatibility
        }
      },
      update: {
        scores,
        comments,
        evaluationTime,
        updatedAt: new Date(),
        version: { increment: 1 }
      },
      create: {
        tournamentId: team.tournament.id,
        teamId,
        areaId,
        scores,
        comments,
        evaluationTime,
        evaluatedById: user.id,
        round: 1
      }
    })

    // Create penalties if any
    if (penalties.length > 0) {
      await prisma.penalty.deleteMany({
        where: { evaluationId: evaluation.id }
      })

      await prisma.penalty.createMany({
        data: penalties.map((penalty: any) => ({
          evaluationId: evaluation.id,
          type: penalty.type,
          points: penalty.points,
          description: penalty.description
        }))
      })
    }

    // Return evaluation with area code for backward compatibility
    return NextResponse.json({
      success: true,
      evaluation: {
        id: evaluation.id,
        teamId: evaluation.teamId,
        area: tournamentArea.code,
        areaId: tournamentArea.id,
        totalScore: finalScore,
        maxPossibleScore,
        percentage: maxPossibleScore > 0 ? Math.round((finalScore / maxPossibleScore) * 100) : 0,
        scores,
        comments: evaluation.comments,
        evaluationTime: evaluation.evaluationTime,
        evaluatedAt: evaluation.evaluatedAt,
        evaluatedBy: user.name
      }
    })

  } catch (error) {
    console.error('Create evaluation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// GET /api/evaluations - List evaluations
export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const area = searchParams.get('area')

    const where: any = {}
    if (teamId) where.teamId = teamId
    if (area) {
      // Find areaId from area code
      const areaRecord = await prisma.tournamentArea.findFirst({
        where: { code: area }
      })
      if (areaRecord) {
        where.areaId = areaRecord.id
      }
    }

    // If not admin, only show evaluations from user's areas (backward compatibility)
    if (!user.isAdmin && !user.role.includes('admin')) {
      if (area && !user.areas.includes(area)) {
        // User doesn't have access to this area
        return NextResponse.json({ evaluations: [] })
      }
    }

    const evaluations = await prisma.evaluation.findMany({
      where,
      include: {
        team: {
          select: { id: true, name: true, grade: true, shift: true }
        },
        area: {
          select: { id: true, code: true, name: true }
        },
        evaluatedBy: {
          select: { id: true, name: true }
        },
        penalties: true
      },
      orderBy: { evaluatedAt: 'desc' }
    })

    // Transform evaluations to include area code for backward compatibility
    const transformedEvaluations = evaluations.map((evaluation) => ({
      ...evaluation,
      area: evaluation.area.code // Legacy field
    }))

    return NextResponse.json({ evaluations: transformedEvaluations })

  } catch (error) {
    console.error('Get evaluations error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
