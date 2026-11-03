import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { soldoutFetch } from '@/lib/soldout-proxy'

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const body = await request.json()

    // Validate required fields
    if (!body.id || !body.idType) {
      return NextResponse.json(
        { message: 'Missing required fields: id and idType', status: false },
        { status: 400 }
      )
    }

    // Company- and user-wide reports are always the signed-in user's own.
    if (body.idType === 'company') body.id = auth.user.company_id
    if (body.idType === 'user') body.id = auth.user.user_id

    const response = await soldoutFetch(auth.accessToken, '/gl/transactions/fetch/detailed', {
      method: 'POST',
      body,
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || 'Failed to fetch transactions', status: false },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Transactions fetch error:', error)
    return NextResponse.json(
      { message: 'Internal server error', status: false },
      { status: 500 }
    )
  }
}

