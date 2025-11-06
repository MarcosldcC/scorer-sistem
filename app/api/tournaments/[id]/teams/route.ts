import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { config } from '@/lib/config'

async function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as any
    // Map userId to id for consistency
    if (decoded && decoded.userId) {
      return {
        ...decoded,
        id: decoded.userId
      }
    }
    return decoded
  } catch {
    return null
  }
}

// GET /api/tournaments/[id]/teams - Get teams linked to tournament
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: params.id },
      include: {
        teams: {
          include: {
            team: true
          }
        }
      }
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

    const teams = tournament.teams.map(tt => tt.team)

    return NextResponse.json({ teams })

  } catch (error) {
    console.error('Get tournament teams error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/tournaments/[id]/teams - Link teams to tournament
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { teamIds } = await request.json()

    if (!Array.isArray(teamIds)) {
      return NextResponse.json(
        { error: 'teamIds deve ser um array' },
        { status: 400 }
      )
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: params.id }
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

    // Verify all teams belong to the same school
    const teams = await prisma.team.findMany({
      where: {
        id: { in: teamIds },
        schoolId: tournament.schoolId
      }
    })

    if (teams.length !== teamIds.length) {
      return NextResponse.json(
        { error: 'Uma ou mais equipes não pertencem à escola do torneio' },
        { status: 400 }
      )
    }

    // Link teams to tournament (skip if already linked)
    await prisma.tournamentTeam.createMany({
      data: teamIds.map((teamId: string) => ({
        tournamentId: params.id,
        teamId
      })),
      skipDuplicates: true
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Link teams error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/tournaments/[id]/teams - Unlink team from tournament
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    if (!teamId) {
      return NextResponse.json(
        { error: 'ID da equipe é obrigatório' },
        { status: 400 }
      )
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: params.id }
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

    // Unlink team from tournament
    await prisma.tournamentTeam.deleteMany({
      where: {
        tournamentId: params.id,
        teamId
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Unlink team error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

