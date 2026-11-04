import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { proxyToSoldOut } from '@/lib/soldout-proxy'
import { canRequestWithdrawal, isWithdrawalMethod } from '@/lib/withdrawal'

export const dynamic = 'force-dynamic'

const PASSED_THROUGH = [
  'idempotentKey',
  'method',
  'tillNumber',
  'paybillNumber',
  'accountNumber',
  'mobileNumber',
  'recipientName',
  'stepUpChallengeId',
  'stepUpCode',
] as const

/**
 * POST /api/wallet/withdraw → core POST /transaction/withdraw/initialize
 *
 * The first call answers 428 { stepUpRequired, stepUpChallengeId, expiresIn }
 * and core texts a code to the organiser. The same body plus
 * stepUpChallengeId and stepUpCode then requests the withdrawal. Core's status
 * codes (428 / 403 / 400) are passed through with `error` mirrored to `message`.
 * companyId is always the session's.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  if (!canRequestWithdrawal(auth.user)) {
    return NextResponse.json(
      { status: false, message: 'Only the company owner or an organizer can withdraw funds.' },
      { status: 403 }
    )
  }
  if (!auth.user.company_id) {
    return NextResponse.json({ status: false, message: 'Your account is not linked to a company.' }, { status: 403 })
  }

  let input: Record<string, unknown>
  try {
    input = await request.json()
  } catch {
    return NextResponse.json({ status: false, message: 'Invalid request' }, { status: 400 })
  }

  const amount = Number(input.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ status: false, message: 'Enter an amount to withdraw' }, { status: 400 })
  }
  if (!isWithdrawalMethod(input.method)) {
    return NextResponse.json({ status: false, message: 'Choose how you want to be paid' }, { status: 400 })
  }
  if (typeof input.idempotentKey !== 'string' || !input.idempotentKey) {
    return NextResponse.json({ status: false, message: 'Missing request key' }, { status: 400 })
  }

  const body: Record<string, unknown> = { companyId: auth.user.company_id, amount }
  for (const field of PASSED_THROUGH) {
    if (typeof input[field] === 'string' && input[field] !== '') body[field] = input[field]
  }

  return proxyToSoldOut(request, '/transaction/withdraw/initialize', {
    method: 'POST',
    body,
    accessToken: auth.accessToken,
  })
}
