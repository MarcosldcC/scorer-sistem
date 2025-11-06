import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { config } from '@/lib/config'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de autenticação necessário' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, config.jwt.secret) as any

    // Map userId to id for consistency
    const user = decoded && decoded.userId ? { ...decoded, id: decoded.userId } : decoded

    // Block viewers from deleting evaluations
    if (user.role === 'viewer') {
      return NextResponse.json({ 
        error: 'Visualizadores não podem excluir avaliações. Apenas visualização de rankings é permitida.' 
      }, { status: 403 })
    }

    // Verificar se é administrador
    if (!user.isAdmin && user.role !== 'school_admin' && user.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem excluir avaliações.' }, { status: 403 })
    }

    const { teamId, area } = await request.json()

    if (!teamId || !area) {
      return NextResponse.json({ error: 'ID da equipe e área são obrigatórios' }, { status: 400 })
    }

    // Verificar se a avaliação existe
    const evaluation = await prisma.evaluation.findFirst({
      where: {
        teamId,
        area
      }
    })

    if (!evaluation) {
      return NextResponse.json({ error: 'Avaliação não encontrada' }, { status: 404 })
    }

    // Excluir a avaliação (as penalidades serão excluídas automaticamente devido ao onDelete: Cascade)
    await prisma.evaluation.delete({
      where: {
        id: evaluation.id
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Avaliação excluída com sucesso' 
    })

  } catch (error) {
    console.error('Erro ao excluir avaliação:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}
