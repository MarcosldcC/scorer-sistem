import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { config } from '@/lib/config'

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

// GET /api/tournament-areas - List areas
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
    const tournamentId = searchParams.get('tournamentId')

    if (!tournamentId) {
      return NextResponse.json(
        { error: 'ID do torneio é obrigatório' },
        { status: 400 }
      )
    }

    // Verify tournament access
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    })

    if (!tournament) {
      return NextResponse.json(
        { error: 'Torneio não encontrado' },
        { status: 404 }
      )
    }

    // Check permissions
    // - platform_admin: can access any tournament
    // - school_admin: can access tournaments from their school
    // - judge: can access tournaments from their school (to see areas they can evaluate)
    // - viewer: CANNOT access areas - they can only view rankings
    if (user.role === 'viewer') {
      return NextResponse.json(
        { error: 'Visualizadores não têm acesso a áreas de avaliação. Apenas visualização de rankings é permitida.' },
        { status: 403 }
      )
    }
    
    if (tournament.schoolId !== user.schoolId && user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const areas = await prisma.tournamentArea.findMany({
      where: { tournamentId },
      include: {
        _count: {
          select: {
            evaluations: true,
            assignedJudges: true
          }
        }
      },
      orderBy: { order: 'asc' }
    })

    return NextResponse.json({ areas })

  } catch (error) {
    console.error('Get tournament areas error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/tournament-areas - Create area
export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const {
      tournamentId,
      name,
      code,
      description,
      scoringType,
      rubricConfig,
      performanceConfig,
      aggregationMethod,
      timeLimit,
      timeAction,
      allowRounds,
      maxRounds,
      roundsAggregation,
      penaltyLimits,
      hasPrice,
      priceConfig,
      weight
    } = await request.json()

    if (!tournamentId || !name || !code || !scoringType) {
      return NextResponse.json(
        { error: 'Dados obrigatórios: tournamentId, name, code, scoringType' },
        { status: 400 }
      )
    }

    // Verify tournament exists and user has access
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    })

    if (!tournament) {
      return NextResponse.json(
        { error: 'Torneio não encontrado' },
        { status: 404 }
      )
    }

    if (tournament.schoolId !== user.schoolId && user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Check config lock
    if (tournament.configLocked && user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Configuração bloqueada - torneio publicado' },
        { status: 403 }
      )
    }

    // Validate scoring type configurations
    if ((scoringType === 'rubric' || scoringType === 'mixed') && !rubricConfig) {
      return NextResponse.json(
        { error: 'rubricConfig é obrigatório para scoringType rubric ou mixed' },
        { status: 400 }
      )
    }

    if ((scoringType === 'performance' || scoringType === 'mixed') && !performanceConfig) {
      return NextResponse.json(
        { error: 'performanceConfig é obrigatório para scoringType performance ou mixed' },
        { status: 400 }
      )
    }

    const area = await prisma.tournamentArea.create({
      data: {
        tournamentId,
        name,
        code,
        description,
        scoringType,
        rubricConfig: rubricConfig ? rubricConfig : null,
        performanceConfig: performanceConfig ? performanceConfig : null,
        aggregationMethod: aggregationMethod || 'last',
        timeLimit: timeLimit || null,
        timeAction: timeAction || 'alert',
        allowRounds: allowRounds || false,
        maxRounds: maxRounds || 1,
        roundsAggregation: roundsAggregation || null,
        penaltyLimits: penaltyLimits || null,
        hasPrice: hasPrice || false,
        priceConfig: priceConfig || null,
        weight: weight || 1.0,
        order: 0 // Will be recalculated
      }
    })

    return NextResponse.json({
      success: true,
      area
    })

  } catch (error) {
    console.error('Create tournament area error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/tournament-areas - Update area
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { id, ...updateData } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'ID da área é obrigatório' },
        { status: 400 }
      )
    }

    const area = await prisma.tournamentArea.findUnique({
      where: { id },
      include: {
        tournament: true
      }
    })

    if (!area) {
      return NextResponse.json(
        { error: 'Área não encontrada' },
        { status: 404 }
      )
    }

    // Check permissions
    if (area.tournament.schoolId !== user.schoolId && user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Check config lock
    if (area.tournament.configLocked && user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Configuração bloqueada - torneio publicado' },
        { status: 403 }
      )
    }

    // Clean update data
    const cleanData: any = {}
    const allowedFields = [
      'name', 'code', 'description', 'scoringType', 'rubricConfig',
      'performanceConfig', 'aggregationMethod', 'timeLimit', 'timeAction',
      'allowRounds', 'maxRounds', 'roundsAggregation', 'penaltyLimits',
      'hasPrice', 'priceConfig', 'weight', 'order'
    ]

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        cleanData[field] = updateData[field]
      }
    }

    const updatedArea = await prisma.tournamentArea.update({
      where: { id },
      data: cleanData
    })

    return NextResponse.json({
      success: true,
      area: updatedArea
    })

  } catch (error) {
    console.error('Update tournament area error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/tournament-areas - Delete area
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID da área é obrigatório' },
        { status: 400 }
      )
    }

    const area = await prisma.tournamentArea.findUnique({
      where: { id },
      include: {
        tournament: true
      }
    })

    if (!area) {
      return NextResponse.json(
        { error: 'Área não encontrada' },
        { status: 404 }
      )
    }

    if (area.tournament.schoolId !== user.schoolId && user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    await prisma.tournamentArea.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete tournament area error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

