"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { Calendar, TrendingUp, Eye, Edit, Plus, Search, CheckCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

// Mock data - replace with actual API data
const eventsData = [
  {
    id: 1,
    name: "Summer Music Festival 2026",
    date: "2026-02-15",
    status: "active",
    ticketsSold: 450,
    totalTickets: 500,
    revenue: 135000,
    attendees: 420,
    image: "/placeholder.jpg",
  },
  {
    id: 2,
    name: "Tech Conference Nairobi",
    date: "2026-02-20",
    status: "active",
    ticketsSold: 320,
    totalTickets: 400,
    revenue: 96000,
    attendees: 305,
    image: "/placeholder.jpg",
  },
  {
    id: 3,
    name: "Food & Wine Expo",
    date: "2026-03-01",
    status: "pending",
    ticketsSold: 180,
    totalTickets: 300,
    revenue: 54000,
    attendees: 0,
    image: "/placeholder.jpg",
  },
  {
    id: 4,
    name: "Art Gallery Exhibition",
    date: "2026-03-10",
    status: "pending",
    ticketsSold: 85,
    totalTickets: 150,
    revenue: 25500,
    attendees: 0,
    image: "/placeholder.jpg",
  },
  {
    id: 5,
    name: "Jazz Night Live",
    date: "2026-01-02",
    status: "active",
    ticketsSold: 200,
    totalTickets: 200,
    revenue: 60000,
    attendees: 195,
    image: "/placeholder.jpg",
  },
]

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "pending">("all")

  // Filter events based on search and status
  const filteredEvents = eventsData.filter((event) => {
    const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || event.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Calculate summary statistics
  const stats = {
    totalEvents: eventsData.length,
    activeEvents: eventsData.filter((e) => e.status === "active").length,
    pendingEvents: eventsData.filter((e) => e.status === "pending").length,
    totalRevenue: eventsData.reduce((sum, e) => sum + e.revenue, 0),
  }

  const getStatusBadge = (status: string) => {
    if (status === "active") {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-xs font-medium">
          <CheckCircle className="w-3 h-3" />
          Active
        </div>
      )
    } else if (status === "pending") {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 text-xs font-medium">
          <Clock className="w-3 h-3" />
          Pending Approval
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
            { label: "Pending", value: "pending" },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value as "all" | "active" | "pending")}
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
        {filteredEvents.length === 0 ? (
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
          filteredEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.05 }}
              className="group relative overflow-hidden rounded-xl sm:rounded-2xl border border-border bg-card hover:border-[#8b5cf6]/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Event Image */}
                  <div className="w-full sm:w-32 h-32 sm:h-24 rounded-lg bg-gradient-to-br from-[#8b5cf6]/20 to-[#7c3aed]/20 flex-shrink-0 overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center">
                      <Calendar className="w-12 h-12 text-[#8b5cf6]/40" />
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-3 mb-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <h3 className="text-lg sm:text-xl font-bold line-clamp-2">{event.name}</h3>
                        {getStatusBadge(event.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.date).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Tickets Sold</p>
                        <p className="text-sm sm:text-base font-semibold">
                          {event.ticketsSold} / {event.totalTickets}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                        <p className="text-sm sm:text-base font-semibold">KES {event.revenue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Attendees</p>
                        <p className="text-sm sm:text-base font-semibold">{event.attendees}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Capacity</p>
                        <p className="text-sm sm:text-base font-semibold">
                          {Math.round((event.ticketsSold / event.totalTickets) * 100)}%
                        </p>
                      </div>
                    </div>

                    {/* Pending Approval Message */}
                    {event.status === "pending" && (
                      <div className="mb-4 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30">
                        <div className="flex items-start gap-2">
                          <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                          <p className="text-xs sm:text-sm text-orange-800 dark:text-orange-300">
                            <span className="font-semibold">Under Review:</span> The SoldOutAfrica team is reviewing your event.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] transition-all duration-500"
                          style={{ width: `${(event.ticketsSold / event.totalTickets) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <Link
                        href={`/dashboard/events/${event.id}`}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all duration-300 cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </Link>
                      <Link
                        href={`/dashboard/events/${event.id}/edit`}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-all duration-200 cursor-pointer"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  )
}

