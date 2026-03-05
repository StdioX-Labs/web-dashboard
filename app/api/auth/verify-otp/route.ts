import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'
import { verifyPendingLogin } from '@/lib/pending-login-store'


// Configure route segment
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * OTP Verification API Route with IP-based Rate Limiting
 *
 * Security Features:
 * - IP-based rate limiting (works across tabs and browsers)
 * - Validates OTP against backend service
 * - Request logging for security auditing
 *
 * Rate Limiting:
 * - Configurable via environment variables
 * - Default: 5 attempts per 5 minutes
 * - Block duration: 15 minutes after exceeding limit
 */
export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIp = getClientIp(request)
    console.log('Verify OTP proxy - Client IP:', clientIp)

    // Check rate limit (use stricter limits for OTP verification)
    const rateLimitConfig = {
      maxRequests: parseInt(process.env.OTP_VERIFY_RATE_LIMIT_MAX_REQUESTS || '5', 10),
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '300000', 10), // 5 minutes default
      blockDurationMs: parseInt(process.env.RATE_LIMIT_BLOCK_DURATION_MS || '900000', 10) // 15 minutes default
    }

    const rateLimitResult = checkRateLimit(`${clientIp}:verify`, rateLimitConfig)

    // If rate limit exceeded, return 429 response
    if (!rateLimitResult.allowed) {
      console.warn(`Verify OTP proxy - Rate limit exceeded for IP: ${clientIp}`)
      return NextResponse.json(
        {
          status: false,
          message: 'Too many verification attempts. Please request a new code.',
          retryAfter: rateLimitResult.retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '900',
            'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
          }
        }
      )
    }

    const body = await request.json()
    const { loginToken, otp } = body

    console.log('Verify OTP proxy - Received request:', { ip: clientIp, remaining: rateLimitResult.remaining })

    if (!loginToken || !otp) {
      return NextResponse.json(
        {
          status: false,
          message: 'Missing required fields: loginToken and otp'
        },
        { status: 400 }
      )
    }

    // Validate OTP format
    if (!/^\d{4}$/.test(otp)) {
      return NextResponse.json(
        {
          status: false,
          message: 'Invalid OTP format. Must be 4 digits.'
        },
        { status: 400 }
      )
    }

    // Verify OTP against server-side stored data
    const result = verifyPendingLogin(loginToken, otp)

    // Add rate limit headers to response
    const responseHeaders = {
      'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
    }

    if (!result.success) {
      console.log('Verify OTP proxy - Verification failed:', result.error)
      return NextResponse.json(
        {
          status: false,
          message: result.error || 'Invalid verification code',
        },
        { status: 401, headers: responseHeaders }
      )
    }

    console.log('Verify OTP proxy - Verification successful for user:', result.user?.email)

    return NextResponse.json(
      {
        status: true,
        message: 'OTP verified successfully',
        user: result.user,
      },
      { status: 200, headers: responseHeaders }
    )
  } catch (error) {
    console.error('Verify OTP Proxy Error - Full details:', error)
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error)
    console.error('Error message:', error instanceof Error ? error.message : String(error))

    return NextResponse.json(
      {
        status: false,
        message: 'Failed to verify OTP',
      },
      { status: 500 }
    )
  }
}

