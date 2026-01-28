import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import { sessionManager } from '@/lib/session-manager'

/**
 * Hook to fetch all events with full ticket details
 * This makes parallel calls to /admin/events/all and /event/get for each event
 * Use this when you need complete ticket data for edit forms
 */
export function useEventsWithDetails() {
  const [events, setEvents] = useState<Array<Record<string, unknown>>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEventsWithDetails = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const user = sessionManager.getUser()

        if (!user?.company_id) {
          throw new Error('No company ID found')
        }

        console.log('Fetching events with full details for company:', user.company_id)

        // Fetch events with includeDetails=true
        const response = await api.company.getAllEvents(user.company_id, 0, 300, true)

        console.log('Events with details response:', response)

        if (response.events && Array.isArray(response.events)) {
          setEvents(response.events)
        } else {
          throw new Error('Invalid response format')
        }
      } catch (err) {
        console.error('Failed to fetch events with details:', err)
        const errorMsg = err instanceof Error ? err.message : 'Failed to load events'
        setError(errorMsg)
        toast.error(errorMsg)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEventsWithDetails()
  }, [])

  return { events, isLoading, error, refetch: () => setIsLoading(true) }
}

