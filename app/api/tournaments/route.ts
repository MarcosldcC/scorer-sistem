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

// GET /api/tournaments - List tournaments
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
    const schoolId = searchParams.get('schoolId')
    const status = searchParams.get('status')

    const where: any = {}

    // Platform admins see all, school admins see their school only
    if (user.role === 'school_admin' && user.schoolId) {
      where.schoolId = user.schoolId
    } else if (schoolId) {
      where.schoolId = schoolId
    }

    if (status) where.status = status

    const tournaments = await prisma.tournament.findMany({
      where,
      include: {
        school: {
          select: {
            id: true,
            name: true
          }
        },
        template: {
          select: {
            id: true,
            name: true,
            version: true
          }
        },
        _count: {
          select: {
            areas: true,
            teams: true,
            evaluations: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ tournaments })

  } catch (error) {
    console.error('Get tournaments error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/tournaments - Create tournament
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
      name,
      code,
      description,
      templateId,
      startDate,
      endDate,
      rankingMethod,
      allowReevaluation,
      features
    } = await request.json()

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Nome e código são obrigatórios' },
        { status: 400 }
      )
    }

    // Check permissions
    if (user.role !== 'platform_admin' && user.role !== 'school_admin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const schoolId = user.role === 'platform_admin' ? (await request.json()).schoolId : user.schoolId

    if (!schoolId) {
      return NextResponse.json(
        { error: 'ID da escola é obrigatório' },
        { status: 400 }
      )
    }

    // Check if code exists
    const existingTournament = await prisma.tournament.findUnique({
      where: { code }
    })

    if (existingTournament) {
      return NextResponse.json(
        { error: 'Código já existe' },
        { status: 400 }
      )
    }

    // Get template version if provided
    let templateVersion = null
    if (templateId) {
      const template = await prisma.tournamentTemplate.findUnique({
        where: { id: templateId }
      })
      if (template) {
        templateVersion = template.version
      }
    }

    const tournament = await prisma.tournament.create({
      data: {
        schoolId,
        name,
        code,
        description,
        templateId: templateId || null,
        templateVersion,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: 'draft',
        rankingMethod: rankingMethod || 'percentage',
        allowReevaluation: allowReevaluation !== undefined ? allowReevaluation : true,
        configLocked: false,
        features: features || {}
      }
    })

    return NextResponse.json({
      success: true,
      tournament
    })

  } catch (error) {
    console.error('Create tournament error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/tournaments - Update tournament
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const {
      id,
      name,
      description,
      status,
      startDate,
      endDate,
      rankingMethod,
      allowReevaluation,
      features,
      weights,
      tieBreak
    } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'ID do torneio é obrigatório' },
        { status: 400 }
      )
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id }
    })

    if (!tournament) {
      return NextResponse.json(
        { error: 'Torneio não encontrado' },
        { status: 404 }
      )
    }

    // Check permissions
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

    const updateData: any = {}
    if (name) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (status) updateData.status = status
    if (startDate) updateData.startDate = new Date(startDate)
    if (endDate) updateData.endDate = new Date(endDate)
    if (rankingMethod) updateData.rankingMethod = rankingMethod
    if (allowReevaluation !== undefined) updateData.allowReevaluation = allowReevaluation
    if (features) updateData.features = features
    if (weights) updateData.weights = weights
    if (tieBreak) updateData.tieBreak = tieBreak

    // Handle status transitions
    if (status === 'published' && tournament.status !== 'published') {
      // Lock configuration when publishing
      updateData.configLocked = true

      // Lock template version
      if (tournament.templateId) {
        updateData.templateVersion = tournament.templateVersion || '1.0.0'
      }
    }

    const updatedTournament = await prisma.tournament.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      tournament: updatedTournament
    })

  } catch (error) {
    console.error('Update tournament error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/tournaments - Delete tournament
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
        { error: 'ID do torneio é obrigatório' },
        { status: 400 }
      )
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id }
    })

    if (!tournament) {
      return NextResponse.json(
        { error: 'Torneio não encontrado' },
        { status: 404 }
      )
    }

    // Check permissions
    if (tournament.schoolId !== user.schoolId && user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    await prisma.tournament.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete tournament error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

