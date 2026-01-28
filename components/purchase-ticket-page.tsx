"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ShoppingCart, Ticket, Calendar, Plus, Minus, CreditCard, Smartphone, Loader2, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { api } from "@/lib/api-client"
import { sessionManager } from "@/lib/session-manager"

interface Event {
  id: number
  name: string
  date: string
  location: string
  status: string
}

interface TicketType {
  id: number
  ticketName: string
  ticketPrice: number
  quantityAvailable: number
  isActive: boolean
}

export default function PurchaseTicketPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [tickets, setTickets] = useState<TicketType[]>([])
  const [selectedTickets, setSelectedTickets] = useState<{ ticketId: number; quantity: number }[]>([])
  const [isLoadingEvents, setIsLoadingEvents] = useState(true)
  const [isLoadingTickets, setIsLoadingTickets] = useState(false)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [channel, setChannel] = useState<"mpesa" | "card">("mpesa")

  // Customer info
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [couponCode, setCouponCode] = useState("")

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    if (selectedEvent) {
      fetchTickets(selectedEvent.id)
    }
  }, [selectedEvent])

  const fetchEvents = async () => {
    try {
      const user = sessionManager.getUser()
      if (!user || !user.company_id) {
        toast.error("Unable to identify company")
        setIsLoadingEvents(false)
        return
      }

      const response = await api.company.getEvents()

      if (response.events) {
        // Filter for active events only
        const activeEvents = response.events
          .filter((event) => event.isActive)
          .map((event) => ({
            id: event.id,
            name: event.eventName,
            date: event.eventStartDate,
            location: event.eventLocation,
            status: event.isActive ? 'ACTIVE' : 'INACTIVE',
          }))

        setEvents(activeEvents)

        if (activeEvents.length === 0) {
          toast.info("No active events available")
        }
      } else {
        toast.error("Failed to load events")
      }
    } catch (error) {
      console.error("Error fetching events:", error)
      toast.error("Failed to load events")
    } finally {
      setIsLoadingEvents(false)
    }
  }

  const fetchTickets = async (eventId: number) => {
    setIsLoadingTickets(true)
    try {
      const response = await api.event.getById(eventId)

      if (response.status && response.event?.tickets) {
        // Filter for active tickets with available quantity
        const availableTickets = response.event.tickets
          .filter((ticket) =>
            ticket.isActive &&
            ticket.quantityAvailable > 0
          )
          .map((ticket) => ({
            id: ticket.id,
            ticketName: ticket.ticketName,
            ticketPrice: ticket.ticketPrice,
            quantityAvailable: ticket.quantityAvailable,
            isActive: ticket.isActive,
          }))

        setTickets(availableTickets)
        setSelectedTickets([])

        if (availableTickets.length === 0) {
          toast.info("No available tickets for this event")
        }
      } else {
        toast.error("Failed to load tickets")
        setTickets([])
      }
    } catch (error) {
      console.error("Error fetching tickets:", error)
      toast.error("Failed to load tickets")
      setTickets([])
    } finally {
      setIsLoadingTickets(false)
    }
  }

  const handleQuantityChange = (ticketId: number, delta: number) => {
    const ticket = tickets.find(t => t.id === ticketId)
    if (!ticket) return

    const currentItem = selectedTickets.find(t => t.ticketId === ticketId)
    const currentQuantity = currentItem?.quantity || 0
    const newQuantity = currentQuantity + delta

    if (newQuantity < 0 || newQuantity > ticket.quantityAvailable) {
      return
    }

    if (newQuantity === 0) {
      setSelectedTickets(selectedTickets.filter(t => t.ticketId !== ticketId))
    } else {
      if (currentItem) {
        setSelectedTickets(selectedTickets.map(t =>
          t.ticketId === ticketId ? { ...t, quantity: newQuantity } : t
        ))
      } else {
        setSelectedTickets([...selectedTickets, { ticketId, quantity: newQuantity }])
      }
    }
  }

  const calculateTotal = () => {
    return selectedTickets.reduce((total, item) => {
      const ticket = tickets.find(t => t.id === item.ticketId)
      return total + (ticket ? ticket.ticketPrice * item.quantity : 0)
    }, 0)
  }

  const handlePurchase = async () => {
    if (!selectedEvent) {
      toast.error("Please select an event")
      return
    }

    if (selectedTickets.length === 0) {
      toast.error("Please select at least one ticket")
      return
    }

    if (!customerEmail || !customerPhone) {
      toast.error("Please provide customer email and phone number")
      return
    }

    // Validate phone number format
    const phoneRegex = /^254\d{9}$/
    if (!phoneRegex.test(customerPhone)) {
      toast.error("Phone number must be in format: 254XXXXXXXXX")
      return
    }

    setIsPurchasing(true)

    try {
      const purchaseData = {
        eventId: selectedEvent.id,
        amountDisplayed: calculateTotal(),
        coupon_code: couponCode || "",
        channel,
        customer: {
          mobile_number: customerPhone,
          email: customerEmail,
        },
        tickets: selectedTickets,
      }

      const response = await api.ticket.purchase(purchaseData)

      if (response.status) {
        toast.success(response.message || "Ticket purchase initiated successfully!")
        // Reset form
        setSelectedTickets([])
        setCustomerEmail("")
        setCustomerPhone("")
        setCouponCode("")
      } else {
        toast.error(response.message || "Failed to purchase tickets")
      }
    } catch (error) {
      console.error("Error purchasing tickets:", error)
      toast.error("An error occurred while purchasing tickets")
    } finally {
      setIsPurchasing(false)
    }
  }

  const totalAmount = calculateTotal()

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold mb-2 flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-[#8b5cf6]" />
            Purchase Tickets
          </h1>
          <p className="text-muted-foreground">Select an event and tickets to purchase</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Selection */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl border border-border p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#8b5cf6]" />
                Select Event
              </h2>

              {isLoadingEvents ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#8b5cf6]" />
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No active events available</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {events.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={cn(
                        "text-left p-4 rounded-xl border-2 transition-all",
                        selectedEvent?.id === event.id
                          ? "border-[#8b5cf6] bg-[#8b5cf6]/5"
                          : "border-border hover:border-[#8b5cf6]/50"
                      )}
                    >
                      <div className="font-semibold">{event.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {event.date} • {event.location}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Ticket Selection */}
            {selectedEvent && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl border border-border p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-[#8b5cf6]" />
                  Available Tickets
                </h2>

                {isLoadingTickets ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[#8b5cf6]" />
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Ticket className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No available tickets for this event</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tickets.map((ticket) => {
                      const selectedItem = selectedTickets.find(t => t.ticketId === ticket.id)
                      const quantity = selectedItem?.quantity || 0

                      return (
                        <div key={ticket.id} className="flex items-center justify-between p-4 rounded-xl border border-border">
                          <div className="flex-1">
                            <div className="font-semibold">{ticket.ticketName}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              KES {ticket.ticketPrice.toLocaleString()} • {ticket.quantityAvailable} available
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleQuantityChange(ticket.id, -1)}
                              disabled={quantity === 0}
                              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-semibold">{quantity}</span>
                            <button
                              onClick={() => handleQuantityChange(ticket.id, 1)}
                              disabled={quantity >= ticket.quantityAvailable}
                              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* Customer Information */}
            {selectedEvent && tickets.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-2xl border border-border p-6">
                <h2 className="text-xl font-bold mb-4">Customer Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Email Address *</label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="customer@example.com"
                      className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Phone Number *</label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="254712345678"
                      className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Format: 254XXXXXXXXX</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Coupon Code (Optional)</label>
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Enter coupon code"
                      className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl border border-border p-6 sticky top-6">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>

              {selectedTickets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No tickets selected</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-6">
                    {selectedTickets.map((item) => {
                      const ticket = tickets.find(t => t.id === item.ticketId)
                      if (!ticket) return null

                      return (
                        <div key={item.ticketId} className="flex justify-between text-sm">
                          <div>
                            <div className="font-medium">{ticket.ticketName}</div>
                            <div className="text-muted-foreground">x{item.quantity}</div>
                          </div>
                          <div className="font-semibold">
                            KES {(ticket.ticketPrice * item.quantity).toLocaleString()}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="border-t border-border pt-4 mb-6">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>KES {totalAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="mb-6">
                    <label className="text-sm font-medium mb-3 block">Payment Method</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setChannel("mpesa")}
                        className={cn(
                          "p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2",
                          channel === "mpesa"
                            ? "border-[#8b5cf6] bg-[#8b5cf6]/5"
                            : "border-border hover:border-[#8b5cf6]/50"
                        )}
                      >
                        <Smartphone className="w-6 h-6" />
                        <span className="text-sm font-medium">M-Pesa</span>
                      </button>
                      <button
                        onClick={() => setChannel("card")}
                        className={cn(
                          "p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2",
                          channel === "card"
                            ? "border-[#8b5cf6] bg-[#8b5cf6]/5"
                            : "border-border hover:border-[#8b5cf6]/50"
                        )}
                      >
                        <CreditCard className="w-6 h-6" />
                        <span className="text-sm font-medium">Card</span>
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handlePurchase}
                    disabled={isPurchasing || !customerEmail || !customerPhone}
                    className="w-full px-6 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-[#8b5cf6]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isPurchasing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Purchase Tickets
                      </>
                    )}
                  </button>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

