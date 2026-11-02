import { NextRequest, NextResponse } from 'next/server'
import { normalizeEmail } from '@/lib/email'
import { proxyToSoldOut } from '@/lib/soldout-proxy'

export async function POST(request: NextRequest) {
  const body = await request.json()
  if (!body?.company || !body?.user) {
    return NextResponse.json(
      { status: false, message: "Fill in your details and your company's" },
      { status: 400 }
    )
  }

  // Same backstop as the login proxy: sign-in later looks the address up in
  // this form, so the account must be created with it.
  if (typeof body.user.emailAddress === 'string') {
    body.user.emailAddress = normalizeEmail(body.user.emailAddress)
  }
  if (typeof body.company.emailAddress === 'string') {
    body.company.emailAddress = normalizeEmail(body.company.emailAddress)
  }

  return proxyToSoldOut(request, '/company/signup', { method: 'POST', body })
}
