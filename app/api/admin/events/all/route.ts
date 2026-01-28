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
    const includeDetails = searchParams.get('includeDetails') === 'true' // Optional flag to fetch detailed event data

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

    // Add companyId to the API request if provided
    const apiUrl = companyId
      ? `${SOLDOUT_API_BASE}/admin/events/get/all?page=${page}&size=${size}&companyId=${companyId}`
      : `${SOLDOUT_API_BASE}/admin/events/get/all?page=${page}&size=${size}`

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || 'Failed to fetch all events', status: false },
        { status: response.status }
      )
    }

    // If includeDetails flag is true, fetch detailed data for each event
    if (includeDetails && data.data?.data && Array.isArray(data.data.data)) {
      console.log(`Fetching detailed data for ${data.data.data.length} events...`)

      // Fetch detailed event data for each event in parallel
      const detailedEventsPromises = data.data.data.map(async (event: { eventId: number; [key: string]: unknown }) => {
        try {
          const detailResponse = await fetch(
            `${SOLDOUT_API_BASE}/event/get?eventId=${event.eventId}`,
            { method: 'GET', headers }
          )

          if (detailResponse.ok) {
            const detailData = await detailResponse.json()
            if (detailData.status && detailData.event) {
              // Merge detailed event data with summary data
              return {
                ...event,
                detailedEvent: detailData.event, // Full event with complete ticket data
              }
            }
          }
        } catch (err) {
          console.error(`Failed to fetch details for event ${event.eventId}:`, err)
        }
        // Return original event if detail fetch fails
        return event
      })

      const eventsWithDetails = await Promise.all(detailedEventsPromises)

      // Replace the events array with enriched data
      data.data.data = eventsWithDetails

      console.log(`Successfully enriched ${eventsWithDetails.length} events with detailed data`)
    }

    // Return the data (enriched if includeDetails was true)
    return NextResponse.json(data)
  } catch (error) {
    console.error('All events fetch error:', error)
    return NextResponse.json(
      { message: 'Internal server error', status: false },
      { status: 500 }
    )
  }
}

