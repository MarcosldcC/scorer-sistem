import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValidGmail, normalizeGmail } from '@/lib/email-validation'
import { sendPasswordResetEmail } from '@/lib/email'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    // Validate Gmail
    if (!isValidGmail(email)) {
      // Don't reveal if email exists - return success regardless
      return NextResponse.json({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá um link para redefinir sua senha.'
      })
    }

    // Normalize Gmail
    const normalizedEmail = normalizeGmail(email)

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (!user) {
      // Don't reveal if email exists - return success regardless
      return NextResponse.json({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá um link para redefinir sua senha.'
      })
    }

    // Generate reset token (64 random bytes)
    const resetToken = crypto.randomBytes(32).toString('hex')
    
    // Store reset token in tempPassword field temporarily (expires in 1 hour)
    // We'll use tempPassword field to store the reset token temporarily
    // Format: "RESET_TOKEN:<token>:<expiry_timestamp>"
    const expiryTimestamp = Date.now() + (60 * 60 * 1000) // 1 hour
    const resetTokenData = `RESET_TOKEN:${resetToken}:${expiryTimestamp}`

    // Store reset token (we'll use tempPassword field temporarily for this)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        tempPassword: resetTokenData
      }
    })

    // Send password reset email
    try {
      await sendPasswordResetEmail(user.email, resetToken)
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError)
      // Continue even if email fails - don't reveal if user exists
    }

    return NextResponse.json({
      success: true,
      message: 'Se o email estiver cadastrado, você receberá um link para redefinir sua senha.'
    })

  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
