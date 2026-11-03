import { NextRequest, NextResponse } from 'next/server'
import { isAccessTokenValid, readSession, type AuthSession } from './session'
import type { UserSession } from './user'

export interface Auth {
  session: AuthSession
  accessToken: string
  user: UserSession
}

/**
 * The signed-in user for this request, from the encrypted session cookie.
 * proxy.ts has already refreshed the tokens when they were about to expire,
 * so an expired access token here means the refresh failed.
 */
export async function getAuth(request: NextRequest): Promise<Auth | null> {
  const session = await readSession(request.cookies)
  if (!session || !isAccessTokenValid(session)) return null
  return { session, accessToken: session.accessToken, user: session.user }
}

/** `authRequired` tells the browser client to send the user back through sign-in. */
export function unauthorized(message = 'Your session has expired. Please sign in again.') {
  return NextResponse.json({ status: false, message, authRequired: true }, { status: 401 })
}

export async function requireAuth(request: NextRequest): Promise<Auth | NextResponse> {
  return (await getAuth(request)) ?? unauthorized()
}

/**
 * Overwrites acting-user ids in a query string with the session's. The API
 * still takes userId / companyId / requesterUserId as parameters; they are
 * never taken from the browser any more.
 */
export function actorQuery(
  params: URLSearchParams,
  auth: Auth,
  fields: { userId?: string[]; companyId?: string[] } = { userId: ['userId'], companyId: ['companyId'] }
): URLSearchParams {
  const next = new URLSearchParams(params)
  for (const name of fields.userId ?? []) next.set(name, String(auth.user.user_id))
  for (const name of fields.companyId ?? []) next.set(name, String(auth.user.company_id))
  return next
}
