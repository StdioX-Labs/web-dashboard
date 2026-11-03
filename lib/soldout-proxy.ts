import { NextRequest, NextResponse } from 'next/server'
import { soldoutApiBaseUrl } from '@/lib/auth/env'
import { getAuth, unauthorized } from '@/lib/auth/server'

/**
 * Calls the SoldOut API as the signed-in user: their Keycloak access token is
 * forwarded as `Authorization: Bearer`. There is no shared service credential.
 * `path` is relative to SOLDOUT_API_BASE_URL (which already ends in /api/v1).
 */
export function soldoutFetch(
  accessToken: string,
  path: string,
  init: { method?: string; body?: unknown; timeoutMs?: number } = {}
): Promise<Response> {
  return fetch(`${soldoutApiBaseUrl()}${path}`, {
    method: init.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    signal: AbortSignal.timeout(init.timeoutMs ?? 30000),
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  })
}

/**
 * Forwards a request to the SoldOut API with the signed-in user's access
 * token attached server-side, so the token never reaches the browser.
 *
 * The affiliate and promotion endpoints report failures as `{ status: false, error: "..." }`
 * with a 400, while the api-client surfaces `message` — so `error` is mirrored
 * onto `message` to keep client-side toasts useful.
 *
 * Pass `accessToken` to call with a token other than the session's (the
 * public signup route uses the dashboard's service-account token).
 */
export async function proxyToSoldOut(
  request: NextRequest,
  path: string,
  init: { method?: string; body?: unknown; accessToken?: string } = {}
): Promise<NextResponse> {
  const method = init.method || 'GET'

  let accessToken = init.accessToken
  if (!accessToken) {
    const auth = await getAuth(request)
    if (!auth) return unauthorized()
    accessToken = auth.accessToken
  }

  try {
    console.log('SoldOut proxy:', method, path)

    const response = await soldoutFetch(accessToken, path, { method, body: init.body })

    const text = await response.text()

    let data: Record<string, unknown>
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      console.error('SoldOut proxy - non-JSON response:', text)
      return NextResponse.json(
        {
          status: false,
          // A gateway's HTML error page, usually: the API is down or restarting.
          message: response.status >= 500
            ? 'SoldOut is temporarily unavailable. Please try again in a few minutes.'
            : `Unexpected response from the API (${response.status})`,
          details: text,
        },
        { status: response.status || 500 }
      )
    }

    if (!response.ok || data.status === false) {
      const message = (data.error || data.message || `Request failed (${response.status})`) as string
      console.warn('SoldOut proxy - error response:', response.status, message)
      return NextResponse.json(
        { ...data, status: false, message },
        { status: response.ok ? 400 : response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    // Never the raw fetch error ("fetch failed", "ECONNREFUSED"): it means
    // nothing to an organiser, and the cause is the same either way.
    console.error('SoldOut proxy - request failed:', error)
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
    return NextResponse.json(
      {
        status: false,
        message: timedOut
          ? 'SoldOut took too long to respond. Please try again.'
          : "Couldn't reach SoldOut right now. Please check your connection and try again.",
      },
      { status: timedOut ? 504 : 502 }
    )
  }
}

/**
 * Returns a 400 response naming the query params that were missing, or null
 * when they are all present.
 */
export function requireParams(
  searchParams: URLSearchParams,
  names: string[]
): NextResponse | null {
  const missing = names.filter((name) => !searchParams.get(name))

  if (missing.length === 0) {
    return null
  }

  return NextResponse.json(
    { status: false, message: `Missing required parameter(s): ${missing.join(', ')}` },
    { status: 400 }
  )
}
