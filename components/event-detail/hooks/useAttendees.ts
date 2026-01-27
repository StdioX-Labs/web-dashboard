import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import { Attendee, EventData } from '../types'

/**
 * Hook to fetch and manage attendees data
 */
export function useAttendees(
  eventId: number,
  activeTab: string,
  eventData: EventData | null
) {
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [attendeesLoading, setAttendeesLoading] = useState(false)

  useEffect(() => {
    const fetchAttendees = async () => {
      if (activeTab !== 'attendees' || !eventData) return

      setAttendeesLoading(true)
      try {
        const response = await api.company.getAttendees(eventId)

        console.log('Attendees Response:', response)

        if (response.status && response.attendees) {
          setAttendees(response.attendees)
        } else {
          setAttendees([])
        }
      } catch (error) {
        console.error('Failed to fetch attendees:', error)
        toast.error('Failed to load attendees')
        setAttendees([])
      } finally {
        setAttendeesLoading(false)
      }
    }

    fetchAttendees()
  }, [activeTab, eventId, eventData])

  return {
    attendees,
    attendeesLoading,
  }
}

