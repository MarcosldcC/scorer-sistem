import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { config } from '@/lib/config'
import { calculateTotalScore, getMaxPossibleScore, RUBRICS } from '@/lib/rubrics'

// Middleware to verify JWT token
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

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Token inválido' },
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

    // Check if user can evaluate this area
    if (!user.isAdmin && !user.areas.includes(area)) {
      return NextResponse.json(
        { error: 'Usuário não autorizado para avaliar esta área' },
        { status: 403 }
      )
    }

    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId }
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Equipe não encontrada' },
        { status: 404 }
      )
    }

    // Calculate total score
    const totalScore = calculateTotalScore(scores)
    const rubric = RUBRICS[area]
    const maxPossibleScore = getMaxPossibleScore(rubric)
    
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
        teamId_area_evaluatedById: {
          teamId,
          area,
          evaluatedById: user.userId
        }
      },
      update: {
        scores,
        comments,
        evaluationTime,
        updatedAt: new Date()
      },
      create: {
        teamId,
        area,
        scores,
        comments,
        evaluationTime,
        evaluatedById: user.userId
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

    return NextResponse.json({
      success: true,
      evaluation: {
        id: evaluation.id,
        teamId: evaluation.teamId,
        area: evaluation.area,
        totalScore: finalScore,
        maxPossibleScore,
        percentage: Math.round((finalScore / maxPossibleScore) * 100),
        scores,
        comments: evaluation.comments,
        evaluationTime: evaluation.evaluationTime,
        evaluatedAt: evaluation.evaluatedAt
      }
    })

  } catch (error) {
    console.error('Create evaluation error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const area = searchParams.get('area')

    const where: any = {}
    if (teamId) where.teamId = teamId
    if (area) where.area = area

    // If not admin, only show evaluations from user's areas
    if (!user.isAdmin) {
      where.area = { in: user.areas }
    }

    const evaluations = await prisma.evaluation.findMany({
      where,
      include: {
        team: {
          select: { id: true, name: true, grade: true, shift: true }
        },
        evaluatedBy: {
          select: { id: true, name: true }
        },
        penalties: true
      },
      orderBy: { evaluatedAt: 'desc' }
    })

    return NextResponse.json({ evaluations })

  } catch (error) {
    console.error('Get evaluations error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
