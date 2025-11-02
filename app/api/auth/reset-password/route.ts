import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { isValidGmail, normalizeGmail } from '@/lib/email-validation'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { token, email, password } = await request.json()

    if (!token || !email || !password) {
      return NextResponse.json(
        { error: 'Token, email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Validate Gmail
    if (!isValidGmail(email)) {
      return NextResponse.json(
        { error: 'Email deve ser um endereço Gmail válido (@gmail.com ou @googlemail.com)' },
        { status: 400 }
      )
    }

    // Normalize Gmail
    const normalizedEmail = normalizeGmail(email)

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Check if user has a reset token
    if (!user.tempPassword || !user.tempPassword.startsWith('RESET_TOKEN:')) {
      return NextResponse.json(
        { error: 'Token de redefinição inválido ou expirado' },
        { status: 400 }
      )
    }

    // Extract token and expiry from tempPassword field
    // Format: "RESET_TOKEN:<token>:<expiry_timestamp>"
    const parts = user.tempPassword.split(':')
    if (parts.length !== 3 || parts[0] !== 'RESET_TOKEN') {
      return NextResponse.json(
        { error: 'Token de redefinição inválido ou expirado' },
        { status: 400 }
      )
    }

    const storedToken = parts[1]
    const expiryTimestamp = parseInt(parts[2], 10)

    // Verify token matches
    if (storedToken !== token) {
      return NextResponse.json(
        { error: 'Token de redefinição inválido' },
        { status: 400 }
      )
    }

    // Check if token has expired
    if (Date.now() > expiryTimestamp) {
      // Clear expired token
      await prisma.user.update({
        where: { id: user.id },
        data: { tempPassword: null }
      })
      return NextResponse.json(
        { error: 'Token de redefinição expirado. Solicite um novo link.' },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        tempPassword: null,
        isFirstLogin: false
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Senha redefinida com sucesso'
    })

  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
