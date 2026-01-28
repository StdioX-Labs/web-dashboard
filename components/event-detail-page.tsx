"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Edit,
  Download,
  Eye,
  EyeOff,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Gift,
  Plus,
  AlertTriangle,
  X,
  Info,
  Save,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Share2,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { api } from "@/lib/api-client"
import { sessionManager } from "@/lib/session-manager"
import { eventCache } from "@/lib/event-cache"

// Type definitions
interface TicketType {
  id: number
  name: string
  price: number
  totalAvailable: number
  sold: number
  revenue: number
  status: "active" | "sold_out" | "suspended"
}

// Mock attendees data removed - now fetched from API


export default function EventDetailPage({ eventId = 1 }: { eventId?: number }) {
  // API Data State
  const [eventData, setEventData] = useState<{
    id: number
    name: string
    date: string
    time: string
    venue: string
    description: string
    status: string
    apiStatus?: string
    balance: number
    pendingBalance: number
    totalRevenue: number
    image: string
    currency: string
    tickets: any[]
    totalTicketsSold: number
    eventStartDate: string
    eventEndDate: string
    slug?: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currency, setCurrency] = useState("KES")

  // Existing state
  const [activeTab, setActiveTab] = useState<"overview" | "tickets" | "transactions" | "attendees">("overview")
  const [showComplementaryModal, setShowComplementaryModal] = useState(false)
  const [compEmail, setCompEmail] = useState("")
  const [compEmailError, setCompEmailError] = useState("")
  const [compPhone, setCompPhone] = useState("")
  const [compPhoneError, setCompPhoneError] = useState("")
  const [compTicketType, setCompTicketType] = useState("")
  const [compQuantity, setCompQuantity] = useState("1")
  const [searchQuery, setSearchQuery] = useState("")
  const [showBalance, setShowBalance] = useState(true)
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [suspendStep, setSuspendStep] = useState<"confirm" | "otp">("confirm")
  const [suspendOtp, setSuspendOtp] = useState("")
  const [suspendError, setSuspendError] = useState("")
  const [suspendType, setSuspendType] = useState<"event" | "ticket">("event")
  const [suspendTicketId, setSuspendTicketId] = useState<number | null>(null)
  const [actionType, setActionType] = useState<"suspend" | "activate">("suspend")
  const [eventSuspended, setEventSuspended] = useState(false)
  const [suspendedTickets, setSuspendedTickets] = useState<number[]>([])
  const [showEditTicketModal, setShowEditTicketModal] = useState(false)
  const [editingTicket, setEditingTicket] = useState<any>(null)
  const [editTicketName, setEditTicketName] = useState("")
  const [editTicketPrice, setEditTicketPrice] = useState("")
  const [editTicketQuantity, setEditTicketQuantity] = useState("")
  const [editTicketDescription, setEditTicketDescription] = useState("")
  const [editTicketSaleStart, setEditTicketSaleStart] = useState<Date | undefined>(undefined)
  const [editTicketSaleEnd, setEditTicketSaleEnd] = useState<Date | undefined>(undefined)
  const [editTicketLimitPerPerson, setEditTicketLimitPerPerson] = useState("")
  const [editTicketComplementary, setEditTicketComplementary] = useState("")
  const [editTicketToIssue, setEditTicketToIssue] = useState("")
  const [editTicketIsFree, setEditTicketIsFree] = useState(false)
  const [loadingTicketDetails, setLoadingTicketDetails] = useState(false)

  const [showAddTicketModal, setShowAddTicketModal] = useState(false)
  const [addTicketName, setAddTicketName] = useState("")
  const [addTicketPrice, setAddTicketPrice] = useState("")
  const [addTicketQuantity, setAddTicketQuantity] = useState("")
  const [addTicketDescription, setAddTicketDescription] = useState("")
  const [addTicketSaleStart, setAddTicketSaleStart] = useState<Date | undefined>(undefined)
  const [addTicketSaleEnd, setAddTicketSaleEnd] = useState<Date | undefined>(undefined)

  // Share state
  const [showShareModal, setShowShareModal] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  // Pagination state
  const [transactionsPage, setTransactionsPage] = useState(1)
  const [attendeesPage, setAttendeesPage] = useState(1)
  const itemsPerPage = 10

  // Smart pagination helper - shows elegant page ranges
  const getPageNumbers = (currentPage: number, totalPages: number) => {
    const pages: (number | string)[] = []
    const maxVisible = 7 // Maximum number of page buttons to show

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    // Always show first page
    pages.push(1)

    if (currentPage <= 3) {
      // Near start: show 1, 2, 3, 4, 5, ..., last
      for (let i = 2; i <= Math.min(5, totalPages - 1); i++) {
        pages.push(i)
      }
      if (totalPages > 6) pages.push('...')
      pages.push(totalPages)
    } else if (currentPage >= totalPages - 2) {
      // Near end: show 1, ..., last-4, last-3, last-2, last-1, last
      pages.push('...')
      for (let i = Math.max(2, totalPages - 4); i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Middle: show 1, ..., current-1, current, current+1, ..., last
      pages.push('...')
      pages.push(currentPage - 1)
      pages.push(currentPage)
      pages.push(currentPage + 1)
      pages.push('...')
      pages.push(totalPages)
    }

    return pages
  }

  // Attendees state
  const [attendees, setAttendees] = useState<Array<{
    firstName: string
    lastName: string
    mobileNumber: string
    ticketName: string
    ticketPrice: number
    ticketId: string
    email: string
    purchaseTime: string
    scanned: boolean
    complementary: boolean
    transactionId: string
  }>>([])
  const [attendeesLoading, setAttendeesLoading] = useState(false)

  // Transactions state
  const [transactions, setTransactions] = useState<Array<{
    id: string
    buyer: string
    email: string
    ticketType: string
    quantity: number
    amount: number
    date: string
    status: string
    barcode: string
    platformFee: number
  }>>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [transactionsStats, setTransactionsStats] = useState<{
    ticketsSold: number
    platformLiability: number
    totalSales: number
  } | null>(null)
  const [transactionsTotalPages, setTransactionsTotalPages] = useState(1)
  const [transactionsTotalElements, setTransactionsTotalElements] = useState(0)

  // Fetch event data from API
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const user = sessionManager.getUser()
        console.log("=== Event Detail Fetch Start ===")
        console.log("Event ID:", eventId, "Type:", typeof eventId)
        console.log("User:", user)

        if (!user || !user.company_id) {
          console.log("No user or company_id, exiting")
          setIsLoading(false)
          return
        }

        setCurrency(user.currency || "KES")

        // Use getAllEvents API with caching
        const cacheKey = 'all-events-300'
        console.log("Fetching events with cache key:", cacheKey)

        const eventsData = await eventCache.getOrFetch(
          cacheKey,
          user.company_id,
          async () => {
            console.log("Cache miss, fetching from API...")
            const response = await api.company.getAllEvents(user.company_id, 0, 300)
            console.log("API Response:", response)
            return response
          }
        )

        console.log("Events Data received:", eventsData)
        console.log("Total events:", eventsData?.events?.length)

        if (eventsData && eventsData.events) {
          console.log("First 3 events:", eventsData.events.slice(0, 3).map(e => ({
            id: e.id,
            name: e.eventName,
            companyId: e.companyId
          })))

          const foundEvent = eventsData.events.find(
            (e) => {
              const eventIdMatch = Number(e.id) === Number(eventId)
              console.log(`Comparing event ${e.id} (${typeof e.id}) with ${eventId} (${typeof eventId}):`, eventIdMatch)
              return eventIdMatch && e.companyId === user.company_id
            }
          )

          console.log("Found Event:", foundEvent)

          if (foundEvent) {
            console.log("✅ Event Found:", foundEvent.eventName)
            console.log("Event Tickets:", foundEvent.tickets)
            console.log("API Total Revenue:", foundEvent.totalRevenue)
            console.log("API Total Tickets Sold:", foundEvent.totalTicketsSold)

            // Use API totals if available, otherwise calculate from tickets
            const revenue = foundEvent.totalRevenue !== undefined
              ? foundEvent.totalRevenue
              : foundEvent.tickets?.reduce((sum, ticket) =>
                  sum + ((ticket.ticketPrice || 0) * (ticket.soldQuantity || 0)), 0) || 0

            const ticketsSold = foundEvent.totalTicketsSold !== undefined
              ? foundEvent.totalTicketsSold
              : foundEvent.tickets?.reduce((sum, ticket) =>
                  sum + (ticket.soldQuantity || 0), 0) || 0

            console.log("Using Revenue:", revenue)
            console.log("Using Tickets Sold:", ticketsSold)

            // Transform API data to component format
            const transformedEvent = {
              id: foundEvent.id,
              name: foundEvent.eventName,
              date: new Date(foundEvent.eventStartDate).toISOString().split('T')[0],
              time: new Date(foundEvent.eventStartDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
              venue: foundEvent.eventLocation,
              description: foundEvent.eventDescription,
              status: foundEvent.isActive ? 'active' : 'inactive',
              apiStatus: foundEvent.status, // Store API status (ONHOLD, ACTIVE, etc.)
              balance: revenue,
              pendingBalance: 0,
              totalRevenue: revenue,
              image: foundEvent.eventPosterUrl,
              currency: foundEvent.currency || currency,
              tickets: foundEvent.tickets || [],
              totalTicketsSold: ticketsSold,
              eventStartDate: foundEvent.eventStartDate,
              eventEndDate: foundEvent.eventEndDate,
              slug: foundEvent.slug,
            }
            console.log("Transformed Event:", transformedEvent)
            setEventData(transformedEvent)
          } else {
            console.log("❌ Event not found with ID:", eventId)
            console.log("Available event IDs:", eventsData.events.map(e => `${e.id} (${e.eventName})`))
          }
        } else {
          console.log("No events data received")
        }
        console.log("=== Event Detail Fetch End ===")
      } catch (error) {
        console.error("Failed to fetch event:", error)
        toast.error("Failed to load event details")
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvent()
  }, [eventId])

  // Debug: Monitor ticket sale date changes
  useEffect(() => {
    console.log('=== Edit Ticket Sale Dates Changed ===', {
      editTicketSaleStart,
      editTicketSaleEnd,
      startIsDate: editTicketSaleStart instanceof Date,
      endIsDate: editTicketSaleEnd instanceof Date,
      startValid: editTicketSaleStart ? !isNaN(editTicketSaleStart.getTime()) : false,
      endValid: editTicketSaleEnd ? !isNaN(editTicketSaleEnd.getTime()) : false
    })
  }, [editTicketSaleStart, editTicketSaleEnd])

  // Fetch transactions when transactions tab is active
  useEffect(() => {
    const fetchTransactions = async () => {
      if (activeTab !== 'transactions' || !eventData) return

      setTransactionsLoading(true)
      try {
        const response = await api.transactions.fetchDetailed({
          id: eventId,
          idType: 'event',
          transactionType: 'TICKET_SALE',
          page: transactionsPage - 1, // API uses 0-based indexing
          size: itemsPerPage,
        })

        if (response.status && response.data) {
          // Transform API data to match component format
          const transformedTransactions = response.data.data.map((txn) => {
            const buyerName = txn.buyer.firstName && txn.buyer.lastName
              ? `${txn.buyer.firstName} ${txn.buyer.lastName}`
              : txn.buyer.firstName || txn.buyer.lastName || 'Unknown'

            return {
              id: txn.transactionId,
              buyer: buyerName,
              email: txn.buyer.email || 'N/A',
              ticketType: txn.ticket.ticketName,
              quantity: 1, // Each transaction is for 1 ticket based on API response
              amount: txn.transactionAmount,
              date: new Date(txn.createdAt).toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              }).replace(',', ''),
              status: 'completed', // All fetched transactions are completed
              barcode: txn.barcode,
              platformFee: txn.platformFee,
            }
          })

          setTransactions(transformedTransactions)
          setTransactionsTotalPages(response.data.totalPages)
          setTransactionsTotalElements(response.data.totalElements)

          // Set stats if available
          if (response.stats) {
            setTransactionsStats(response.stats)
          }
        }
      } catch (error) {
        console.error('Failed to fetch transactions:', error)
        toast.error('Failed to load transactions')
      } finally {
        setTransactionsLoading(false)
      }
    }

    fetchTransactions()
  }, [activeTab, transactionsPage, eventId, eventData])

  // Fetch attendees when attendees tab is active
  useEffect(() => {
    const fetchAttendees = async () => {
      if (activeTab !== 'attendees' || !eventData) return

      setAttendeesLoading(true)
      try {
        const response = await api.company.getAttendees(eventId)

        console.log('Attendees Response:', response)

        if (response.status && response.attendees) {
          setAttendees(response.attendees)
        } else {
          setAttendees([])
        }
      } catch (error) {
        console.error('Failed to fetch attendees:', error)
        toast.error('Failed to load attendees')
        setAttendees([])
      } finally {
        setAttendeesLoading(false)
      }
    }

    fetchAttendees()
  }, [activeTab, eventId, eventData])

  // Get ticket types from event data
  const ticketTypes = eventData?.tickets?.map((ticket: any) => ({
    id: ticket.id,
    name: ticket.ticketName,
    price: ticket.ticketPrice,
    totalAvailable: ticket.soldQuantity + ticket.quantityAvailable,
    sold: ticket.soldQuantity,
    revenue: ticket.ticketPrice * ticket.soldQuantity,
    status: ticket.isSoldOut ? 'sold_out' : ticket.isActive ? 'active' : 'inactive',
    quantityAvailable: ticket.quantityAvailable,
  })) || []

  // Kenyan phone number validation and formatting
  const formatKenyanPhone = (phone: string): string | null => {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '')

    // Handle different Kenyan phone number formats
    // +254715066651, 254715066651, 0715066651, 715066651
    // Also handle 01 prefix (Safaricom old format)

    if (cleaned.startsWith('254')) {
      // Already in international format (254715066651)
      cleaned = cleaned.slice(3) // Remove 254
    } else if (cleaned.startsWith('0')) {
      // Local format (0715066651 or 0115066651)
      cleaned = cleaned.slice(1) // Remove leading 0
    }

    // Convert 01 prefix to 07 (old Safaricom format)
    if (cleaned.startsWith('1') && cleaned.length === 9) {
      cleaned = '7' + cleaned.slice(1)
    }

    // Validate length (should be 9 digits after removing country code and leading zero)
    if (cleaned.length !== 9) {
      return null
    }

    // Validate it starts with valid prefixes (7, 1, or 8 for Kenyan numbers)
    const firstDigit = cleaned[0]
    if (!['7', '1', '8'].includes(firstDigit)) {
      return null
    }

    // Return in international format
    return '+254' + cleaned
  }

  const validateKenyanPhone = (phone: string): boolean => {
    return formatKenyanPhone(phone) !== null
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleEmailChange = (value: string) => {
    setCompEmail(value)

    // Clear error if field is empty
    if (!value.trim()) {
      setCompEmailError("")
      return
    }

    // Validate the email
    if (!validateEmail(value)) {
      setCompEmailError("Invalid email address")
    } else {
      setCompEmailError("")
    }
  }

  const handlePhoneChange = (value: string) => {
    setCompPhone(value)

    // Clear error if field is empty
    if (!value.trim()) {
      setCompPhoneError("")
      return
    }

    // Validate the phone number
    if (!validateKenyanPhone(value)) {
      setCompPhoneError("Invalid Kenyan phone number")
    } else {
      setCompPhoneError("")
    }
  }

  const handleSuspendClick = (type: "event" | "ticket", ticketId?: number) => {
    setSuspendType(type)
    setSuspendTicketId(ticketId || null)
    setActionType("suspend")
    setSuspendStep("confirm")
    setSuspendOtp("")
    setSuspendError("")
    setShowSuspendModal(true)
  }

  const handleActivateClick = (type: "event" | "ticket", ticketId?: number) => {
    setSuspendType(type)
    setSuspendTicketId(ticketId || null)
    setActionType("activate")
    setSuspendStep("confirm")
    setSuspendOtp("")
    setSuspendError("")
    setShowSuspendModal(true)
  }

  const handleSuspendConfirm = () => {
    setSuspendStep("otp")
    setSuspendError("")
  }

  const handleOtpSubmit = () => {
    // Test OTP is 0000
    if (suspendOtp === "0000") {
      // Success - update state
      if (actionType === "suspend") {
        if (suspendType === "event") {
          setEventSuspended(true)
          toast.error("Event suspended", {
            description: "Ticket sales have been paused and the event is now hidden from the marketplace."
          })
        } else {
          setSuspendedTickets([...suspendedTickets, suspendTicketId!])
          toast.error("Ticket sales suspended", {
            description: "This ticket type is no longer available for purchase."
          })
        }
      } else {
        // Activate
        if (suspendType === "event") {
          setEventSuspended(false)
          toast.success("Event activated successfully!", {
            description: "Ticket sales have resumed and the event is now visible on the marketplace."
          })
        } else {
          setSuspendedTickets(suspendedTickets.filter(id => id !== suspendTicketId))
          toast.success("Ticket sales activated successfully!", {
            description: "This ticket type is now available for purchase again."
          })
        }
      }
      setShowSuspendModal(false)
      setSuspendOtp("")
      setSuspendError("")
    } else {
      setSuspendError("Invalid OTP. Please try again.")
    }
  }

  const handleModalClose = () => {
    setShowSuspendModal(false)
    setSuspendStep("confirm")
    setSuspendOtp("")
    setSuspendError("")
  }

  const handleEditTicket = async (ticket: any) => {
    setEditingTicket(ticket)

    // Set basic info from the ticket summary first
    setEditTicketName(ticket.name)
    setEditTicketPrice(ticket.price.toString())
    setEditTicketQuantity(ticket.totalAvailable.toString())
    setEditTicketDescription("")

    // Reset additional fields
    setEditTicketLimitPerPerson("0")
    setEditTicketComplementary("0")
    setEditTicketToIssue("1")
    setEditTicketIsFree(false)
    setEditTicketSaleStart(undefined)
    setEditTicketSaleEnd(undefined)

    // Show loading toast while fetching
    const loadingToast = toast.loading('Loading ticket details...')

    // Fetch full ticket details from API BEFORE opening modal
    setLoadingTicketDetails(true)
    try {
      console.log('Fetching full event details to get complete ticket info for ticket ID:', ticket.id)
      const response = await api.event.getById(eventId)

      if (response.status && response.event && response.event.tickets) {
        // Find the specific ticket in the full response
        const fullTicket = response.event.tickets.find((t: any) => t.id === ticket.id)

        if (fullTicket) {
          console.log('Found full ticket details:', fullTicket)

          // Update with complete ticket details
          setEditTicketName(fullTicket.ticketName || ticket.name)
          setEditTicketPrice(fullTicket.ticketPrice?.toString() || ticket.price.toString())
          setEditTicketQuantity(fullTicket.quantityAvailable?.toString() || ticket.totalAvailable.toString())
          setEditTicketLimitPerPerson(fullTicket.ticketLimitPerPerson?.toString() || "0")
          setEditTicketComplementary(fullTicket.numberOfComplementary?.toString() || "0")
          setEditTicketToIssue(fullTicket.ticketsToIssue?.toString() || "1")
          setEditTicketIsFree(fullTicket.isFree || false)

          // Set ticket sale dates
          if (fullTicket.ticketSaleStartDate) {
            const startDate = new Date(fullTicket.ticketSaleStartDate)
            console.log('Setting ticket sale start date:', fullTicket.ticketSaleStartDate, '-> Date object:', startDate)
            setEditTicketSaleStart(startDate)
          } else {
            console.log('No ticket sale start date found in API response')
          }

          if (fullTicket.ticketSaleEndDate) {
            const endDate = new Date(fullTicket.ticketSaleEndDate)
            console.log('Setting ticket sale end date:', fullTicket.ticketSaleEndDate, '-> Date object:', endDate)
            setEditTicketSaleEnd(endDate)
          } else {
            console.log('No ticket sale end date found in API response')
          }

          console.log('All ticket details populated:', {
            name: fullTicket.ticketName,
            price: fullTicket.ticketPrice,
            quantity: fullTicket.quantityAvailable,
            limitPerPerson: fullTicket.ticketLimitPerPerson,
            complementary: fullTicket.numberOfComplementary,
            ticketsToIssue: fullTicket.ticketsToIssue,
            isFree: fullTicket.isFree,
            saleStartRaw: fullTicket.ticketSaleStartDate,
            saleEndRaw: fullTicket.ticketSaleEndDate,
            saleStartParsed: fullTicket.ticketSaleStartDate ? new Date(fullTicket.ticketSaleStartDate) : null,
            saleEndParsed: fullTicket.ticketSaleEndDate ? new Date(fullTicket.ticketSaleEndDate) : null
          })
        }
      }

      toast.dismiss(loadingToast)
    } catch (error) {
      console.error('Error fetching full ticket details:', error)
      toast.dismiss(loadingToast)
      toast.error('Could not load complete ticket details')
      return // Don't open modal if fetch failed
    } finally {
      setLoadingTicketDetails(false)
    }

    // Open modal AFTER fetching data
    setShowEditTicketModal(true)
  }

  const handleSaveTicket = async () => {
    if (!editTicketName || !editTicketPrice || !editTicketQuantity) {
      toast.error("Please fill in all required fields")
      return
    }

    if (!editTicketSaleStart || !editTicketSaleEnd) {
      toast.error("Please set the ticket sale period")
      return
    }

    if (!editingTicket) {
      toast.error("No ticket selected")
      return
    }

    try {
      const ticketId = parseInt(editingTicket.id)

      const ticketUpdateData: Record<string, unknown> = {
        ticketName: editTicketName,
        quantityAvailable: parseInt(editTicketQuantity),
        ticketLimitPerPerson: parseInt(editTicketLimitPerPerson || "0"),
        numberOfComplementary: parseInt(editTicketComplementary || "0"),
        ticketsToIssue: parseInt(editTicketToIssue || "1"),
        ticketSaleStartDate: editTicketSaleStart.toISOString(),
        ticketSaleEndDate: editTicketSaleEnd.toISOString(),
      }

      console.log('=== Updating Ticket ===')
      console.log('Ticket ID:', ticketId)
      console.log('Update data:', ticketUpdateData)

      const response = await api.ticket.update(ticketId, ticketUpdateData)

      console.log('Update response:', response)

      if (!response.status) {
        const errorMsg = response.message || 'Failed to update ticket'
        console.error('Update failed:', errorMsg)
        throw new Error(errorMsg)
      }

      toast.success("Ticket updated successfully!", {
        description: "Your changes have been saved.",
      })

      setShowEditTicketModal(false)

      // Refresh the page data
      setTimeout(() => {
        window.location.reload()
      }, 500)

    } catch (error) {
      console.error('=== Error updating ticket ===')
      console.error('Error type:', error?.constructor?.name)
      console.error('Error details:', error)

      let errorMessage = "Failed to update ticket"
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = (error as { message: string }).message
      }

      toast.error(errorMessage, {
        description: "Please check the console for more details"
      })
    }
  }

  const handleCloseEditTicketModal = () => {
    setShowEditTicketModal(false)
    setEditingTicket(null)
    setEditTicketName("")
    setEditTicketPrice("")
    setEditTicketQuantity("")
    setEditTicketDescription("")
    setEditTicketSaleStart(undefined)
    setEditTicketSaleEnd(undefined)
    setEditTicketLimitPerPerson("0")
    setEditTicketComplementary("0")
    setEditTicketToIssue("1")
    setEditTicketIsFree(false)
  }

  const handleAddTicket = () => {
    setShowAddTicketModal(true)
  }

  const handleSaveNewTicket = () => {
    if (!addTicketName || !addTicketPrice || !addTicketQuantity) {
      toast.error("Please fill in all required fields")
      return
    }

    if (!addTicketSaleStart || !addTicketSaleEnd) {
      toast.error("Please set the ticket sale period")
      return
    }

    toast.success("Ticket added successfully!", {
      description: "Your new ticket type has been created.",
    })

    // Reset form
    setAddTicketName("")
    setAddTicketPrice("")
    setAddTicketQuantity("")
    setAddTicketDescription("")
    setAddTicketSaleStart(undefined)
    setAddTicketSaleEnd(undefined)
    setShowAddTicketModal(false)
  }

  const handleCloseAddTicketModal = () => {
    setShowAddTicketModal(false)
    setAddTicketName("")
    setAddTicketPrice("")
    setAddTicketQuantity("")
    setAddTicketDescription("")
    setAddTicketSaleStart(undefined)
    setAddTicketSaleEnd(undefined)
  }

  const handleIssueCompTicket = () => {
    // Validation
    if (!compEmail) {
      toast.error("Please enter recipient email")
      return
    }

    if (compEmailError || !validateEmail(compEmail)) {
      toast.error("Please enter a valid email address")
      return
    }

    if (!compPhone) {
      toast.error("Please enter recipient phone number")
      return
    }

    if (compPhoneError || !validateKenyanPhone(compPhone)) {
      toast.error("Please enter a valid Kenyan phone number")
      return
    }

    if (!compTicketType) {
      toast.error("Please select a ticket type")
      return
    }

    const quantity = parseInt(compQuantity)
    if (isNaN(quantity) || quantity < 1) {
      toast.error("Please enter a valid quantity")
      return
    }

    // Format phone number for display
    const formattedPhone = formatKenyanPhone(compPhone)

    toast.success("Complimentary ticket issued successfully!", {
      description: `Sent to ${compEmail} (${formattedPhone})`,
    })

    // Reset form and close modal
    setCompEmail("")
    setCompEmailError("")
    setCompPhone("")
    setCompPhoneError("")
    setCompTicketType("")
    setCompQuantity("1")
    setShowComplementaryModal(false)
  }

  const handleCloseCompModal = () => {
    setShowComplementaryModal(false)
    setCompEmail("")
    setCompEmailError("")
    setCompPhone("")
    setCompPhoneError("")
    setCompTicketType("")
    setCompQuantity("1")
  }

  // Pagination helpers
  const getPaginatedData = (data: any[], page: number) => {
    const startIndex = (page - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return data.slice(startIndex, endIndex)
  }

  const getTotalPages = (dataLength: number) => {
    return Math.ceil(dataLength / itemsPerPage)
  }

  // Paginated data
  // Transactions are paginated from API, use state directly
  const paginatedTransactions = transactions
  const paginatedAttendees = getPaginatedData(attendees, attendeesPage)
  // Use API-provided total pages for transactions
  const attendeesTotalPages = getTotalPages(attendees.length)

  // Helper function to check if event is past or inactive
  const isEventPastOrInactive = () => {
    if (!eventData) return false

    // Check if event status is inactive
    if (eventData.status === 'inactive' || eventData.status === 'cancelled') {
      return true
    }

    // Check if event date has passed
    if (eventData.eventEndDate) {
      const eventEndDate = new Date(eventData.eventEndDate)
      const now = new Date()
      if (eventEndDate < now) {
        return true
      }
    }

    return false
  }

  // Export functions
  // Export functions - Professional PDF reports using /report page
  const exportTransactionsToPDF = async () => {
    try {
      if (!eventData) {
        toast.error("No event data available")
        return
      }

      // Show loading toast
      const loadingToast = toast.loading("Fetching all transactions...")

      // Fetch ALL transactions (not just current page)
      let allTransactions: typeof transactions = []
      try {
        const response = await api.transactions.fetchDetailed({
          id: eventId,
          idType: 'event',
          page: 0, // Start from first page
          size: 1000, // Fetch up to 1000 transactions at once
        })

        if (response.data && response.data.data) {
          allTransactions = response.data.data.map((txn: any) => ({
            id: txn.transactionId || 'N/A',
            buyer: `${txn.buyer?.firstName || ''} ${txn.buyer?.lastName || ''}`.trim() || 'N/A',
            email: txn.buyer?.email || 'N/A',
            ticketType: txn.ticket?.ticketName || 'N/A',
            quantity: 1, // Each transaction is for 1 ticket
            amount: txn.transactionAmount || 0,
            date: new Date(txn.createdAt).toLocaleString(),
            status: 'completed',
            barcode: txn.barcode || '',
            platformFee: txn.platformFee || 0,
          }))
        }

        toast.dismiss(loadingToast)
      } catch (error) {
        console.error("Error fetching all transactions:", error)
        toast.dismiss(loadingToast)
        toast.error("Failed to fetch all transactions. Using current page data.")
        // Fallback to current page transactions
        allTransactions = transactions
      }

      const totalRevenue = allTransactions.reduce((sum, t) => sum + t.amount, 0)

      // Generate unique report ID
      const reportId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Transaction Report - ${eventData?.name ?? 'Untitled Event'}</title>
          <style>
            @page { margin: 15mm; size: A4 landscape; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #1a1a1a;
              background: #ffffff;
              padding: 20px;
            }
            
            /* Header with logo and branding */
            .report-header {
              border-bottom: 3px solid #8b5cf6;
              padding-bottom: 20px;
              margin-bottom: 30px;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .brand-section {
              flex: 1;
            }
            .brand-name {
              font-size: 28px;
              font-weight: 700;
              color: #8b5cf6;
              margin-bottom: 4px;
              letter-spacing: -0.5px;
            }
            .brand-tagline {
              font-size: 11px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .report-info {
              text-align: right;
            }
            .report-title {
              font-size: 24px;
              font-weight: 700;
              color: #1a1a1a;
              margin-bottom: 4px;
            }
            .report-date {
              font-size: 12px;
              color: #6b7280;
            }
            .report-id {
              font-size: 11px;
              color: #9ca3af;
              font-family: 'Courier New', monospace;
            }

            /* Event details box */
            .info-section {
              background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 30px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
            }
            .info-item {
              border-left: 3px solid #8b5cf6;
              padding-left: 12px;
            }
            .info-label {
              font-size: 11px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-weight: 600;
              margin-bottom: 4px;
            }
            .info-value {
              font-size: 16px;
              color: #1a1a1a;
              font-weight: 600;
            }

            /* Summary stats */
            .summary-section {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            .summary-card {
              background: #ffffff;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 15px;
              text-align: center;
            }
            .summary-label {
              font-size: 11px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 6px;
            }
            .summary-value {
              font-size: 22px;
              font-weight: 700;
              color: #8b5cf6;
            }

            /* Table styling */
            .table-section {
              margin-bottom: 30px;
            }
            .section-title {
              font-size: 16px;
              font-weight: 700;
              color: #1a1a1a;
              margin-bottom: 15px;
              padding-bottom: 8px;
              border-bottom: 2px solid #e5e7eb;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              background: #ffffff;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              overflow: hidden;
            }
            thead {
              background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            }
            th {
              padding: 12px;
              text-align: left;
              font-size: 11px;
              font-weight: 700;
              color: #ffffff;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            td {
              padding: 12px;
              font-size: 13px;
              border-bottom: 1px solid #f3f4f6;
              color: #374151;
            }
            tbody tr:hover {
              background: #f9fafb;
            }
            tbody tr:last-child td {
              border-bottom: none;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 10px;
              border-radius: 12px;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .status-completed {
              background: #d1fae5;
              color: #065f46;
            }
            .status-pending {
              background: #fef3c7;
              color: #92400e;
            }

            /* Footer */
            .report-footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 11px;
              color: #6b7280;
            }
            .footer-text {
              flex: 1;
            }
            .footer-company {
              font-weight: 600;
              color: #8b5cf6;
            }

            /* Mobile responsive styles */
            @media (max-width: 768px) {
              body {
                padding: 10px;
              }
              .report-header {
                flex-direction: column;
                gap: 15px;
                padding-bottom: 15px;
              }
              .brand-section {
                width: 100%;
              }
              .brand-name {
                font-size: 18px;
              }
              .brand-tagline {
                font-size: 10px;
              }
              .report-info {
                text-align: left;
                width: 100%;
              }
              .report-title {
                font-size: 16px;
              }
              .report-date {
                font-size: 11px;
              }
              .report-id {
                font-size: 10px;
              }
              .info-section {
                padding: 15px;
              }
              .info-grid {
                grid-template-columns: 1fr;
                gap: 15px;
              }
              .info-value {
                font-size: 14px;
              }
              .summary-section {
                grid-template-columns: 1fr;
                gap: 10px;
              }
              .summary-card {
                padding: 12px;
              }
              .summary-value {
                font-size: 18px;
              }
              .table-section {
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
                margin: 0 -10px;
                padding: 0 10px;
              }
              table {
                min-width: 800px;
                font-size: 12px;
              }
              th, td {
                padding: 8px 6px;
                font-size: 11px;
              }
              .report-footer {
                flex-direction: column;
                gap: 10px;
                text-align: center;
              }
            }

            /* Print styles */
            @media print {
              @page { size: A4 landscape; margin: 15mm; }
              body { 
                padding: 0 !important; 
                margin: 0 !important;
                overflow: visible !important;
              }
              
              /* Reset header styles */
              .report-header { 
                page-break-after: avoid;
                flex-direction: row !important;
                gap: initial !important;
                padding-bottom: 20px !important;
              }
              
              .brand-section {
                flex: 1 !important;
                width: auto !important;
              }
              
              .brand-name {
                font-size: 28px !important;
              }
              
              .brand-tagline {
                font-size: 11px !important;
              }
              
              .report-info {
                text-align: right !important;
                width: auto !important;
              }
              
              .report-title {
                font-size: 24px !important;
              }
              
              .report-date {
                font-size: 12px !important;
              }
              
              .report-id {
                font-size: 11px !important;
              }
              
              /* Reset info section */
              .info-section { 
                page-break-after: avoid;
                padding: 20px !important;
                margin-bottom: 30px !important;
              }
              
              .info-grid { 
                grid-template-columns: repeat(4, 1fr) !important;
                gap: 15px !important;
              }
              
              .info-value {
                font-size: 16px !important;
              }
              
              /* CRITICAL: Reset summary section to horizontal layout */
              .summary-section {
                grid-template-columns: repeat(3, 1fr) !important;
                gap: 15px !important;
                page-break-after: avoid;
                margin-bottom: 30px !important;
              }
              
              .summary-card {
                padding: 15px !important;
              }
              
              .summary-value {
                font-size: 22px !important;
              }
              
              /* Reset table section */
              .table-section {
                overflow: visible !important;
                margin: 0 !important;
              }
              
              table { 
                page-break-inside: auto;
                font-size: 10px !important;
                table-layout: fixed !important;
                width: 100% !important;
              }
              
              th, td {
                padding: 8px 6px !important;
                font-size: 10px !important;
                word-wrap: break-word;
              }
              
              th:nth-child(1), td:nth-child(1) { width: 12%; } /* Transaction ID */
              th:nth-child(2), td:nth-child(2) { width: 20%; } /* Buyer Information */
              th:nth-child(3), td:nth-child(3) { width: 18%; } /* Ticket Type */
              th:nth-child(4), td:nth-child(4) { width: 8%; } /* Qty */
              th:nth-child(5), td:nth-child(5) { width: 12%; } /* Amount */
              th:nth-child(6), td:nth-child(6) { width: 18%; } /* Date & Time */
              th:nth-child(7), td:nth-child(7) { width: 12%; } /* Status */
              
              tr { page-break-inside: avoid; page-break-after: auto; }
              thead { display: table-header-group; }
              .status-badge { font-size: 8px; padding: 3px 6px; }
              
              /* Ensure nothing is cut off */
              * {
                overflow: visible !important;
              }
            }
          </style>
        </head>
        <body>
          <!-- Header -->
          <div class="report-header">
            <div class="brand-section">
              <div class="brand-name">SOLDOUTAFRICA</div>
              <div class="brand-tagline">Event Management Platform</div>
            </div>
            <div class="report-info">
              <div class="report-title">Transaction Report</div>
              <div class="report-date">${new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</div>
              <div class="report-id">Report ID: ${reportId}</div>
            </div>
          </div>


          <!-- Event Information -->
          <div class="info-section">
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Event Name</div>
                <div class="info-value">${eventData?.name ?? 'Untitled Event'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Event Date</div>
                <div class="info-value">${eventData?.date ? new Date(eventData.date).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Venue</div>
                <div class="info-value">${eventData?.venue ?? 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Report Generated</div>
                <div class="info-value">${new Date().toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}</div>
              </div>
            </div>
          </div>

          <!-- Summary Statistics -->
          <div class="summary-section">
            <div class="summary-card">
              <div class="summary-label">Total Transactions</div>
              <div class="summary-value">${allTransactions.length}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Total Revenue</div>
              <div class="summary-value">KES ${totalRevenue.toLocaleString()}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Avg. Transaction</div>
              <div class="summary-value">KES ${allTransactions.length > 0 ? Math.round(totalRevenue / allTransactions.length).toLocaleString() : '0'}</div>
            </div>
          </div>

          <!-- Transactions Table -->
          <div class="table-section">
            <div class="section-title">Transaction Details (${allTransactions.length} Total)</div>
            <table>
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Buyer Information</th>
                  <th>Ticket Type</th>
                  <th>Qty</th>
                  <th>Amount</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${allTransactions.map(txn => `
                  <tr>
                    <td style="font-family: 'Courier New', monospace; font-weight: 600;">${txn.id}</td>
                    <td>
                      <div style="font-weight: 600;">${txn.buyer}</div>
                      <div style="font-size: 11px; color: #6b7280;">${txn.email}</div>
                    </td>
                    <td>${txn.ticketType}</td>
                    <td style="font-weight: 600;">${txn.quantity}</td>
                    <td style="font-weight: 700; color: #059669;">KES ${txn.amount.toLocaleString()}</td>
                    <td style="font-size: 12px;">${txn.date}</td>
                    <td>
                      <span class="status-badge status-${txn.status}">
                        ${txn.status}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Footer -->
          <div class="report-footer">
            <div class="footer-text">
              <div class="footer-company">SoldOutAfrica Event Management Platform</div>
              <div>This is an official transaction report. For inquiries, contact support@soldoutafrica.com</div>
            </div>
          </div>

          <script>
            // Override about:blank title
            document.title = 'SoldOutAfrica - Transaction Report';
            
            window.onload = function() {
              setTimeout(() => window.print(), 500);
            }
          </script>
        </body>
        </html>
      `

      // Store HTML in sessionStorage and open /report page
      sessionStorage.setItem("reportHTML", html)
      window.open("/report", "_blank")

      toast.success("Transaction report ready!", {
        description: "Opening in new tab...",
      })
    } catch (error) {
      console.error("Error exporting transactions:", error)
      toast.error("Failed to export transactions")
    }
  }

  const exportAttendeesToPDF = () => {
    try {
      const checkedInCount = attendees.filter(a => a.scanned).length
      const notCheckedInCount = attendees.length - checkedInCount

      // Generate unique report ID
      const reportId = `ATT-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`

      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Attendees Report - ${eventData?.name ?? 'Untitled Event'}</title>
          <style>
            @page { margin: 15mm; size: A4; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.4;
              color: #1a1a1a;
              background: #ffffff;
              padding: 0;
            }
            
            /* Professional Header - Enhanced Design */
            .report-header {
              background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
              padding: 30px 35px;
              margin-bottom: 0;
              color: white;
              position: relative;
              overflow: hidden;
            }
            /* Elegant pattern overlay */
            .report-header::before {
              content: '';
              position: absolute;
              top: 0;
              right: 0;
              width: 300px;
              height: 100%;
              background: radial-gradient(circle at 80% 50%, rgba(255,255,255,0.1) 0%, transparent 70%);
              pointer-events: none;
            }
            .header-top {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 18px;
              padding-bottom: 18px;
              border-bottom: 1px solid rgba(255, 255, 255, 0.25);
              position: relative;
              z-index: 1;
            }
            .brand-section {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }
            .brand-name {
              font-size: 26px;
              font-weight: 800;
              letter-spacing: 1.2px;
              text-transform: uppercase;
              background: linear-gradient(to right, #ffffff 0%, rgba(255,255,255,0.9) 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            }
            .brand-tagline {
              font-size: 10px;
              letter-spacing: 2px;
              text-transform: uppercase;
              opacity: 0.85;
              font-weight: 500;
            }
            .report-meta {
              text-align: right;
              font-size: 11px;
              opacity: 0.9;
            }
            .report-meta-date {
              margin-bottom: 4px;
              font-weight: 500;
            }
            .report-id {
              font-size: 10px;
              font-family: 'Courier New', monospace;
              opacity: 0.75;
              font-weight: 400;
            }
            .header-title {
              display: flex;
              justify-content: space-between;
              align-items: baseline;
              position: relative;
              z-index: 1;
            }
            .report-title {
              font-size: 30px;
              font-weight: 700;
              letter-spacing: -0.5px;
              text-shadow: 0 1px 2px rgba(0,0,0,0.1);
            }

            /* Event Information Card */
            .event-info {
              background: #f8f9fa;
              border-left: 4px solid #8b5cf6;
              padding: 20px 25px;
              margin: 25px 30px;
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px 30px;
            }
            .info-item {
              display: flex;
              flex-direction: column;
            }
            .info-label {
              font-size: 10px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 1px;
              font-weight: 600;
              margin-bottom: 5px;
            }
            .info-value {
              font-size: 15px;
              color: #1a1a1a;
              font-weight: 600;
            }

            /* Summary stats - Single row compact */
            .summary-section {
              background: #ffffff;
              border: 2px solid #e5e7eb;
              border-radius: 0;
              margin: 0 30px 30px 30px;
              overflow: hidden;
            }
            .summary-content {
              padding: 20px 25px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 50px;
              border-bottom: 1px solid #e5e7eb;
            }
            .summary-item {
              display: flex;
              align-items: baseline;
              gap: 10px;
              flex: 1;
            }
            .summary-label {
              font-size: 11px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.8px;
              font-weight: 600;
              white-space: nowrap;
            }
            .summary-value {
              font-size: 32px;
              font-weight: 700;
              color: #8b5cf6;
              line-height: 1;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            }
            .summary-footer {
              background: #fafbfc;
              padding: 8px 20px;
              font-size: 10px;
              color: #6b7280;
              text-align: right;
            }
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
            }
            .info-item {
              border-left: 3px solid #8b5cf6;
              padding-left: 12px;
            }
            .info-label {
              font-size: 11px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-weight: 600;
              margin-bottom: 4px;
            }
            .info-value {
              font-size: 16px;
              color: #1a1a1a;
              font-weight: 600;
            }

            /* Summary stats */
            .summary-section {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            .summary-card {
              background: #ffffff;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 15px;
              text-align: center;
            }
            .summary-label {
              font-size: 11px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 6px;
            }
            .summary-value {
              font-size: 22px;
              font-weight: 700;
              color: #8b5cf6;
            }

            /* Table styling */
            .table-section {
              margin: 0 30px 30px 30px;
            }
            .section-title {
              font-size: 13px;
              font-weight: 600;
              color: #374151;
              margin-bottom: 15px;
              padding-bottom: 8px;
              border-bottom: 2px solid #e5e7eb;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              background: #ffffff;
              border: 2px solid #e5e7eb;
              overflow: hidden;
            }
            thead {
              background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            }
            th {
              padding: 12px;
              text-align: left;
              font-size: 11px;
              font-weight: 700;
              color: #ffffff;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            td {
              padding: 12px;
              font-size: 13px;
              border-bottom: 1px solid #f3f4f6;
              color: #374151;
            }
            tbody tr:hover {
              background: #f9fafb;
            }
            tbody tr:last-child td {
              border-bottom: none;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 10px;
              border-radius: 12px;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .status-checked-in {
              background: #d1fae5;
              color: #065f46;
            }
            .status-not-checked-in {
              background: #fee2e2;
              color: #991b1b;
            }
            .comp-badge {
              background: #dbeafe;
              color: #1e40af;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 9px;
              margin-left: 6px;
            }

            /* Footer */
            .report-footer {
              margin: 40px 30px 0 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 10px;
              color: #6b7280;
            }
            .footer-text {
              flex: 1;
            }
            .footer-company {
              font-weight: 600;
              color: #8b5cf6;
            }

            /* Mobile responsive styles */
            @media (max-width: 768px) {
              body { padding: 0; }
              .report-header { padding: 20px; }
              .header-top { flex-direction: column; align-items: flex-start; gap: 10px; }
              .report-meta { text-align: left; }
              .brand-name { font-size: 18px; }
              .report-title { font-size: 22px; }
              .event-info { 
                grid-template-columns: 1fr; 
                gap: 12px; 
                margin: 20px;
                padding: 15px 20px;
              }
              .summary-section { margin: 0 20px 25px 20px; }
              .summary-grid { flex-direction: column; }
              .summary-item { border-right: none; border-bottom: 1px solid #e5e7eb; }
              .summary-item:last-child { border-bottom: none; }
              .summary-value { font-size: 28px; }
              .table-section { margin: 0 20px 25px 20px; }
              table { min-width: 800px; font-size: 12px; }
              th, td { padding: 8px 6px; font-size: 11px; }
              .report-footer { 
                margin: 30px 20px 0 20px; 
                flex-direction: column; 
                gap: 10px; 
                text-align: center; 
              }
            }

            /* Print styles */
            @media print {
              @page {
                size: A4 landscape;  /* Landscape for better table view */
                margin: 12mm 15mm;
              }
              
              body { 
                padding: 0;
                margin: 0;
                width: 100%;
                max-width: 100%;
              }
              
              * {
                box-sizing: border-box;
                max-width: 100%;
              }
              
              /* Compact Header - Single Row */
              .report-header { 
                page-break-after: avoid;
                break-after: avoid;
                width: 100%;
                margin: 0;
                padding: 15px 20px;
              }
              
              .header-top {
                display: flex !important;
                justify-content: space-between;
                align-items: center;
                padding-bottom: 10px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.2);
              }
              
              .brand-name {
                font-size: 18px;
              }
              
              .report-meta {
                text-align: right;
                font-size: 10px;
              }
              
              .header-title {
                margin-top: 8px;
              }
              
              .report-title {
                font-size: 22px;
              }
              
              /* Compact Event Info - Horizontal Layout */
              .event-info {
                page-break-after: avoid;
                break-after: avoid;
                width: 100%;
                margin: 15px 0;
                padding: 12px 20px;
                display: flex !important;
                flex-wrap: wrap;
                gap: 20px;
                grid-template-columns: none !important;
              }
              
              .info-item {
                flex: 0 1 auto;
                min-width: 150px;
              }
              
              .info-label {
                font-size: 9px;
                margin-bottom: 3px;
              }
              
              .info-value {
                font-size: 13px;
              }
              
              /* Compact Summary - Horizontal */
              .summary-section {
                page-break-inside: avoid;
                break-inside: avoid;
                width: 100%;
                margin: 15px 0;
              }
              
              .summary-header {
                padding: 8px 15px;
              }
              
              .summary-header-title {
                font-size: 11px;
              }
              
              .summary-grid {
                display: flex;
                width: 100%;
              }
              
              .summary-item {
                flex: 1;
                min-width: 0;
                padding: 15px;
              }
              
              .summary-value {
                font-size: 28px;
              }
              
              .summary-footer {
                padding: 8px 15px;
              }
              
              /* Optimized Table for Landscape */
              .table-section {
                width: 100%;
                margin: 15px 0;
              }
              
              .section-title {
                font-size: 11px;
                margin-bottom: 10px;
                padding-bottom: 6px;
              }
              
              table { 
                page-break-inside: auto;
                width: 100%;
                max-width: 100%;
                table-layout: fixed;
                font-size: 11px;
              }
              
              thead { 
                display: table-header-group;
                break-inside: avoid;
              }
              
              th {
                padding: 8px 6px;
                font-size: 9px;
              }
              
              td {
                padding: 8px 6px;
                font-size: 10px;
              }
              
              /* Column widths for attendees table */
              th:nth-child(1), td:nth-child(1) { width: 15%; } /* Name */
              th:nth-child(2), td:nth-child(2) { width: 25%; } /* Contact Information */
              th:nth-child(3), td:nth-child(3) { width: 25%; } /* Ticket Details */
              th:nth-child(4), td:nth-child(4) { width: 15%; } /* Purchase Date */
              th:nth-child(5), td:nth-child(5) { width: 20%; } /* Check-in Status */
              
              tbody {
                width: 100%;
              }
              
              tr { 
                page-break-inside: avoid;
                break-inside: avoid;
                page-break-after: auto;
                width: 100%;
              }
              
              td, th {
                word-wrap: break-word;
                overflow-wrap: break-word;
              }
              
              /* Compact Footer */
              .report-footer {
                width: 100%;
                margin: 15px 0 0 0;
                padding: 10px 0;
                font-size: 9px;
              }
              
              .footer-company {
                font-size: 10px;
              }
              
              /* Hide elements that take too much space */
              .summary-subtext {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <!-- Professional Header -->
          <div class="report-header">
            <div class="header-top">
              <div class="brand-name">SoldOutAfrica</div>
              <div class="report-meta">
                <div class="report-meta-date">${new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric',
                  year: 'numeric'
                })}</div>
                <div class="report-id">ID: ${reportId}</div>
              </div>
            </div>
            <div class="header-title">
              <div class="report-title">Attendees Report</div>
            </div>
          </div>

          <!-- Event Information -->
          <div class="event-info">
            <div class="info-item">
              <div class="info-label">Event Name</div>
              <div class="info-value">${eventData?.name ?? 'Untitled Event'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Event Date</div>
              <div class="info-value">${eventData?.date ? new Date(eventData.date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }) : 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Venue</div>
              <div class="info-value">${eventData?.venue ?? 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Generated</div>
              <div class="info-value">${new Date().toLocaleTimeString('en-US', { 
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}</div>
            </div>
          </div>

          <!-- Summary Statistics -->
          <div class="summary-section">
            <div class="summary-content">
              <div class="summary-item">
                <div class="summary-label">Total Registered:</div>
                <div class="summary-value">${attendees.length}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Checked In:</div>
                <div class="summary-value">${checkedInCount}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Attendance Rate:</div>
                <div class="summary-value">${attendees.length > 0 ? Math.round((checkedInCount / attendees.length) * 100) : 0}%</div>
              </div>
            </div>
            <div class="summary-footer">
              Last updated: ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </div>
          </div>

          <!-- Attendees Table -->
          <div class="table-section">
            <div class="section-title">Attendee Details (${attendees.length} Total)</div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact Information</th>
                  <th>Ticket Details</th>
                  <th>Purchase Date</th>
                  <th>Check-in Status</th>
                </tr>
              </thead>
              <tbody>
                ${attendees.map(attendee => `
                  <tr>
                    <td style="font-weight: 600;">${attendee.firstName} ${attendee.lastName}</td>
                    <td>
                      <div style="font-size: 12px;">${attendee.email}</div>
                      <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">${attendee.mobileNumber || 'N/A'}</div>
                    </td>
                    <td>
                      <div style="font-weight: 600;">
                        ${attendee.ticketName}
                        ${attendee.complementary ? '<span class="comp-badge">COMP</span>' : ''}
                      </div>
                      <div style="font-size: 11px; font-family: 'Courier New', monospace; color: #6b7280; margin-top: 2px;">#${attendee.ticketId}</div>
                      <div style="font-size: 11px; color: #8b5cf6; margin-top: 2px;">KES ${attendee.ticketPrice.toFixed(2)}</div>
                    </td>
                    <td style="font-size: 12px;">${new Date(attendee.purchaseTime).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}</td>
                    <td>
                      <span class="status-badge status-${attendee.scanned ? 'checked-in' : 'not-checked-in'}">
                        ${attendee.scanned ? '✓ Checked In' : '✗ Not Checked In'}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Footer -->
          <div class="report-footer">
            <div class="footer-text">
              <div class="footer-company">SoldOutAfrica</div>
              <div style="margin-top: 3px;">Official Attendee Report · support@soldoutafrica.com</div>
            </div>
            <div style="text-align: right;">
              <div>© ${new Date().getFullYear()} SoldOutAfrica. All rights reserved.</div>
            </div>
          </div>

          <script>
            document.title = 'SoldOutAfrica - Attendees Report';
            window.onload = function() {
              setTimeout(() => window.print(), 500);
            }
          </script>
        </body>
        </html>
      `

      // Store HTML in sessionStorage and open /report page
      sessionStorage.setItem("reportHTML", html)
      window.open("/report", "_blank")

      toast.success("Attendees report ready!", {
        description: "Opening in new tab...",
      })
    } catch (error) {
      console.error("Error exporting attendees:", error)
      toast.error("Failed to export attendees")
    }
  }

  return (
    <>
      {/* Loading State */}
      {isLoading && (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-[#8b5cf6]" />
            <p className="text-muted-foreground">Loading event details...</p>
          </div>
        </div>
      )}

      {/* Not Found State */}
      {!isLoading && !eventData && (
        <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 max-w-[1600px] mx-auto">
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold mb-2">Event Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The event you're looking for doesn't exist or you don't have access to it.
            </p>
            <Link
              href="/dashboard/events"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Events
            </Link>
          </div>
        </div>
      )}

      {/* Event Content */}
      {!isLoading && eventData && (
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
            <div className="flex items-start gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">{eventData.name}</h1>
              {eventData.status === "pending" && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-950/30 border-2 border-orange-500/50 text-orange-700 dark:text-orange-400 text-xs sm:text-sm font-bold whitespace-nowrap animate-pulse">
                  <Clock className="w-4 h-4" />
                  Pending Review
                </div>
              )}
              {eventSuspended && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-950/30 border-2 border-red-500/50 text-red-700 dark:text-red-400 text-xs sm:text-sm font-bold whitespace-nowrap">
                  <XCircle className="w-4 h-4" />
                  Suspended
                </div>
              )}
            </div>
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
          {eventData.status !== "pending" && !isEventPastOrInactive() && (
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {eventSuspended ? (
                <button
                  onClick={() => handleActivateClick("event")}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-lg text-sm font-semibold hover:bg-green-200 dark:hover:bg-green-950/50 transition-all cursor-pointer border border-green-200 dark:border-green-900"
                >
                  Activate Event
                </button>
              ) : (
                <button
                  onClick={() => handleSuspendClick("event")}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-lg text-sm font-semibold hover:bg-red-200 dark:hover:bg-red-950/50 transition-all cursor-pointer border border-red-200 dark:border-red-900"
                >
                  Suspend Event
                </button>
              )}
              <Link
                href={`/dashboard/events/${eventData.id}/edit`}
                className="hidden lg:inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all duration-300 cursor-pointer"
              >
                <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Edit Event</span>
              </Link>

              {/* View Event Button */}
              {eventData.slug && (
                <button
                  onClick={() => window.open(`https://soldoutafrica.com/${eventData.slug}`, '_blank')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-semibold hover:bg-blue-200 dark:hover:bg-blue-950/50 transition-all cursor-pointer border border-blue-200 dark:border-blue-900"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="hidden sm:inline">View Event</span>
                </button>
              )}

              {/* Share Event Button */}
              {eventData.slug && (
                <button
                  onClick={async () => {
                    const url = `https://soldoutafrica.com/${eventData.slug}`
                    const shareData = {
                      title: eventData.name,
                      text: `Check out ${eventData.name} on SoldOut Africa!`,
                      url: url
                    }

                    try {
                      // Check if Web Share API is supported
                      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                        await navigator.share(shareData)
                        toast.success("Event shared successfully!")
                      } else {
                        // Fallback to clipboard
                        await navigator.clipboard.writeText(url)
                        toast.success("Event link copied to clipboard!")
                      }
                    } catch (error) {
                      // If share was cancelled or failed, try clipboard as fallback
                      if (error instanceof Error && error.name === 'AbortError') {
                        // User cancelled the share, no need to show error
                        return
                      }
                      try {
                        await navigator.clipboard.writeText(url)
                        toast.success("Event link copied to clipboard!")
                      } catch (clipboardError) {
                        toast.error("Failed to share event")
                      }
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-lg text-sm font-semibold hover:bg-green-200 dark:hover:bg-green-950/50 transition-all cursor-pointer border border-green-200 dark:border-green-900"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Pending Approval Notification */}
      {eventData.apiStatus === "ONHOLD" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 p-4 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-yellow-900 dark:text-yellow-200 mb-1">
                  Pending Approval
                </h3>
                <p className="text-sm sm:text-base text-yellow-800 dark:text-yellow-300">
                  This event is pending approval and will be active once approved by the administrator. The SoldOutAfrica team is currently reviewing your event.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs sm:text-sm text-yellow-700 dark:text-yellow-400">
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

        {/* Event Suspended Notification */}
        {eventSuspended && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/30 p-4 sm:p-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-red-900 dark:text-red-200 mb-1">
                    Event Suspended
                  </h3>
                  <p className="text-sm sm:text-base text-red-800 dark:text-red-300">
                    This event has been suspended. Ticket sales are currently paused and the event is not visible on the marketplace. To resume sales and make the event public again, click the &quot;Activate Event&quot; button above.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs sm:text-sm text-red-700 dark:text-red-400">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="font-medium">Sales Paused</span>
                    </div>
                    <span className="opacity-50">•</span>
                    <span className="opacity-75">Event is hidden from marketplace</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Event Balance Card - Mobile friendly */}
        {eventData.status !== "pending" && (
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#6d28d9] via-[#7c3aed] to-[#5b21b6] p-4 sm:p-6 lg:p-8 text-white mb-6">
          <div className="absolute -right-8 -top-8 w-40 h-40 sm:w-64 sm:h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-8 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-black/20 blur-2xl pointer-events-none" />

          {/* Toggle Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowBalance(!showBalance);
            }}
            className="absolute top-4 sm:top-6 lg:top-8 right-4 sm:right-6 lg:right-8 p-2.5 rounded-lg sm:rounded-xl bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-sm transition-all cursor-pointer z-20 border border-white/30 pointer-events-auto"
            aria-label={showBalance ? "Hide balance" : "Show balance"}
          >
            {showBalance ? (
              <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            ) : (
              <EyeOff className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            )}
          </button>

          <div className="relative z-10">
            <div className="max-w-4xl">
              {/* Total Revenue */}
              <div className="mb-4 sm:mb-6">
                <p className="text-xs sm:text-sm opacity-75 mb-1 sm:mb-2">Total Revenue</p>
                <p className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold break-words">
                  {showBalance
                    ? `${eventData.currency || currency} ${eventData.totalRevenue.toLocaleString()}`
                    : '••••••••'}
                </p>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-4 sm:pt-6 border-t border-white/20">
                <div className="pb-4 border-b border-white/10 sm:border-b-0">
                  <p className="text-xs opacity-75 mb-1">Commission & Fees</p>
                  <p className="text-base sm:text-lg lg:text-xl xl:text-2xl font-semibold break-words">
                    {showBalance
                      ? `- ${eventData.currency || currency} ${(eventData.totalRevenue * 0.125).toLocaleString()}`
                      : '- ••••••'}
                  </p>
                </div>
                <div className="sm:border-l sm:border-white/20 sm:pl-6">
                  <p className="text-xs opacity-75 mb-1">Net Amount</p>
                  <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-green-300 break-words">
                    {showBalance
                      ? `${eventData.currency || currency} ${(eventData.totalRevenue * 0.875).toLocaleString()}`
                      : '••••••'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

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
            {/* Event Poster Card with Details */}
            <div className="rounded-2xl border border-border overflow-hidden shadow-lg bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e]">
              <div className="relative w-full h-64 sm:h-80 lg:h-96">
                {/* Background Image */}
                {eventData.image ? (
                  <>
                    <img
                      src={eventData.image}
                      alt={eventData.name}
                      className="absolute inset-0 w-full h-full object-contain"
                      style={{
                        objectFit: 'contain',
                        objectPosition: 'center'
                      }}
                    />
                    {/* Dark background behind the image */}
                    <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e]" />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed]" />
                )}

                {/* Dark Gradient Overlays for better text readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-transparent" />

                {/* Content */}
                <div className="relative h-full flex flex-col justify-end p-6 sm:p-8">
                  {/* Event Title */}
                  <h3 className="text-white text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 drop-shadow-2xl">
                    {eventData.name}
                  </h3>

                  {/* Event Details - Date, Time, Location */}
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 text-white/90 backdrop-blur-md bg-white/10 px-3 py-1.5 rounded-full border border-white/20 shadow-lg">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {new Date(eventData.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-white/90 backdrop-blur-md bg-white/10 px-3 py-1.5 rounded-full border border-white/20 shadow-lg">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">{eventData.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/90 backdrop-blur-md bg-white/10 px-3 py-1.5 rounded-full border border-white/20 shadow-lg">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm font-medium">{eventData.venue}</span>
                    </div>
                  </div>
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
                    <p className="text-sm text-muted-foreground mb-1">Tickets Sold</p>
                    <p className="text-2xl font-bold">{eventData.totalTicketsSold || ticketTypes.reduce((sum: number, t: any) => sum + t.sold, 0)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50">
                    <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                    <p className="text-2xl font-bold">{eventData.currency || currency} {eventData.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50">
                    <p className="text-sm text-muted-foreground mb-1">Ticket Types</p>
                    <p className="text-2xl font-bold">{ticketTypes.length}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50">
                    <p className="text-sm text-muted-foreground mb-1">Available Tickets</p>
                    <p className="text-2xl font-bold">{ticketTypes.reduce((sum: number, t: any) => sum + t.quantityAvailable, 0)}</p>
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
              {!isEventPastOrInactive() && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleAddTicket}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Add Ticket
                  </button>
                  <button
                    onClick={() => setShowComplementaryModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all duration-300 cursor-pointer"
                  >
                    <Gift className="w-4 h-4" />
                    Issue Comp Ticket
                  </button>
                </div>
              )}
            </div>

            {/* Ticket Cards */}
            <div className="grid gap-4">
              {ticketTypes.map((ticket: any) => (
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
                          {suspendedTickets.includes(ticket.id) && (
                            <span className="px-3 py-1 rounded-full bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs font-medium border border-red-200 dark:border-red-900">
                              Sales Suspended
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditTicket(ticket)}
                            className="p-2 hover:bg-secondary rounded-lg transition-colors cursor-pointer"
                            title="Edit Ticket"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Price</p>
                          <p className="font-semibold">{eventData.currency || currency} {ticket.price.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Sold</p>
                          <p className="font-semibold">
                            {ticket.sold} / {ticket.totalAvailable}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                          <p className="font-semibold">{eventData.currency || currency} {ticket.revenue.toLocaleString()}</p>
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
                        {!isEventPastOrInactive() && (
                          <>
                            {suspendedTickets.includes(ticket.id) ? (
                              <button
                                onClick={() => handleActivateClick("ticket", ticket.id)}
                                className="px-3 py-1.5 bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-lg text-xs font-medium hover:bg-green-200 dark:hover:bg-green-950/50 transition-colors cursor-pointer border border-green-200 dark:border-green-900"
                              >
                                Activate Sales
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSuspendClick("ticket", ticket.id)}
                                className="px-3 py-1.5 bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-200 dark:hover:bg-red-950/50 transition-colors cursor-pointer border border-red-200 dark:border-red-900"
                              >
                                Suspend Sales
                              </button>
                            )}
                          </>
                        )}
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
            {transactionsLoading ? (
              <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-card/50">
                <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading transactions...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-card/50">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary/50 flex items-center justify-center">
                  <Download className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No Transactions Yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                </p>
              </div>
            ) : (
              <>
                {/* Search and Actions */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-11 pl-10 pr-20 rounded-lg border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/10 transition-all"
                    />
                    <button className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#8b5cf6] text-white rounded-md text-xs font-semibold hover:bg-[#7c3aed] transition-colors cursor-pointer">
                      Search
                    </button>
                  </div>
                  <button
                    onClick={exportTransactionsToPDF}
                    className="inline-flex items-center justify-center gap-2 h-11 px-4 py-2 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-4 h-4" />
                    Export PDF
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
                        {paginatedTransactions.map((txn) => (
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
                            <td className="p-4 text-sm font-semibold">{eventData.currency || currency} {txn.amount.toLocaleString()}</td>
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
                  {paginatedTransactions.map((txn) => (
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
                          <p className="text-sm font-bold">{currency} {txn.amount.toLocaleString()}</p>
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

                {/* Pagination - Bottom Only */}
                {transactionsTotalElements > 0 && (
                  <div className="pagination-container">
                    <p className="pagination-info">
                      Showing <span className="font-semibold text-foreground">{((transactionsPage - 1) * itemsPerPage) + 1}</span> to <span className="font-semibold text-foreground">{Math.min(transactionsPage * itemsPerPage, transactionsTotalElements)}</span> of <span className="font-semibold text-foreground">{transactionsTotalElements}</span> transactions
                    </p>
                    <div className="pagination-controls">
                      <button
                        onClick={() => setTransactionsPage(prev => Math.max(1, prev - 1))}
                        disabled={transactionsPage === 1}
                        className="pagination-nav-button"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-1">
                        {getPageNumbers(transactionsPage, transactionsTotalPages).map((page, index) => (
                          page === '...' ? (
                            <span key={`ellipsis-${index}`} className="px-2 py-1 text-muted-foreground">
                              ...
                            </span>
                          ) : (
                            <button
                              key={page}
                              onClick={() => setTransactionsPage(page as number)}
                              className={cn(
                                "pagination-button",
                                page === transactionsPage && "pagination-button-active"
                              )}
                            >
                              {page}
                            </button>
                          )
                        ))}
                      </div>
                      <button
                        onClick={() => setTransactionsPage(prev => Math.min(transactionsTotalPages, prev + 1))}
                        disabled={transactionsPage === transactionsTotalPages}
                        className="pagination-nav-button"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
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
            {attendeesLoading ? (
              <div className="flex flex-col items-center justify-center gap-4 py-20">
                <Loader2 className="w-12 h-12 animate-spin text-[#8b5cf6]" />
                <div className="text-center">
                  <p className="text-base font-medium text-foreground">Loading attendees...</p>
                  <p className="text-sm text-muted-foreground mt-1">Please wait while we fetch the data</p>
                </div>
              </div>
            ) : eventData.status === "pending" || attendees.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-card/50">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary/50 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No Attendees Yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {eventData.status === "pending"
                    ? "Attendee information will be available once your event is approved and tickets are sold."
                    : "Attendees will appear here once tickets are purchased."}
                </p>
              </div>
            ) : (
              <>
                {/* Search and Actions */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search attendees..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-11 pl-10 pr-20 rounded-lg border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/10 transition-all"
                    />
                    <button className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#8b5cf6] text-white rounded-md text-xs font-semibold hover:bg-[#7c3aed] transition-colors cursor-pointer">
                      Search
                    </button>
                  </div>
                  <button
                    onClick={exportAttendeesToPDF}
                    className="inline-flex items-center justify-center gap-2 h-11 px-4 py-2 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all cursor-pointer whitespace-nowrap"
                  >
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
                          <th className="text-left p-4 text-sm font-semibold">Phone</th>
                          <th className="text-left p-4 text-sm font-semibold">Ticket Type</th>
                          <th className="text-left p-4 text-sm font-semibold">Ticket #</th>
                          <th className="text-left p-4 text-sm font-semibold">Purchase Date</th>
                          <th className="text-left p-4 text-sm font-semibold">Check-in</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendeesLoading ? (
                          <tr>
                            <td colSpan={7} className="p-12">
                              <div className="flex flex-col items-center justify-center gap-4">
                                <Loader2 className="w-10 h-10 animate-spin text-[#8b5cf6]" />
                                <div className="text-center">
                                  <p className="text-sm font-medium text-foreground">Loading attendees...</p>
                                  <p className="text-xs text-muted-foreground mt-1">Please wait while we fetch the data</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : paginatedAttendees.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-muted-foreground">
                              No attendees found
                            </td>
                          </tr>
                        ) : (
                          paginatedAttendees.map((attendee, index) => (
                            <tr key={`${attendee.ticketId}-${index}`} className="border-b border-border hover:bg-secondary/30 transition-colors">
                              <td className="p-4 text-sm font-medium">
                                {attendee.firstName} {attendee.lastName}
                              </td>
                              <td className="p-4 text-sm text-muted-foreground">{attendee.email}</td>
                              <td className="p-4 text-sm text-muted-foreground">{attendee.mobileNumber || 'N/A'}</td>
                              <td className="p-4 text-sm">
                                {attendee.ticketName}
                                {attendee.complementary && (
                                  <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded">
                                    Comp
                                  </span>
                                )}
                              </td>
                              <td className="p-4 text-sm font-mono">{attendee.ticketId}</td>
                              <td className="p-4 text-sm text-muted-foreground">
                                {new Date(attendee.purchaseTime).toLocaleDateString()}
                              </td>
                              <td className="p-4">
                                {attendee.scanned ? (
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
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>


                {/* Mobile Cards */}
                <div className="lg:hidden space-y-4">
                  {attendeesLoading ? (
                    <div className="flex flex-col items-center justify-center gap-4 p-12">
                      <Loader2 className="w-10 h-10 animate-spin text-[#8b5cf6]" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground">Loading attendees...</p>
                        <p className="text-xs text-muted-foreground mt-1">Please wait while we fetch the data</p>
                      </div>
                    </div>
                  ) : paginatedAttendees.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      No attendees found
                    </div>
                  ) : (
                    paginatedAttendees.map((attendee, index) => (
                      <div key={`${attendee.ticketId}-${index}`} className="rounded-xl border border-border bg-card p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold">{attendee.firstName} {attendee.lastName}</p>
                            <p className="text-sm text-muted-foreground">{attendee.email}</p>
                            <p className="text-sm text-muted-foreground">{attendee.mobileNumber || 'N/A'}</p>
                          </div>
                          {attendee.scanned ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-xs font-medium">
                              <CheckCircle className="w-3 h-3" />
                              Checked In
                            </span>
                          ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-muted-foreground text-xs font-medium">
                            Not Checked In
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Ticket Type</p>
                          <p className="text-sm">
                            {attendee.ticketName}
                            {attendee.complementary && (
                              <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded">
                                Comp
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Ticket Number</p>
                          <p className="text-sm font-mono">{attendee.ticketId}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Purchase Date</p>
                          <p className="text-sm">{new Date(attendee.purchaseTime).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Transaction ID</p>
                          <p className="text-sm font-mono">{attendee.transactionId}</p>
                        </div>
                      </div>
                    </div>
                  )))}
                </div>

                {/* Pagination - Bottom Only */}
                {attendees.length > itemsPerPage && (
                  <div className="pagination-container">
                    <p className="pagination-info">
                      Showing <span className="font-semibold text-foreground">{((attendeesPage - 1) * itemsPerPage) + 1}</span> to <span className="font-semibold text-foreground">{Math.min(attendeesPage * itemsPerPage, attendees.length)}</span> of <span className="font-semibold text-foreground">{attendees.length}</span> attendees
                    </p>
                    <div className="pagination-controls">
                      <button
                        onClick={() => setAttendeesPage(prev => Math.max(1, prev - 1))}
                        disabled={attendeesPage === 1}
                        className="pagination-nav-button"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-1">
                        {getPageNumbers(attendeesPage, attendeesTotalPages).map((page, index) => (
                          page === '...' ? (
                            <span key={`ellipsis-${index}`} className="px-2 py-1 text-muted-foreground">
                              ...
                            </span>
                          ) : (
                            <button
                              key={page}
                              onClick={() => setAttendeesPage(page as number)}
                              className={cn(
                                "pagination-button",
                                page === attendeesPage && "pagination-button-active"
                              )}
                            >
                              {page}
                            </button>
                          )
                        ))}
                      </div>
                      <button
                        onClick={() => setAttendeesPage(prev => Math.min(attendeesTotalPages, prev + 1))}
                        disabled={attendeesPage === attendeesTotalPages}
                        className="pagination-nav-button"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
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
              onClick={handleCloseCompModal}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-2xl border border-border p-6 z-50 shadow-2xl max-h-[90vh] overflow-y-auto"
              style={{ position: 'fixed' }}
            >
              <button
                onClick={handleCloseCompModal}
                className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-bold mb-4">Issue Complimentary Ticket</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Recipient Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative z-10">
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      value={compEmail}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      placeholder="recipient@example.com"
                      className={cn(
                        "w-full h-12 px-4 rounded-xl border bg-background text-sm outline-none focus:ring-4 transition-all relative z-10",
                        compEmailError
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                          : compEmail && !compEmailError
                          ? "border-green-500 focus:border-green-500 focus:ring-green-500/10"
                          : "border-border focus:border-[#8b5cf6] focus:ring-[#8b5cf6]/10"
                      )}
                      style={{ position: 'relative' }}
                    />
                    {compEmail && !compEmailError && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                    )}
                    {compEmailError && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <XCircle className="w-5 h-5 text-red-500" />
                      </div>
                    )}
                  </div>
                  {compEmailError && (
                    <p className="text-xs text-red-500 mt-1.5">{compEmailError}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative z-10">
                    <input
                      type="tel"
                      name="phone"
                      autoComplete="tel"
                      value={compPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="254117066018"
                      className={cn(
                        "w-full h-12 px-4 rounded-xl border bg-background text-sm outline-none focus:ring-4 transition-all relative z-10",
                        compPhoneError
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                          : compPhone && !compPhoneError
                          ? "border-green-500 focus:border-green-500 focus:ring-green-500/10"
                          : "border-border focus:border-[#8b5cf6] focus:ring-[#8b5cf6]/10"
                      )}
                      style={{ position: 'relative' }}
                    />
                    {compPhone && !compPhoneError && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                    )}
                    {compPhoneError && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <XCircle className="w-5 h-5 text-red-500" />
                      </div>
                    )}
                  </div>
                  {compPhoneError && (
                    <p className="text-xs text-red-500 mt-1.5">{compPhoneError}</p>
                  )}
                  {compPhone && !compPhoneError && formatKenyanPhone(compPhone) && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1.5">
                      Valid: {formatKenyanPhone(compPhone)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Ticket Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={compTicketType}
                    onChange={(e) => setCompTicketType(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3c%2Fsvg%3E')] bg-[length:1rem] bg-[center_right_1rem] bg-no-repeat pr-12"
                  >
                    <option value="">Select ticket type</option>
                    {ticketTypes.map((ticket: any) => (
                      <option key={ticket.id} value={ticket.id}>
                        {ticket.name} - {currency} {ticket.price.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={compQuantity}
                    onChange={(e) => setCompQuantity(e.target.value)}
                    min="1"
                    className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                  />
                </div>

                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/30">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-purple-800 dark:text-purple-300">
                      The ticket will be sent to both the email and phone number provided. The recipient will receive a QR code for entry.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleCloseCompModal}
                    className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl font-semibold text-sm hover:bg-secondary/80 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleIssueCompTicket}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                  >
                    <Gift className="w-4 h-4" />
                    Issue Ticket
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Suspend Event/Ticket Modal */}
      <AnimatePresence>
        {showSuspendModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleModalClose}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-2xl border border-border p-6 z-50 shadow-2xl"
            >
              <button
                onClick={handleModalClose}
                className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {suspendStep === "confirm" ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center",
                      actionType === "suspend"
                        ? "bg-red-100 dark:bg-red-950/30"
                        : "bg-green-100 dark:bg-green-950/30"
                    )}>
                      <AlertTriangle className={cn(
                        "w-6 h-6",
                        actionType === "suspend"
                          ? "text-red-600 dark:text-red-400"
                          : "text-green-600 dark:text-green-400"
                      )} />
                    </div>
                    <h3 className="text-xl font-bold">
                      {actionType === "suspend" ? "Suspend" : "Activate"} {suspendType === "event" ? "Event" : "Ticket Sales"}?
                    </h3>
                  </div>
                  <div className="mb-6">
                    <p className="text-sm text-muted-foreground mb-4">
                      {actionType === "suspend" ? (
                        suspendType === "event"
                          ? "Are you sure you want to suspend this event? This will stop all ticket sales and hide the event from the marketplace."
                          : "Are you sure you want to suspend sales for this ticket type? No more tickets of this type can be sold."
                      ) : (
                        suspendType === "event"
                          ? "Are you sure you want to activate this event? This will resume ticket sales and make the event visible on the marketplace."
                          : "Are you sure you want to activate sales for this ticket type? Tickets will be available for purchase again."
                      )}
                    </p>
                    <div className={cn(
                      "p-4 rounded-lg border",
                      actionType === "suspend"
                        ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30"
                        : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/30"
                    )}>
                      <p className={cn(
                        "text-sm",
                        actionType === "suspend"
                          ? "text-red-800 dark:text-red-300"
                          : "text-green-800 dark:text-green-300"
                      )}>
                        <span className="font-semibold">{actionType === "suspend" ? "Warning:" : "Note:"}</span> {actionType === "suspend"
                          ? "This action can be reversed, but it may affect your event's visibility and sales."
                          : "This will make the event/ticket immediately available for purchase."}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleModalClose}
                      className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl font-semibold text-sm hover:bg-secondary/80 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSuspendConfirm}
                      className={cn(
                        "flex-1 px-4 py-3 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all cursor-pointer",
                        actionType === "suspend"
                          ? "bg-gradient-to-r from-red-600 to-red-700 hover:shadow-red-600/25"
                          : "bg-gradient-to-r from-green-600 to-green-700 hover:shadow-green-600/25"
                      )}
                    >
                      Continue
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold mb-4">Enter OTP to Confirm</h3>
                  <div className="mb-6">
                    <p className="text-sm text-muted-foreground mb-4">
                      For security purposes, please enter the 4-digit OTP to confirm the {actionType === "suspend" ? "suspension" : "activation"}.
                    </p>
                    <div>
                      <label className="text-sm font-medium mb-2 block">OTP Code</label>
                      <input
                        type="text"
                        maxLength={4}
                        value={suspendOtp}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "")
                          setSuspendOtp(value)
                          setSuspendError("")
                        }}
                        placeholder="••••"
                        className="w-full h-14 px-4 rounded-xl border border-border bg-background text-2xl font-mono text-center outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                      />
                      {suspendError && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-2">{suspendError}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSuspendStep("confirm")}
                      className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl font-semibold text-sm hover:bg-secondary/80 transition-all cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleOtpSubmit}
                      disabled={suspendOtp.length !== 4}
                      className={cn(
                        "flex-1 px-4 py-3 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                        actionType === "suspend"
                          ? "bg-gradient-to-r from-red-600 to-red-700 hover:shadow-red-600/25"
                          : "bg-gradient-to-r from-green-600 to-green-700 hover:shadow-green-600/25"
                      )}
                    >
                      Confirm {actionType === "suspend" ? "Suspension" : "Activation"}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Ticket Modal */}
      <AnimatePresence>
        {showEditTicketModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseEditTicketModal}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card rounded-2xl border border-border p-6 z-50 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={handleCloseEditTicketModal}
                className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-bold mb-4">Edit Ticket Type</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Ticket Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editTicketName}
                    onChange={(e) => setEditTicketName(e.target.value)}
                    placeholder="e.g., VIP Pass"
                    className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Price (KES) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={editTicketPrice}
                      onChange={(e) => setEditTicketPrice(e.target.value)}
                      placeholder="e.g., 2500"
                      min="0"
                      disabled
                      className="w-full h-12 px-4 rounded-xl border border-border bg-secondary text-sm outline-none transition-all cursor-not-allowed opacity-60"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Total Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={editTicketQuantity}
                      onChange={(e) => setEditTicketQuantity(e.target.value)}
                      placeholder="e.g., 100"
                      min="1"
                      className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Limit Per Person
                    </label>
                    <input
                      type="number"
                      value={editTicketLimitPerPerson}
                      onChange={(e) => setEditTicketLimitPerPerson(e.target.value)}
                      placeholder="0 = No limit"
                      min="0"
                      className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Complementary Tickets
                    </label>
                    <input
                      type="number"
                      value={editTicketComplementary}
                      onChange={(e) => setEditTicketComplementary(e.target.value)}
                      placeholder="0"
                      min="0"
                      className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Tickets To Issue
                  </label>
                  <input
                    type="number"
                    value={editTicketToIssue}
                    onChange={(e) => setEditTicketToIssue(e.target.value)}
                    placeholder="1"
                    min="1"
                    className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                  />
                </div>

                {/* Ticket Sale Period */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <label className="text-sm font-medium block">
                    Ticket Sale Period <span className="text-red-500">*</span>
                  </label>
                  <div>
                    <label className="text-xs font-medium mb-2 block text-muted-foreground">Sale Start Date & Time <span className="text-red-500">*</span></label>
                    <DateTimePicker
                      selected={editTicketSaleStart}
                      onChange={(date) => setEditTicketSaleStart(date)}
                      placeholderText="Select start date & time"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-2 block text-muted-foreground">Sale End Date & Time <span className="text-red-500">*</span></label>
                    <DateTimePicker
                      selected={editTicketSaleEnd}
                      onChange={(date) => setEditTicketSaleEnd(date)}
                      placeholderText="Select end date & time"
                      minDate={editTicketSaleStart}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleCloseEditTicketModal}
                    className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl font-semibold text-sm hover:bg-secondary/80 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveTicket}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Ticket Modal */}
      <AnimatePresence>
        {showAddTicketModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseAddTicketModal}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card rounded-2xl border border-border p-6 z-50 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={handleCloseAddTicketModal}
                className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-bold mb-4">Add New Ticket Type</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Ticket Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addTicketName}
                    onChange={(e) => setAddTicketName(e.target.value)}
                    placeholder="e.g., VIP Pass"
                    className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Price (KES) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={addTicketPrice}
                      onChange={(e) => setAddTicketPrice(e.target.value)}
                      placeholder="e.g., 2500"
                      min="0"
                      className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={addTicketQuantity}
                      onChange={(e) => setAddTicketQuantity(e.target.value)}
                      placeholder="e.g., 100"
                      min="1"
                      className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Description (Optional)
                  </label>
                  <textarea
                    value={addTicketDescription}
                    onChange={(e) => setAddTicketDescription(e.target.value)}
                    placeholder="Add additional details about this ticket type..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all resize-none"
                  />
                </div>

                {/* Ticket Sale Period */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <label className="text-sm font-medium block">
                    Ticket Sale Period <span className="text-red-500">*</span>
                  </label>
                  <div>
                    <label className="text-xs font-medium mb-2 block text-muted-foreground">Sale Start Date & Time <span className="text-red-500">*</span></label>
                    <DateTimePicker
                      selected={addTicketSaleStart}
                      onChange={(date) => setAddTicketSaleStart(date)}
                      placeholderText="Select start date & time"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-2 block text-muted-foreground">Sale End Date & Time <span className="text-red-500">*</span></label>
                    <DateTimePicker
                      selected={addTicketSaleEnd}
                      onChange={(date) => setAddTicketSaleEnd(date)}
                      placeholderText="Select end date & time"
                      minDate={addTicketSaleStart}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800 dark:text-blue-300">
                      <span className="font-semibold">Important:</span> Set when this ticket type should be available for purchase. This controls when customers can buy this specific ticket.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleCloseAddTicketModal}
                    className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl font-semibold text-sm hover:bg-secondary/80 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNewTicket}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Ticket
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
      )}
    </>
  )
}

