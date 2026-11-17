import { NextRequest, NextResponse } from 'next/server'
import { proxyToSoldOut } from '@/lib/soldout-proxy'
import { scannerAccess } from '@/lib/scanner-access'

/** The owner's events a scanner can be attached to: not closed and not over. */
export async function GET(request: NextRequest) {
  const access = await scannerAccess(request)
  if (access instanceof NextResponse) return access
  return proxyToSoldOut(request, `/gate/admin/events?companyId=${access.companyId}`)
}
