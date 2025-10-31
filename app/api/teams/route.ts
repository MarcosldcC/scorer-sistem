import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { config } from '@/lib/config'
import { hasPermission } from '@/lib/permissions'

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

// GET /api/teams - List teams
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
    if (tournament.schoolId !== user.schoolId && user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const teams = await prisma.team.findMany({
      where: { tournamentId },
      include: {
        evaluations: {
          include: {
            evaluatedBy: {
              select: { id: true, name: true }
            },
            area: {
              select: {
                id: true,
                code: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Transform data for frontend
    const transformedTeams = teams.map(team => {
      const evaluations: any = {}
      const evaluatedBy: any = {}

      team.evaluations.forEach(evaluation => {
        const areaCode = evaluation.area.code
        evaluations[areaCode] = evaluation.scores
        evaluatedBy[areaCode] = evaluation.evaluatedBy.name
      })

      return {
        id: team.id,
        name: team.name,
        code: team.code,
        grade: team.grade,
        shift: team.shift,
        metadata: team.metadata,
        evaluations,
        evaluatedBy
      }
    })

    return NextResponse.json({ teams: transformedTeams })

  } catch (error) {
    console.error('Get teams error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/teams - Create team
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
      grade,
      shift,
      metadata 
    } = await request.json()

    if (!tournamentId || !name) {
      return NextResponse.json(
        { error: 'Torneio e nome são obrigatórios' },
        { status: 400 }
      )
    }

    // Verify tournament and permissions
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

    // Build metadata
    const teamMetadata: any = {}
    if (grade) teamMetadata.grade = grade
    if (shift) teamMetadata.shift = shift
    if (metadata) Object.assign(teamMetadata, metadata)

    const team = await prisma.team.create({
      data: {
        tournamentId,
        name,
        code,
        grade,
        shift,
        metadata: teamMetadata
      }
    })

    return NextResponse.json({
      success: true,
      team
    })

  } catch (error) {
    console.error('Create team error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/teams - Update team
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { id, name, code, grade, shift, metadata } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'ID da equipe é obrigatório' },
        { status: 400 }
      )
    }

    const team = await prisma.team.findUnique({
      where: { id },
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

    if (team.tournament.schoolId !== user.schoolId && user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Build metadata
    const teamMetadata: any = team.metadata || {}
    if (grade) teamMetadata.grade = grade
    if (shift) teamMetadata.shift = shift
    if (metadata) Object.assign(teamMetadata, metadata)

    const updateData: any = {}
    if (name) updateData.name = name
    if (code !== undefined) updateData.code = code
    if (grade) updateData.grade = grade
    if (shift) updateData.shift = shift
    if (metadata !== undefined) updateData.metadata = teamMetadata

    const updatedTeam = await prisma.team.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      team: updatedTeam
    })

  } catch (error) {
    console.error('Update team error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/teams - Delete team
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
        { error: 'ID da equipe é obrigatório' },
        { status: 400 }
      )
    }

    const team = await prisma.team.findUnique({
      where: { id },
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

    if (team.tournament.schoolId !== user.schoolId && user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    await prisma.team.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete team error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
