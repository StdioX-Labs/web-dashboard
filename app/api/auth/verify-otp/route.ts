import { NextRequest, NextResponse } from 'next/server'
import { checkAttempt, getBackoffConfig, getClientIp, resetAttempts, tooManyAttemptsResponse } from '@/lib/rate-limiter'
import { normalizeLoginId } from '@/lib/email'
import { verifyPendingLogin } from '@/lib/pending-login-store'


// Configure route segment
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * OTP Verification API Route with per-login attempt limiting
 *
 * Security Features:
 * - Attempts limited per login token + IP, so one person can't lock out others
 * - Validates OTP against backend service
 * - Request logging for security auditing
 *
 * Rate Limiting (see lib/rate-limiter):
 * - The first 50 requests are never limited, then each waits longer than the last
 * - Guessing is bounded separately: a code is void after 5 wrong tries
 *   (lib/pending-login-store), so a fresh code has to be requested anyway
 */
export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request)
    const body = await request.json()
    const { loginToken, otp } = body

    console.log('Verify OTP proxy - Received request:', { ip: clientIp })

    if (!loginToken || !otp) {
      return NextResponse.json(
        {
          status: false,
          message: 'Missing required fields: loginToken and otp'
        },
        { status: 400 }
      )
    }

    const attemptKey = `verify:${loginToken}:${clientIp}`
    const attempt = checkAttempt(attemptKey, getBackoffConfig())
    if (!attempt.allowed) {
      console.warn(`Verify OTP proxy - Backing off ${clientIp} for ${attempt.retryAfter}s`)
      return tooManyAttemptsResponse(attempt)
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

    if (!result.success) {
      console.log('Verify OTP proxy - Verification failed:', result.error)
      return NextResponse.json(
        {
          status: false,
          message: result.error || 'Invalid verification code',
        },
        { status: 401 }
      )
    }

    // Deactivated accounts must never receive a session, even with a valid OTP.
    // Checked here rather than when the code is requested so account status is
    // only revealed to whoever actually received the code.
    if (result.user && result.user.is_active === false) {
      console.warn('Verify OTP proxy - Rejected login for deactivated user:', result.user.email)
      return NextResponse.json(
        {
          status: false,
          message: 'This account has been deactivated. Please contact your administrator.',
        },
        { status: 403 }
      )
    }

    console.log('Verify OTP proxy - Verification successful for user:', result.user?.email)

    // Signed in: start them afresh, whichever id they asked for the code with
    resetAttempts(attemptKey)
    if (result.user?.email) resetAttempts(`login:${normalizeLoginId(result.user.email, 'email')}:${clientIp}`)
    if (result.user?.phoneNumber) resetAttempts(`login:${normalizeLoginId(result.user.phoneNumber, 'phone')}:${clientIp}`)

    return NextResponse.json(
      {
        status: true,
        message: 'OTP verified successfully',
        user: result.user,
      },
      { status: 200 }
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

