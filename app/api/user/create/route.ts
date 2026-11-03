import { NextRequest, NextResponse } from 'next/server'
import { normalizeEmail } from '@/lib/email'
import { proxyToSoldOut } from '@/lib/soldout-proxy'
import { requireAuth } from '@/lib/auth/server'

// Adds a teammate from the dashboard. Signup goes through /api/company/signup.
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const body = await request.json()

  // Same guarantee as signup: this route is reachable directly, so the API
  // client's normalisation is a convenience and this is the backstop. An
  // account must not be created with an address that differs from the one
  // sign-in will later look up.
  if (typeof body?.emailAddress === 'string') {
    body.emailAddress = normalizeEmail(body.emailAddress)
  }

  // The API checks the requester may add users to that company. The requester
  // is the signed-in user, never an id from the browser.
  const path = `/user/create?requesterUserId=${auth.user.user_id}`

  return proxyToSoldOut(request, path, { method: 'POST', body, accessToken: auth.accessToken })
}
