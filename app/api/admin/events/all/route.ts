import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { soldoutFetch } from '@/lib/soldout-proxy'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const searchParams = request.nextUrl.searchParams
    const page = searchParams.get('page') || '0'
    const size = searchParams.get('size') || '300'
    // The signed-in user's company, never one named by the browser.
    const companyId = auth.user.company_id ? String(auth.user.company_id) : null
    const includeDetails = searchParams.get('includeDetails') === 'true' // Optional flag to fetch detailed event data

    // Add companyId to the API request if provided
    const query = new URLSearchParams({ page, size })
    if (companyId) query.set('companyId', companyId)

    const response = await soldoutFetch(auth.accessToken, `/admin/events/get/all?${query}`)

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
          const detailResponse = await soldoutFetch(auth.accessToken, `/event/get?eventId=${event.eventId}`)

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

