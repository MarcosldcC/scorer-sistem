import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { config } from '@/lib/config'
import bcrypt from 'bcryptjs'
import { isValidGmail, normalizeGmail } from '@/lib/email-validation'

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

    const adminPassword = password || generateTempPassword()
    const hashedPassword = await bcrypt.hash(adminPassword, 10)

    const adminUser = await prisma.user.create({
      data: {
        name: `Admin - ${name}`,
        email: adminEmail,
        password: hashedPassword,
        tempPassword: adminPassword,
        role: 'school_admin',
        schoolId: school.id,
        isFirstLogin: true,
        isActive: true,
        areas: []
      }
    })

    // Remove sensitive data from response
    const { password: _, tempPassword: __, ...safeUser } = adminUser

    return NextResponse.json({
      success: true,
      school,
      adminUser: {
        ...safeUser,
        tempPassword: adminPassword // Include temp password so admin can share it
      },
      message: `Escola criada! Usuário admin criado automaticamente com email: ${adminEmail} e senha temporária: ${adminPassword}`
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

