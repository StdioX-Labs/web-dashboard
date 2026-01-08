"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Ticket,
  TrendingUp,
  Edit,
  Download,
  Plus,
  Eye,
  Filter,
  Search,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  Gift,
  Wallet,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

// Mock data - replace with actual API data
const eventData = {
  id: 1,
  name: "Summer Music Festival 2026",
  date: "2026-02-15",
  time: "18:00",
  venue: "Uhuru Gardens, Nairobi",
  description: "Join us for an unforgettable evening of music, culture, and celebration.",
  status: "active",
  balance: 135000,
  pendingBalance: 12000,
  totalRevenue: 147000,
  image: "/placeholder.jpg",
}

const ticketTypes = [
  {
    id: 1,
    name: "VIP Pass",
    price: 5000,
    totalAvailable: 100,
    sold: 85,
    revenue: 425000,
    status: "active",
  },
  {
    id: 2,
    name: "General Admission",
    price: 2000,
    totalAvailable: 300,
    sold: 265,
    revenue: 530000,
    status: "active",
  },
  {
    id: 3,
    name: "Early Bird",
    price: 1500,
    totalAvailable: 100,
    sold: 100,
    revenue: 150000,
    status: "sold_out",
  },
]

const transactions = [
  {
    id: "TXN001",
    buyer: "John Doe",
    email: "john@example.com",
    ticketType: "VIP Pass",
    quantity: 2,
    amount: 10000,
    date: "2026-01-05 14:30",
    status: "completed",
  },
  {
    id: "TXN002",
    buyer: "Jane Smith",
    email: "jane@example.com",
    ticketType: "General Admission",
    quantity: 4,
    amount: 8000,
    date: "2026-01-05 12:15",
    status: "completed",
  },
  {
    id: "TXN003",
    buyer: "Mike Johnson",
    email: "mike@example.com",
    ticketType: "VIP Pass",
    quantity: 1,
    amount: 5000,
    date: "2026-01-04 18:45",
    status: "pending",
  },
  {
    id: "TXN004",
    buyer: "Sarah Williams",
    email: "sarah@example.com",
    ticketType: "General Admission",
    quantity: 2,
    amount: 4000,
    date: "2026-01-04 10:20",
    status: "completed",
  },
]

const attendees = [
  {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    ticketType: "VIP Pass",
    ticketNumber: "VIP-001",
    purchaseDate: "2026-01-05",
    checkedIn: true,
    checkedInTime: "2026-02-15 18:15",
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane@example.com",
    ticketType: "General Admission",
    ticketNumber: "GA-045",
    purchaseDate: "2026-01-05",
    checkedIn: true,
    checkedInTime: "2026-02-15 18:30",
  },
  {
    id: 3,
    name: "Mike Johnson",
    email: "mike@example.com",
    ticketType: "VIP Pass",
    ticketNumber: "VIP-012",
    purchaseDate: "2026-01-04",
    checkedIn: false,
    checkedInTime: null,
  },
]

export default function EventDetailPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "tickets" | "transactions" | "attendees">("overview")
  const [showComplementaryModal, setShowComplementaryModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 max-w-[1600px] mx-auto">
      {/* Back Button */}
      <Link
        href="/dashboard/events"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Events
      </Link>

      {/* Event Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 sm:mb-8"
      >
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">{eventData.name}</h1>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(eventData.date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {eventData.time}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {eventData.venue}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-lg text-sm font-semibold hover:bg-red-200 dark:hover:bg-red-950/50 transition-all cursor-pointer border border-red-200 dark:border-red-900">
              Suspend Event
            </button>
            <Link
              href={`/dashboard/events/${eventData.id}/edit`}
              className="hidden lg:inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all duration-300 cursor-pointer"
            >
              <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Edit Event</span>
            </Link>
          </div>
        </div>

        {/* Pending Approval Notification */}
        {eventData.status === "pending" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 p-4 sm:p-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-orange-900 dark:text-orange-200 mb-1">
                    Pending Approval
                  </h3>
                  <p className="text-sm sm:text-base text-orange-800 dark:text-orange-300">
                    The SoldOutAfrica team is currently reviewing your event. You'll be notified once your event has been approved and is live on the platform.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs sm:text-sm text-orange-700 dark:text-orange-400">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                      <span className="font-medium">Under Review</span>
                    </div>
                    <span className="opacity-50">•</span>
                    <span className="opacity-75">Typically takes 24-48 hours</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Event Balance Card - Mobile friendly */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#6d28d9] via-[#7c3aed] to-[#5b21b6] p-4 sm:p-6 lg:p-8 text-white mb-6">
          <div className="absolute -right-8 -top-8 w-40 h-40 sm:w-64 sm:h-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-8 -bottom-8 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-black/20 blur-2xl" />

          <div className="relative z-10">
            <div className="max-w-4xl">
              {/* Total Revenue */}
              <div className="mb-4 sm:mb-6">
                <p className="text-xs sm:text-sm opacity-75 mb-1 sm:mb-2">Total Revenue</p>
                <p className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold break-words">
                  KES {eventData.totalRevenue.toLocaleString()}
                </p>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-4 sm:pt-6 border-t border-white/20">
                <div className="pb-4 border-b border-white/10 sm:border-b-0">
                  <p className="text-xs opacity-75 mb-1">Commission & Fees (12.5%)</p>
                  <p className="text-base sm:text-lg lg:text-xl xl:text-2xl font-semibold break-words">
                    - KES {(eventData.totalRevenue * 0.125).toLocaleString()}
                  </p>
                </div>
                <div className="sm:border-l sm:border-white/20 sm:pl-6">
                  <p className="text-xs opacity-75 mb-1">Net Amount</p>
                  <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-green-300 break-words">
                    KES {(eventData.totalRevenue * 0.875).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs - Better mobile styling */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { id: "overview", label: "Overview" },
              { id: "tickets", label: "Tickets" },
              { id: "transactions", label: "Transactions" },
              { id: "attendees", label: "Attendees" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as "overview" | "tickets" | "transactions" | "attendees")}
                className={cn(
                  "px-4 sm:px-6 py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0",
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white shadow-md"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-[#8b5cf6]/30"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Floating Edit Button - Mobile */}
      <Link
        href={`/dashboard/events/${eventData.id}/edit`}
        className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-full shadow-2xl shadow-[#8b5cf6]/40 flex items-center justify-center hover:scale-110 transition-all duration-300 cursor-pointer"
      >
        <Edit className="w-6 h-6" />
      </Link>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Event Image */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="relative w-full h-48 sm:h-64 lg:h-80 bg-gradient-to-br from-[#8b5cf6]/20 to-[#7c3aed]/20">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Calendar className="w-16 h-16 sm:w-24 sm:h-24 text-[#8b5cf6]/40" />
                </div>
                {/* Placeholder for actual event image */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
                  <h3 className="text-white text-xl sm:text-2xl font-bold">{eventData.name}</h3>
                  <p className="text-white/80 text-sm mt-1">{eventData.venue}</p>
                </div>
              </div>
            </div>

            {/* Event Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Event Information */}
              <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <h2 className="text-xl font-bold mb-4">Event Information</h2>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-base">{eventData.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="font-medium capitalize">{eventData.status}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Date & Time</p>
                    <p className="font-semibold">
                      {new Date(eventData.date).toLocaleDateString()} at {eventData.time}
                    </p>
                  </div>
                </div>
              </div>

              {/* Event Statistics */}
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-xl font-bold mb-4">Statistics</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-secondary/50">
                    <p className="text-sm text-muted-foreground mb-1">Total Tickets</p>
                    <p className="text-2xl font-bold">{ticketTypes.reduce((sum, t) => sum + t.totalAvailable, 0)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50">
                    <p className="text-sm text-muted-foreground mb-1">Tickets Sold</p>
                    <p className="text-2xl font-bold">{ticketTypes.reduce((sum, t) => sum + t.sold, 0)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50">
                    <p className="text-sm text-muted-foreground mb-1">Capacity</p>
                    <p className="text-2xl font-bold">
                      {Math.round(
                        (ticketTypes.reduce((sum, t) => sum + t.sold, 0) /
                          ticketTypes.reduce((sum, t) => sum + t.totalAvailable, 0)) *
                          100
                      )}
                      %
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50">
                    <p className="text-sm text-muted-foreground mb-1">Revenue</p>
                    <p className="text-2xl font-bold">KES {eventData.totalRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "tickets" && (
          <motion.div
            key="tickets"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Ticket Types Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-bold">Ticket Types</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowComplementaryModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all duration-300 cursor-pointer"
                >
                  <Gift className="w-4 h-4" />
                  Issue Comp Ticket
                </button>
              </div>
            </div>

            {/* Ticket Cards */}
            <div className="grid gap-4">
              {ticketTypes.map((ticket) => (
                <div
                  key={ticket.id}
                  className="rounded-2xl border border-border bg-card p-4 sm:p-6 hover:border-[#8b5cf6]/30 transition-all duration-300"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-lg font-bold">{ticket.name}</h3>
                          {ticket.status === "sold_out" && (
                            <span className="px-3 py-1 rounded-full bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs font-medium">
                              Sold Out
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button className="p-2 hover:bg-secondary rounded-lg transition-colors cursor-pointer" title="Edit Ticket">
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Price</p>
                          <p className="font-semibold">KES {ticket.price.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Sold</p>
                          <p className="font-semibold">
                            {ticket.sold} / {ticket.totalAvailable}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                          <p className="font-semibold">KES {ticket.revenue.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Remaining</p>
                          <p className="font-semibold">{ticket.totalAvailable - ticket.sold}</p>
                        </div>
                      </div>
                      <div className="mb-3">
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] transition-all duration-500"
                            style={{ width: `${(ticket.sold / ticket.totalAvailable) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button className="px-3 py-1.5 bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-200 dark:hover:bg-red-950/50 transition-colors cursor-pointer border border-red-200 dark:border-red-900">
                          Suspend Sales
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "transactions" && (
          <motion.div
            key="transactions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Search and Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                />
              </div>
              <button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all cursor-pointer">
                <Download className="w-4 h-4" />
                Export Transactions
              </button>
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block rounded-2xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left p-4 text-sm font-semibold">Transaction ID</th>
                      <th className="text-left p-4 text-sm font-semibold">Buyer</th>
                      <th className="text-left p-4 text-sm font-semibold">Ticket Type</th>
                      <th className="text-left p-4 text-sm font-semibold">Qty</th>
                      <th className="text-left p-4 text-sm font-semibold">Amount</th>
                      <th className="text-left p-4 text-sm font-semibold">Date</th>
                      <th className="text-left p-4 text-sm font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((txn) => (
                      <tr key={txn.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                        <td className="p-4 text-sm font-medium">{txn.id}</td>
                        <td className="p-4">
                          <div>
                            <p className="text-sm font-medium">{txn.buyer}</p>
                            <p className="text-xs text-muted-foreground">{txn.email}</p>
                          </div>
                        </td>
                        <td className="p-4 text-sm">{txn.ticketType}</td>
                        <td className="p-4 text-sm">{txn.quantity}</td>
                        <td className="p-4 text-sm font-semibold">KES {txn.amount.toLocaleString()}</td>
                        <td className="p-4 text-sm text-muted-foreground">{txn.date}</td>
                        <td className="p-4">
                          {txn.status === "completed" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-xs font-medium">
                              <CheckCircle className="w-3 h-3" />
                              Completed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 text-xs font-medium">
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
              {transactions.map((txn) => (
                <div key={txn.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Transaction ID</p>
                      <p className="font-semibold">{txn.id}</p>
                    </div>
                    {txn.status === "completed" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-xs font-medium">
                        <CheckCircle className="w-3 h-3" />
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 text-xs font-medium">
                        <Clock className="w-3 h-3" />
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Buyer</p>
                      <p className="text-sm font-medium">{txn.buyer}</p>
                      <p className="text-xs text-muted-foreground">{txn.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Amount</p>
                      <p className="text-sm font-bold">KES {txn.amount.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Ticket Type</p>
                      <p className="text-sm">{txn.ticketType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Quantity</p>
                      <p className="text-sm">{txn.quantity}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Date</p>
                    <p className="text-sm">{txn.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "attendees" && (
          <motion.div
            key="attendees"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Search and Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search attendees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                />
              </div>
              <button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all cursor-pointer">
                <Download className="w-4 h-4" />
                Export Attendees
              </button>
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block rounded-2xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left p-4 text-sm font-semibold">Name</th>
                      <th className="text-left p-4 text-sm font-semibold">Email</th>
                      <th className="text-left p-4 text-sm font-semibold">Ticket Type</th>
                      <th className="text-left p-4 text-sm font-semibold">Ticket #</th>
                      <th className="text-left p-4 text-sm font-semibold">Purchase Date</th>
                      <th className="text-left p-4 text-sm font-semibold">Check-in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendees.map((attendee) => (
                      <tr key={attendee.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                        <td className="p-4 text-sm font-medium">{attendee.name}</td>
                        <td className="p-4 text-sm text-muted-foreground">{attendee.email}</td>
                        <td className="p-4 text-sm">{attendee.ticketType}</td>
                        <td className="p-4 text-sm font-mono">{attendee.ticketNumber}</td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {new Date(attendee.purchaseDate).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          {attendee.checkedIn ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-xs font-medium">
                                <CheckCircle className="w-3 h-3" />
                                Checked In
                              </span>
                              <p className="text-xs text-muted-foreground mt-1">{attendee.checkedInTime}</p>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-muted-foreground text-xs font-medium">
                              <XCircle className="w-3 h-3" />
                              Not Checked In
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
              {attendees.map((attendee) => (
                <div key={attendee.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{attendee.name}</p>
                      <p className="text-sm text-muted-foreground">{attendee.email}</p>
                    </div>
                    {attendee.checkedIn ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-xs font-medium">
                        <CheckCircle className="w-3 h-3" />
                        Checked In
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-muted-foreground text-xs font-medium">
                        <XCircle className="w-3 h-3" />
                        Not Checked In
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Ticket Type</p>
                      <p className="text-sm">{attendee.ticketType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Ticket Number</p>
                      <p className="text-sm font-mono">{attendee.ticketNumber}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Purchase Date</p>
                      <p className="text-sm">{new Date(attendee.purchaseDate).toLocaleDateString()}</p>
                    </div>
                    {attendee.checkedIn && attendee.checkedInTime && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Check-in Time</p>
                        <p className="text-sm">{attendee.checkedInTime}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Complementary Ticket Modal */}
      <AnimatePresence>
        {showComplementaryModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowComplementaryModal(false)}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-2xl border border-border p-6 z-50 shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-4">Issue Complimentary Ticket</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Recipient Email</label>
                  <input
                    type="email"
                    placeholder="recipient@example.com"
                    className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Ticket Type</label>
                  <select className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all">
                    {ticketTypes.map((ticket) => (
                      <option key={ticket.id} value={ticket.id}>
                        {ticket.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    defaultValue="1"
                    className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowComplementaryModal(false)}
                    className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl font-semibold text-sm hover:bg-secondary/80 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Handle issue ticket
                      setShowComplementaryModal(false)
                    }}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all cursor-pointer"
                  >
                    Issue Ticket
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

