import { NextRequest, NextResponse } from 'next/server'

const SOLDOUT_API_BASE = 'https://api.soldoutafrica.com/api/v1'
const SOLDOUT_API_USERNAME = process.env.SOLDOUT_API_USERNAME
const SOLDOUT_API_PASSWORD = process.env.SOLDOUT_API_PASSWORD

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = searchParams.get('page') || '0'
    const size = searchParams.get('size') || '300'
    const companyId = searchParams.get('companyId') // Get company ID from query params

    // Get auth token from request headers
    const authHeader = request.headers.get('Authorization')

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Add basic auth if credentials are available
    if (SOLDOUT_API_USERNAME && SOLDOUT_API_PASSWORD) {
      const credentials = Buffer.from(`${SOLDOUT_API_USERNAME}:${SOLDOUT_API_PASSWORD}`).toString('base64')
      headers['Authorization'] = `Basic ${credentials}`
    } else if (authHeader) {
      headers['Authorization'] = authHeader
    }

    const response = await fetch(
      `${SOLDOUT_API_BASE}/admin/events/get/all?page=${page}&size=${size}`,
      {
        method: 'GET',
        headers,
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || 'Failed to fetch all events', status: false },
        { status: response.status }
      )
    }

    // SECURITY: Filter events to only return those belonging to the requesting company
    if (companyId && data.data && data.data.data) {
      const companyIdNum = parseInt(companyId, 10)
      const filteredEvents = data.data.data.filter(
        (event: any) => event.companyId === companyIdNum
      )

      // Return filtered data with updated pagination
      return NextResponse.json({
        data: {
          data: filteredEvents,
          page: data.data.page,
          size: data.data.size,
          totalElements: filteredEvents.length,
          totalPages: Math.ceil(filteredEvents.length / parseInt(size, 10)),
        },
        message: 'Events fetched successfully',
        status: true,
      })
    }

    // If no companyId provided, return all data (for backward compatibility)
    // This should only happen in development/testing
    return NextResponse.json(data)
  } catch (error) {
    console.error('All events fetch error:', error)
    return NextResponse.json(
      { message: 'Internal server error', status: false },
      { status: 500 }
    )
  }
}

