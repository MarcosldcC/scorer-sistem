import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { config } from '@/lib/config'
import bcrypt from 'bcryptjs'
import { isValidGmail, normalizeGmail } from '@/lib/email-validation'
import { sendWelcomeEmail } from '@/lib/email'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// Helper function to generate temporary password
function generateTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let password = ''
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

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

// GET /api/schools - List all schools (Platform Admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Only platform admins can list all schools
    if (user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // draft, active, suspended, archived

    const where: any = {}
    if (status) where.status = status

    const schools = await prisma.school.findMany({
      where,
      include: {
        _count: {
          select: {
            tournaments: true,
            users: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ schools })

  } catch (error) {
    console.error('Get schools error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/schools - Create new school (Platform Admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Only platform admins can create schools
    if (user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const { name, email, location, adminEmail, tempPassword } = await request.json()

    if (!name || !location) {
      return NextResponse.json(
        { error: 'Nome e localização são obrigatórios' },
        { status: 400 }
      )
    }

    if (!adminEmail || !tempPassword) {
      return NextResponse.json(
        { error: 'Gmail do admin e senha temporária são obrigatórios' },
        { status: 400 }
      )
    }

    // Validate admin email is Gmail
    if (!isValidGmail(adminEmail)) {
      return NextResponse.json(
        { error: 'Email do admin deve ser um endereço Gmail válido (@gmail.com ou @googlemail.com)' },
        { status: 400 }
      )
    }

    // Normalize admin Gmail
    const normalizedAdminEmail = normalizeGmail(adminEmail)

    // Check if admin email already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: normalizedAdminEmail }
    })

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Email do admin já está cadastrado. Use um email Gmail diferente.' },
        { status: 400 }
      )
    }

    // Generate unique code from school name
    let baseCode = name
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^A-Z0-9]/g, '_') // Replace non-alphanumeric with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .substring(0, 20) // Limit length
    
    // Ensure baseCode is not empty
    if (!baseCode || baseCode.length === 0) {
      baseCode = 'SCHOOL_' + Date.now().toString().slice(-6)
    }
    
    let code = baseCode
    let codeExists = true
    let attempts = 0
    
    // Generate unique code (try up to 10 times)
    while (codeExists && attempts < 10) {
      const existingSchool = await prisma.school.findUnique({
        where: { code }
      })
      
      if (!existingSchool) {
        codeExists = false
      } else {
        // Add number suffix
        code = `${baseCode}_${attempts + 1}`
        attempts++
      }
    }

    if (codeExists) {
      // Fallback: use timestamp if all attempts failed
      code = `SCHOOL_${Date.now()}`
      const finalCheck = await prisma.school.findUnique({
        where: { code }
      })
      if (finalCheck) {
        return NextResponse.json(
          { error: 'Não foi possível gerar um código único. Tente novamente.' },
          { status: 500 }
        )
      }
    }

    const school = await prisma.school.create({
      data: {
        name,
        email: email || null, // Contact email (optional)
        code,
        password: null, // No longer needed
        location,
        status: 'active' // Always active when created
      }
    })

    // Create default settings for the school
    await prisma.schoolSettings.create({
      data: {
        schoolId: school.id,
        language: 'pt-BR',
        branding: {}
      }
    })

    // Generate reset token for password setup
    const resetToken = crypto.randomBytes(32).toString('hex')
    const expiryTimestamp = Date.now() + (60 * 60 * 1000) // 1 hour
    const resetTokenData = `RESET_TOKEN:${resetToken}:${expiryTimestamp}`

    // Hash temporary password (won't be used - user will set via email link)
    const hashedPassword = await bcrypt.hash(tempPassword, 10)

    const adminUser = await prisma.user.create({
      data: {
        name: `Admin - ${name}`,
        email: normalizedAdminEmail,
        password: hashedPassword,
        tempPassword: resetTokenData, // Store reset token instead of temp password
        role: 'school_admin',
        schoolId: school.id,
        isFirstLogin: true,
        isActive: true,
        areas: []
      }
    })

    // Send welcome email with password setup link
    let emailSent = false
    try {
      emailSent = await sendWelcomeEmail(normalizedAdminEmail, `Admin - ${name}`, resetToken, 'school_admin')
      if (!emailSent) {
        console.warn('Email não foi enviado, mas o usuário foi criado com sucesso')
      }
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError)
      // Continue even if email fails - user can still request password reset
    }

    // Remove sensitive data from response and ensure serialization
    const { password: _, tempPassword: __, ...safeUser } = adminUser

    // Ensure DateTime fields are serializable
    const schoolResponse = {
      ...school,
      createdAt: school.createdAt.toISOString(),
      updatedAt: school.updatedAt.toISOString(),
    }

    const userResponse = {
      ...safeUser,
      createdAt: safeUser.createdAt.toISOString(),
      updatedAt: safeUser.updatedAt.toISOString(),
      lastLoginAt: safeUser.lastLoginAt?.toISOString() || null,
      sessionExpiresAt: safeUser.sessionExpiresAt?.toISOString() || null,
    }

    return NextResponse.json({
      success: true,
      school: schoolResponse,
      adminUser: userResponse,
      message: emailSent 
        ? 'Escola criada com sucesso! Um email foi enviado para o admin configurar a senha.'
        : 'Escola criada com sucesso! O admin pode solicitar redefinição de senha na tela de login.'
    })

  } catch (error: any) {
    console.error('Create school error:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    })
    
    // Return more specific error messages
    const errorMessage = error?.message || 'Erro interno do servidor'
    
    // Check for specific Prisma errors
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Já existe uma escola ou usuário com esses dados. Verifique o código da escola ou email do admin.' },
        { status: 400 }
      )
    }
    
    if (error?.code === 'P2003') {
      return NextResponse.json(
        { error: 'Erro de referência: dados relacionados não encontrados.' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: `Erro interno do servidor: ${errorMessage}` },
      { status: 500 }
    )
  }
}

// PUT /api/schools - Update school (Platform Admin only)
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    if (user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const { id, name, email, password, location, status } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'ID da escola é obrigatório' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (name) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (password !== undefined) updateData.password = password
    if (location !== undefined) updateData.location = location
    if (status) updateData.status = status

    const school = await prisma.school.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      school
    })

  } catch (error) {
    console.error('Update school error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/schools - Delete school (Platform Admin only)
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    if (user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID da escola é obrigatório' },
        { status: 400 }
      )
    }

    // Check if school has associated tournaments
    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tournaments: true,
            users: true
          }
        }
      }
    })

    if (!school) {
      return NextResponse.json(
        { error: 'Escola não encontrada' },
        { status: 404 }
      )
    }

    // Check if school has tournaments or users
    if (school._count.tournaments > 0 || school._count.users > 0) {
      return NextResponse.json(
        { 
          error: `Não é possível excluir a escola. Ela possui ${school._count.tournaments} torneio(s) e ${school._count.users} usuário(s) associados. Primeiro remova ou transfira esses dados.` 
        },
        { status: 400 }
      )
    }

    // Delete school settings first (if exists)
    await prisma.schoolSettings.deleteMany({
      where: { schoolId: id }
    })

    // Delete the school
    await prisma.school.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Escola excluída com sucesso'
    })

  } catch (error) {
    console.error('Delete school error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

