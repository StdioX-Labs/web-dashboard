import { NextRequest, NextResponse } from 'next/server'
import { normalizeEmail } from '@/lib/email'
import { proxyToSoldOut } from '@/lib/soldout-proxy'
import { serviceAccessToken } from '@/lib/auth/oidc'

export async function POST(request: NextRequest) {
  const body = await request.json()
  if (!body?.company || !body?.user) {
    return NextResponse.json(
      { status: false, message: "Fill in your details and your company's" },
      { status: 400 }
    )
  }

  // Sign-in later looks the address up in this form, so the account must be
  // created with it.
  if (typeof body.user.emailAddress === 'string') {
    body.user.emailAddress = normalizeEmail(body.user.emailAddress)
  }
  if (typeof body.company.emailAddress === 'string') {
    body.company.emailAddress = normalizeEmail(body.company.emailAddress)
  }

  // Public: nobody is signed in yet, so core is called with the dashboard's
  // own service-account token (client_credentials), not a user's.
  let accessToken: string
  try {
    accessToken = await serviceAccessToken()
  } catch (error) {
    console.error('Signup - service token unavailable:', error)
    return NextResponse.json(
      { status: false, message: "Signup isn't available right now. Please try again in a few minutes." },
      { status: 503 }
    )
  }

  return proxyToSoldOut(request, '/company/signup', { method: 'POST', body, accessToken })
}
