import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { config } from '@/lib/config'

export const dynamic = 'force-dynamic'

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

// POST /api/templates/[id]/assign-schools - Assign template to schools
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Only platform admins can assign templates to schools
    if (user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const templateId = params.id
    const { schoolIds } = await request.json()

    if (!Array.isArray(schoolIds)) {
      return NextResponse.json(
        { error: 'schoolIds deve ser um array' },
        { status: 400 }
      )
    }

    // Verify template exists and is official
    const template = await prisma.tournamentTemplate.findUnique({
      where: { id: templateId }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template não encontrado' },
        { status: 404 }
      )
    }

    if (!template.isOfficial) {
      return NextResponse.json(
        { error: 'Apenas templates oficiais podem ser direcionados para escolas' },
        { status: 400 }
      )
    }

    // Verify all schools exist
    if (schoolIds.length > 0) {
      const schools = await prisma.school.findMany({
        where: {
          id: { in: schoolIds }
        },
        select: { id: true }
      })

      if (schools.length !== schoolIds.length) {
        return NextResponse.json(
          { error: 'Uma ou mais escolas não foram encontradas' },
          { status: 400 }
        )
      }
    }

    // Remove existing assignments for this template
    await prisma.templateSchoolAssignment.deleteMany({
      where: { templateId }
    })

    // Create new assignments
    const assignments = schoolIds.map((schoolId: string) => ({
      templateId,
      schoolId,
      assignedBy: user.id
    }))

    if (assignments.length > 0) {
      await prisma.templateSchoolAssignment.createMany({
        data: assignments
      })
    }

    // Fetch updated template with assignments
    const updatedTemplate = await prisma.tournamentTemplate.findUnique({
      where: { id: templateId },
      include: {
        assignedSchools: {
          include: {
            school: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      template: updatedTemplate,
      message: `Template direcionado para ${schoolIds.length} escola(s) com sucesso.`
    })

  } catch (error: any) {
    console.error('Assign schools error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// GET /api/templates/[id]/assign-schools - Get schools assigned to template
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const templateId = params.id

    const assignments = await prisma.templateSchoolAssignment.findMany({
      where: { templateId },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            code: true,
            location: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      schools: assignments.map(a => a.school)
    })

  } catch (error: any) {
    console.error('Get assigned schools error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

