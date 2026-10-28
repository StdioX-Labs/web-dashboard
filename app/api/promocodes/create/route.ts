import { NextRequest, NextResponse } from 'next/server'
import { proxyToSoldOut } from '@/lib/soldout-proxy'

// POST /api/promocodes/create
// Either a single named code (promoCode) or a batch of generated ones
// (numberOfPromoCodes, 1-250). validFrom/validUntil are Nairobi wall-clock
// times without an offset — the API stores them as LocalDateTime.
export async function POST(request: NextRequest) {
  const body = await request.json()

  const missing = ['userId', 'companyId', 'scope', 'discountType', 'discountValue', 'validFrom', 'validUntil', 'maxUses'].filter(
    (field) => body[field] === undefined || body[field] === null || body[field] === ''
  )

  if (missing.length > 0) {
    return NextResponse.json(
      { status: false, message: `Missing required field(s): ${missing.join(', ')}` },
      { status: 400 }
    )
  }

  if (!body.promoCode && !body.numberOfPromoCodes) {
    return NextResponse.json(
      { status: false, message: 'Provide a promo code or a number of codes to generate' },
      { status: 400 }
    )
  }

  return proxyToSoldOut(request, '/promocodes/create', {
    method: 'POST',
    body,
  })
}
