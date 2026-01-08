"use client"

import React from "react"
import { motion } from "framer-motion"
import { Wallet, TrendingUp, Calendar, Users, Plus, Eye, Download, Send, Megaphone, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"

// Mock data - replace with actual data from API
const dashboardData = {
  wallet: {
    balance: 45000,
    pending: 12000,
    currency: "KES",
  },
  stats: {
    totalEvents: 12,
    activeEvents: 5,
    totalTickets: 2450,
    totalRevenue: 890000,
  },
  recentTransactions: [
    { id: 1, event: "Nura Fest 2026", amount: 15000, date: "2026-01-05", status: "completed" },
    { id: 2, event: "Tech Summit Nairobi", amount: 28000, date: "2026-01-03", status: "completed" },
    { id: 3, event: "Jazz Night Live", amount: 8500, date: "2026-01-02", status: "pending" },
    { id: 4, event: "Art Exhibition", amount: 12000, date: "2025-12-30", status: "completed" },
  ],
  upcomingEvents: [
    { id: 1, name: "Summer Music Festival", date: "2026-02-15", tickets: 450, revenue: 135000 },
    { id: 2, name: "Tech Conference 2026", date: "2026-02-20", tickets: 320, revenue: 96000 },
    { id: 3, name: "Food & Wine Expo", date: "2026-03-01", tickets: 180, revenue: 54000 },
  ],
}

export default function DashboardHome() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 sm:mb-8"
      >
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Welcome back! Here&apos;s what&apos;s happening with your events.</p>
      </motion.div>

      {/* Wallet Summary Card - Darker gradient */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 sm:mb-8"
      >
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#6d28d9] via-[#7c3aed] to-[#5b21b6] p-6 sm:p-8 text-white">
          {/* Subtle accent circles */}
          <div className="absolute -right-8 -top-8 w-40 h-40 sm:w-64 sm:h-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-8 -bottom-8 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-black/20 blur-2xl" />

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6 sm:mb-8">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium opacity-90">Available Balance</span>
                </div>
                <div>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2">
                    {dashboardData.wallet.currency} {dashboardData.wallet.balance.toLocaleString()}
                  </h2>
                  <p className="text-xs sm:text-sm opacity-75 flex items-center gap-1">
                    <span>Pending:</span>
                    <span className="font-semibold">{dashboardData.wallet.currency} {dashboardData.wallet.pending.toLocaleString()}</span>
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-white/10 backdrop-blur-sm items-center justify-center">
                <TrendingUp className="w-8 h-8 lg:w-10 lg:h-10" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 sm:py-3 bg-white text-[#7c3aed] hover:bg-white/90 rounded-lg sm:rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer">
                <Send className="w-4 h-4" />
                Withdraw
              </button>
              <button className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 sm:py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 border border-white/20 cursor-pointer">
                <Eye className="w-4 h-4" />
                History
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid - Better mobile layout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8"
      >
        {[
          { label: "Total Events", value: dashboardData.stats.totalEvents, icon: Calendar, color: "from-blue-500 to-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Active Events", value: dashboardData.stats.activeEvents, icon: Calendar, color: "from-green-500 to-green-600", bgColor: "bg-green-50 dark:bg-green-950/30" },
          { label: "Tickets Sold", value: dashboardData.stats.totalTickets.toLocaleString(), icon: Users, color: "from-orange-500 to-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
          { label: "Total Revenue", value: `${(dashboardData.stats.totalRevenue / 1000).toFixed(0)}K`, icon: TrendingUp, color: "from-purple-500 to-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950/30" },
        ].map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              className="group relative overflow-hidden rounded-xl sm:rounded-2xl border border-border bg-card p-4 sm:p-6 hover:border-[#8b5cf6]/30 transition-all duration-300"
            >
              <div className="flex flex-col h-full">
                <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 transition-transform group-hover:scale-105", stat.bgColor)}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: `hsl(var(--${stat.color.split('-')[1]}))` }} />
                </div>
                <div className="mt-auto">
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1">{stat.value}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-tight">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Quick Actions - Classy and stylish button design */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6 sm:mb-8"
      >
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: "Create Event", icon: Plus, gradient: "from-[#8b5cf6] via-[#7c3aed] to-[#6d28d9]", glow: "shadow-[#8b5cf6]/30" },
            { label: "View Events", icon: Calendar, gradient: "from-blue-500 via-blue-600 to-blue-700", glow: "shadow-blue-500/30" },
            { label: "Export Data", icon: Download, gradient: "from-green-500 via-green-600 to-green-700", glow: "shadow-green-500/30" },
            { label: "Promotions", icon: Megaphone, gradient: "from-orange-500 via-orange-600 to-orange-700", glow: "shadow-orange-500/30" },
          ].map((action, index) => {
            const Icon = action.icon
            return (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group relative overflow-hidden rounded-2xl bg-card border border-border/50 hover:border-transparent transition-all duration-500 cursor-pointer shadow-lg hover:shadow-2xl"
              >
                {/* Animated gradient background */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                  action.gradient
                )}>
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>

                {/* Glow effect */}
                <div className={cn(
                  "absolute -inset-1 bg-gradient-to-br opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500 -z-10",
                  action.gradient
                )} />

                <div className="relative p-5 sm:p-6 flex flex-col items-start gap-4">
                  {/* Icon with glass morphism effect */}
                  <div className="relative">
                    <div className={cn(
                      "w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br flex items-center justify-center transition-all duration-500",
                      "shadow-md group-hover:shadow-xl group-hover:scale-110 group-hover:rotate-3",
                      action.gradient
                    )}>
                      <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white relative z-10" />
                      {/* Inner glow */}
                      <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                    {/* Floating ring effect */}
                    <div className={cn(
                      "absolute inset-0 rounded-xl border-2 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500",
                      action.gradient.includes('purple') ? "border-[#8b5cf6]/50" :
                      action.gradient.includes('blue') ? "border-blue-500/50" :
                      action.gradient.includes('green') ? "border-green-500/50" :
                      "border-orange-500/50"
                    )} />
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm sm:text-base font-bold text-foreground group-hover:text-white transition-colors duration-300">
                      {action.label}
                    </p>
                    <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="text-xs text-muted-foreground group-hover:text-white/80 transition-colors duration-300">
                        Quick access
                      </span>
                      <ArrowUpRight className="w-3 h-3 text-muted-foreground group-hover:text-white/80 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </div>
                </div>

                {/* Corner accent */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* Events and Transactions Grid - Responsive layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        {/* Upcoming Events */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl sm:rounded-2xl border border-border bg-card p-4 sm:p-6"
        >
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold">Upcoming Events</h2>
            <button className="text-xs sm:text-sm text-[#8b5cf6] hover:text-[#7c3aed] font-medium flex items-center gap-1 cursor-pointer">
              View All
              <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {dashboardData.upcomingEvents.map((event) => (
              <div key={event.id} className="flex items-start sm:items-center justify-between p-3 sm:p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <div className="flex-1 min-w-0 pr-3">
                  <h3 className="font-semibold mb-1 text-sm sm:text-base truncate">{event.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-sm sm:text-base">KES {event.revenue.toLocaleString()}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{event.tickets} tickets</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl sm:rounded-2xl border border-border bg-card p-4 sm:p-6"
        >
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold">Recent Transactions</h2>
            <button className="text-xs sm:text-sm text-[#8b5cf6] hover:text-[#7c3aed] font-medium flex items-center gap-1 cursor-pointer">
              View All
              <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {dashboardData.recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-start sm:items-center justify-between p-3 sm:p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <div className="flex-1 min-w-0 pr-3">
                  <h3 className="font-semibold mb-1 text-sm sm:text-base truncate">{transaction.event}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-sm sm:text-base">KES {transaction.amount.toLocaleString()}</p>
                  <div className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium",
                    transaction.status === "completed"
                      ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                      : "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
                  )}>
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      transaction.status === "completed" ? "bg-green-600 dark:bg-green-400" : "bg-orange-600 dark:bg-orange-400"
                    )} />
                    {transaction.status === "completed" ? "Completed" : "Pending"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

