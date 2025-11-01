import { NextResponse } from 'next/server'
import { getNeonAuthConfig } from '@/lib/neon-auth'

export const dynamic = 'force-dynamic'

/**
 * Check if Neon Auth is configured
 * Returns configuration status for frontend
 */
export async function GET() {
  try {
    const config = getNeonAuthConfig()

    // Retorna URL pública para uso no frontend
    const publicUrl = process.env.NEXT_PUBLIC_STACK_AUTH_URL || config.stackAuthUrl

    return NextResponse.json({
      enabled: config.enabled,
      stackAuthUrl: publicUrl || null,
      projectId: config.projectId || null,
      message: config.enabled 
        ? 'Neon Auth está configurado e pronto para uso'
        : 'Neon Auth não está configurado. Configure no console do Neon.'
    })
  } catch (error) {
    console.error('Neon Auth check error:', error)
    return NextResponse.json(
      { error: 'Erro ao verificar configuração do Neon Auth' },
      { status: 500 }
    )
  }
}

