"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import {
  Zap,
  Tag,
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  Calendar,
  Percent,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  X,
  Eye,
  MoreVertical,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { DateTimePicker } from "@/components/ui/date-time-picker"

// Mock data for flash sales
const flashSalesData = [
  {
    id: 1,
    name: "Early Bird Special",
    eventName: "Summer Music Festival 2026",
    discount: 30,
    status: "active",
    startDate: "2026-01-15T00:00:00",
    endDate: "2026-02-01T23:59:59",
    ticketsUsed: 45,
    ticketsLimit: 100,
    revenue: 40500,
  },
  {
    id: 2,
    name: "Weekend Flash Sale",
    eventName: "Tech Conference Nairobi",
    discount: 20,
    status: "scheduled",
    startDate: "2026-01-20T00:00:00",
    endDate: "2026-01-22T23:59:59",
    ticketsUsed: 0,
    ticketsLimit: 50,
    revenue: 0,
  },
  {
    id: 3,
    name: "Last Minute Deal",
    eventName: "Jazz Night Live",
    discount: 15,
    status: "expired",
    startDate: "2026-01-01T00:00:00",
    endDate: "2026-01-05T23:59:59",
    ticketsUsed: 30,
    ticketsLimit: 30,
    revenue: 25500,
  },
]

// Mock data for promo codes
const promoCodesData = [
  {
    id: 1,
    code: "SUMMER2026",
    eventName: "Summer Music Festival 2026",
    discount: 25,
    status: "active",
    usageCount: 67,
    usageLimit: 100,
    expiryDate: "2026-02-14T23:59:59",
    revenue: 60375,
  },
  {
    id: 2,
    code: "VIPACCESS",
    eventName: "Tech Conference Nairobi",
    discount: 20,
    status: "active",
    usageCount: 12,
    usageLimit: 20,
    expiryDate: "2026-02-19T23:59:59",
    revenue: 36000,
  },
  {
    id: 3,
    code: "EARLYBIRD",
    eventName: "Food & Wine Expo",
    discount: 15,
    status: "scheduled",
    usageCount: 0,
    usageLimit: 50,
    expiryDate: "2026-02-28T23:59:59",
    revenue: 0,
  },
  {
    id: 4,
    code: "WELCOME10",
    eventName: "All Events",
    discount: 10,
    status: "active",
    usageCount: 234,
    usageLimit: null,
    expiryDate: "2026-12-31T23:59:59",
    revenue: 175500,
  },
]

type TabType = "flash-sales" | "promo-codes"

interface TicketType {
  id: string
  name: string
  price: number
  available: number
}

interface FlashSaleFormData {
  name: string
  eventId: string
  ticketTypeId: string
  originalPrice: string
  discountedPrice: string
  calculatedDiscount: number
  startDate: Date | undefined
  endDate: Date | undefined
  ticketsLimit: string
  description: string
}

interface PromoCodeFormData {
  code: string
  eventId: string
  ticketTypeId: string
  originalPrice: string
  discountedPrice: string
  calculatedDiscount: number
  usageLimit: string
  expiryDate: Date | undefined
  description: string
}

export default function PromotionsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("flash-sales")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "scheduled" | "expired">("all")

  // Modal states
  const [showFlashSaleModal, setShowFlashSaleModal] = useState(false)
  const [showPromoCodeModal, setShowPromoCodeModal] = useState(false)
  const [editingFlashSale, setEditingFlashSale] = useState<any>(null)
  const [editingPromoCode, setEditingPromoCode] = useState<any>(null)

  // Mock events with ticket types - replace with actual API data
  const eventsWithTickets = [
    {
      id: "1",
      name: "Summer Music Festival 2026",
      tickets: [
        { id: "1-1", name: "General Admission", price: 3000, available: 200 },
        { id: "1-2", name: "VIP Pass", price: 7500, available: 50 },
        { id: "1-3", name: "Early Bird", price: 2500, available: 100 },
      ],
    },
    {
      id: "2",
      name: "Tech Conference Nairobi",
      tickets: [
        { id: "2-1", name: "Standard Pass", price: 5000, available: 150 },
        { id: "2-2", name: "Premium Pass", price: 10000, available: 50 },
        { id: "2-3", name: "Student Ticket", price: 2500, available: 100 },
      ],
    },
    {
      id: "3",
      name: "Food & Wine Expo",
      tickets: [
        { id: "3-1", name: "Regular Entry", price: 2000, available: 200 },
        { id: "3-2", name: "Tasting Package", price: 4500, available: 80 },
      ],
    },
  ]

  const [selectedEvent, setSelectedEvent] = useState<typeof eventsWithTickets[0] | null>(null)
  const [availableTickets, setAvailableTickets] = useState<TicketType[]>([])

  // Form states
  const [flashSaleForm, setFlashSaleForm] = useState<FlashSaleFormData>({
    name: "",
    eventId: "",
    ticketTypeId: "",
    originalPrice: "",
    discountedPrice: "",
    calculatedDiscount: 0,
    startDate: undefined,
    endDate: undefined,
    ticketsLimit: "",
    description: "",
  })

  const [promoCodeForm, setPromoCodeForm] = useState<PromoCodeFormData>({
    code: "",
    eventId: "",
    ticketTypeId: "",
    originalPrice: "",
    discountedPrice: "",
    calculatedDiscount: 0,
    usageLimit: "",
    expiryDate: undefined,
    description: "",
  })

  // Update available tickets when event changes
  const handleEventChange = (eventId: string, isFlashSale: boolean) => {
    const event = eventsWithTickets.find(e => e.id === eventId)
    if (event) {
      setSelectedEvent(event)
      setAvailableTickets(event.tickets)

      if (isFlashSale) {
        setFlashSaleForm(prev => ({
          ...prev,
          eventId,
          ticketTypeId: "",
          originalPrice: "",
          discountedPrice: "",
          calculatedDiscount: 0,
        }))
      } else {
        setPromoCodeForm(prev => ({
          ...prev,
          eventId,
          ticketTypeId: "",
          originalPrice: "",
          discountedPrice: "",
          calculatedDiscount: 0,
        }))
      }
    }
  }

  // Update original price when ticket type changes
  const handleTicketTypeChange = (ticketTypeId: string, isFlashSale: boolean) => {
    const ticket = availableTickets.find(t => t.id === ticketTypeId)
    if (ticket) {
      if (isFlashSale) {
        setFlashSaleForm(prev => ({
          ...prev,
          ticketTypeId,
          originalPrice: ticket.price.toString(),
          discountedPrice: "",
          calculatedDiscount: 0,
        }))
      } else {
        setPromoCodeForm(prev => ({
          ...prev,
          ticketTypeId,
          originalPrice: ticket.price.toString(),
          discountedPrice: "",
          calculatedDiscount: 0,
        }))
      }
    }
  }

  // Calculate discount percentage based on original and discounted price
  const calculateDiscount = (originalPrice: number, discountedPrice: number): number => {
    if (originalPrice <= 0 || discountedPrice < 0 || discountedPrice >= originalPrice) return 0
    return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100)
  }

  // Handle discounted price change
  const handleDiscountedPriceChange = (value: string, isFlashSale: boolean) => {
    const discountedPrice = parseFloat(value) || 0

    if (isFlashSale) {
      const originalPrice = parseFloat(flashSaleForm.originalPrice) || 0
      const calculatedDiscount = calculateDiscount(originalPrice, discountedPrice)
      setFlashSaleForm(prev => ({
        ...prev,
        discountedPrice: value,
        calculatedDiscount,
      }))
    } else {
      const originalPrice = parseFloat(promoCodeForm.originalPrice) || 0
      const calculatedDiscount = calculateDiscount(originalPrice, discountedPrice)
      setPromoCodeForm(prev => ({
        ...prev,
        discountedPrice: value,
        calculatedDiscount,
      }))
    }
  }

  // Filter data
  const filteredFlashSales = flashSalesData.filter((sale) => {
    const matchesSearch = sale.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.eventName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || sale.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const filteredPromoCodes = promoCodesData.filter((promo) => {
    const matchesSearch = promo.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      promo.eventName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || promo.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const openFlashSaleModal = (sale?: any) => {
    if (sale) {
      setEditingFlashSale(sale)
      const event = eventsWithTickets.find(e => e.id === "1")
      if (event) {
        setSelectedEvent(event)
        setAvailableTickets(event.tickets)
      }
      setFlashSaleForm({
        name: sale.name,
        eventId: "1",
        ticketTypeId: "1-1",
        originalPrice: "3000",
        discountedPrice: "2100",
        calculatedDiscount: sale.discount,
        startDate: new Date(sale.startDate),
        endDate: new Date(sale.endDate),
        ticketsLimit: sale.ticketsLimit.toString(),
        description: "",
      })
    } else {
      setEditingFlashSale(null)
      setSelectedEvent(null)
      setAvailableTickets([])
      setFlashSaleForm({
        name: "",
        eventId: "",
        ticketTypeId: "",
        originalPrice: "",
        discountedPrice: "",
        calculatedDiscount: 0,
        startDate: undefined,
        endDate: undefined,
        ticketsLimit: "",
        description: "",
      })
    }
    setShowFlashSaleModal(true)
  }

  const openPromoCodeModal = (promo?: any) => {
    if (promo) {
      setEditingPromoCode(promo)
      const event = eventsWithTickets.find(e => e.id === "1")
      if (event) {
        setSelectedEvent(event)
        setAvailableTickets(event.tickets)
      }
      setPromoCodeForm({
        code: promo.code,
        eventId: "1",
        ticketTypeId: "1-1",
        originalPrice: "3000",
        discountedPrice: "2250",
        calculatedDiscount: promo.discount,
        usageLimit: promo.usageLimit?.toString() || "",
        expiryDate: new Date(promo.expiryDate),
        description: "",
      })
    } else {
      setEditingPromoCode(null)
      setSelectedEvent(null)
      setAvailableTickets([])
      setPromoCodeForm({
        code: "",
        eventId: "",
        ticketTypeId: "",
        originalPrice: "",
        discountedPrice: "",
        calculatedDiscount: 0,
        usageLimit: "",
        expiryDate: undefined,
        description: "",
      })
    }
    setShowPromoCodeModal(true)
  }

  const handleFlashSaleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!flashSaleForm.name || !flashSaleForm.eventId || !flashSaleForm.ticketTypeId ||
        !flashSaleForm.discountedPrice || !flashSaleForm.startDate || !flashSaleForm.endDate ||
        !flashSaleForm.ticketsLimit) {
      toast.error("Please fill in all required fields")
      return
    }

    const originalPrice = parseFloat(flashSaleForm.originalPrice)
    const discountedPrice = parseFloat(flashSaleForm.discountedPrice)

    if (discountedPrice >= originalPrice) {
      toast.error("Discounted price must be less than original price")
      return
    }

    if (discountedPrice <= 0) {
      toast.error("Discounted price must be greater than 0")
      return
    }

    toast.success(
      editingFlashSale
        ? "Flash sale updated successfully!"
        : `Flash sale created successfully with ${flashSaleForm.calculatedDiscount}% discount!`
    )
    setShowFlashSaleModal(false)
    setEditingFlashSale(null)
  }

  const handlePromoCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!promoCodeForm.code || !promoCodeForm.eventId || !promoCodeForm.ticketTypeId ||
        !promoCodeForm.discountedPrice || !promoCodeForm.expiryDate) {
      toast.error("Please fill in all required fields")
      return
    }

    const originalPrice = parseFloat(promoCodeForm.originalPrice)
    const discountedPrice = parseFloat(promoCodeForm.discountedPrice)

    if (discountedPrice >= originalPrice) {
      toast.error("Discounted price must be less than original price")
      return
    }

    if (discountedPrice <= 0) {
      toast.error("Discounted price must be greater than 0")
      return
    }

    toast.success(
      editingPromoCode
        ? "Promo code updated successfully!"
        : `Promo code created successfully with ${promoCodeForm.calculatedDiscount}% discount!`
    )
    setShowPromoCodeModal(false)
    setEditingPromoCode(null)
  }

  const handleDelete = (type: "flash-sale" | "promo-code", id: number) => {
    if (confirm(`Are you sure you want to delete this ${type === "flash-sale" ? "flash sale" : "promo code"}?`)) {
      toast.success(`${type === "flash-sale" ? "Flash sale" : "Promo code"} deleted successfully`)
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success("Promo code copied to clipboard!")
  }

  const getStatusBadge = (status: string) => {
    if (status === "active") {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-xs font-medium border border-green-200 dark:border-green-900">
          <CheckCircle className="w-3 h-3" />
          Active
        </div>
      )
    } else if (status === "scheduled") {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-xs font-medium border border-blue-200 dark:border-blue-900">
          <Clock className="w-3 h-3" />
          Scheduled
        </div>
      )
    } else if (status === "expired") {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-950/30 text-gray-700 dark:text-gray-400 text-xs font-medium border border-gray-200 dark:border-gray-900">
          <XCircle className="w-3 h-3" />
          Expired
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
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">Promotions</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Create and manage flash sales and promo codes for your events
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("flash-sales")}
            className={cn(
              "flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200",
              activeTab === "flash-sales"
                ? "bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white shadow-lg shadow-[#8b5cf6]/25"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-[#8b5cf6]/30"
            )}
          >
            <Zap className="w-4 h-4" />
            Flash Sales
          </button>
          <button
            onClick={() => setActiveTab("promo-codes")}
            className={cn(
              "flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200",
              activeTab === "promo-codes"
                ? "bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white shadow-lg shadow-[#8b5cf6]/25"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-[#8b5cf6]/30"
            )}
          >
            <Tag className="w-4 h-4" />
            Promo Codes
          </button>
        </div>
      </motion.div>

      {/* Search and Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4"
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder={`Search ${activeTab === "flash-sales" ? "flash sales" : "promo codes"}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { label: "All", value: "all" },
            { label: "Active", value: "active" },
            { label: "Scheduled", value: "scheduled" },
            { label: "Expired", value: "expired" },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value as any)}
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

        {/* Create Button */}
        <button
          onClick={() => activeTab === "flash-sales" ? openFlashSaleModal() : openPromoCodeModal()}
          className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all duration-300 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Create {activeTab === "flash-sales" ? "Flash Sale" : "Promo Code"}
        </button>
      </motion.div>

      {/* Flash Sales Tab Content */}
      {activeTab === "flash-sales" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {filteredFlashSales.length === 0 ? (
            <div className="text-center py-12 sm:py-16 rounded-2xl border border-dashed border-border bg-card/50">
              <Zap className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2">No flash sales found</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Create your first flash sale to boost ticket sales"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <button
                  onClick={() => openFlashSaleModal()}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all duration-300"
                >
                  <Plus className="w-5 h-5" />
                  Create Flash Sale
                </button>
              )}
            </div>
          ) : (
            filteredFlashSales.map((sale, index) => (
              <motion.div
                key={sale.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="rounded-xl sm:rounded-2xl border border-border bg-card hover:shadow-lg transition-all duration-300"
              >
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-2">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] flex items-center justify-center flex-shrink-0">
                            <Zap className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold mb-1">{sale.name}</h3>
                            <p className="text-sm text-muted-foreground">{sale.eventName}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(sale.status)}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openFlashSaleModal(sale)}
                            className="p-2 hover:bg-secondary rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete("flash-sale", sale.id)}
                            className="p-2 hover:bg-secondary rounded-lg transition-colors text-red-500"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground mb-1">Discount</p>
                        <p className="text-lg font-bold text-[#8b5cf6]">{sale.discount}%</p>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground mb-1">Tickets Used</p>
                        <p className="text-lg font-bold">
                          {sale.ticketsUsed} / {sale.ticketsLimit}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                        <p className="text-lg font-bold">KES {sale.revenue.toLocaleString()}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground mb-1">Usage Rate</p>
                        <p className="text-lg font-bold">
                          {Math.round((sale.ticketsUsed / sale.ticketsLimit) * 100)}%
                        </p>
                      </div>
                    </div>

                    {/* Date Range */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(sale.startDate).toLocaleDateString()} -{" "}
                        {new Date(sale.endDate).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    {sale.status === "active" && (
                      <div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] transition-all duration-500"
                            style={{ width: `${(sale.ticketsUsed / sale.ticketsLimit) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      )}

      {/* Promo Codes Tab Content */}
      {activeTab === "promo-codes" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {filteredPromoCodes.length === 0 ? (
            <div className="text-center py-12 sm:py-16 rounded-2xl border border-dashed border-border bg-card/50">
              <Tag className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2">No promo codes found</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Create your first promo code to reward your customers"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <button
                  onClick={() => openPromoCodeModal()}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all duration-300"
                >
                  <Plus className="w-5 h-5" />
                  Create Promo Code
                </button>
              )}
            </div>
          ) : (
            filteredPromoCodes.map((promo, index) => (
              <motion.div
                key={promo.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="rounded-xl sm:rounded-2xl border border-border bg-card hover:shadow-lg transition-all duration-300"
              >
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-2">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] flex items-center justify-center flex-shrink-0">
                            <Tag className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-bold font-mono">{promo.code}</h3>
                              <button
                                onClick={() => handleCopyCode(promo.code)}
                                className="p-1 hover:bg-secondary rounded transition-colors"
                                title="Copy code"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="text-sm text-muted-foreground">{promo.eventName}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(promo.status)}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openPromoCodeModal(promo)}
                            className="p-2 hover:bg-secondary rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete("promo-code", promo.id)}
                            className="p-2 hover:bg-secondary rounded-lg transition-colors text-red-500"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground mb-1">Discount</p>
                        <p className="text-lg font-bold text-[#8b5cf6]">
                          {promo.discount}%
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground mb-1">Usage</p>
                        <p className="text-lg font-bold">
                          {promo.usageCount} {promo.usageLimit ? `/ ${promo.usageLimit}` : ""}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                        <p className="text-lg font-bold">KES {promo.revenue.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Expiry Date */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Expires: {new Date(promo.expiryDate).toLocaleDateString()}</span>
                    </div>

                    {/* Progress Bar (if has usage limit) */}
                    {promo.usageLimit && promo.status === "active" && (
                      <div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] transition-all duration-500"
                            style={{ width: `${(promo.usageCount / promo.usageLimit) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      )}

      {/* Flash Sale Modal */}
      {showFlashSaleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {editingFlashSale ? "Edit Flash Sale" : "Create Flash Sale"}
              </h2>
              <button
                onClick={() => setShowFlashSaleModal(false)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFlashSaleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Flash Sale Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={flashSaleForm.name}
                  onChange={(e) => setFlashSaleForm({ ...flashSaleForm, name: e.target.value })}
                  placeholder="e.g., Early Bird Special"
                  className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Event <span className="text-red-500">*</span>
                </label>
                <select
                  value={flashSaleForm.eventId}
                  onChange={(e) => handleEventChange(e.target.value, true)}
                  className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all appearance-none cursor-pointer"
                  required
                >
                  <option value="">Select an event</option>
                  {eventsWithTickets.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>

              {flashSaleForm.eventId && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Ticket Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={flashSaleForm.ticketTypeId}
                    onChange={(e) => handleTicketTypeChange(e.target.value, true)}
                    className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all appearance-none cursor-pointer"
                    required
                  >
                    <option value="">Select a ticket type</option>
                    {availableTickets.map((ticket) => (
                      <option key={ticket.id} value={ticket.id}>
                        {ticket.name} - KES {ticket.price.toLocaleString()} ({ticket.available} available)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {flashSaleForm.ticketTypeId && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Original Price</label>
                      <div className="w-full h-12 px-4 rounded-xl border border-border bg-secondary/50 text-sm flex items-center text-muted-foreground">
                        KES {parseFloat(flashSaleForm.originalPrice || "0").toLocaleString()}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Discounted Price <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max={parseFloat(flashSaleForm.originalPrice) - 1}
                          value={flashSaleForm.discountedPrice}
                          onChange={(e) => handleDiscountedPriceChange(e.target.value, true)}
                          placeholder="2000"
                          className="w-full h-12 px-4 pr-14 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                          required
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium">
                          KES
                        </div>
                      </div>
                    </div>
                  </div>

                  {flashSaleForm.calculatedDiscount > 0 && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-[#8b5cf6]/10 to-[#7c3aed]/10 border border-[#8b5cf6]/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Calculated Discount</p>
                          <p className="text-2xl font-bold text-[#8b5cf6]">{flashSaleForm.calculatedDiscount}% OFF</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground mb-1">Customer Saves</p>
                          <p className="text-xl font-bold text-green-600">
                            KES {(parseFloat(flashSaleForm.originalPrice) - parseFloat(flashSaleForm.discountedPrice || "0")).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Start Date & Time <span className="text-red-500">*</span>
                  </label>
                  <DateTimePicker
                    selected={flashSaleForm.startDate}
                    onChange={(date) => setFlashSaleForm({ ...flashSaleForm, startDate: date })}
                    placeholderText="Select start date"
                    minDate={new Date()}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    End Date & Time <span className="text-red-500">*</span>
                  </label>
                  <DateTimePicker
                    selected={flashSaleForm.endDate}
                    onChange={(date) => setFlashSaleForm({ ...flashSaleForm, endDate: date })}
                    placeholderText="Select end date"
                    minDate={flashSaleForm.startDate || new Date()}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Ticket Limit <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={flashSaleForm.ticketsLimit}
                  onChange={(e) => setFlashSaleForm({ ...flashSaleForm, ticketsLimit: e.target.value })}
                  placeholder="100"
                  className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum number of tickets that can be sold at this discounted price
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
                <textarea
                  value={flashSaleForm.description}
                  onChange={(e) => setFlashSaleForm({ ...flashSaleForm, description: e.target.value })}
                  placeholder="Add any additional details about this flash sale..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowFlashSaleModal(false)}
                  className="flex-1 px-6 py-3 rounded-xl border border-border hover:bg-secondary transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all"
                >
                  {editingFlashSale ? "Update Flash Sale" : "Create Flash Sale"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Promo Code Modal */}
      {showPromoCodeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {editingPromoCode ? "Edit Promo Code" : "Create Promo Code"}
              </h2>
              <button
                onClick={() => setShowPromoCodeModal(false)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePromoCodeSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Promo Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={promoCodeForm.code}
                  onChange={(e) => setPromoCodeForm({ ...promoCodeForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., SUMMER2026"
                  className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all font-mono"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use uppercase letters, numbers, and hyphens only
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Event <span className="text-red-500">*</span>
                </label>
                <select
                  value={promoCodeForm.eventId}
                  onChange={(e) => handleEventChange(e.target.value, false)}
                  className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all appearance-none cursor-pointer"
                  required
                >
                  <option value="">Select an event</option>
                  {eventsWithTickets.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>

              {promoCodeForm.eventId && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Ticket Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={promoCodeForm.ticketTypeId}
                    onChange={(e) => handleTicketTypeChange(e.target.value, false)}
                    className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all appearance-none cursor-pointer"
                    required
                  >
                    <option value="">Select a ticket type</option>
                    {availableTickets.map((ticket) => (
                      <option key={ticket.id} value={ticket.id}>
                        {ticket.name} - KES {ticket.price.toLocaleString()} ({ticket.available} available)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {promoCodeForm.ticketTypeId && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Original Price</label>
                      <div className="w-full h-12 px-4 rounded-xl border border-border bg-secondary/50 text-sm flex items-center text-muted-foreground">
                        KES {parseFloat(promoCodeForm.originalPrice || "0").toLocaleString()}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Discounted Price <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max={parseFloat(promoCodeForm.originalPrice) - 1}
                          value={promoCodeForm.discountedPrice}
                          onChange={(e) => handleDiscountedPriceChange(e.target.value, false)}
                          placeholder="2000"
                          className="w-full h-12 px-4 pr-14 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                          required
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium">
                          KES
                        </div>
                      </div>
                    </div>
                  </div>

                  {promoCodeForm.calculatedDiscount > 0 && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-[#8b5cf6]/10 to-[#7c3aed]/10 border border-[#8b5cf6]/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Calculated Discount</p>
                          <p className="text-2xl font-bold text-[#8b5cf6]">{promoCodeForm.calculatedDiscount}% OFF</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground mb-1">Customer Saves</p>
                          <p className="text-xl font-bold text-green-600">
                            KES {(parseFloat(promoCodeForm.originalPrice) - parseFloat(promoCodeForm.discountedPrice || "0")).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Expiry Date <span className="text-red-500">*</span>
                </label>
                <DateTimePicker
                  selected={promoCodeForm.expiryDate}
                  onChange={(date) => setPromoCodeForm({ ...promoCodeForm, expiryDate: date })}
                  placeholderText="Select expiry date"
                  minDate={new Date()}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Usage Limit (Optional)</label>
                <input
                  type="number"
                  min="1"
                  value={promoCodeForm.usageLimit}
                  onChange={(e) => setPromoCodeForm({ ...promoCodeForm, usageLimit: e.target.value })}
                  placeholder="Leave empty for unlimited uses"
                  className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum number of times this code can be used
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
                <textarea
                  value={promoCodeForm.description}
                  onChange={(e) => setPromoCodeForm({ ...promoCodeForm, description: e.target.value })}
                  placeholder="Add any additional details about this promo code..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPromoCodeModal(false)}
                  className="flex-1 px-6 py-3 rounded-xl border border-border hover:bg-secondary transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all"
                >
                  {editingPromoCode ? "Update Promo Code" : "Create Promo Code"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}

