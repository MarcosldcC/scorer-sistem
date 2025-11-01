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

    return NextResponse.json({
      enabled: config.enabled,
      projectId: config.projectId || null,
      authUrl: config.authUrl || null,
      apiBaseUrl: config.apiBaseUrl || null,
      message: config.enabled 
        ? 'Neon Auth está configurado e pronto para uso'
        : 'Neon Auth não está configurado. Configure NEXT_PUBLIC_STACK_PROJECT_ID e STACK_SECRET_SERVER_KEY.'
    })
  } catch (error) {
    console.error('Neon Auth check error:', error)
    return NextResponse.json(
      { error: 'Erro ao verificar configuração do Neon Auth' },
      { status: 500 }
    )
  }
}

