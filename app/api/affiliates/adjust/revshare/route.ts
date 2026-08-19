import { NextRequest, NextResponse } from 'next/server'
import { proxyToSoldOut, requireParams } from '@/lib/soldout-proxy'

// GET /api/affiliates/adjust/revshare?affiliateId=&revShare=&isActive=
// Sets the commission value AND the active flag in one call, so isActive must
// always be sent deliberately — omitting it would deactivate the affiliate.
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const invalid = requireParams(searchParams, ['revShare', 'isActive'])
  if (invalid) return invalid

  const affiliateId = searchParams.get('affiliateId')
  const affiliateCode = searchParams.get('affiliateCode')

  if (!affiliateId && !affiliateCode) {
    return NextResponse.json(
      { status: false, message: 'Either affiliateId or affiliateCode is required' },
      { status: 400 }
    )
  }

  const query = new URLSearchParams({
    revShare: searchParams.get('revShare')!,
    isActive: searchParams.get('isActive')!,
  })

  if (affiliateId) query.set('affiliateId', affiliateId)
  if (affiliateCode) query.set('affiliateCode', affiliateCode)

  return proxyToSoldOut(request, `/affiliates/adjust/revshare?${query}`)
}
