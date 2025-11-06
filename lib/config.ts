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
// IMPORTANT: This should only be called at runtime, not during build
// The function is exported but not called automatically to prevent build-time errors
export function validateEnvironment() {
  // Only validate on server side
  if (typeof window === 'undefined') {
    // Skip validation during build time
    // During build, Next.js sets NEXT_PHASE, and we should not validate
    // Runtime is when NEXT_RUNTIME is set or when handling actual requests
    const isBuildTime = process.env.NEXT_PHASE !== undefined
    
    if (isBuildTime) {
      // During build, skip validation - variables will be available at runtime
      return
    }
    
    // Only validate in actual runtime (when handling requests)
    // Check if we're actually in a request context (not build)
    const isRuntime = process.env.NEXT_RUNTIME !== undefined || 
                     typeof process.env.VERCEL === 'string' && 
                     process.env.VERCEL_ENV !== undefined
    
    if (!isRuntime) {
      // Not in runtime context, skip validation
      return
    }
    
    // In production runtime, require critical environment variables
    if (process.env.VERCEL_ENV === 'production' || 
        (process.env.NODE_ENV === 'production' && process.env.VERCEL)) {
      if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "your-super-secret-jwt-key-change-this-in-production") {
        throw new Error('JWT_SECRET must be set to a secure value in production')
      }
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is required in production')
      }
    }
    // In development runtime, warn if using defaults
    else if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PHASE) {
      if (process.env.JWT_SECRET === "your-super-secret-jwt-key-change-this-in-production") {
        console.warn('⚠️  WARNING: Using default JWT_SECRET. Set a secure JWT_SECRET in production!')
      }
    }
  }
}

// Don't validate on module load - let it be called explicitly when needed
// This prevents build-time errors when env vars aren't available yet
