import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { soldoutFetch } from '@/lib/soldout-proxy'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const searchParams = request.nextUrl.searchParams
    // The signed-in user's company, never one named by the browser.
    const companyId = auth.user.company_id || searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json(
        { message: 'Company ID is required', status: false },
        { status: 400 }
      )
    }

    const response = await soldoutFetch(auth.accessToken, `/company/summary?companyId=${encodeURIComponent(String(companyId))}`)

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || 'Failed to fetch company summary', status: false },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Company summary error:', error)
    return NextResponse.json(
      { message: 'Internal server error', status: false },
      { status: 500 }
    )
  }
}

