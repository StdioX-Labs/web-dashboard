import { NextRequest } from 'next/server'
import { normalizeEmail } from '@/lib/email'
import { proxyToSoldOut } from '@/lib/soldout-proxy'

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Same guarantee as the login proxy: this route is reachable directly,
  // so the API client's normalisation is a convenience and this is the
  // backstop. Signing up must not be able to create an account whose
  // address differs from the one sign-in will later look up.
  if (typeof body?.emailAddress === 'string') {
    body.emailAddress = normalizeEmail(body.emailAddress)
  }

  // Present when a teammate is added from the dashboard, so the API can check
  // the requester may add users to that company. Signup has no requester.
  const requesterUserId = request.nextUrl.searchParams.get('requesterUserId')
  const path = requesterUserId
    ? `/user/create?requesterUserId=${encodeURIComponent(requesterUserId)}`
    : '/user/create'

  return proxyToSoldOut(request, path, { method: 'POST', body })
}
