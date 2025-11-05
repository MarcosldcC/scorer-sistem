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

    // Check permissions
    if (user.role !== 'platform_admin' && user.role !== 'school_admin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      name,
      code,
      description,
      icon,
      templateId,
      startDate,
      endDate,
      rankingMethod,
      allowReevaluation,
      features,
      teamIds, // Array of team IDs to link to tournament
      schoolId: requestSchoolId
    } = body

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Nome e código são obrigatórios' },
        { status: 400 }
      )
    }

    // Get schoolId: platform admin must provide it, school admin uses their own
    const schoolId = user.role === 'platform_admin' ? requestSchoolId : user.schoolId

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
        icon: icon || null,
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

    // Link teams if provided (create TournamentTeam entries separately)
    if (teamIds && Array.isArray(teamIds) && teamIds.length > 0) {
      // Verify that all team IDs exist and belong to the same school
      const existingTeams = await prisma.team.findMany({
        where: {
          id: { in: teamIds },
          schoolId: schoolId
        },
        select: { id: true }
      })

      const validTeamIds = existingTeams.map(t => t.id)
      
      if (validTeamIds.length > 0) {
        await prisma.tournamentTeam.createMany({
          data: validTeamIds.map((teamId: string) => ({
            tournamentId: tournament.id,
            teamId
          })),
          skipDuplicates: true
        })
      }
    }

    // Fetch tournament with teams included
    const tournamentWithTeams = await prisma.tournament.findUnique({
      where: { id: tournament.id },
      include: {
        teams: {
          include: {
            team: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      tournament: tournamentWithTeams
    })

  } catch (error: any) {
    console.error('Create tournament error:', error)
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta
    })
    
    // Return more specific error messages
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Código do torneio já existe' },
        { status: 400 }
      )
    }
    
    if (error?.code === 'P2003') {
      return NextResponse.json(
        { error: 'Referência inválida. Verifique se a escola existe.' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error?.message || 'Erro interno do servidor' },
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

    // Delete related data first (Prisma will handle cascades if configured)
    // But we need to delete manually if cascades aren't set up
    
    // Delete tournament teams (many-to-many)
    await prisma.tournamentTeam.deleteMany({
      where: { tournamentId: id }
    })

    // Delete user tournament area assignments
    await prisma.userTournamentArea.deleteMany({
      where: { tournamentId: id }
    })

    // Delete tournament areas
    await prisma.tournamentArea.deleteMany({
      where: { tournamentId: id }
    })

    // Delete evaluations (if not cascade)
    await prisma.evaluation.deleteMany({
      where: { tournamentId: id }
    })

    // Delete ranking snapshots
    await prisma.rankingSnapshot.deleteMany({
      where: { tournamentId: id }
    })

    // Finally delete the tournament
    await prisma.tournament.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Delete tournament error:', error)
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta
    })
    
    // Return more specific error messages
    if (error?.code === 'P2003') {
      return NextResponse.json(
        { error: 'Não é possível excluir o torneio pois há dados relacionados. Verifique se há avaliações ou áreas associadas.' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error?.message || 'Erro interno do servidor ao excluir torneio' },
      { status: 500 }
    )
  }
}

