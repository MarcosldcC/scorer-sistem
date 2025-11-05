import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { config } from '@/lib/config'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 400 }
      )
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwt.secret) as any

    // Fetch user from database to get latest assignedAreas
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId || decoded.id },
      include: {
        assignedAreas: {
          include: {
            area: {
              select: {
                id: true,
                code: true,
                name: true
              }
            },
            tournament: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Get assigned areas for the user (with tournament info)
    const assignedAreas = user.assignedAreas.map(ua => ({
      id: ua.id,
      areaId: ua.areaId,
      areaCode: ua.area.code,
      areaName: ua.area.name,
      tournamentId: ua.tournamentId,
      tournamentName: ua.tournament.name
    }))

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin,
        areas: user.areas,
        schoolId: user.schoolId,
        isFirstLogin: user.isFirstLogin,
        assignedAreas
      }
    })

  } catch (error) {
    console.error('Token verification error:', error)
    return NextResponse.json(
      { error: 'Token inválido' },
      { status: 401 }
    )
  }
}
