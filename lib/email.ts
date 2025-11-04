/**
 * Email sending utility
 * Configure with your email provider (Resend, SendGrid, Gmail API, etc.)
 */

import { Resend } from 'resend'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://scorer-sistem.vercel.app'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Send email using Resend
 */
export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<boolean> {
  try {
    const resendApiKey = process.env.RESEND_API_KEY

    if (!resendApiKey) {
      console.error('RESEND_API_KEY não configurada')
      // In development, log the email content
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Email would be sent (RESEND_API_KEY not configured):')
        console.log('To:', to)
        console.log('Subject:', subject)
        console.log('HTML:', html)
        if (text) console.log('Text:', text)
      }
      return false
    }

    const resend = new Resend(resendApiKey)

    // Get from email from env or use default
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    
    // Log email configuration (without sensitive data)
    console.log('Sending email:', {
      to,
      from: fromEmail,
      subject,
      hasResendFromEmail: !!process.env.RESEND_FROM_EMAIL
    })

    const result = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
      text: text || undefined,
    })

    if (result.error) {
      console.error('Error sending email via Resend:', result.error)
      console.error('Resend error details:', {
        message: result.error.message,
        name: result.error.name,
        statusCode: result.error.statusCode
      })
      return false
    }

    if (!result.data) {
      console.error('Resend returned no data, result:', result)
      return false
    }

    console.log('✅ Email sent successfully to:', to)
    console.log('Email ID:', result.data.id)
    return true
  } catch (error) {
    console.error('Error sending email:', error)
    // In development, log the email content even if there's an error
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Email content (error occurred):')
      console.log('To:', to)
      console.log('Subject:', subject)
    }
    return false
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
  const resetLink = `${APP_URL}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Sistema de Avaliação</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Redefinir Senha</h2>
        <p>Olá,</p>
        <p>Você solicitou a redefinição de senha da sua conta. Clique no botão abaixo para criar uma nova senha:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Redefinir Senha</a>
        </div>
        <p style="color: #666; font-size: 14px;">Ou copie e cole este link no seu navegador:</p>
        <p style="color: #667eea; font-size: 12px; word-break: break-all;">${resetLink}</p>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">Este link expira em 1 hora.</p>
        <p style="color: #666; font-size: 14px;">Se você não solicitou esta redefinição, ignore este email.</p>
      </div>
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© ${new Date().getFullYear()} Sistema de Avaliação. Todos os direitos reservados.</p>
      </div>
    </body>
    </html>
  `

  const text = `
Redefinir Senha

Você solicitou a redefinição de senha da sua conta. 
Clique no link abaixo para criar uma nova senha:

${resetLink}

Este link expira em 1 hora.
Se você não solicitou esta redefinição, ignore este email.
  `

  return await sendEmail({
    to: email,
    subject: 'Redefinir Senha - Sistema de Avaliação',
    html,
    text
  })
}

/**
 * Send welcome email with password setup link
 */
export async function sendWelcomeEmail(email: string, userName: string, resetToken: string, role: string): Promise<boolean> {
  const resetLink = `${APP_URL}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`
  
  const roleName = {
    'platform_admin': 'Administrador da Plataforma',
    'school_admin': 'Administrador de Torneio',
    'judge': 'Juiz',
    'viewer': 'Visualizador'
  }[role] || 'Usuário'

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Sistema de Avaliação</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Bem-vindo(a), ${userName}!</h2>
        <p>Sua conta foi criada com sucesso no Sistema de Avaliação.</p>
        <p><strong>Função:</strong> ${roleName}</p>
        <p>Para começar a usar a plataforma, defina sua senha clicando no botão abaixo:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Definir Senha</a>
        </div>
        <p style="color: #666; font-size: 14px;">Ou copie e cole este link no seu navegador:</p>
        <p style="color: #667eea; font-size: 12px; word-break: break-all;">${resetLink}</p>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">Este link expira em 1 hora.</p>
        <p style="color: #666; font-size: 14px;">Após definir sua senha, você poderá fazer login normalmente.</p>
      </div>
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© ${new Date().getFullYear()} Sistema de Avaliação. Todos os direitos reservados.</p>
      </div>
    </body>
    </html>
  `

  const text = `
Bem-vindo(a), ${userName}!

Sua conta foi criada com sucesso no Sistema de Avaliação.
Função: ${roleName}

Para começar a usar a plataforma, defina sua senha clicando no link abaixo:

${resetLink}

Este link expira em 1 hora.
Após definir sua senha, você poderá fazer login normalmente.
  `

  return await sendEmail({
    to: email,
    subject: 'Bem-vindo ao Sistema de Avaliação',
    html,
    text
  })
}

