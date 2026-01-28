"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Calendar, Eye, Edit, Plus, Search, CheckCircle, Clock, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { api } from "@/lib/api-client"
import { sessionManager } from "@/lib/session-manager"
import { eventCache } from "@/lib/event-cache"

interface Event {
  id: number
  eventName: string
  eventDescription: string
  eventPosterUrl: string
  eventStartDate: string
  eventEndDate: string
  eventLocation: string
  isActive: boolean
  status?: string
  companyId: number
  category: string
  currency: string
  tickets: Array<{
    id: number
    ticketName: string
    ticketPrice: number
    soldQuantity: number
    quantityAvailable: number
    totalTicketSaleBalance?: number
  }>
  totalTicketsSold?: number
  totalRevenue?: number
  totalPlatformFee?: number
  analytics?: {
    dailySalesGraph: string
    currentWeekSales: number
    totalAttendees: number
    totalTicketTypes: number
  }
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoadingInitial, setIsLoadingInitial] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "upcoming" | "past" | "inactive" | "pending">("all")
  const [currency, setCurrency] = useState("KES")

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const user = sessionManager.getUser()

        if (!user || !user.company_id) {
          setIsLoadingInitial(false)
          return
        }

        setCurrency(user.currency || "KES")

        // Only use admin/events/get/all API with caching
        const cacheKey = 'all-events-300'

        if (eventCache.isLoading(cacheKey)) {
          // Wait for pending request to complete
          const pendingRequest = eventCache.getPendingRequest(cacheKey)
          if (pendingRequest) {
            const cachedData = await pendingRequest as { events?: Event[] }
            if (cachedData && cachedData.events) {
              // Filter to only this company's events (security)
              const companyEvents = cachedData.events.filter(
                (event: Event) => event.companyId === user.company_id
              )
              // Sort by date (newest first)
              companyEvents.sort((a: Event, b: Event) =>
                new Date(b.eventStartDate).getTime() - new Date(a.eventStartDate).getTime()
              )
              setEvents(companyEvents)
            }
          }
          setIsLoadingInitial(false)
          return
        }

        // Use cache manager to fetch or retrieve cached data
        const allEventsData = await eventCache.getOrFetch(
          cacheKey,
          user.company_id,
          async () => {
            const response = await api.company.getAllEvents(user.company_id, 0, 300)
            return response
          }
        )

        if (allEventsData && allEventsData.events) {
          // IMPORTANT: Filter to only this company's events for security
          // This ensures users can't see events from other companies
          const companyEvents = allEventsData.events.filter(
            (event) => event.companyId === user.company_id
          )

          // Sort by date (newest first)
          companyEvents.sort((a, b) =>
            new Date(b.eventStartDate).getTime() - new Date(a.eventStartDate).getTime()
          )
          setEvents(companyEvents)
        }
      } catch (error) {
        console.error("Failed to fetch events:", error)
      } finally {
        setIsLoadingInitial(false)
      }
    }

    fetchEvents()
  }, [])

  // Calculate event statistics
  const getEventStats = (event: Event) => {
    // Calculate total original tickets and sold tickets from all ticket types
    // Sum up originalTicketCount from all tickets to get total capacity
    const totalTickets = event.tickets.reduce((sum, ticket) => {
      // Check if ticket has originalTicketCount (from ticketSummaries)
      const originalCount = (ticket as any).originalTicketCount
      if (originalCount) {
        return sum + originalCount
      }
      // Fallback to soldQuantity + quantityAvailable
      return sum + ticket.soldQuantity + ticket.quantityAvailable
    }, 0)

    // Sum up uniqueTicketCount (or soldQuantity) from all tickets to get total sold
    const ticketsSold = event.tickets.reduce((sum, ticket) => {
      const uniqueCount = (ticket as any).uniqueTicketCount
      return sum + (uniqueCount !== undefined ? uniqueCount : ticket.soldQuantity)
    }, 0)

    // Use event-level revenue if available, otherwise calculate
    const revenue = event.totalRevenue !== undefined
      ? event.totalRevenue
      : event.tickets.reduce((sum, ticket) => {
          const sold = (ticket as any).uniqueTicketCount !== undefined
            ? (ticket as any).uniqueTicketCount
            : ticket.soldQuantity
          return sum + (ticket.ticketPrice * sold)
        }, 0)

    return {
      totalTickets: totalTickets || ticketsSold,
      ticketsSold,
      revenue
    }
  }

  // Determine event status
  const getEventStatus = (event: Event) => {
    // Check API status first (ONHOLD, ACTIVE, etc.)
    if (event.status === 'ONHOLD') return 'pending'

    const now = new Date()
    const startDate = new Date(event.eventStartDate)
    const endDate = new Date(event.eventEndDate)

    if (!event.isActive) return 'inactive'
    if (endDate < now) return 'past'
    if (startDate > now) return 'upcoming'
    return 'active'
  }

  // Filter events based on search and status
  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.eventDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.eventLocation.toLowerCase().includes(searchQuery.toLowerCase())

    const eventStatus = getEventStatus(event)
    const matchesStatus = statusFilter === "all" || eventStatus === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (event: Event) => {
    const status = getEventStatus(event)

    if (status === "pending") {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 text-xs font-bold border-2 border-yellow-500/50">
          <Clock className="w-3.5 h-3.5" />
          Pending Approval
        </div>
      )
    } else if (status === "active") {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-xs font-medium border border-green-200 dark:border-green-900">
          <CheckCircle className="w-3 h-3" />
          Active
        </div>
      )
    } else if (status === "upcoming") {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-xs font-bold border-2 border-blue-500/50">
          <Clock className="w-3.5 h-3.5" />
          Upcoming
        </div>
      )
    } else if (status === "past") {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-950/30 text-gray-700 dark:text-gray-400 text-xs font-bold border-2 border-gray-500/50">
          <CheckCircle className="w-3.5 h-3.5" />
          Past
        </div>
      )
    } else if (status === "inactive") {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs font-bold border-2 border-red-500/50">
          <Clock className="w-3.5 h-3.5" />
          Inactive
        </div>
      )
    }
    return null
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 sm:mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">My Events</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage and track your events</p>
          </div>
          <Link
            href="/dashboard/events/create"
            className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all duration-300 cursor-pointer"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            Create Event
          </Link>
        </div>
      </motion.div>

      {/* Search and Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6 flex flex-col gap-3 sm:gap-4"
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {[
            { label: "All", value: "all" },
            { label: "Active", value: "active" },
            { label: "Upcoming", value: "upcoming" },
            { label: "Pending", value: "pending" },
            { label: "Past", value: "past" },
            { label: "Inactive", value: "inactive" },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value as "all" | "active" | "upcoming" | "past" | "inactive" | "pending")}
              className={cn(
                "px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0",
                statusFilter === filter.value
                  ? "bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white shadow-lg shadow-[#8b5cf6]/25"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-[#8b5cf6]/30"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Events List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        {isLoadingInitial ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-[#8b5cf6]" />
              <p className="text-muted-foreground">Loading events...</p>
            </div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12 sm:py-16 rounded-2xl border border-dashed border-border bg-card/50">
            <Calendar className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg sm:text-xl font-semibold mb-2">No events found</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first event to get started"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Link
                href="/dashboard/events/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all duration-300 cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                Create Event
              </Link>
            )}
          </div>
        ) : (
          filteredEvents.map((event, index) => {
            const stats = getEventStats(event)
            const eventStatus = getEventStatus(event)

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.05 }}
                className={cn(
                  "group relative overflow-hidden rounded-xl sm:rounded-2xl border bg-card hover:shadow-lg transition-all duration-300",
                  eventStatus === "pending"
                    ? "border-yellow-500/50 bg-yellow-50/30 dark:bg-yellow-950/10 hover:border-yellow-500/70"
                    : eventStatus === "upcoming"
                    ? "border-blue-500/50 bg-blue-50/30 dark:bg-blue-950/10 hover:border-blue-500/70"
                    : eventStatus === "inactive"
                    ? "border-red-500/50 bg-red-50/30 dark:bg-red-950/10 hover:border-red-500/70"
                    : "border-border hover:border-[#8b5cf6]/30"
                )}
              >
                {/* Pending Approval Banner */}
                {eventStatus === "pending" && (
                  <div className="absolute top-0 left-0 right-0 bg-yellow-500 text-white text-xs font-medium px-4 py-2 flex items-center gap-2 z-10">
                    <Clock className="w-3.5 h-3.5" />
                    This event is pending approval and will be active once approved by the administrator
                  </div>
                )}
                <div className={cn("p-4 sm:p-6", eventStatus === "pending" && "pt-14")}>
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Event Image */}
                    <div className="relative w-full sm:w-48 h-32 sm:h-32 rounded-lg overflow-hidden bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] flex-shrink-0">
                      {event.eventPosterUrl ? (
                        <img
                          src={event.eventPosterUrl}
                          alt={event.eventName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Calendar className="w-12 h-12 text-white/50" />
                        </div>
                      )}
                    </div>

                    {/* Event Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl font-bold mb-1 truncate">{event.eventName}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{event.eventDescription}</p>
                        </div>
                        {getStatusBadge(event)}
                      </div>

                      {/* Event Stats */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Date</p>
                          <p className="text-sm font-semibold">
                            {new Date(event.eventStartDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Tickets Sold</p>
                          <p className="text-sm font-semibold">
                            {stats.ticketsSold} / {stats.totalTickets}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Revenue</p>
                          <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                            {event.currency} {stats.revenue.toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Location</p>
                          <p className="text-sm font-semibold truncate">{event.eventLocation}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/events/${event.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8b5cf6] text-white text-sm font-medium hover:bg-[#7c3aed] transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Link>
                        <Link
                          href={`/dashboard/events/${event.id}/edit`}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium hover:bg-secondary transition-colors cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </motion.div>
    </div>
  )
}

