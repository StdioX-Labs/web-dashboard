"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Wallet, TrendingUp, Calendar, Users, Plus, Eye, EyeOff, Download, Send, Megaphone, ArrowUpRight, DollarSign, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"
import { api } from "@/lib/api-client"
import { sessionManager } from "@/lib/session-manager"

/**
 * FEATURE FLAGS: Quick Actions
 *
 * Set to `true` to enable specific quick action items on the dashboard.
 *
 * @default false
 */
const ENABLE_PROMOTIONS = false


interface CompanySummary {
  totalFees: number
  totalTicketsSold: number
  totalEvents: number
  activeEvents: number
  totalRevenue: number
}

interface CompanyEvent {
  id: number
  eventName: string
  eventStartDate: string
  eventLocation: string
  tickets: Array<{
    ticketPrice: number
    soldQuantity: number
  }>
  companyId: number
  currency: string
}

interface Transaction {
  id: number
  amount: number
  currency: string
  status: string
  transactionType: string
  createdAt: string
  eventName?: string
  ticketName?: string
  quantity?: number
  customerName?: string
  customerEmail?: string
  paymentMethod?: string
  reference?: string
}

export default function DashboardHome() {
  const [showBalance, setShowBalance] = useState(true)
  const [summary, setSummary] = useState<CompanySummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currency, setCurrency] = useState("KES")
  const [upcomingEvents, setUpcomingEvents] = useState<CompanyEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(true)

  useEffect(() => {
    const user = sessionManager.getUser()
    if (!user || !user.company_id) {
      setIsLoading(false)
      setEventsLoading(false)
      setTransactionsLoading(false)
      return
    }

    setCurrency(user.currency || "KES")

    // Stage 1: Fetch summary (critical data) - loads first to show main dashboard
    const fetchSummary = async () => {
      try {
        const summaryResponse = await api.company.getSummary(user.company_id)
        if (summaryResponse.status && summaryResponse.summary) {
          setSummary(summaryResponse.summary)
        }
      } catch (error) {
        console.error("Failed to fetch summary:", error)
      } finally {
        setIsLoading(false)
      }
    }

    // Stage 2: Fetch upcoming events (background) - loads independently
    const fetchUpcomingEvents = async () => {
      try {
        const eventsResponse = await api.company.getAllEvents(user.company_id, 0, 300)
        if (eventsResponse.events) {
          // Filter events for the current user's company
          const companyEvents = eventsResponse.events.filter(
            (event) => event.companyId === user.company_id && event.isActive
          )

          // Filter upcoming events (events that haven't started yet)
          const now = new Date()
          const upcoming = companyEvents
            .filter((event) => new Date(event.eventStartDate) > now)
            .sort((a, b) => new Date(a.eventStartDate).getTime() - new Date(b.eventStartDate).getTime())
            .slice(0, 5) // Get top 5 upcoming events

          setUpcomingEvents(upcoming)
        }
      } catch (error) {
        console.error("Failed to fetch events:", error)
      } finally {
        setEventsLoading(false)
      }
    }

    // Stage 3: Fetch recent transactions (background) - loads independently
    const fetchRecentTransactions = async () => {
      try {
        const transactionsResponse = await api.transactions.fetchDetailed({
          id: user.company_id,
          idType: 'company',
          transactionType: 'TICKET_SALE',
          page: 0,
          size: 5,
        })

        if (transactionsResponse.data && transactionsResponse.data.data) {
          // Transform the API data for display
          const transformedTransactions = transactionsResponse.data.data.map((txn) => {
            // Get customer name
            const customerName = txn.buyer.firstName && txn.buyer.lastName
              ? `${txn.buyer.firstName} ${txn.buyer.lastName}`
              : txn.buyer.firstName || txn.buyer.lastName || 'Unknown'

            return {
              id: txn.id,
              amount: txn.transactionAmount,
              currency: txn.event.currency,
              status: 'completed',
              transactionType: txn.transactionType,
              createdAt: txn.createdAt,
              eventName: txn.event.eventName,
              ticketName: txn.ticket.ticketName,
              quantity: 1,
              customerName: customerName,
              customerEmail: txn.buyer.email || 'N/A',
              reference: txn.transactionId,
            }
          }).slice(0, 5) // Take only the first 5

          setRecentTransactions(transformedTransactions)
        }
      } catch (error) {
        console.error("Failed to fetch transactions:", error)
      } finally {
        setTransactionsLoading(false)
      }
    }

    // Execute: Summary first (shows main dashboard), then events and transactions in parallel (background)
    fetchSummary()
    fetchUpcomingEvents()
    fetchRecentTransactions()
  }, [])

  const totalRevenue = summary?.totalRevenue || 0
  const commissionAndFees = summary?.totalFees || 0
  const withdrawn = 0
  const availableBalance = totalRevenue - commissionAndFees - withdrawn

  // Helper function to format large numbers for mobile
  const formatCurrency = (amount: number, compact = false): string => {
    if (!compact || amount < 100000) {
      return Math.round(amount).toLocaleString()
    }

    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 100000) {
      return `${(amount / 1000).toFixed(0)}K`
    }

    return Math.round(amount).toLocaleString()
  }

  const stats = {
    totalEvents: summary?.totalEvents || 0,
    activeEvents: summary?.activeEvents || 0,
    totalTickets: summary?.totalTicketsSold || 0,
    totalRevenue: totalRevenue,
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 max-w-[1600px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Welcome back! Here&apos;s what&apos;s happening with your events.</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6 sm:mb-8">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#6d28d9] via-[#7c3aed] to-[#5b21b6] p-5 sm:p-6 lg:p-8 text-white shadow-2xl">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none"
          />

          <button
            type="button"
            onClick={() => setShowBalance(!showBalance)}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 sm:p-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all cursor-pointer z-20 border border-white/30"
          >
            {showBalance ? <Eye className="w-4 h-4 sm:w-5 sm:h-5" /> : <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          <div className="relative z-10">
            <div className="mb-6 lg:mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0">
                  <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm opacity-70 mb-1">Total Revenue</p>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold">
                    {isLoading ? (
                      <span className="animate-pulse">Loading...</span>
                    ) : showBalance ? (
                      <>
                        <span className="sm:hidden">{currency} {formatCurrency(totalRevenue, true)}</span>
                        <span className="hidden sm:inline">{currency} {formatCurrency(totalRevenue)}</span>
                      </>
                    ) : (
                      "••••••••"
                    )}
                  </h2>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 min-w-0">
                <p className="text-xs sm:text-sm text-white/70 mb-2 sm:mb-3">Commission & Fees</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold break-words">
                  {isLoading ? "..." : showBalance ? `- ${currency} ${Math.round(commissionAndFees).toLocaleString()}` : "- ••••••"}
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 min-w-0">
                <p className="text-xs sm:text-sm text-white/70 mb-2 sm:mb-3">Withdrawn</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold break-words">
                  {isLoading ? "..." : showBalance ? `- ${currency} ${withdrawn.toLocaleString()}` : "- ••••••"}
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/30 min-w-0">
                <p className="text-xs sm:text-sm text-green-200 mb-2 sm:mb-3">Available Balance</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-200 break-words">
                  {isLoading ? "..." : showBalance ? `${currency} ${Math.round(availableBalance).toLocaleString()}` : "••••••"}
                </p>
              </div>

              <div className="flex flex-col gap-2 justify-center">
                <button className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white text-[#7c3aed] rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 hover:bg-white/95 transition-colors">
                  <Send className="w-4 h-4 shrink-0" />
                  <span className="truncate">Withdraw</span>
                </button>
                <button className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border border-white/20 transition-colors">
                  <Download className="w-4 h-4 shrink-0" />
                  <span className="truncate">Report</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
        {[
          { label: "Total Events", value: isLoading ? "..." : stats.totalEvents, icon: Calendar, bgColor: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Active Events", value: isLoading ? "..." : stats.activeEvents, icon: Calendar, bgColor: "bg-green-50 dark:bg-green-950/30" },
          { label: "Tickets Sold", value: isLoading ? "..." : stats.totalTickets.toLocaleString(), icon: Users, bgColor: "bg-orange-50 dark:bg-orange-950/30" },
          { label: "Total Revenue", value: isLoading ? "..." : `${(stats.totalRevenue / 1000).toFixed(0)}K`, icon: TrendingUp, bgColor: "bg-purple-50 dark:bg-purple-950/30" },
        ].map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              className="rounded-2xl border border-border bg-card p-6 hover:border-[#8b5cf6]/30 transition-all"
            >
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", stat.bgColor)}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-3xl font-bold mb-1">{stat.value}</h3>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          )
        })}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Create Event", icon: Plus, gradient: "from-[#8b5cf6] to-[#7c3aed]", href: "/dashboard/events/create" },
            { label: "View Events", icon: Calendar, gradient: "from-blue-500 to-blue-600", href: "/dashboard/events" },
            { label: "Transactions", icon: Download, gradient: "from-green-500 to-green-600", href: "/dashboard/transactions" },
            { label: "Promotions", icon: Megaphone, gradient: "from-orange-500 to-orange-600", href: "/dashboard/promotions", enabled: ENABLE_PROMOTIONS },
          ].filter(action => action.enabled !== false).map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.label} href={action.href}>
                <motion.div whileHover={{ y: -4, scale: 1.02 }} className="group relative rounded-2xl bg-card border border-border p-6 hover:border-transparent transition-all cursor-pointer shadow-lg hover:shadow-2xl">
                  <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl", action.gradient)} />
                  <div className="relative">
                    <div className={cn("w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-md", action.gradient)}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <p className="text-base font-bold group-hover:text-white transition-colors">{action.label}</p>
                  </div>
                </motion.div>
              </Link>
            )
          })}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Upcoming Events</h2>
            <Link href="/dashboard/events" className="text-sm text-[#8b5cf6] hover:text-[#7c3aed] font-medium flex items-center gap-1">
              View All
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-4">
            {eventsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading events...</div>
            ) : upcomingEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No upcoming events</div>
            ) : (
              upcomingEvents.map((event) => {
                // Calculate total revenue for this event
                const totalRevenue = event.tickets.reduce(
                  (sum, ticket) => sum + (ticket.ticketPrice * ticket.soldQuantity),
                  0
                )
                // Calculate total tickets sold
                const totalTickets = event.tickets.reduce(
                  (sum, ticket) => sum + ticket.soldQuantity,
                  0
                )

                return (
                  <div key={event.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <div className="flex-1 min-w-0 pr-3">
                      <h3 className="font-semibold mb-1 truncate">{event.eventName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.eventStartDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{event.eventLocation}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{event.currency} {totalRevenue.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{totalTickets} tickets</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Recent Transactions</h2>
            <Link href="/dashboard/transactions" className="text-sm text-[#8b5cf6] hover:text-[#7c3aed] font-medium flex items-center gap-1">
              View All
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-4">
            {transactionsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>
            ) : recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No recent transactions</div>
            ) : (
              recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <div className="flex-1 min-w-0 pr-3">
                    <h3 className="font-semibold mb-1 truncate">
                      {transaction.eventName || 'Transaction'}
                      {transaction.ticketName && ` - ${transaction.ticketName}`}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(transaction.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    {transaction.customerName && (
                      <p className="text-xs text-muted-foreground mt-1">{transaction.customerName}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{transaction.currency} {transaction.amount.toLocaleString()}</p>
                    {transaction.quantity && (
                      <p className="text-sm text-muted-foreground">{transaction.quantity} ticket{transaction.quantity > 1 ? 's' : ''}</p>
                    )}
                    <div className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium mt-1",
                      transaction.status.toLowerCase() === "completed" || transaction.status.toLowerCase() === "success"
                        ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                        : transaction.status.toLowerCase() === "pending"
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
                        : "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                    )}>
                      {transaction.status}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

