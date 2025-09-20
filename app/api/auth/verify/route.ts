import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { config } from '@/lib/config'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 400 }
      )
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwt.secret) as any

    return NextResponse.json({
      success: true,
      user: {
        id: decoded.userId,
        name: decoded.name,
        isAdmin: decoded.isAdmin,
        areas: decoded.areas
      }
    })

  } catch (error) {
    console.error('Token verification error:', error)
    return NextResponse.json(
      { error: 'Token inválido' },
      { status: 401 }
    )
  }
}
