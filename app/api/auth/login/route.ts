import { NextRequest, NextResponse } from 'next/server'
import { buildLoginRedirect } from '@/lib/auth/oidc'
import { cookieOptions, LOGIN_COOKIE, seal } from '@/lib/auth/session'
import { safeReturnTo } from '@/lib/auth/return-to'
import { authEnv } from '@/lib/auth/env'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/auth/login?returnTo=/dashboard[&login_hint=]
 *
 * Starts the OIDC authorization code flow with PKCE. Keycloak itself asks for
 * the email or phone number and sends the one-time code; this app never sees
 * it. The PKCE verifier, state and nonce wait in a short-lived encrypted
 * cookie scoped to /api/auth until the callback.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const returnTo = safeReturnTo(params.get('returnTo'))
  const loginHint = params.get('login_hint')?.trim().slice(0, 254) || null

  try {
    const { url, checks } = await buildLoginRedirect(returnTo, loginHint)
    const response = NextResponse.redirect(url)
    response.cookies.set(LOGIN_COOKIE, await seal(checks, 'login'), {
      ...cookieOptions(10 * 60),
      path: '/api/auth',
    })
    return response
  } catch (error) {
    console.error('[auth] could not start sign-in:', error)
    return NextResponse.redirect(new URL('/?error=signin_unavailable', authEnv.appUrl))
  }
}
