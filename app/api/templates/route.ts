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
    // Normalize user object to ensure consistent structure
    return {
      id: decoded.userId || decoded.id,
      userId: decoded.userId || decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
      isAdmin: decoded.isAdmin,
      areas: decoded.areas || [],
      schoolId: decoded.schoolId || null
    }
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
      console.log(`[Templates API] School admin request - User ID: ${user.id || user.userId}, School ID: ${user.schoolId}, Role: ${user.role}`)
      
      // Get IDs of official templates assigned to this school
      const assignedTemplates = await prisma.templateSchoolAssignment.findMany({
        where: { schoolId: user.schoolId },
        select: { templateId: true }
      })
      const assignedTemplateIds = assignedTemplates.map(a => a.templateId)
      
      console.log(`[Templates API] Found ${assignedTemplates.length} assignments for school ${user.schoolId}`)
      console.log(`[Templates API] Assigned template IDs:`, assignedTemplateIds)
      
      // Build OR conditions
      const orConditions: any[] = []
      
      // Add assigned official templates if any
      if (assignedTemplateIds.length > 0) {
        orConditions.push({
          id: { in: assignedTemplateIds },
          isOfficial: true,
          isActive: true // Only show active templates
        })
      }
      
      // Always add school's custom templates
      orConditions.push({ 
        schoolId: user.schoolId,
        isActive: true // Only show active templates
      })
      
      where.OR = orConditions
    } else if (user.role === 'school_admin') {
      console.log(`[Templates API] School admin without schoolId - User ID: ${user.id || user.userId}, Role: ${user.role}`)
    } else if (user.role === 'platform_admin') {
      // Platform admin sees all templates, but can filter by isOfficial if provided
      if (isOfficial === 'true') {
        where.isOfficial = true
      } else if (isOfficial === 'false') {
        where.isOfficial = false
      }
      // Don't filter by isActive for platform_admin - they see all templates
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

    console.log(`[Templates API] Returning ${templates.length} templates for ${user.role}`)
    if (user.role === 'school_admin') {
      console.log(`[Templates API] Template IDs:`, templates.map(t => ({ id: t.id, name: t.name, isOfficial: t.isOfficial })))
    }

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

    const { name, description, config, isOfficial, cloneFromId, isActive } = await request.json()

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
        isActive: isActive !== undefined ? isActive : false, // Default to inactive for new templates
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

    const { id, name, description, config, version, isActive } = await request.json()

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

    const updateData: any = {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(config && { config }),
      version: newVersion,
      updatedAt: new Date()
    }

    // Update isActive if provided (for publishing/unpublishing)
    if (isActive !== undefined) {
      updateData.isActive = isActive
    }

    const template = await prisma.tournamentTemplate.update({
      where: { id },
      data: updateData
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
      where: { id },
      include: {
        _count: {
          select: {
            tournaments: true,
            assignedSchools: true
          }
        }
      }
    })

    if (!template) {
      console.log(`[DELETE Template] Template not found: ${id}`)
      return NextResponse.json(
        { error: 'Template não encontrado' },
        { status: 404 }
      )
    }

    console.log(`[DELETE Template] Template found:`, {
      id: template.id,
      name: template.name,
      isOfficial: template.isOfficial,
      schoolId: template.schoolId,
      userRole: user.role,
      userSchoolId: user.schoolId,
      tournamentsCount: template._count.tournaments,
      assignmentsCount: template._count.assignedSchools
    })

    // Only can delete own templates or be platform admin
    // Platform admins can delete any template, school admins can only delete their own
    if (template.isOfficial && user.role !== 'platform_admin') {
      console.log(`[DELETE Template] Permission denied: Official template can only be deleted by platform admin`)
      return NextResponse.json(
        { error: 'Apenas admin da plataforma pode excluir templates oficiais' },
        { status: 403 }
      )
    }

    if (!template.isOfficial && template.schoolId !== user.schoolId && user.role !== 'platform_admin') {
      console.log(`[DELETE Template] Permission denied:`, {
        templateSchoolId: template.schoolId,
        userSchoolId: user.schoolId,
        userRole: user.role
      })
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Check if template is being used by tournaments
    if (template._count.tournaments > 0) {
      console.log(`[DELETE Template] Template is being used by ${template._count.tournaments} tournament(s)`)
      return NextResponse.json(
        { error: `Não é possível excluir o template pois ele está sendo usado por ${template._count.tournaments} torneio(s). Remova os torneios primeiro ou desassocie o template.` },
        { status: 400 }
      )
    }

    // Delete template school assignments first (if any)
    if (template._count.assignedSchools > 0) {
      console.log(`[DELETE Template] Deleting ${template._count.assignedSchools} school assignment(s)`)
      await prisma.templateSchoolAssignment.deleteMany({
        where: { templateId: id }
      })
    }

    // Finally delete the template
    console.log(`[DELETE Template] Deleting template: ${id}`)
    await prisma.tournamentTemplate.delete({
      where: { id }
    })

    console.log(`[DELETE Template] Template deleted successfully: ${id}`)
    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Delete template error:', error)
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta
    })
    
    // Return more specific error messages
    if (error?.code === 'P2003') {
      return NextResponse.json(
        { error: 'Não é possível excluir o template pois há dados relacionados. Verifique se há torneios ou atribuições associadas.' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error?.message || 'Erro interno do servidor ao excluir template' },
      { status: 500 }
    )
  }
}

// Helper function to increment semantic version
function incrementVersion(currentVersion: string): string {
  const [major, minor, patch] = currentVersion.split('.').map(Number)
  return `${major}.${minor}.${patch + 1}`
}

