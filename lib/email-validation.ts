/**
 * Validates if an email is a valid Gmail address
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

