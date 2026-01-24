"use client"

import React, { useState, useEffect } from "react"
import { toast } from "sonner"
import { api } from "@/lib/api-client"
import { sessionManager } from "@/lib/session-manager"
import { eventCache } from "@/lib/event-cache"
import { EventDetailHeader } from "./EventDetailHeader"
import { EventStats } from "./EventStats"
import { ReportExporter } from "./ReportExporter"
import { EventData, TabType, SuspendType, ActionType, SuspendStep } from "./types"

interface EventDetailProps {
  eventId: number
}

export function EventDetail({ eventId }: EventDetailProps) {
  // API Data State
  const [eventData, setEventData] = useState<EventData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currency, setCurrency] = useState("KES")

  // UI State
  const [activeTab, setActiveTab] = useState<TabType>("overview")
  const [showBalance, setShowBalance] = useState(true)
  const [eventSuspended, setEventSuspended] = useState(false)
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [suspendStep, setSuspendStep] = useState<SuspendStep>("confirm")
  const [suspendOtp, setSuspendOtp] = useState("")
  const [suspendError, setSuspendError] = useState("")
  const [suspendType, setSuspendType] = useState<SuspendType>("event")
  const [actionType, setActionType] = useState<ActionType>("suspend")

  // Fetch event data from API
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const user = sessionManager.getUser()
        if (!user || !user.company_id) {
          setIsLoading(false)
          return
        }

        setCurrency(user.currency || "KES")

        // Try active events first
        try {
          const activeEventsResponse = await api.company.getEvents()
          if (activeEventsResponse.events) {
            const foundActiveEvent = activeEventsResponse.events.find(
              (e: any) => e.id === eventId && e.companyId === user.company_id
            )

            if (foundActiveEvent) {
              const calculatedRevenue = foundActiveEvent.tickets?.reduce((sum: number, ticket: any) =>
                sum + (ticket.ticketPrice * ticket.soldQuantity), 0
              ) || 0
              const calculatedTicketsSold = foundActiveEvent.tickets?.reduce((sum: number, ticket: any) =>
                sum + ticket.soldQuantity, 0
              ) || 0

              const transformedEvent: EventData = {
                id: foundActiveEvent.id,
                name: foundActiveEvent.eventName,
                date: new Date(foundActiveEvent.eventStartDate).toISOString().split('T')[0],
                time: new Date(foundActiveEvent.eventStartDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
                venue: foundActiveEvent.eventLocation,
                description: foundActiveEvent.eventDescription,
                status: foundActiveEvent.isActive ? 'active' : 'inactive',
                balance: calculatedRevenue,
                pendingBalance: 0,
                totalRevenue: calculatedRevenue,
                image: foundActiveEvent.eventPosterUrl,
                currency: foundActiveEvent.currency || currency,
                tickets: foundActiveEvent.tickets || [],
                totalTicketsSold: calculatedTicketsSold,
                eventStartDate: foundActiveEvent.eventStartDate,
                eventEndDate: foundActiveEvent.eventEndDate,
              }
              setEventData(transformedEvent)
              setIsLoading(false)
              return
            }
          }
        } catch {
          console.log("Active events not found, checking all events...")
        }

        // Try all events
        const cacheKey = 'all-events-300'
        const eventsData = await eventCache.getOrFetch(
          cacheKey,
          user.company_id,
          async () => {
            return await api.company.getAllEvents(user.company_id, 0, 300)
          }
        )

        if (eventsData && eventsData.events) {
          const foundEvent = eventsData.events.find(
            (e: any) => e.id === eventId && e.companyId === user.company_id
          )

          if (foundEvent) {
            const transformedEvent: EventData = {
              id: foundEvent.id,
              name: foundEvent.eventName,
              date: new Date(foundEvent.eventStartDate).toISOString().split('T')[0],
              time: new Date(foundEvent.eventStartDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
              venue: foundEvent.eventLocation,
              description: foundEvent.eventDescription,
              status: foundEvent.isActive ? 'active' : 'inactive',
              balance: foundEvent.totalRevenue || 0,
              pendingBalance: 0,
              totalRevenue: foundEvent.totalRevenue || 0,
              image: foundEvent.eventPosterUrl,
              currency: foundEvent.currency || currency,
              tickets: foundEvent.tickets || [],
              totalTicketsSold: foundEvent.totalTicketsSold || 0,
              eventStartDate: foundEvent.eventStartDate,
              eventEndDate: foundEvent.eventEndDate,
            }
            setEventData(transformedEvent)
          }
        }
      } catch (error) {
        console.error("Failed to fetch event:", error)
        toast.error("Failed to load event details")
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvent()
  }, [eventId, currency])

  const handleSuspendClick = () => {
    setSuspendType("event")
    setActionType("suspend")
    setSuspendStep("confirm")
    setSuspendOtp("")
    setSuspendError("")
    setShowSuspendModal(true)
  }

  const handleActivateClick = () => {
    setSuspendType("event")
    setActionType("activate")
    setSuspendStep("confirm")
    setSuspendOtp("")
    setSuspendError("")
    setShowSuspendModal(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <EventDetailHeader
          eventData={eventData}
          isLoading={isLoading}
          eventSuspended={eventSuspended}
          onSuspendClick={handleSuspendClick}
          onActivateClick={handleActivateClick}
        />

        <EventStats
          eventData={eventData}
          isLoading={isLoading}
          showBalance={showBalance}
          onToggleBalance={() => setShowBalance(!showBalance)}
          currency={currency}
        />

        {/* Additional tabs and content would go here */}
        {/* This is a simplified example showing the refactoring pattern */}
      </div>
    </div>
  )
}

