import { NextRequest, NextResponse } from 'next/server'
import { authEnv } from '@/lib/auth/env'
import { buildLogoutUrl, exchangeCode, type LoginChecks } from '@/lib/auth/oidc'
import { cookieOptions, LOGIN_COOKIE, tokensToSession, unseal, writeSession } from '@/lib/auth/session'
import { decodeAccessToken, userFromClaims, type UserSession } from '@/lib/auth/user'
import { safeReturnTo } from '@/lib/auth/return-to'
import { soldoutFetch } from '@/lib/soldout-proxy'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface CompanyUser {
  id: number
  fullName?: string
  roles?: string | null
  companyName?: string | null
  kycStatus?: string | null
  active?: boolean
  currency?: string | null
}

/**
 * The token carries who the user is (soa_user_id, company_id, roles, phone,
 * email). Company name, currency, KYC status and whether the account is
 * active still live only in core, so they are read once here, as the user.
 */
async function withCoreProfile(user: UserSession, accessToken: string): Promise<UserSession> {
  if (!user.company_id) return user
  try {
    const response = await soldoutFetch(accessToken, `/company/fetch/users?companyId=${user.company_id}`, { timeoutMs: 10000 })
    if (!response.ok) {
      console.warn('[auth] profile lookup failed:', response.status)
      return user
    }
    const data = (await response.json()) as { users?: CompanyUser[] }
    const me = data.users?.find((u) => u.id === user.user_id)
    if (!me) return user
    return {
      ...user,
      fullName: me.fullName || user.fullName,
      role: me.roles || user.role,
      company_name: me.companyName || user.company_name,
      currency: me.currency || user.currency,
      kycStatus: me.kycStatus || user.kycStatus,
      is_active: me.active !== false,
    }
  } catch (error) {
    console.warn('[auth] profile lookup failed:', error instanceof Error ? error.message : error)
    return user
  }
}

const home = (error: string) => new URL(`/?error=${encodeURIComponent(error)}`, authEnv.appUrl)

function withoutLoginCookie(response: NextResponse) {
  response.cookies.set(LOGIN_COOKIE, '', { ...cookieOptions(0), path: '/api/auth' })
  return response
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams

  // Keycloak sends the user back with ?error= when they cancel or it refuses.
  const oauthError = params.get('error')
  if (oauthError) {
    console.warn('[auth] authorization error:', oauthError, params.get('error_description'))
    return withoutLoginCookie(NextResponse.redirect(home(oauthError === 'access_denied' ? 'access_denied' : 'signin_failed')))
  }

  const checks = await unseal<LoginChecks>(request.cookies.get(LOGIN_COOKIE)?.value, 'login')
  if (!checks) {
    // The 10-minute login cookie expired, or the callback was opened in another browser.
    return NextResponse.redirect(home('signin_expired'))
  }

  try {
    const tokens = await exchangeCode(request.nextUrl.search, checks)
    const idClaims = tokens.claims()
    const claims = decodeAccessToken(tokens.access_token)
    let user = userFromClaims(claims)
    if (!user.email && typeof idClaims?.email === 'string') user.email = idClaims.email

    if (!user.user_id) {
      console.warn('[auth] token has no soa_user_id for', claims.sub)
      return withoutLoginCookie(NextResponse.redirect(buildLogoutUrl(tokens.id_token, '/?error=account_not_linked')))
    }

    user = await withCoreProfile(user, tokens.access_token)

    // A deactivated account never gets a session, even with a valid sign-in.
    if (!user.is_active) {
      console.warn('[auth] rejected sign-in for deactivated user', user.user_id)
      return withoutLoginCookie(NextResponse.redirect(buildLogoutUrl(tokens.id_token, '/?error=deactivated')))
    }

    const session = tokensToSession(tokens, user)
    const response = NextResponse.redirect(new URL(safeReturnTo(checks.returnTo), authEnv.appUrl))
    await writeSession(response, session)
    return withoutLoginCookie(response)
  } catch (error) {
    console.error('[auth] code exchange failed:', error)
    return withoutLoginCookie(NextResponse.redirect(home('signin_failed')))
  }
}
