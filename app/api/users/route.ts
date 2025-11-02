import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { config } from '@/lib/config'
import { isValidGmail, normalizeGmail } from '@/lib/email-validation'
import { sendWelcomeEmail } from '@/lib/email'
import crypto from 'crypto'

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

// GET /api/users - List users
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
    const role = searchParams.get('role')

    const where: any = {}

    // Platform admins see all users
    // School admins see only their school users
    if (user.role === 'school_admin' && user.schoolId) {
      where.schoolId = user.schoolId
    } else if (user.role === 'platform_admin' && schoolId) {
      where.schoolId = schoolId
    }

    if (role) where.role = role

    const users = await prisma.user.findMany({
      where,
      include: {
        school: {
          select: {
            id: true,
            name: true
          }
        },
        assignedAreas: {
          include: {
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
        },
        _count: {
          select: {
            evaluations: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Remove passwords from response
    const usersWithoutPasswords = users.map(({ password, tempPassword, ...rest }) => rest)

    return NextResponse.json({ users: usersWithoutPasswords })

  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/users - Create user
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
      email,
      password,
      role,
      schoolId,
      areas
    } = await request.json()

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: 'Nome, email e role são obrigatórios' },
        { status: 400 }
      )
    }

    // Validate role permissions
    // Platform admin can create: school_admin, judge, viewer
    // School admin can create: judge, viewer
    const allowedRoles = user.role === 'platform_admin' 
      ? ['school_admin', 'judge', 'viewer'] 
      : ['judge', 'viewer']

    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: `Você não tem permissão para criar usuários com o role "${role}"` },
        { status: 403 }
      )
    }

    // Validate Gmail
    if (!isValidGmail(email)) {
      return NextResponse.json(
        { error: 'Email deve ser um endereço Gmail válido (@gmail.com ou @googlemail.com)' },
        { status: 400 }
      )
    }

    // Normalize Gmail (remove dots, lowercase)
    const normalizedEmail = normalizeGmail(email)

    // Check if email already exists (after normalization)
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email já está cadastrado' },
        { status: 400 }
      )
    }

    // Determine school
    // Platform admin must provide schoolId for school_admin, judge, and viewer roles
    // School admin uses their own schoolId
    let targetSchoolId: string | null = null
    
    if (user.role === 'platform_admin') {
      // Platform admin creating user - must provide schoolId for non-platform_admin roles
      if (role !== 'platform_admin' && !schoolId) {
        return NextResponse.json(
          { error: 'Escola é obrigatória para criar usuários com este role' },
          { status: 400 }
        )
      }
      targetSchoolId = schoolId || null
    } else {
      // School admin creating user - uses their own schoolId
      targetSchoolId = user.schoolId
    }

    // Validate school exists if provided
    if (targetSchoolId) {
      const schoolExists = await prisma.school.findUnique({
        where: { id: targetSchoolId }
      })
      
      if (!schoolExists) {
        return NextResponse.json(
          { error: 'Escola não encontrada' },
          { status: 400 }
        )
      }
    }

    // Generate reset token for password setup
    const resetToken = crypto.randomBytes(32).toString('hex')
    const expiryTimestamp = Date.now() + (60 * 60 * 1000) // 1 hour
    const resetTokenData = `RESET_TOKEN:${resetToken}:${expiryTimestamp}`

    // Generate a temporary password (won't be used - user will set via email link)
    const tempPassword = crypto.randomBytes(16).toString('hex')
    const hashedPassword = await bcrypt.hash(tempPassword, 10)

    const newUser = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail, // Use normalized email
        password: hashedPassword,
        tempPassword: resetTokenData, // Store reset token instead of temp password
        role,
        schoolId: targetSchoolId,
        isFirstLogin: true,
        isActive: true,
        areas: [] // Deprecated field, kept for compatibility
      }
    })

    // Assign areas if provided (for judges)
    if (areas && areas.length > 0 && role === 'judge') {
      // Note: This requires tournamentId, will be handled by separate endpoint
      // For now, just store in areas array for legacy compatibility
      await prisma.user.update({
        where: { id: newUser.id },
        data: { areas }
      })
    }

    // Send welcome email with password setup link
    try {
      await sendWelcomeEmail(normalizedEmail, name, resetToken, role)
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError)
      // Continue even if email fails - user can still request password reset
    }

    // Remove password from response
    const { password: _, tempPassword: __, ...userResponse } = newUser

    return NextResponse.json({
      success: true,
      user: userResponse,
      message: 'Usuário criado com sucesso. Um email foi enviado para configurar a senha.'
    })

  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Email já cadastrado' },
        { status: 400 }
      )
    }
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/users - Update user
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { id, name, email, role, isActive, areas } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'ID do usuário é obrigatório' },
        { status: 400 }
      )
    }

    const targetUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Check permissions
    if (user.role !== 'platform_admin' && targetUser.schoolId !== user.schoolId) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const updateData: any = {}
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (role) updateData.role = role
    if (isActive !== undefined) updateData.isActive = isActive
    if (areas) updateData.areas = areas // Legacy field

    await prisma.user.update({
      where: { id },
      data: updateData
    })

    const updatedUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        areas: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      user: updatedUser
    })

  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/users - Delete user
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
        { error: 'ID do usuário é obrigatório' },
        { status: 400 }
      )
    }

    const targetUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    if (user.role !== 'platform_admin' && targetUser.schoolId !== user.schoolId) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    await prisma.user.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Helper function to generate temporary password
function generateTempPassword(): string {
  return crypto.randomBytes(8).toString('base64').substring(0, 8)
}

