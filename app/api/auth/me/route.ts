import { NextRequest, NextResponse } from 'next/server'
import { getAuth, unauthorized } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/auth/me: the signed-in organizer, from the session (token claims
 * plus the profile read from core at sign-in). Replaces the localStorage
 * `user_session` the pages used to read. Never returns the tokens.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuth(request)
  if (!auth) return unauthorized()
  return NextResponse.json(
    { status: true, user: auth.user, expiresAt: auth.session.expiresAt },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
