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

// Validate required environment variables only at runtime, not during build
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production' && process.env.VERCEL !== '1') {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required in production')
  }
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required in production')
  }
}
