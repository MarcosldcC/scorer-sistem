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

// GET /api/tournaments/[id]/viewers - List viewers for a tournament and available viewers
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

    const tournamentId = params.id
    const { searchParams } = new URL(request.url)
    const listAvailable = searchParams.get('available') === 'true'

    // Verify tournament exists and user has access
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        viewerAssignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
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

    // Check access - only school admin or platform admin can view viewers
    if (tournament.schoolId !== user.schoolId && user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const assignedViewers = tournament.viewerAssignments.map(assignment => ({
      id: assignment.user.id,
      name: assignment.user.name,
      email: assignment.user.email,
      role: assignment.user.role,
      assignedAt: assignment.createdAt
    }))

    // If requesting available viewers, return list of viewers not yet assigned
    if (listAvailable) {
      const assignedViewerIds = assignedViewers.map(v => v.id)
      
      // Get all viewers from the same school
      const availableViewers = await prisma.user.findMany({
        where: {
          role: 'viewer',
          schoolId: tournament.schoolId,
          isActive: true,
          id: {
            notIn: assignedViewerIds
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        },
        orderBy: { name: 'asc' }
      })

      return NextResponse.json({ 
        assigned: assignedViewers,
        available: availableViewers 
      })
    }

    return NextResponse.json({ viewers: assignedViewers })

  } catch (error) {
    console.error('Get viewers error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/tournaments/[id]/viewers - Add viewer to tournament
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

    const tournamentId = params.id
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'ID do usuário é obrigatório' },
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

    // Check access - only school admin or platform admin can add viewers
    if (tournament.schoolId !== user.schoolId && user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Verify user exists and is a viewer
    const viewerUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!viewerUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Verify user is a viewer
    if (viewerUser.role !== 'viewer') {
      return NextResponse.json(
        { error: 'Usuário deve ter o role "viewer" para ser atribuído como visualizador' },
        { status: 400 }
      )
    }

    // Verify viewer belongs to the same school as the tournament
    if (viewerUser.schoolId !== tournament.schoolId) {
      return NextResponse.json(
        { error: 'Visualizador deve pertencer à mesma escola do torneio' },
        { status: 400 }
      )
    }

    // Check if already assigned
    const existing = await prisma.tournamentViewer.findUnique({
      where: {
        userId_tournamentId: {
          userId,
          tournamentId
        }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Visualizador já está atribuído a este torneio' },
        { status: 400 }
      )
    }

    // Create assignment
    const assignment = await prisma.tournamentViewer.create({
      data: {
        userId,
        tournamentId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      viewer: {
        id: assignment.user.id,
        name: assignment.user.name,
        email: assignment.user.email,
        role: assignment.user.role,
        assignedAt: assignment.createdAt
      }
    })

  } catch (error) {
    console.error('Add viewer error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/tournaments/[id]/viewers - Remove viewer from tournament
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

    const tournamentId = params.id
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'ID do usuário é obrigatório' },
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

    // Check access - only school admin or platform admin can remove viewers
    if (tournament.schoolId !== user.schoolId && user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Delete assignment
    await prisma.tournamentViewer.delete({
      where: {
        userId_tournamentId: {
          userId,
          tournamentId
        }
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Remove viewer error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

