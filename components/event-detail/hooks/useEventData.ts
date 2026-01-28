import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import { sessionManager } from '@/lib/session-manager'
import { eventCache } from '@/lib/event-cache'
import { EventData } from '../types'

/**
 * Hook to fetch and manage event data from the cached list of all events
 * This is efficient for displaying event summaries but may not have complete ticket details.
 *
 * For prepopulating edit forms with full ticket data, use useEventDetails instead,
 * which calls the /event/get endpoint for complete event information.
 */
export function useEventData(eventId: number) {
  const [eventData, setEventData] = useState<EventData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currency, setCurrency] = useState("KES")

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const user = sessionManager.getUser()
        console.log("=== Event Detail Fetch Start ===")
        console.log("Event ID:", eventId, "Type:", typeof eventId)
        console.log("User:", user)

        if (!user || !user.company_id) {
          console.log("No user or company_id, exiting")
          setIsLoading(false)
          return
        }

        setCurrency(user.currency || "KES")

        // Use getAllEvents API with caching
        const cacheKey = 'all-events-300'
        console.log("Fetching events with cache key:", cacheKey)

        const eventsData = await eventCache.getOrFetch(
          cacheKey,
          user.company_id,
          async () => {
            console.log("Cache miss, fetching from API...")
            const response = await api.company.getAllEvents(user.company_id, 0, 300)
            console.log("API Response:", response)
            return response
          }
        )

        console.log("Events Data received:", eventsData)
        console.log("Total events:", eventsData?.events?.length)

        if (eventsData && eventsData.events) {
          console.log("First 3 events:", eventsData.events.slice(0, 3).map(e => ({
            id: e.id,
            name: e.eventName,
            companyId: e.companyId
          })))

          const foundEvent = eventsData.events.find(
            (e) => {
              const eventIdMatch = Number(e.id) === Number(eventId)
              console.log(`Comparing event ${e.id} (${typeof e.id}) with ${eventId} (${typeof eventId}):`, eventIdMatch)
              return eventIdMatch && e.companyId === user.company_id
            }
          )

          console.log("Found Event:", foundEvent)

          if (foundEvent) {
            console.log("✅ Event Found:", foundEvent.eventName)
            console.log("Event Tickets:", foundEvent.tickets)
            console.log("API Total Revenue:", foundEvent.totalRevenue)
            console.log("API Total Tickets Sold:", foundEvent.totalTicketsSold)

            // Use API totals if available, otherwise calculate from tickets
            const revenue = foundEvent.totalRevenue !== undefined
              ? foundEvent.totalRevenue
              : foundEvent.tickets?.reduce((sum, ticket) =>
                  sum + ((ticket.ticketPrice || 0) * (ticket.soldQuantity || 0)), 0) || 0

            const ticketsSold = foundEvent.totalTicketsSold !== undefined
              ? foundEvent.totalTicketsSold
              : foundEvent.tickets?.reduce((sum, ticket) =>
                  sum + (ticket.soldQuantity || 0), 0) || 0

            console.log("Using Revenue:", revenue)
            console.log("Using Tickets Sold:", ticketsSold)

            // Transform API data to component format
            const transformedEvent: EventData = {
              id: foundEvent.id,
              name: foundEvent.eventName,
              date: new Date(foundEvent.eventStartDate).toISOString().split('T')[0],
              time: new Date(foundEvent.eventStartDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
              venue: foundEvent.eventLocation,
              description: foundEvent.eventDescription,
              status: foundEvent.isActive ? 'active' : 'inactive',
              apiStatus: foundEvent.status, // Store API status (ONHOLD, ACTIVE, etc.)
              balance: revenue,
              pendingBalance: 0,
              totalRevenue: revenue,
              image: foundEvent.eventPosterUrl,
              currency: foundEvent.currency || currency,
              tickets: foundEvent.tickets?.map(ticket => ({
                id: ticket.id,
                name: ticket.ticketName,
                price: ticket.ticketPrice,
                totalAvailable: (ticket as any).originalTicketCount || ticket.quantityAvailable,
                sold: ticket.soldQuantity || (ticket as any).uniqueTicketCount || 0,
                revenue: (ticket as { totalTicketSaleBalance?: number }).totalTicketSaleBalance || (ticket.ticketPrice * (ticket.soldQuantity || (ticket as any).uniqueTicketCount || 0)),
                status: ticket.isSoldOut ? 'sold_out' : ticket.isActive ? 'active' : 'inactive',
                quantityAvailable: ticket.quantityAvailable || ((ticket as any).originalTicketCount ? (ticket as any).originalTicketCount - ((ticket as any).uniqueTicketCount || 0) : 0),
              })) || [],
              totalTicketsSold: ticketsSold,
              eventStartDate: foundEvent.eventStartDate,
              eventEndDate: foundEvent.eventEndDate,
              slug: foundEvent.slug,
            }
            console.log("Transformed Event:", transformedEvent)
            setEventData(transformedEvent)
          } else {
            console.log("❌ Event not found with ID:", eventId)
            console.log("Available event IDs:", eventsData.events.map(e => `${e.id} (${e.eventName})`))
          }
        } else {
          console.log("No events data received")
        }
        console.log("=== Event Detail Fetch End ===")
      } catch (error) {
        console.error("Failed to fetch event:", error)
        toast.error("Failed to load event details")
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvent()
  }, [eventId])

  return { eventData, isLoading, currency }
}

