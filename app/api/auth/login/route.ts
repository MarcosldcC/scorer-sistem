import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { config } from '@/lib/config'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Check if required environment variables are available
    if (!config.jwt.secret) {
      console.error('JWT_SECRET is not configured')
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta' },
        { status: 500 }
      )
    }

    const { email, name, password } = await request.json()

    // Support both email and name login for backward compatibility
    if ((!email && !name) || !password) {
      return NextResponse.json(
        { error: 'Email/nome e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Use email exactly as provided (lowercase for consistency but keep dots)
    const normalizedEmail = email ? email.toLowerCase().trim() : null

    // Find user by email or name
    let user
    try {
      const where: any = normalizedEmail ? { email: normalizedEmail } : { name }
      
      user = await prisma.user.findFirst({
        where,
        include: {
          school: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          assignedAreas: {
            include: {
              area: {
                select: {
                  id: true,
                  code: true,
                  name: true
                }
              }
            }
          }
        }
      })
    } catch (dbError) {
      console.error('Database connection error:', dbError)
      return NextResponse.json(
        { error: 'Erro de conexão com o banco de dados' },
        { status: 500 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 401 }
      )
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Usuário inativo' },
        { status: 403 }
      )
    }

    // Check if school is active (if user belongs to a school)
    if (user.schoolId && user.school?.status !== 'active') {
      return NextResponse.json(
        { error: 'Escola inativa' },
        { status: 403 }
      )
    }

    // Verify password
    // The password field contains the hashed temporary password (or regular password)
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Senha incorreta' },
        { status: 401 }
      )
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date()
      }
    })

    // Generate JWT token with extended info
    const token = jwt.sign(
      { 
        userId: user.id,
        schoolId: user.schoolId,
        name: user.name,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin,
        areas: user.areas // Legacy compatibility
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    )

    // Get assigned areas for the user
    const assignedAreas = user.assignedAreas.map(ua => ({
      areaId: ua.areaId,
      areaCode: ua.area.code,
      areaName: ua.area.name
    }))

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin,
        areas: user.areas, // Legacy
        assignedAreas,
        schoolId: user.schoolId,
        isFirstLogin: user.isFirstLogin
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
