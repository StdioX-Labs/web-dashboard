import { NextRequest, NextResponse } from 'next/server'
import {
  clearSession,
  needsRefresh,
  readSession,
  refreshSession,
  SESSION_COOKIE,
  sessionCookies,
  writeSession,
  type AuthSession,
} from '@/lib/auth/session'

// Next 16's proxy (formerly middleware), on the Node.js runtime. Every page
// and /api route needs a signed-in session except the ones listed here. It
// also refreshes the access token shortly before it expires, so route
// handlers always see a usable token, and forces a new sign-in when Keycloak
// refuses the refresh.

/** Pages anyone may open: sign-in, signup and the organizer lead form. */
const PUBLIC_PAGES = new Set(['/', '/signup', '/get-started'])

/** API routes that work without a session. */
const PUBLIC_API = new Set([
  '/api/auth/login',
  '/api/auth/callback',
  '/api/auth/logout',
  '/api/health',
  '/api/organizer-lead', // lead capture on /get-started
  '/api/company/signup', // creates the company and its owner on /signup
])

/** The sign-in handshake manages its own cookies; leave its requests alone. */
const AUTH_FLOW = new Set(['/api/auth/login', '/api/auth/callback', '/api/auth/logout'])

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** Public origin for redirects: inside the cluster request.url is the pod's address. */
function appOrigin(request: NextRequest): string {
  const appUrl = process.env.APP_URL
  return appUrl ? new URL(appUrl).origin : request.nextUrl.origin
}

function authRequired(request: NextRequest, isApi: boolean): NextResponse {
  const response = isApi
    ? NextResponse.json(
        { status: false, message: 'Your session has expired. Please sign in again.', authRequired: true },
        { status: 401 }
      )
    : NextResponse.redirect(
        new URL(
          `/api/auth/login?returnTo=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`,
          appOrigin(request)
        )
      )
  if (request.cookies.has(`${SESSION_COOKIE}.0`)) clearSession(response)
  return response
}

/** Passes the request on, carrying a refreshed session to the handler and the browser. */
async function next(request: NextRequest, refreshed: AuthSession | null): Promise<NextResponse> {
  if (!refreshed) return NextResponse.next()

  const chunks = await sessionCookies(refreshed)
  const others = request.cookies.getAll().filter((c) => !c.name.startsWith(`${SESSION_COOKIE}.`))
  const headers = new Headers(request.headers)
  headers.set(
    'cookie',
    [...others.map((c) => `${c.name}=${c.value}`), ...chunks.map(([name, value]) => `${name}=${value}`)].join('; ')
  )
  const response = NextResponse.next({ request: { headers } })
  await writeSession(response, refreshed, chunks)
  return response
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApi = pathname.startsWith('/api/')

  // The session cookie is SameSite=Lax; also refuse cross-site writes outright.
  if (isApi && !SAFE_METHODS.has(request.method)) {
    const origin = request.headers.get('origin')
    if (origin && origin !== appOrigin(request) && origin !== request.nextUrl.origin) {
      return NextResponse.json({ status: false, message: 'Cross-site request refused' }, { status: 403 })
    }
  }

  if (AUTH_FLOW.has(pathname)) return NextResponse.next()

  const isPublic = isApi ? PUBLIC_API.has(pathname) : PUBLIC_PAGES.has(pathname)

  let session = await readSession(request.cookies)
  let refreshed: AuthSession | null = null
  if (session && needsRefresh(session)) {
    refreshed = await refreshSession(session)
    session = refreshed
  }

  if (!session) {
    if (!isPublic) return authRequired(request, isApi)
    const response = NextResponse.next()
    // A session that could not be refreshed is dead; don't keep sending it.
    if (request.cookies.has(`${SESSION_COOKIE}.0`)) clearSession(response)
    return response
  }

  // Signed in already: the sign-in page has nothing to offer.
  if (pathname === '/') {
    const response = NextResponse.redirect(new URL('/dashboard', appOrigin(request)))
    if (refreshed) await writeSession(response, refreshed)
    return response
  }

  return next(request, refreshed)
}

export const config = {
  matcher: [
    // Everything except Next's build output and static files in /public.
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|webmanifest|woff2?|ttf|otf)$).*)',
  ],
}
