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

    let body
    try {
      body = await request.json()
    } catch (error) {
      console.error('Error parsing request body:', error)
      return NextResponse.json(
        { error: 'Erro ao processar dados da requisição' },
        { status: 400 }
      )
    }

    const { teamId, area, scores, comments, evaluationTime, penalties = [], tournamentId } = body

    console.log('Evaluation request data:', {
      teamId,
      area,
      scoresCount: Array.isArray(scores) ? scores.length : 'not array',
      evaluationTime,
      penaltiesCount: Array.isArray(penalties) ? penalties.length : 'not array',
      tournamentId,
      userId: user.id,
      userRole: user.role
    })

    if (!teamId || !area || !scores || evaluationTime === undefined) {
      console.error('Missing required fields:', { teamId: !!teamId, area: !!area, scores: !!scores, evaluationTime: evaluationTime !== undefined })
      return NextResponse.json(
        { error: 'Dados obrigatórios não fornecidos' },
        { status: 400 }
      )
    }

    if (!Array.isArray(scores)) {
      console.error('Scores is not an array:', scores)
      return NextResponse.json(
        { error: 'Scores deve ser um array' },
        { status: 400 }
      )
    }

    // Get team
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        school: true,
        tournaments: {
          include: {
            tournament: true
          }
        }
      }
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Equipe não encontrada' },
        { status: 404 }
      )
    }

    // Determine tournament - use provided tournamentId or find first tournament the team belongs to
    let tournament: any = null
    if (tournamentId) {
      tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId }
      })
      
      // Verify team belongs to this tournament
      const teamTournament = await prisma.tournamentTeam.findUnique({
        where: {
          tournamentId_teamId: {
            tournamentId,
            teamId
          }
        }
      })
      
      if (!teamTournament) {
        return NextResponse.json(
          { error: 'Equipe não está associada a este torneio' },
          { status: 400 }
        )
      }
    } else {
      // Try to find tournament from team's tournaments
      if (team.tournaments.length > 0) {
        tournament = team.tournaments[0].tournament
      } else {
        return NextResponse.json(
          { error: 'Equipe não está associada a nenhum torneio. É necessário fornecer o tournamentId.' },
          { status: 400 }
        )
      }
    }

    if (!tournament) {
      return NextResponse.json(
        { error: 'Torneio não encontrado' },
        { status: 404 }
      )
    }

    // Verify tournament access
    if (tournament.schoolId !== user.schoolId && user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Convert legacy area code to areaId
    let areaId: string
    try {
      areaId = await getAreaIdFromCode(tournament.id, area)
    } catch (error) {
      console.error('Error getting areaId from code:', error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Área de avaliação não encontrada no torneio' },
        { status: 404 }
      )
    }
    
    // Get area info
    const tournamentArea = await prisma.tournamentArea.findUnique({
      where: { id: areaId }
    })

    if (!tournamentArea) {
      console.error('Tournament area not found:', { areaId, tournamentId: tournament.id, areaCode: area })
      return NextResponse.json(
        { error: 'Área de avaliação não encontrada' },
        { status: 404 }
      )
    }

    // Check if user can evaluate this area
    // For judges, check if they are assigned to this area in this tournament
    let hasAccess = user.isAdmin || 
                    user.role === 'platform_admin' || 
                    user.role === 'school_admin'
    
    if (!hasAccess && user.role === 'judge') {
      // Check if judge is assigned to this area in this tournament
      const assignment = await prisma.userTournamentArea.findFirst({
        where: {
          userId: user.id,
          tournamentId: tournament.id,
          areaId: areaId
        },
        include: {
          area: {
            select: {
              id: true,
              code: true,
              name: true
            }
          }
        }
      })
      
      hasAccess = !!assignment
      
      // Log for debugging
      console.log('Judge evaluation access check:', {
        userId: user.id,
        userName: user.name,
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        areaId: areaId,
        areaCode: tournamentArea.code,
        assignmentFound: !!assignment,
        assignmentAreaCode: assignment?.area?.code,
        hasAccess
      })
      
      if (!hasAccess) {
        // Also check by area code for additional verification
        const assignmentByCode = await prisma.userTournamentArea.findFirst({
          where: {
            userId: user.id,
            tournamentId: tournament.id,
            area: {
              code: tournamentArea.code
            }
          }
        })
        
        if (assignmentByCode) {
          console.log('Found assignment by area code:', assignmentByCode)
          hasAccess = true
        }
      }
    } else if (!hasAccess) {
      // Fallback to legacy areas check for backward compatibility
      hasAccess = user.areas?.includes(area) || false
    }

    if (!hasAccess) {
      console.log('Access denied for evaluation:', {
        userId: user.id,
        userRole: user.role,
        tournamentId: tournament.id,
        areaId: areaId,
        areaCode: tournamentArea.code
      })
      return NextResponse.json(
        { error: 'Usuário não autorizado para avaliar esta área neste torneio' },
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
    // First, try to find existing evaluation to get current version
    let existingEvaluation
    try {
      existingEvaluation = await prisma.evaluation.findUnique({
        where: {
          tournamentId_teamId_areaId_evaluatedById_round: {
            tournamentId: tournament.id,
            teamId,
            areaId,
            evaluatedById: user.id,
            round: 1 // Default to round 1 for backward compatibility
          }
        },
        select: { version: true }
      })
    } catch (error) {
      console.error('Error finding existing evaluation:', error)
      // Continue anyway, will create new evaluation
      existingEvaluation = null
    }

    const newVersion = existingEvaluation ? existingEvaluation.version + 1 : 1

    console.log('Creating/updating evaluation:', {
      tournamentId: tournament.id,
      teamId,
      areaId,
      evaluatedById: user.id,
      round: 1,
      newVersion,
      isUpdate: !!existingEvaluation
    })

    let evaluation
    try {
      evaluation = await prisma.evaluation.upsert({
        where: {
          tournamentId_teamId_areaId_evaluatedById_round: {
            tournamentId: tournament.id,
            teamId,
            areaId,
            evaluatedById: user.id,
            round: 1 // Default to round 1 for backward compatibility
          }
        },
        update: {
          scores,
          comments: comments || null,
          evaluationTime,
          version: newVersion
        },
        create: {
          tournamentId: tournament.id,
          teamId,
          areaId,
          scores,
          comments: comments || null,
          evaluationTime,
          evaluatedById: user.id,
          round: 1,
          version: 1
        }
      })
      console.log('Evaluation created/updated successfully:', evaluation.id)
    } catch (error) {
      console.error('Error upserting evaluation:', error)
      console.error('Upsert error details:', {
        tournamentId: tournament.id,
        teamId,
        areaId,
        evaluatedById: user.id,
        round: 1,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorName: error instanceof Error ? error.name : 'Unknown'
      })
      throw error // Re-throw to be caught by outer try-catch
    }

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
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      ...(error instanceof Error && error.cause ? { cause: error.cause } : {})
    })
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined
      },
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
