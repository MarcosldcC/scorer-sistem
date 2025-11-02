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

// GET /api/templates - List templates
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
    const isOfficial = searchParams.get('isOfficial')
    const schoolId = searchParams.get('schoolId')

    const where: any = {}
    
    // Platform admins see all templates
    // School admins see:
    // 1. Official templates assigned to their school
    // 2. Their school's custom templates
    if (user.role === 'school_admin' && user.schoolId) {
      // Get IDs of official templates assigned to this school
      const assignedTemplates = await prisma.templateSchoolAssignment.findMany({
        where: { schoolId: user.schoolId },
        select: { templateId: true }
      })
      const assignedTemplateIds = assignedTemplates.map(a => a.templateId)
      
      where.OR = [
        // Official templates assigned to this school
        { 
          id: { in: assignedTemplateIds },
          isOfficial: true 
        },
        // School's custom templates
        { schoolId: user.schoolId }
      ]
    } else if (isOfficial === 'true') {
      where.isOfficial = true
    } else if (isOfficial === 'false') {
      where.isOfficial = false
    }

    if (schoolId) {
      where.schoolId = schoolId
    }

    const templates = await prisma.tournamentTemplate.findMany({
      where,
      include: {
        school: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            tournaments: true
          }
        }
      },
      orderBy: [
        { isOfficial: 'desc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json({ templates })

  } catch (error) {
    console.error('Get templates error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/templates - Create template
export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { name, description, config, isOfficial, cloneFromId } = await request.json()

    if (!name || !config) {
      return NextResponse.json(
        { error: 'Nome e configuração são obrigatórios' },
        { status: 400 }
      )
    }

    // Only platform admins can create official templates
    if (isOfficial && user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Apenas admin da plataforma pode criar templates oficiais' },
        { status: 403 }
      )
    }

    let finalConfig = config

    // If cloning, get config from source template
    if (cloneFromId) {
      const sourceTemplate = await prisma.tournamentTemplate.findUnique({
        where: { id: cloneFromId }
      })

      if (!sourceTemplate) {
        return NextResponse.json(
          { error: 'Template de origem não encontrado' },
          { status: 404 }
        )
      }

      // Clone config from source
      finalConfig = sourceTemplate.config

      // If cloning official template, auto-set as unofficial
      if (sourceTemplate.isOfficial) {
        finalConfig = {
          ...finalConfig,
          isOfficial: false
        }
      }
    }

    const template = await prisma.tournamentTemplate.create({
      data: {
        name,
        description,
        config: finalConfig,
        version: '1.0.0',
        isOfficial: isOfficial || false,
        schoolId: user.schoolId || null,
        createdBy: user.userId || user.id
      }
    })

    return NextResponse.json({
      success: true,
      template
    })

  } catch (error) {
    console.error('Create template error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/templates - Update template
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { id, name, description, config, version } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'ID do template é obrigatório' },
        { status: 400 }
      )
    }

    // Check if template exists
    const existingTemplate = await prisma.tournamentTemplate.findUnique({
      where: { id },
      include: {
        tournaments: true
      }
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template não encontrado' },
        { status: 404 }
      )
    }

    // Check permissions
    if (existingTemplate.isOfficial && user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Apenas admin da plataforma pode editar templates oficiais' },
        { status: 403 }
      )
    }

    if (!existingTemplate.isOfficial && existingTemplate.schoolId !== user.schoolId && user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Increment version if config changed
    const newVersion = version || incrementVersion(existingTemplate.version)

    const template = await prisma.tournamentTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(config && { config }),
        version: newVersion,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      template
    })

  } catch (error) {
    console.error('Update template error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/templates - Delete template
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
        { error: 'ID do template é obrigatório' },
        { status: 400 }
      )
    }

    const template = await prisma.tournamentTemplate.findUnique({
      where: { id }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template não encontrado' },
        { status: 404 }
      )
    }

    // Only can delete own templates or be platform admin
    if (template.schoolId !== user.schoolId && user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    await prisma.tournamentTemplate.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete template error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Helper function to increment semantic version
function incrementVersion(currentVersion: string): string {
  const [major, minor, patch] = currentVersion.split('.').map(Number)
  return `${major}.${minor}.${patch + 1}`
}

