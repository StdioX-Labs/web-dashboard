import { NextRequest, NextResponse } from 'next/server'
import { authEnv } from '@/lib/auth/env'
import { buildLogoutUrl } from '@/lib/auth/oidc'
import { clearSession, readSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Clears the session cookie and ends the Keycloak SSO session too
 * (RP-initiated logout), so "Sign in" afterwards really asks again.
 */
async function logout(request: NextRequest) {
  const session = await readSession(request.cookies)
  let target: URL
  try {
    target = buildLogoutUrl(session?.idToken)
  } catch (error) {
    console.error('[auth] logout URL unavailable:', error)
    target = new URL('/', authEnv.appUrl)
  }
  // 303 so a POST from a form becomes a GET at Keycloak.
  const response = NextResponse.redirect(target, 303)
  clearSession(response)
  return response
}

export const GET = logout
export const POST = logout
