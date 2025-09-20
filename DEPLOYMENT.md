# Deployment Guide

## Environment Variables

Before deploying, ensure the following environment variables are set:

### Required Variables

- `DATABASE_URL`: PostgreSQL database connection string
- `JWT_SECRET`: Secret key for JWT token signing (use a strong, random string)

### Optional Variables

- `NEXTAUTH_URL`: Base URL for the application (defaults to localhost:3000)
- `NEXTAUTH_SECRET`: Secret key for NextAuth (defaults to a fallback value)

## Deployment Steps

1. **Set Environment Variables**: Configure the required environment variables in your deployment platform (Vercel, Netlify, etc.)

2. **Database Setup**: Ensure your PostgreSQL database is accessible and the schema is migrated:
   ```bash
   pnpm run db:push
   ```

3. **Validate Environment**: Run the validation script to check environment variables:
   ```bash
   pnpm run validate:env
   ```

4. **Build**: The build should now work without database connection errors:
   ```bash
   pnpm run build
   ```

## Vercel Deployment

For Vercel deployment:

1. Connect your repository to Vercel
2. Set the environment variables in the Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add `DATABASE_URL` and `JWT_SECRET`
3. Deploy

## Troubleshooting

### Build Error: "Failed to collect page data for /api/auth/login"

This error was fixed by implementing lazy database connection initialization. If you still encounter this error:

1. Ensure all required environment variables are set
2. Check that the database is accessible from the deployment environment
3. Verify that Prisma migrations have been applied

### Database Connection Issues

- Ensure `DATABASE_URL` is correctly formatted
- Check that the database server is accessible from your deployment environment
- Verify that the database user has the necessary permissions
