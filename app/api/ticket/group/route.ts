import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = 'https://api.soldoutafrica.com/api/v1'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const ticketGroup = searchParams.get('ticketGroup')

    if (!ticketGroup) {
      return NextResponse.json(
        { error: 'Ticket group code is required', status: false },
        { status: 400 }
      )
    }

    // Get auth token from request headers
    const authHeader = request.headers.get('authorization')

    const response = await fetch(`${BASE_URL}/event/ticket/group/get?ticketGroup=${ticketGroup}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
    })

    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Group ticket fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch group tickets', status: false },
      { status: 500 }
    )
  }
}

