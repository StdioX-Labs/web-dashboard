import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { soldoutFetch } from '@/lib/soldout-proxy'

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const searchParams = request.nextUrl.searchParams
    const ticketId = searchParams.get('ticketId')

    if (!ticketId) {
      return NextResponse.json(
        {
          status: false,
          message: 'Ticket ID is required'
        },
        { status: 400 }
      )
    }

    const body = await request.json()
    console.log('=== Ticket Update Request ===')
    console.log('Ticket ID:', ticketId)
    console.log('Request body:', JSON.stringify(body, null, 2))

    const apiPath = `/ticket/update?ticketId=${encodeURIComponent(ticketId)}`
    console.log('Making request to:', apiPath)

    const response = await soldoutFetch(auth.accessToken, apiPath, {
      method: 'POST',
      body,
    })

    console.log('=== API Response ===')
    console.log('Status:', response.status, response.statusText)
    console.log('Headers:', Object.fromEntries(response.headers.entries()))

    const contentType = response.headers.get('content-type')
    const text = await response.text()

    console.log('Response body:', text)

    if (!contentType || !contentType.includes('application/json')) {
      console.error('Non-JSON response received')
      return NextResponse.json(
        {
          status: false,
          message: `API returned non-JSON response (${response.status}): ${response.statusText}`,
          details: text,
        },
        { status: response.status || 500 }
      )
    }

    let data
    try {
      data = JSON.parse(text)
      console.log('Parsed response data:', JSON.stringify(data, null, 2))
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError)
      return NextResponse.json(
        {
          status: false,
          message: 'Failed to parse API response',
          details: text,
        },
        { status: 500 }
      )
    }

    // Return the response even if not ok, so the client can see the error message
    // Upstream reports failures as `{ status: false, error: "..." }` while the
    // api-client and its callers read `message`, so without mirroring it the
    // real reason is dropped and the toast falls back to a generic failure.
    // Same fix as `/api/company/create` and `lib/soldout-proxy.ts`.
    if (!response.ok || data?.status === false) {
      console.error('API returned error status:', response.status)
      console.error('Error details:', data)
      const message = data?.error || data?.message || `Request failed (${response.status})`

      return NextResponse.json(
        {
          ...data,
          status: false,
          message,
          _httpStatus: response.status,
          _statusText: response.statusText
        },
        { status: response.status }
      )
    }

    console.log('=== Request successful ===')
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating ticket:', error)
    return NextResponse.json(
      {
        status: false,
        message: error instanceof Error ? error.message : 'Failed to update ticket',
        error: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    )
  }
}

