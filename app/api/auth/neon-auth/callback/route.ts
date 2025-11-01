import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getNeonAuthConfig, checkUserInNeonAuth } from '@/lib/neon-auth'
import jwt from 'jsonwebtoken'
import { config } from '@/lib/config'
import { normalizeGmail } from '@/lib/email-validation'

export const dynamic = 'force-dynamic'

/**
 * Callback handler for Neon Auth OAuth flow
 * This is called after user authenticates with Google via Neon Auth
 */
export async function GET(request: NextRequest) {
  try {
    const neonConfig = getNeonAuthConfig()

    if (!neonConfig.enabled) {
      return NextResponse.redirect(new URL('/?error=neon-auth-not-configured', request.url))
    }

    // Get OAuth code from query params
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(new URL(`/?error=${error}`, request.url))
    }

    if (!code) {
      return NextResponse.redirect(new URL('/?error=no-code', request.url))
    }

    // Exchange code for token via Stack Auth API
    // Stack Auth API endpoint: /api/v1/projects/{projectId}/oauth/callback
    const callbackEndpoint = `${neonConfig.stackAuthApiUrl}/oauth/callback`
    
    const tokenResponse = await fetch(callbackEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${neonConfig.stackAuthApiKey}`,
        'X-Stack-Auth-Project-Id': neonConfig.projectId || ''
      },
      body: JSON.stringify({ 
        code,
        redirect_uri: `${new URL(request.url).origin}/api/auth/neon-auth/callback`
      })
    })

    if (!tokenResponse.ok) {
      return NextResponse.redirect(new URL('/?error=token-exchange-failed', request.url))
    }

    const tokenData = await tokenResponse.json()
    const userEmail = tokenData.email || tokenData.user?.email

    if (!userEmail) {
      return NextResponse.redirect(new URL('/?error=no-email', request.url))
    }

    // Normalize Gmail email
    const normalizedEmail = normalizeGmail(userEmail)

    // Check if user exists in neon_auth.users_sync (synced by Neon Auth)
    const existsInNeonAuth = await checkUserInNeonAuth(normalizedEmail, prisma)

    if (!existsInNeonAuth) {
      return NextResponse.redirect(new URL('/?error=user-not-synced', request.url))
    }

    // Find or create user in our User table
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        assignedAreas: {
          include: {
            area: {
              select: {
                id: true,
                code: true,
                name: true
              }
            }
          }
        }
      }
    })

    // If user doesn't exist in our system, check neon_auth.users_sync and create
    if (!user) {
      // Get user data from neon_auth.users_sync
      const neonUser = await prisma.$queryRaw`
        SELECT * FROM neon_auth.users_sync 
        WHERE email = ${normalizedEmail}
        LIMIT 1
      ` as any[]

      if (neonUser && neonUser.length > 0) {
        const neonData = neonUser[0]
        
        // Create user in our User table
        // Note: Role and schoolId need to be determined based on business logic
        user = await prisma.user.create({
          data: {
            name: neonData.name || neonData.email?.split('@')[0] || 'Usuário',
            email: normalizedEmail,
            password: '', // No password needed - uses Neon Auth
            role: 'viewer', // Default role - should be updated based on business rules
            schoolId: null, // Should be determined based on email domain or other logic
            isFirstLogin: true,
            isActive: true,
            areas: []
          },
          include: {
            school: {
              select: {
                id: true,
                name: true,
                status: true
              }
            },
            assignedAreas: {
              include: {
                area: {
                  select: {
                    id: true,
                    code: true,
                    name: true
                  }
                }
              }
            }
          }
        })
      } else {
        return NextResponse.redirect(new URL('/?error=user-not-found', request.url))
      }
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.redirect(new URL('/?error=user-inactive', request.url))
    }

    // Check if school is active (if user belongs to a school)
    if (user.schoolId && user.school?.status !== 'active') {
      return NextResponse.redirect(new URL('/?error=school-inactive', request.url))
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
        name: user.name
      },
      config.jwt.secret,
      { expiresIn: '7d' }
    )

    // Redirect to dashboard with token
    const redirectUrl = new URL(user.role === 'platform_admin' ? '/dashboard/platform' : '/dashboard', request.url)
    redirectUrl.searchParams.set('token', token)

    const response = NextResponse.redirect(redirectUrl)
    
    // Set token in cookie as well
    response.cookies.set('robotics-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    return response

  } catch (error) {
    console.error('Neon Auth callback error:', error)
    return NextResponse.redirect(new URL('/?error=callback-error', request.url))
  }
}

