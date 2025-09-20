import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { config } from '@/lib/config'

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
    const shift = searchParams.get('shift')
    const grade = searchParams.get('grade')

    // Build where clause
    const where: any = {}
    if (shift) where.shift = shift
    if (grade) where.grade = grade

    const teams = await prisma.team.findMany({
      where,
      include: {
        evaluations: {
          include: {
            evaluatedBy: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Transform data to match frontend format
    const transformedTeams = teams.map(team => ({
      id: team.id,
      name: team.name,
      grade: team.grade,
      shift: team.shift,
      evaluations: team.evaluations.reduce((acc, evaluation) => {
        acc[evaluation.area] = evaluation.scores
        return acc
      }, {} as any),
      evaluatedBy: team.evaluations.reduce((acc, evaluation) => {
        acc[evaluation.area] = evaluation.evaluatedBy.name
        return acc
      }, {} as any)
    }))

    return NextResponse.json({ teams: transformedTeams })

  } catch (error) {
    console.error('Get teams error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const { name, grade, shift } = await request.json()

    if (!name || !grade || !shift) {
      return NextResponse.json(
        { error: 'Nome, série e turno são obrigatórios' },
        { status: 400 }
      )
    }

    const team = await prisma.team.create({
      data: {
        name,
        grade,
        shift
      }
    })

    return NextResponse.json({ team })

  } catch (error) {
    console.error('Create team error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
