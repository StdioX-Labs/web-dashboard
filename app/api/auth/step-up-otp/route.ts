import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { normalizeLoginId } from '@/lib/email'
import { checkAttempt, getBackoffConfig, getClientIp, tooManyAttemptsResponse } from '@/lib/rate-limiter'
import { soldoutFetch } from '@/lib/soldout-proxy'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/auth/step-up-otp
 *
 * Suspending or reactivating an event or ticket type asks for a code sent to
 * the signed-in user's own phone; core checks it on /event/status/toggle and
 * /ticket/status/toggle. This asks core to send that code. The phone number
 * comes from the session, and the code core echoes back is never forwarded.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const phone = auth.user.phoneNumber
  if (!phone) {
    return NextResponse.json({ status: false, message: 'Your account has no phone number to send a code to.' }, { status: 400 })
  }

  const attempt = checkAttempt(`step-up:${auth.user.user_id}:${getClientIp(request)}`, getBackoffConfig())
  if (!attempt.allowed) return tooManyAttemptsResponse(attempt)

  try {
    const response = await soldoutFetch(auth.accessToken, '/user/otp/login', {
      method: 'POST',
      body: { id: normalizeLoginId(phone, 'phone'), method: 'phone' },
    })
    const data = (await response.json().catch(() => ({}))) as { status?: boolean; message?: string }
    if (!response.ok || !data.status) {
      return NextResponse.json(
        { status: false, message: data.message || 'Could not send the code. Please try again.' },
        { status: response.ok ? 400 : response.status }
      )
    }
    return NextResponse.json({ status: true, message: data.message || 'Code sent' })
  } catch (error) {
    console.error('[auth] step-up code failed:', error)
    return NextResponse.json({ status: false, message: "Couldn't reach SoldOut right now. Please try again." }, { status: 502 })
  }
}
