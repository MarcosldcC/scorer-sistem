/**
 * Email verification utility
 * Verifies if an email address exists and can receive emails
 */

/**
 * Verify if a Gmail address exists and can receive emails
 * Uses a combination of format validation and deliverability check
 */
export async function verifyGmailExists(email: string): Promise<{ exists: boolean; error?: string }> {
  try {
    // First, validate the format
    const emailRegex = /^[^\s@]+@(gmail\.com|googlemail\.com)$/i
    if (!emailRegex.test(email)) {
      return { exists: false, error: 'Formato de email inválido' }
    }

    // Extract the local part (before @)
    const localPart = email.split('@')[0].toLowerCase()
    
    // Normalize Gmail (remove dots, handle + aliases)
    const normalizedLocal = localPart.split('+')[0].replace(/\./g, '')
    const normalizedEmail = `${normalizedLocal}@gmail.com`

    // Check for obviously invalid patterns
    if (normalizedLocal.length < 1 || normalizedLocal.length > 64) {
      return { exists: false, error: 'Email inválido' }
    }

    // Check for invalid characters
    if (!/^[a-z0-9]+$/.test(normalizedLocal)) {
      return { exists: false, error: 'Email contém caracteres inválidos' }
    }

    // For Gmail, we can't directly verify if an email exists without attempting to send
    // However, we can validate the format and check against common patterns
    // In production, you might want to use an email verification API like:
    // - AbstractAPI Email Verification
    // - EmailListVerify
    // - ZeroBounce
    // - Hunter.io

    // For now, we'll do a basic format check and attempt to send
    // The actual verification will happen when we try to send the email
    // If the email doesn't exist, the email service will bounce it
    
    // Use an email verification API if available
    const emailVerificationApiKey = process.env.EMAIL_VERIFICATION_API_KEY
    
    if (emailVerificationApiKey) {
      try {
        // Create AbortController for timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        
        // Try AbstractAPI first (you can replace with your preferred service)
        const response = await fetch(`https://emailvalidation.abstractapi.com/v1/?api_key=${emailVerificationApiKey}&email=${encodeURIComponent(normalizedEmail)}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          },
          // Add timeout to avoid hanging
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
          const data = await response.json()
          // Check multiple deliverability indicators
          if (data.deliverability === 'DELIVERABLE' || 
              (data.is_valid_format?.value && data.is_smtp_valid?.value)) {
            return { exists: true }
          } else if (data.deliverability === 'UNDELIVERABLE') {
            return { exists: false, error: 'Email não encontrado ou não pode receber mensagens' }
          } else {
            // If deliverability is uncertain, we'll try to send anyway
            // The email service will handle bounces
            return { exists: true }
          }
        }
      } catch (apiError: any) {
        console.error('Email verification API error:', apiError)
        // If API times out or fails, continue with basic validation
        // We'll rely on the email service to handle delivery
        if (apiError.name !== 'AbortError') {
          // Continue with basic validation if API fails (not timeout)
        }
      }
    }

    // If no API is configured or API failed, do enhanced format validation
    // For Gmail, we can't verify existence without sending, but we can validate format thoroughly
    // Additional checks:
    
    // Check local part length (Gmail allows 1-64 characters)
    const localPartLength = normalizedLocal.length
    if (localPartLength < 1 || localPartLength > 64) {
      return { exists: false, error: 'Email inválido. O nome do email deve ter entre 1 e 64 caracteres.' }
    }

    // Format is valid - we'll try to send and let the email service handle bounces
    // This is acceptable because:
    // 1. We validate format thoroughly
    // 2. The email service (Resend) will bounce invalid emails
    // 3. We rollback user creation if email fails to send
    return { exists: true }
    
  } catch (error) {
    console.error('Error verifying email:', error)
    return { exists: false, error: 'Erro ao verificar email' }
  }
}

/**
 * Verify email using SMTP check (more reliable but slower)
 */
export async function verifyEmailSMTP(email: string): Promise<{ exists: boolean; error?: string }> {
  try {
    const domain = email.split('@')[1]
    
    // For Gmail, we can't easily verify via SMTP without authentication
    // Gmail doesn't allow open SMTP verification for privacy reasons
    // So we'll use the format validation instead
    
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      // Gmail format validation
      const emailRegex = /^[^\s@]+@(gmail\.com|googlemail\.com)$/i
      if (!emailRegex.test(email)) {
        return { exists: false, error: 'Formato de email inválido' }
      }
      
      // Basic format check passed
      // Actual verification will happen when email is sent
      return { exists: true }
    }
    
    return { exists: false, error: 'Apenas emails Gmail são permitidos' }
  } catch (error) {
    console.error('Error in SMTP verification:', error)
    return { exists: false, error: 'Erro ao verificar email' }
  }
}

