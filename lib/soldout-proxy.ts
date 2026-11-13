import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = 'https://api.soldoutafrica.com/api/v1'
const SOLDOUT_API_USERNAME = process.env.SOLDOUT_API_USERNAME
const SOLDOUT_API_PASSWORD = process.env.SOLDOUT_API_PASSWORD

/**
 * Forwards a request to the SoldOut API with the service Basic credentials
 * attached server-side, so they never reach the browser.
 *
 * The affiliate and promotion endpoints report failures as `{ status: false, error: "..." }`
 * with a 400, while the api-client surfaces `message` — so `error` is mirrored
 * onto `message` to keep client-side toasts useful.
 */
export async function proxyToSoldOut(
  request: NextRequest,
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<NextResponse> {
  const method = init.method || 'GET'

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (SOLDOUT_API_USERNAME && SOLDOUT_API_PASSWORD) {
    const credentials = Buffer.from(`${SOLDOUT_API_USERNAME}:${SOLDOUT_API_PASSWORD}`).toString('base64')
    headers['Authorization'] = `Basic ${credentials}`
  } else {
    const authHeader = request.headers.get('Authorization')
    if (authHeader) {
      headers['Authorization'] = authHeader
    }
  }

  try {
    console.log('SoldOut proxy:', method, path)

    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      signal: AbortSignal.timeout(30000),
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    })

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
 * Calls the SoldOut API with the service login and hands back what it said,
 * for routes that need to look at an answer (who owns what) before relaying
 * anything. Never forwards the browser's own Authorization header.
 */
export async function soldOutJson(
  path: string
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; status: number; message: string }> {
  if (!SOLDOUT_API_USERNAME || !SOLDOUT_API_PASSWORD) {
    console.error('SoldOut service login is not configured')
    return { ok: false, status: 500, message: 'The dashboard is missing its API configuration.' }
  }
  try {
    const credentials = Buffer.from(`${SOLDOUT_API_USERNAME}:${SOLDOUT_API_PASSWORD}`).toString('base64')
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Basic ${credentials}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(30000),
      cache: 'no-store',
    })
    const data = (await response.json().catch(() => null)) as Record<string, unknown> | null
    if (!response.ok || !data || data.status === false) {
      const message = (data?.error || data?.message || `Request failed (${response.status})`) as string
      return { ok: false, status: response.ok ? 400 : response.status, message }
    }
    return { ok: true, data }
  } catch (error) {
    console.error('SoldOut lookup failed:', path, error)
    return { ok: false, status: 502, message: "Couldn't reach SoldOut right now. Please try again." }
  }
}

/** Fetches an image (a gate scan photo) with the service login, or null when there is none. */
export async function soldOutImage(path: string): Promise<ArrayBuffer | null> {
  if (!SOLDOUT_API_USERNAME || !SOLDOUT_API_PASSWORD) return null
  try {
    const credentials = Buffer.from(`${SOLDOUT_API_USERNAME}:${SOLDOUT_API_PASSWORD}`).toString('base64')
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Basic ${credentials}`, Accept: 'image/jpeg' },
      signal: AbortSignal.timeout(30000),
      cache: 'no-store',
    })
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) return null
    return await response.arrayBuffer()
  } catch (error) {
    console.error('SoldOut image failed:', path, error)
    return null
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
