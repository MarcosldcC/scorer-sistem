/**
 * Validates if an email is a valid Gmail address
 * Uses basic validation - for actual Gmail verification, use Neon Auth
 */
export function isValidGmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return false
  }

  // Check if it's a Gmail domain
  const emailLower = email.toLowerCase().trim()
  const gmailDomains = [
    '@gmail.com',
    '@googlemail.com'
  ]

  return gmailDomains.some(domain => emailLower.endsWith(domain))
}

/**
 * Validates if Gmail email exists (checks format only)
 * For real validation, Neon Auth should be configured and email verified through OAuth flow
 */
export async function validateGmailExists(email: string): Promise<boolean> {
  // Format validation only - real existence check requires Neon Auth/Stack Auth
  return isValidGmail(email)
}

/**
 * Normalizes Gmail address (removes dots and converts to lowercase)
 */
export function normalizeGmail(email: string): string {
  if (!isValidGmail(email)) {
    return email
  }

  const [localPart, domain] = email.toLowerCase().split('@')
  // Remove dots from local part (gmail ignores them)
  const normalizedLocal = localPart.replace(/\./g, '')
  
  return `${normalizedLocal}@${domain}`
}

