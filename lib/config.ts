// Environment configuration
export const config = {
  database: {
    url: process.env.DATABASE_URL || "postgresql://postgres:1234@localhost:5432/robotics_evaluation?schema=public",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production",
    expiresIn: "24h",
  },
  app: {
    nextAuthUrl: process.env.NEXTAUTH_URL || "http://localhost:3000",
    nextAuthSecret: process.env.NEXTAUTH_SECRET || "your-nextauth-secret-key",
  },
}

// Validate required environment variables at runtime
function validateEnvironment() {
  // Only validate on server side
  if (typeof window === 'undefined') {
    // In production, require critical environment variables
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "your-super-secret-jwt-key-change-this-in-production") {
        throw new Error('JWT_SECRET must be set to a secure value in production')
      }
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is required in production')
      }
    }
    // In development, warn if using defaults
    else if (process.env.NODE_ENV === 'development') {
      if (process.env.JWT_SECRET === "your-super-secret-jwt-key-change-this-in-production") {
        console.warn('⚠️  WARNING: Using default JWT_SECRET. Set a secure JWT_SECRET in production!')
      }
    }
  }
}

// Validate environment on module load (server-side only)
if (typeof window === 'undefined') {
  try {
    validateEnvironment()
  } catch (error) {
    // In production, fail fast
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Environment validation failed:', error)
      throw error
    }
    // In development, just warn
    console.warn('⚠️  Environment validation warning:', error)
  }
}

export { validateEnvironment }
