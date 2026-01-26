"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Edit,
  Ticket,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  Loader2,
  Share2,
  BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { eventCache } from "@/lib/event-cache"
import { sessionManager } from "@/lib/session-manager"
import { api } from "@/lib/api-client"

interface EventDetail {
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
  slug: string
  tickets: Array<{
    id: number
    ticketName: string
    ticketPrice: number
    soldQuantity: number
    quantityAvailable: number
    isActive: boolean
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

export default function EventDetailPage({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currency, setCurrency] = useState("KES")

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const user = sessionManager.getUser()
        console.log('Fetching event, user:', user, 'eventId:', eventId)

        if (!user || !user.company_id) {
          console.log('No user or company_id')
          setIsLoading(false)
          return
        }

        setCurrency(user.currency || "KES")

        // Always fetch - either from cache or API
        const cacheKey = 'all-events-300'

        console.log('Fetching events data...')
        const eventsData = await eventCache.getOrFetch(
          cacheKey,
          user.company_id,
          async () => {
            console.log('Fetching from API (cache miss or expired)...')
            const response = await api.company.getAllEvents(user.company_id, 0, 300)
            return response
          }
        )

        console.log('Events data received:', eventsData)

        if (eventsData && eventsData.events) {
          console.log('Total events:', eventsData.events.length)
          console.log('Looking for event ID:', eventId, 'Type:', typeof eventId)
          console.log('User company ID:', user.company_id)

          // Log first few event IDs for debugging
          console.log('Sample event IDs:', eventsData.events.slice(0, 5).map(e => ({ id: e.id, type: typeof e.id, companyId: e.companyId })))

          const foundEvent = eventsData.events.find((e) => {
            const matches = e.id.toString() === eventId.toString() && e.companyId === user.company_id
            if (e.id.toString() === eventId.toString()) {
              console.log('Found matching ID but checking company:', e.companyId, 'vs', user.company_id)
            }
            return matches
          })

          console.log('Found event:', foundEvent)

          if (foundEvent) {
            setEvent(foundEvent as EventDetail)
          } else {
            console.log('Event not found - ID mismatch or company mismatch')
          }
        } else {
          console.log('No events data received')
        }
      } catch (error) {
        console.error("Failed to fetch event:", error)
        toast.error("Failed to load event details")
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvent()
  }, [eventId])

  const getEventStatus = (event: EventDetail) => {
    // Check API status first (ONHOLD = pending approval)
    if (event.status === 'ONHOLD') return { label: 'Pending Approval', color: 'yellow' }

    const now = new Date()
    const startDate = new Date(event.eventStartDate)
    const endDate = new Date(event.eventEndDate)

    if (!event.isActive) return { label: 'Inactive', color: 'red' }
    if (endDate < now) return { label: 'Past', color: 'gray' }
    if (startDate > now) return { label: 'Upcoming', color: 'blue' }
    return { label: 'Active', color: 'green' }
  }

  const calculateStats = (event: EventDetail) => {
    const totalTickets = event.totalTicketsSold !== undefined
      ? event.totalTicketsSold + event.tickets.reduce((sum, t) => sum + t.quantityAvailable, 0)
      : event.tickets.reduce((sum, t) => sum + t.soldQuantity + t.quantityAvailable, 0)

    const ticketsSold = event.totalTicketsSold || event.tickets.reduce((sum, t) => sum + t.soldQuantity, 0)
    const revenue = event.totalRevenue || event.tickets.reduce((sum, t) => sum + (t.ticketPrice * t.soldQuantity), 0)
    const availableTickets = event.tickets.reduce((sum, t) => sum + t.quantityAvailable, 0)

    return { totalTickets, ticketsSold, revenue, availableTickets }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#8b5cf6]" />
          <p className="text-muted-foreground">Loading event details...</p>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 max-w-[1600px] mx-auto">
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold mb-2">Event Not Found</h1>
          <p className="text-muted-foreground mb-6">The event you're looking for doesn't exist or you don't have access to it.</p>
          <Link
            href="/dashboard/events"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Events
          </Link>
        </div>
      </div>
    )
  }

  const status = getEventStatus(event)
  const stats = calculateStats(event)

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Link
          href="/dashboard/events"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Events
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl lg:text-4xl font-bold mb-2">{event.eventName}</h1>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
                  status.color === 'green' && "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 border border-green-200",
                  status.color === 'blue' && "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200",
                  status.color === 'gray' && "bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400 border border-gray-200",
                  status.color === 'red' && "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200",
                  status.color === 'yellow' && "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400 border border-yellow-200"
                )}
              >
                {status.label}
              </span>
              <span className="text-sm text-muted-foreground">{event.category}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href)
                toast.success("Event link copied to clipboard")
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background hover:bg-secondary transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <Link
              href={`/dashboard/events/${eventId}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8b5cf6] text-white hover:bg-[#7c3aed] transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit Event
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        {[
          { label: "Total Revenue", value: `${currency} ${stats.revenue.toLocaleString()}`, icon: DollarSign, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
          { label: "Tickets Sold", value: `${stats.ticketsSold} / ${stats.totalTickets}`, icon: Ticket, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Available Tickets", value: stats.availableTickets.toString(), icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
          { label: "Sell Rate", value: `${Math.round((stats.ticketsSold / stats.totalTickets) * 100)}%`, icon: BarChart3, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
        ].map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              className="rounded-xl border border-border bg-card p-6"
            >
              <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mb-4", stat.bg)}>
                <Icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </motion.div>
          )
        })}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Image */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            <div className="relative w-full h-64 sm:h-96 bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed]">
              {event.eventPosterUrl ? (
                <img
                  src={event.eventPosterUrl}
                  alt={event.eventName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Calendar className="w-20 h-20 text-white/30" />
                </div>
              )}
            </div>
          </motion.div>

          {/* Event Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl border border-border bg-card p-6"
          >
            <h2 className="text-xl font-bold mb-4">About This Event</h2>
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: event.eventDescription }}
            />
          </motion.div>

          {/* Tickets */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-xl border border-border bg-card p-6"
          >
            <h2 className="text-xl font-bold mb-4">Ticket Types</h2>
            <div className="space-y-3">
              {event.tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{ticket.ticketName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {ticket.soldQuantity} sold • {ticket.quantityAvailable} available
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#8b5cf6]">
                      {currency} {ticket.ticketPrice.toLocaleString()}
                    </p>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                        ticket.isActive
                          ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                      )}
                    >
                      {ticket.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Event Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-border bg-card p-6"
          >
            <h2 className="text-xl font-bold mb-4">Event Details</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-[#8b5cf6] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                  <p className="font-medium">
                    {new Date(event.eventStartDate).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-[#8b5cf6] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">End Date</p>
                  <p className="font-medium">
                    {new Date(event.eventEndDate).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#8b5cf6] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Location</p>
                  <p className="font-medium">{event.eventLocation}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-[#8b5cf6] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Total Attendees</p>
                  <p className="font-medium">{stats.ticketsSold}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl border border-border bg-card p-6"
          >
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                href={`/dashboard/events/${eventId}/edit`}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium"
              >
                <Edit className="w-4 h-4" />
                Edit Event Details
              </Link>
              <Link
                href={`/dashboard/transactions?eventId=${eventId}`}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium"
              >
                <DollarSign className="w-4 h-4" />
                View Transactions
              </Link>
              <Link
                href={`/dashboard/scan?eventId=${eventId}`}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium"
              >
                <Ticket className="w-4 h-4" />
                Scan Tickets
              </Link>
            </div>
          </motion.div>

          {/* Event Link */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-xl border border-border bg-card p-6"
          >
            <h2 className="text-xl font-bold mb-4">Public Event Page</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Share this link with your audience
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={`https://soldoutafrica.com/events/${event.slug}`}
                readOnly
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://soldoutafrica.com/events/${event.slug}`)
                  toast.success("Link copied!")
                }}
                className="px-4 py-2 rounded-lg bg-[#8b5cf6] text-white hover:bg-[#7c3aed] transition-colors text-sm font-medium"
              >
                Copy
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

