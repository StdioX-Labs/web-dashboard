"use client"

import React from "react"
import { motion } from "framer-motion"
import { ArrowLeft, Edit, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { EventData } from "./types"

interface EventDetailHeaderProps {
  eventData: EventData | null
  isLoading: boolean
  eventSuspended: boolean
  onSuspendClick: () => void
  onActivateClick: () => void
}

export function EventDetailHeader({
  eventData,
  isLoading,
  eventSuspended,
  onSuspendClick,
  onActivateClick,
}: EventDetailHeaderProps) {
  if (isLoading) {
    return (
      <div className="mb-8 animate-pulse">
        <div className="h-10 w-32 bg-white/5 rounded mb-4"></div>
        <div className="h-12 w-3/4 bg-white/5 rounded"></div>
      </div>
    )
  }

  if (!eventData) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <Link
        href="/dashboard/events"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Events
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">{eventData.name}</h1>
          {eventSuspended && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-500">Event Suspended</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/dashboard/events/${eventData.id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
          >
            <Edit className="h-4 w-4" />
            Edit Event
          </Link>

          {eventSuspended ? (
            <button
              onClick={onActivateClick}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Activate Event
            </button>
          ) : (
            <button
              onClick={onSuspendClick}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Suspend Event
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

