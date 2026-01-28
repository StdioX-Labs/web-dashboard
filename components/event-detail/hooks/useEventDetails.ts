import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'

// Full event details type based on API response
interface EventDetailsResponse {
  id: number
  eventName: string
  eventDescription: string
  eventPosterUrl: string
  eventCategoryId: number
  ticketSaleStartDate: string
  ticketSaleEndDate: string
  eventLocation: string
  eventStartDate: string
  eventEndDate: string
  isActive: boolean
  tickets: Array<{
    id: number
    ticketName: string
    ticketPrice: number
    quantityAvailable: number
    soldQuantity: number
    isActive: boolean
    ticketsToIssue: number
    isSoldOut: boolean
    ticketLimitPerPerson: number
    numberOfComplementary: number
    ticketSaleStartDate: string
    ticketSaleEndDate: string
    isFree: boolean
    ticketStatus: string
    createAt: string
  }>
  createdById: number
  companyId: number
  companyName: string
  comission: number
  category: string
  date: string
  time: string
  isFeatured: boolean
  price: number
  slug: string
  currency: string
}

/**
 * Hook to fetch detailed event data including full ticket information
 * Useful for prepopulating edit forms
 */
export function useEventDetails(eventId: number | null) {
  const [eventDetails, setEventDetails] = useState<EventDetailsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  console.log('useEventDetails hook called with eventId:', eventId)

  useEffect(() => {
    console.log('useEventDetails useEffect triggered, eventId:', eventId)

    if (!eventId) {
      console.log('No eventId provided, resetting state')
      setEventDetails(null)
      setIsLoading(false)
      return
    }

    const fetchEventDetails = async () => {
      console.log('Starting fetch for eventId:', eventId)
      setIsLoading(true)
      setError(null)

      try {
        console.log('Calling api.event.getById with eventId:', eventId)
        const response = await api.event.getById(eventId)

        console.log('API Response received:', response)

        if (response.status && response.event) {
          console.log('Setting event details:', response.event)
          setEventDetails(response.event)
        } else {
          const errorMsg = response.message || 'Failed to fetch event details'
          console.error('API returned error:', errorMsg)
          setError(errorMsg)
          toast.error(errorMsg)
        }
      } catch (err) {
        console.error('Exception while fetching event details:', err)
        const errorMsg = err instanceof Error ? err.message : 'Failed to load event details'
        setError(errorMsg)
        toast.error(errorMsg)
      } finally {
        console.log('Fetch complete, setting isLoading to false')
        setIsLoading(false)
      }
    }

    fetchEventDetails()
  }, [eventId])

  console.log('useEventDetails returning:', { eventDetails, isLoading, error })
  return { eventDetails, isLoading, error }
}

