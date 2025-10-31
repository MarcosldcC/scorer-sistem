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

// GET /api/user-areas - List judge assignments
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
    const userId = searchParams.get('userId')

    const where: any = {}
    if (tournamentId) where.tournamentId = tournamentId
    if (userId) where.userId = userId

    const assignments = await prisma.userTournamentArea.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        tournament: {
          select: {
            id: true,
            name: true
          }
        },
        area: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    })

    return NextResponse.json({ assignments })

  } catch (error) {
    console.error('Get user areas error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/user-areas - Assign judge to area
export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { userId, tournamentId, areaId } = await request.json()

    if (!userId || !tournamentId || !areaId) {
      return NextResponse.json(
        { error: 'userId, tournamentId e areaId são obrigatórios' },
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

    // Verify target user is a judge
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    if (targetUser.role !== 'judge') {
      return NextResponse.json(
        { error: 'Apenas juízes podem ser atribuídos a áreas' },
        { status: 400 }
      )
    }

    // Verify area exists
    const area = await prisma.tournamentArea.findUnique({
      where: { id: areaId }
    })

    if (!area) {
      return NextResponse.json(
        { error: 'Área não encontrada' },
        { status: 404 }
      )
    }

    // Create assignment
    const assignment = await prisma.userTournamentArea.create({
      data: {
        userId,
        tournamentId,
        areaId
      }
    })

    return NextResponse.json({
      success: true,
      assignment
    })

  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Juiz já está atribuído a esta área' },
        { status: 400 }
      )
    }
    console.error('Create user area assignment error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/user-areas - Unassign judge from area
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
        { error: 'ID da atribuição é obrigatório' },
        { status: 400 }
      )
    }

    const assignment = await prisma.userTournamentArea.findUnique({
      where: { id },
      include: {
        tournament: true
      }
    })

    if (!assignment) {
      return NextResponse.json(
        { error: 'Atribuição não encontrada' },
        { status: 404 }
      )
    }

    if (assignment.tournament.schoolId !== user.schoolId && user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    await prisma.userTournamentArea.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete user area assignment error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

