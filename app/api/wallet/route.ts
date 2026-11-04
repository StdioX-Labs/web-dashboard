import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { soldoutFetch } from '@/lib/soldout-proxy'
import { canRequestWithdrawal, toWithdrawalRecords } from '@/lib/withdrawal'

export const dynamic = 'force-dynamic'

/**
 * GET /api/wallet
 * The company's treasury balance and its withdrawals, from core's
 * /wallet/get. The company is the signed-in user's, never one from the browser.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const companyId = auth.user.company_id
  if (!companyId) {
    return NextResponse.json({ status: false, message: 'Your account is not linked to a company.' }, { status: 403 })
  }

  try {
    const response = await soldoutFetch(auth.accessToken, `/wallet/get?companyId=${companyId}`)
    const data = (await response.json().catch(() => ({}))) as {
      status?: boolean
      error?: string
      message?: string
      wallet?: { balance?: number | string; currency?: string }
      transactions?: Parameters<typeof toWithdrawalRecords>[0]
    }
    if (!response.ok || data.status === false || !data.wallet) {
      const message = data.error || data.message || `Couldn't load your balance (${response.status})`
      return NextResponse.json({ status: false, message }, { status: response.ok ? 400 : response.status })
    }

    const currency = data.wallet.currency || auth.user.currency || 'KES'
    return NextResponse.json({
      status: true,
      wallet: { balance: Number(data.wallet.balance ?? 0), currency },
      // core doesn't expose the wallet's canWithdraw flag to organisers; this is the role check only.
      canRequest: canRequestWithdrawal(auth.user),
      withdrawals: toWithdrawalRecords(data.transactions, currency),
    })
  } catch (error) {
    console.error('Wallet fetch failed:', error)
    return NextResponse.json(
      { status: false, message: "Couldn't reach SoldOut right now. Please try again." },
      { status: 502 }
    )
  }
}
