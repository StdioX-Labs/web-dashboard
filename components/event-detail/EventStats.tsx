"use client"

import React from "react"
import { motion } from "framer-motion"
import { Calendar, MapPin, Eye, EyeOff } from "lucide-react"
import { EventData } from "./types"
import { cn } from "@/lib/utils"

interface EventStatsProps {
  eventData: EventData | null
  isLoading: boolean
  showBalance: boolean
  onToggleBalance: () => void
  currency: string
}

export function EventStats({
  eventData,
  isLoading,
  showBalance,
  onToggleBalance,
  currency,
}: EventStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 animate-pulse">
            <div className="h-4 w-24 bg-white/5 rounded mb-3"></div>
            <div className="h-8 w-32 bg-white/5 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  if (!eventData) return null

  const stats = [
    {
      label: "Event Date",
      value: new Date(eventData.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      icon: Calendar,
      color: "text-blue-400",
    },
    {
      label: "Venue",
      value: eventData.venue,
      icon: MapPin,
      color: "text-green-400",
    },
    {
      label: "Available Balance",
      value: showBalance
        ? `${currency} ${eventData.balance.toLocaleString()}`
        : "••••••",
      icon: showBalance ? Eye : EyeOff,
      color: "text-purple-400",
      isBalance: true,
    },
    {
      label: "Total Revenue",
      value: showBalance
        ? `${currency} ${eventData.totalRevenue.toLocaleString()}`
        : "••••••",
      icon: showBalance ? Eye : EyeOff,
      color: "text-emerald-400",
      isBalance: true,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={cn(
            "bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors",
            stat.isBalance && "cursor-pointer"
          )}
          onClick={stat.isBalance ? onToggleBalance : undefined}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <stat.icon className={cn("h-5 w-5", stat.color)} />
          </div>
          <p className="text-2xl font-bold">{stat.value}</p>
        </motion.div>
      ))}
    </div>
  )
}

