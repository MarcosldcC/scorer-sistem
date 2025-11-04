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

    // Check permissions - only school_admin can list teams
    if (user.role !== 'school_admin' && user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const tournamentId = searchParams.get('tournamentId')
    const schoolId = user.role === 'platform_admin' ? searchParams.get('schoolId') : user.schoolId

    if (!schoolId) {
      return NextResponse.json(
        { error: 'ID da escola é obrigatório' },
        { status: 400 }
      )
    }

    // If tournamentId is provided, get teams linked to that tournament
    // Otherwise, get all teams from the school
    let whereClause: any = { schoolId }
    
    if (tournamentId) {
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

      // Get teams linked to this tournament
      whereClause = {
        schoolId,
        tournaments: {
          some: {
            tournamentId
          }
        }
      }
    }

    const teams = await prisma.team.findMany({
      where: whereClause,
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
        },
        tournaments: tournamentId ? {
          where: { tournamentId }
        } : true
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

    // Check permissions - only school_admin can create teams
    if (user.role !== 'school_admin' && user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const { 
      tournamentId, // Optional - if provided, team will be linked to tournament
      schoolId: requestSchoolId, // Optional - for platform admin
      name,
      code,
      grade,
      shift,
      metadata 
    } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
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

    // If tournamentId is provided, verify tournament and permissions
    if (tournamentId) {
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId }
      })

      if (!tournament) {
        return NextResponse.json(
          { error: 'Torneio não encontrado' },
          { status: 404 }
        )
      }

      if (tournament.schoolId !== schoolId && user.role !== 'platform_admin') {
        return NextResponse.json(
          { error: 'Acesso negado' },
          { status: 403 }
        )
      }
    }

    // Build metadata
    const teamMetadata: any = {}
    if (grade) teamMetadata.grade = grade
    if (shift) teamMetadata.shift = shift
    if (metadata) Object.assign(teamMetadata, metadata)

    // Create team
    const team = await prisma.team.create({
      data: {
        schoolId,
        name,
        code,
        grade,
        shift,
        metadata: teamMetadata,
        // Link to tournament if provided
        tournaments: tournamentId ? {
          create: {
            tournamentId
          }
        } : undefined
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

    // Check permissions - only school_admin can update teams
    if (user.role !== 'school_admin' && user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
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
        school: true
      }
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Equipe não encontrada' },
        { status: 404 }
      )
    }

    if (team.schoolId !== user.schoolId && user.role !== 'platform_admin') {
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

    // Check permissions - only school_admin can delete teams
    if (user.role !== 'school_admin' && user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
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
        school: true
      }
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Equipe não encontrada' },
        { status: 404 }
      )
    }

    if (team.schoolId !== user.schoolId && user.role !== 'platform_admin') {
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
