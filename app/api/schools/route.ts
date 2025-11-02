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

    const { name, email, code, password, location, status } = await request.json()

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Nome e código são obrigatórios' },
        { status: 400 }
      )
    }

    // Check if code already exists
    const existingSchool = await prisma.school.findUnique({
      where: { code }
    })

    if (existingSchool) {
      return NextResponse.json(
        { error: 'Código já existe' },
        { status: 400 }
      )
    }

    const school = await prisma.school.create({
      data: {
        name,
        email,
        code,
        password,
        location,
        status: status || 'draft'
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

    // Create automatic admin user for the school
    let adminEmail = email || `admin.${code.toLowerCase()}@gmail.com`
    
    // Validate and normalize Gmail
    if (!isValidGmail(adminEmail)) {
      return NextResponse.json(
        { error: 'Email deve ser um endereço Gmail válido (@gmail.com ou @googlemail.com)' },
        { status: 400 }
      )
    }
    adminEmail = normalizeGmail(adminEmail)

    // Check if admin email already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Email do admin já está cadastrado. Use um email Gmail diferente.' },
        { status: 400 }
      )
    }

    // Generate reset token for password setup
    const resetToken = crypto.randomBytes(32).toString('hex')
    const expiryTimestamp = Date.now() + (60 * 60 * 1000) // 1 hour
    const resetTokenData = `RESET_TOKEN:${resetToken}:${expiryTimestamp}`

    // Generate a temporary password (won't be used - user will set via email link)
    const tempPassword = crypto.randomBytes(16).toString('hex')
    const hashedPassword = await bcrypt.hash(tempPassword, 10)

    const adminUser = await prisma.user.create({
      data: {
        name: `Admin - ${name}`,
        email: adminEmail,
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
    try {
      await sendWelcomeEmail(adminEmail, `Admin - ${name}`, resetToken, 'school_admin')
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError)
      // Continue even if email fails - user can still request password reset
    }

    // Remove sensitive data from response
    const { password: _, tempPassword: __, ...safeUser } = adminUser

    return NextResponse.json({
      success: true,
      school,
      adminUser: safeUser,
      message: 'Escola criada com sucesso! Um email foi enviado para o admin configurar a senha.'
    })

  } catch (error) {
    console.error('Create school error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
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

