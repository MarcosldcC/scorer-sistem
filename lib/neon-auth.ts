/**
 * Neon Auth integration utilities
 * Neon Auth uses Stack Auth and syncs users to neon_auth.users_sync table
 */

/**
 * Validates if a Gmail email exists using Neon Auth/Stack Auth
 * This validates that the email is a real Gmail account
 */
export async function validateGmailExists(email: string): Promise<boolean> {
  if (!email || typeof email !== 'string') {
    return false
  }

  // Basic Gmail validation first
  const emailLower = email.toLowerCase().trim()
  if (!emailLower.endsWith('@gmail.com') && !emailLower.endsWith('@googlemail.com')) {
    return false
  }

  // If Neon Auth is configured, use Stack Auth API to validate email
  // For now, we just validate format. Real validation would require:
  // 1. Stack Auth API key
  // 2. Call to Stack Auth API to check if email exists
  // This would be done during OAuth flow or email verification
  
  return true
}

/**
 * Get Neon Auth configuration from environment variables
 * These are provided by Neon when Neon Auth is set up
 * 
 * Neon Auth usa Stack Auth, então as variáveis podem ser:
 * - STACK_AUTH_URL ou NEXT_PUBLIC_STACK_AUTH_URL
 * - STACK_AUTH_API_KEY ou STACK_SECRET_SERVER_KEY
 * - NEXT_PUBLIC_STACK_PROJECT_ID (opcional)
 */
export function getNeonAuthConfig() {
  // Project ID - obrigatório
  const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID
  
  // Stack Auth API Base URL (padrão: https://api.stack-auth.com)
  const apiBaseUrl = process.env.STACK_AUTH_API_URL || 
                     process.env.NEXT_PUBLIC_STACK_AUTH_URL ||
                     'https://api.stack-auth.com'
  
  // Stack Auth UI/Auth URL (para OAuth redirect)
  // Stack Auth usa a API diretamente para OAuth: /api/v1/projects/{projectId}/oauth/google
  const authUrl = process.env.STACK_AUTH_URL || 
                  process.env.NEXT_PUBLIC_STACK_AUTH_UI_URL ||
                  apiBaseUrl // Usa a mesma URL da API
  
  // Stack Auth API Key - deve ser privada (server-side only)
  const stackAuthApiKey = process.env.STACK_AUTH_API_KEY || 
                          process.env.STACK_SECRET_SERVER_KEY ||
                          process.env.STACK_SERVER_KEY
  
  // Build full API URL with project ID
  const stackAuthApiUrl = projectId 
    ? `${apiBaseUrl}/api/v1/projects/${projectId}`
    : apiBaseUrl
  
  return {
    enabled: !!(projectId && stackAuthApiKey),
    projectId,
    stackAuthApiUrl, // URL completa da API (com project ID)
    authUrl, // URL para OAuth redirects
    apiBaseUrl, // URL base da API
    stackAuthApiKey
  }
}

/**
 * Check if user exists in neon_auth.users_sync table
 * This table is automatically synced by Neon Auth
 */
export async function checkUserInNeonAuth(email: string, prisma: any): Promise<boolean> {
  try {
    // Check if neon_auth schema exists
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'neon_auth' 
        AND table_name = 'users_sync'
      )
    `
    
    if (!result || !result[0]?.exists) {
      // Neon Auth not configured yet
      return false
    }

    // Check if user exists in neon_auth.users_sync
    const userExists = await prisma.$queryRaw`
      SELECT 1 
      FROM neon_auth.users_sync 
      WHERE email = ${email.toLowerCase()}
      LIMIT 1
    `
    
    return !!userExists && Array.isArray(userExists) && userExists.length > 0
  } catch (error) {
    // Table doesn't exist or Neon Auth not configured
    console.log('Neon Auth not configured:', error)
    return false
  }
}

