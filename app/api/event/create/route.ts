import { NextRequest, NextResponse } from 'next/server'
import { proxyToSoldOut } from '@/lib/soldout-proxy'
import { requireAuth } from '@/lib/auth/server'

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  // The creator and company come from the session, never from the browser.
  const body = {
    ...(await request.json()),
    users: { id: auth.user.user_id },
    company: { id: auth.user.company_id },
  }
  return proxyToSoldOut(request, '/event/create', { method: 'POST', body, accessToken: auth.accessToken })
}
