"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Camera,
  Keyboard,
  CheckCircle,
  Loader2,
  CreditCard,
  Users,
  Ticket,
  AlertCircle,
  X,
  ChevronLeft,
  XCircle,
  ArrowRight,
  MapPin,
  Calendar,
} from "lucide-react"
import { Html5Qrcode } from "html5-qrcode"
import { toast } from "sonner"
import { api } from "@/lib/api-client"
import { sessionManager } from "@/lib/session-manager"

// ─── Types ───────────────────────────────────────────────────────────────────

type ScanMode = "camera" | "manual" | "payment"

interface Event {
  id: number
  name: string
  date: string
  location: string
}

interface TicketType {
  id: number
  ticketName: string
  ticketPrice: number
  quantityAvailable: number
}

interface ScannedTicket {
  id: number
  ticketName: string
  ticketPrice: number
  barcode: string
  ticketGroupCode: string
  customerMobile: string
  isComplementary: boolean
  status: string
  createdAt: string
  eventId?: number
  eventName?: string
}

interface GroupTickets {
  tickets: ScannedTicket[]
  posterUrl: string
  ticketPrice: number
  event: string
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ScanEventsPage() {
  // ── Top‑level mode ─────────────────────────────────────────────────────
  const [scanMode, setScanMode] = useState<ScanMode>("payment")

  // ── Shared state ───────────────────────────────────────────────────────
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isLoadingEvents, setIsLoadingEvents] = useState(false)

  // ── Camera scanner state ───────────────────────────────────────────────
  const [scannerActive, setScannerActive] = useState(false) // camera is live
  const [isProcessing, setIsProcessing] = useState(false)   // a scan is in-flight
  const [modalTicket, setModalTicket] = useState<ScannedTicket | null>(null) // modal data
  const [modalStatus, setModalStatus] = useState<"success" | "already" | "error">("success")
  const [modalMessage, setModalMessage] = useState("")
  const [showModal, setShowModal] = useState(false)

  // ── Manual barcode in camera mode ──────────────────────────────────────
  const [manualBarcode, setManualBarcode] = useState("")
  const [isValidating, setIsValidating] = useState(false)

  // ── M-Pesa payment state ───────────────────────────────────────────────
  const [tickets, setTickets] = useState<TicketType[]>([])
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null)
  const [customerPhone, setCustomerPhone] = useState("")
  const [isLoadingTickets, setIsLoadingTickets] = useState(false)
  const [isPurchasing, setIsPurchasing] = useState(false)

  // ── Group code lookup state ────────────────────────────────────────────
  const [manualGroupCode, setManualGroupCode] = useState("")
  const [groupTickets, setGroupTickets] = useState<GroupTickets | null>(null)
  const [selectedBarcodes, setSelectedBarcodes] = useState<string[]>([])
  const [isRedeeming, setIsRedeeming] = useState(false)

  // ── Refs ────────────────────────────────────────────────────────────────
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const scannerContainerRef = useRef<HTMLDivElement>(null)
  const isProcessingRef = useRef(false)
  const lastScannedCodeRef = useRef("")
  const lastScanTimeRef = useRef(0)
  const scanTicketRef = useRef<((barcode: string) => Promise<void>) | null>(null)

  // ── Helpers ─────────────────────────────────────────────────────────────

  const formatPhoneNumber = (input: string): string => {
    const digitsOnly = input.replace(/\D/g, "")
    if (digitsOnly.startsWith("0")) return "254" + digitsOnly.substring(1)
    if (digitsOnly.startsWith("254")) return digitsOnly
    if (input.startsWith("+254")) return digitsOnly
    if (digitsOnly.length === 9) return "254" + digitsOnly
    return digitsOnly
  }

  // ── Fetch events ───────────────────────────────────────────────────────

  const fetchEvents = useCallback(async () => {
    setIsLoadingEvents(true)
    try {
      const user = sessionManager.getUser()
      if (!user || !user.company_id) {
        toast.error("Unable to identify company")
        return
      }
      const response = await api.company.getEvents()
      if (response.events) {
        const activeEvents = response.events
          .filter((event) => event.isActive && event.companyId === user.company_id)
          .map((event) => ({
            id: event.id,
            name: event.eventName,
            date: event.eventStartDate,
            location: event.eventLocation,
          }))
        setEvents(activeEvents)
        if (activeEvents.length === 0) {
          toast.info("No active events found for your company")
        }
      }
    } catch (error) {
      console.error("Error fetching events:", error)
      toast.error("Failed to load events")
    } finally {
      setIsLoadingEvents(false)
    }
  }, [])

  useEffect(() => {
    if (scanMode === "payment" || scanMode === "camera") {
      fetchEvents()
    }
  }, [scanMode, fetchEvents])

  // ── Fetch tickets (M-Pesa) ─────────────────────────────────────────────

  const fetchTickets = useCallback(async (eventId: number) => {
    setIsLoadingTickets(true)
    try {
      const response = await api.event.getById(eventId)
      if (response.status && response.event?.tickets) {
        const availableTickets = response.event.tickets
          .filter((ticket) => ticket.isActive && ticket.quantityAvailable > 0)
          .map((ticket) => ({
            id: ticket.id,
            ticketName: ticket.ticketName,
            ticketPrice: ticket.ticketPrice,
            quantityAvailable: ticket.quantityAvailable,
          }))
        setTickets(availableTickets)
        if (availableTickets.length > 0) setSelectedTicket(availableTickets[0])
      }
    } catch (error) {
      console.error("Error fetching tickets:", error)
      toast.error("Failed to load tickets")
    } finally {
      setIsLoadingTickets(false)
    }
  }, [])

  useEffect(() => {
    if (selectedEvent && scanMode === "payment") {
      fetchTickets(selectedEvent.id)
    }
  }, [selectedEvent, scanMode, fetchTickets])

  // ── Scanner core ───────────────────────────────────────────────────────

  const stopScanning = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        const state = html5QrCodeRef.current.getState()
        if (state === 2 || state === 3) {
          await html5QrCodeRef.current.stop()
        }
        await html5QrCodeRef.current.clear()
      } catch (err) {
        console.error("Error stopping scanner:", err)
      }
      html5QrCodeRef.current = null
    }
    setScannerActive(false)
  }, [])

  const pauseScanner = useCallback(() => {
    if (html5QrCodeRef.current) {
      try {
        const state = html5QrCodeRef.current.getState()
        if (state === 2) {
          html5QrCodeRef.current.pause(true)
        }
      } catch (err) {
        console.warn("Could not pause scanner:", err)
      }
    }
  }, [])

  const resumeScanner = useCallback(() => {
    if (html5QrCodeRef.current) {
      try {
        const state = html5QrCodeRef.current.getState()
        if (state === 3) {
          html5QrCodeRef.current.resume()
        }
      } catch (err) {
        console.warn("Could not resume scanner:", err)
      }
    }
    // Reset debounce so next ticket can be scanned
    lastScannedCodeRef.current = ""
    lastScanTimeRef.current = 0
    isProcessingRef.current = false
  }, [])

  // ── Scan ticket API call ───────────────────────────────────────────────

  const scanTicket = useCallback(
    async (barcode: string) => {
      if (!selectedEvent) return

      try {
        const user = sessionManager.getUser()
        if (!user || !user.user_id) {
          toast.error("User not logged in")
          return
        }

        const response = await api.scanner.scan({
          userId: user.user_id,
          eventId: selectedEvent.id,
          barcode: barcode.trim(),
        })

        const ticketData: ScannedTicket | undefined = Array.isArray(response.ticket)
          ? response.ticket[0]
          : response.ticket

        if (ticketData) {
          // Wrong event check
          if (ticketData.eventId && ticketData.eventId !== selectedEvent.id) {
            setModalTicket(ticketData)
            setModalStatus("error")
            setModalMessage(`This ticket belongs to a different event`)
            setShowModal(true)
            return
          }

          setModalTicket(ticketData)

          if (response.status) {
            setModalStatus("success")
            setModalMessage(response.message || "Ticket scanned & redeemed!")
          } else {
            setModalStatus("already")
            setModalMessage(response.error || response.message || "Ticket already scanned")
          }
          setShowModal(true)
        } else {
          setModalTicket(null)
          setModalStatus("error")
          setModalMessage(response.error || response.message || "Invalid ticket")
          setShowModal(true)
        }
      } catch (error) {
        console.error("Scan error:", error)
        setModalTicket(null)
        setModalStatus("error")
        setModalMessage(error instanceof Error ? error.message : "Scan failed")
        setShowModal(true)
      }
    },
    [selectedEvent]
  )

  // Keep ref in sync
  useEffect(() => {
    scanTicketRef.current = scanTicket
  }, [scanTicket])

  // ── Barcode handler (called from html5-qrcode callback) ────────────────

  const handleScanBarcode = useCallback(
    async (code: string) => {
      if (!code || code.trim().length === 0) return

      // Prevent double-processing
      if (isProcessingRef.current) return

      // Debounce same code within 3 seconds
      const now = Date.now()
      if (code === lastScannedCodeRef.current && now - lastScanTimeRef.current < 3000) return

      isProcessingRef.current = true
      lastScannedCodeRef.current = code
      lastScanTimeRef.current = now

      setIsProcessing(true)

      // Pause camera so frames stop (no new callbacks)
      pauseScanner()

      // Call scan API
      if (scanTicketRef.current) {
        await scanTicketRef.current(code)
      }

      setIsProcessing(false)
      // Note: isProcessingRef stays true until modal is dismissed → resumeScanner resets it
    },
    [pauseScanner]
  )

  // ── Start scanning ─────────────────────────────────────────────────────

  const startScanning = useCallback(async () => {
    if (!scannerContainerRef.current) return
    try {
      setScannerActive(true)

      // Clean up previous instance
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop()
          await html5QrCodeRef.current.clear()
        } catch {
          /* ignore */
        }
        html5QrCodeRef.current = null
      }

      const html5QrCode = new Html5Qrcode("scanner-viewport")
      html5QrCodeRef.current = html5QrCode

      const devices = await Html5Qrcode.getCameras()
      const barcodeScanner = devices.find(
        (d) =>
          d.label.toLowerCase().includes("barcode") ||
          d.label.toLowerCase().includes("scanner")
      )

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        formatsToSupport: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      }

      const cameraId = barcodeScanner
        ? barcodeScanner.id
        : { facingMode: "environment" }

      await html5QrCode.start(cameraId, config, (decodedText) => {
        handleScanBarcode(decodedText)
      }, undefined)

      // Reset refs for fresh start
      isProcessingRef.current = false
      lastScannedCodeRef.current = ""
      lastScanTimeRef.current = 0
    } catch (err) {
      console.error("Error starting scanner:", err)
      toast.error("Failed to start camera", {
        description: err instanceof Error ? err.message : "Check camera permissions",
      })
      setScannerActive(false)
    }
  }, [handleScanBarcode])

  // ── Auto-start scanner when event is selected in camera mode ──────────

  useEffect(() => {
    if (scanMode === "camera" && selectedEvent && !scannerActive) {
      // small delay so the DOM element is rendered
      const t = setTimeout(() => startScanning(), 200)
      return () => clearTimeout(t)
    }
    if (scanMode !== "camera") {
      stopScanning()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanMode, selectedEvent])

  // cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Dismiss modal → resume scanning ────────────────────────────────────

  const dismissModal = useCallback(() => {
    setShowModal(false)
    setModalTicket(null)
    setModalMessage("")
    resumeScanner()
  }, [resumeScanner])

  // ── Go back to event selection ─────────────────────────────────────────

  const handleBackToEvents = useCallback(() => {
    stopScanning()
    setSelectedEvent(null)
    setShowModal(false)
    setModalTicket(null)
    setModalMessage("")
  }, [stopScanning])

  // ── Manual barcode (camera mode) ───────────────────────────────────────

  const handleManualBarcodeScan = async () => {
    if (!manualBarcode.trim()) {
      toast.error("Please enter a barcode")
      return
    }
    setIsValidating(true)
    pauseScanner()
    if (scanTicketRef.current) {
      await scanTicketRef.current(manualBarcode.trim())
    }
    setManualBarcode("")
    setIsValidating(false)
  }

  // ── M-Pesa purchase ────────────────────────────────────────────────────

  const handleMpesaPurchase = async () => {
    if (!selectedEvent || !selectedTicket) {
      toast.error("Please select an event and ticket")
      return
    }
    if (!customerPhone) {
      toast.error("Please provide customer phone number")
      return
    }
    const phoneRegex = /^254\d{9}$/
    if (!phoneRegex.test(customerPhone)) {
      toast.error("Phone number must be in format: 254XXXXXXXXX")
      return
    }
    setIsPurchasing(true)
    try {
      const purchaseData = {
        eventId: selectedEvent.id,
        amountDisplayed: selectedTicket.ticketPrice,
        coupon_code: "",
        channel: "mpesa" as const,
        customer: {
          mobile_number: customerPhone,
          email: "brian@stdiox.com",
        },
        tickets: [{ ticketId: selectedTicket.id, quantity: 1 }],
      }
      const response = await api.ticket.purchase(purchaseData)
      if (response.status) {
        toast.success(response.message || "M-Pesa STK push sent successfully!")
        setCustomerPhone("")
      } else {
        toast.error(response.message || "Failed to initiate payment")
      }
    } catch (error) {
      console.error("Error initiating payment:", error)
      toast.error("An error occurred while initiating payment")
    } finally {
      setIsPurchasing(false)
    }
  }

  // ── Group ticket helpers ───────────────────────────────────────────��───

  const fetchGroupTickets = async (groupCode: string) => {
    setIsValidating(true)
    try {
      const response = await api.scanner.getGroupTickets(groupCode)
      if (response.status && response.tickets) {
        setGroupTickets(response)
        toast.success("Group Tickets Loaded", {
          description: `Found ${response.tickets.length} ticket(s) in group`,
        })
      } else {
        toast.error("Failed to load group tickets")
      }
    } catch (error) {
      console.error("Group fetch error:", error)
      toast.error("Failed to load group tickets")
    } finally {
      setIsValidating(false)
    }
  }

  const handleManualGroupCodeLookup = async () => {
    if (!manualGroupCode.trim()) {
      toast.error("Please enter a group code")
      return
    }
    await fetchGroupTickets(manualGroupCode)
  }

  const toggleBarcodeSelection = (barcode: string) => {
    setSelectedBarcodes((prev) =>
      prev.includes(barcode) ? prev.filter((b) => b !== barcode) : [...prev, barcode]
    )
  }

  const handleRedeemBarcodes = async () => {
    if (selectedBarcodes.length === 0) {
      toast.error("Please select at least one ticket to redeem")
      return
    }
    if (!groupTickets || !selectedEvent) {
      toast.error("Missing event or group data")
      return
    }
    setIsRedeeming(true)
    try {
      const user = sessionManager.getUser()
      if (!user || !user.user_id) {
        toast.error("User not logged in")
        return
      }
      const results = await Promise.all(
        selectedBarcodes.map((barcode) =>
          api.scanner.scan({ userId: user.user_id, eventId: selectedEvent.id, barcode })
        )
      )
      const successCount = results.filter((r) => r.status).length
      const failedCount = results.length - successCount
      if (successCount > 0) toast.success(`Successfully redeemed ${successCount} ticket(s)`)
      if (failedCount > 0) toast.error(`Failed to redeem ${failedCount} ticket(s)`)
      await fetchGroupTickets(groupTickets.tickets[0].ticketGroupCode)
      setSelectedBarcodes([])
    } catch (error) {
      console.error("Redemption error:", error)
      toast.error("Redemption Failed")
    } finally {
      setIsRedeeming(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-3 sm:p-4 md:p-6 lg:p-8 pt-20 sm:pt-24 lg:pt-8">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-1 sm:space-y-2"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] bg-clip-text text-transparent">
            Scan & Sell Tickets
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Sell tickets, scan QR codes, or lookup group tickets
          </p>
        </motion.div>

        {/* Mode tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-2 p-1.5 sm:p-2 bg-muted/50 rounded-xl sm:rounded-2xl"
        >
          {[
            { mode: "payment" as ScanMode, icon: CreditCard, label: "M-Pesa" },
            { mode: "camera" as ScanMode, icon: Camera, label: "QR Scan" },
            { mode: "manual" as ScanMode, icon: Keyboard, label: "Group Code" },
          ].map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => {
                setScanMode(mode)
                if (mode !== "camera") {
                  stopScanning()
                  setSelectedEvent(null)
                }
              }}
              className={`flex flex-col items-center justify-center gap-1 px-2 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
                scanMode === mode
                  ? "bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white shadow-lg"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>{label}</span>
            </button>
          ))}
        </motion.div>

        {/* ────────────────────────── CAMERA MODE ────────────────────────── */}
        {scanMode === "camera" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
          >
            {/* Step 1: Event selection (no event selected yet) */}
            {!selectedEvent ? (
              <div className="p-4 sm:p-6 md:p-8">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#8b5cf6]/20 to-[#7c3aed]/20 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-[#8b5cf6]" />
                  </div>
                  <h3 className="text-xl font-bold">Select Event to Scan</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose the event you&apos;re scanning tickets for
                  </p>
                </div>

                {isLoadingEvents ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[#8b5cf6]" />
                  </div>
                ) : events.length > 0 ? (
                  <div className="space-y-3">
                    {events.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className="w-full text-left p-4 rounded-xl border-2 border-border hover:border-[#8b5cf6] hover:bg-[#8b5cf6]/5 transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-base truncate group-hover:text-[#8b5cf6] transition-colors">
                              {event.name}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {event.location}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(event.date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-[#8b5cf6] transition-colors flex-shrink-0 ml-3" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No active events found</p>
                    <p className="text-sm mt-1">Create an event first</p>
                  </div>
                )}
              </div>
            ) : (
              /* Step 2: Scanner is active */
              <div className="relative">
                {/* Top bar */}
                <div className="bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] p-3 sm:p-4 text-white">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={handleBackToEvents}
                      className="flex items-center gap-1 text-sm font-medium opacity-90 hover:opacity-100 transition-opacity"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">Change Event</span>
                    </button>
                    <div className="text-center flex-1 px-2">
                      <p className="text-xs font-medium opacity-80">Scanning For</p>
                      <p className="text-sm sm:text-base font-bold truncate">{selectedEvent.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {scannerActive && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 rounded-full text-xs">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                          <span>Live</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Camera viewport */}
                <div className="relative bg-black" style={{ minHeight: "350px" }}>
                  <div id="scanner-viewport" ref={scannerContainerRef} className="w-full" />

                  {/* Processing overlay */}
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-10">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 text-white animate-spin" />
                        <p className="text-white text-sm font-medium">Validating ticket…</p>
                      </div>
                    </div>
                  )}

                  {/* Not-yet-started placeholder */}
                  {!scannerActive && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-white/70">
                        <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Starting camera…</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Manual barcode fallback */}
                <div className="p-3 sm:p-4 border-t border-border">
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
                    Or enter barcode manually
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualBarcode}
                      onChange={(e) => setManualBarcode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleManualBarcodeScan()
                      }}
                      placeholder="e.g. 5VBM0W"
                      className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                    />
                    <button
                      onClick={handleManualBarcodeScan}
                      disabled={isValidating || !manualBarcode.trim()}
                      className="px-4 py-2 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Scan"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ────────── TICKET RESULT MODAL (overlay, scanner stays behind) ────────── */}
        <AnimatePresence>
          {showModal && scanMode === "camera" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
              onClick={dismissModal}
            >
              {/* backdrop */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

              {/* modal card */}
              <motion.div
                initial={{ opacity: 0, y: 60, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative z-10 w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Drag handle (mobile) */}
                <div className="sm:hidden flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>

                {/* Close button */}
                <button
                  onClick={dismissModal}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 rounded-full hover:bg-muted transition-colors z-20"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>

                {/* Status header */}
                <div className="pt-6 pb-4 px-6 text-center">
                  <div
                    className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center ${
                      modalStatus === "success"
                        ? "bg-green-100 dark:bg-green-950/30"
                        : modalStatus === "already"
                        ? "bg-amber-100 dark:bg-amber-950/30"
                        : "bg-red-100 dark:bg-red-950/30"
                    }`}
                  >
                    {modalStatus === "success" ? (
                      <CheckCircle className="w-9 h-9 text-green-600 dark:text-green-400" />
                    ) : modalStatus === "already" ? (
                      <AlertCircle className="w-9 h-9 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <XCircle className="w-9 h-9 text-red-600 dark:text-red-400" />
                    )}
                  </div>

                  <h3
                    className={`text-xl font-bold ${
                      modalStatus === "success"
                        ? "text-green-600 dark:text-green-400"
                        : modalStatus === "already"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {modalStatus === "success"
                      ? "Ticket Validated!"
                      : modalStatus === "already"
                      ? "Already Scanned"
                      : "Scan Failed"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">{modalMessage}</p>
                </div>

                {/* Ticket details */}
                {modalTicket && (
                  <div className="px-6 pb-2">
                    <div
                      className={`rounded-xl p-4 border space-y-3 ${
                        modalStatus === "success"
                          ? "bg-green-50/50 dark:bg-green-950/10 border-green-200/50 dark:border-green-900/30"
                          : modalStatus === "already"
                          ? "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/50 dark:border-amber-900/30"
                          : "bg-red-50/50 dark:bg-red-950/10 border-red-200/50 dark:border-red-900/30"
                      }`}
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Ticket</p>
                          <p className="font-semibold text-sm mt-0.5">{modalTicket.ticketName}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Price</p>
                          <p className="font-semibold text-sm mt-0.5">
                            {modalTicket.isComplementary ? (
                              <span className="text-blue-600 dark:text-blue-400">Complementary</span>
                            ) : (
                              `KES ${modalTicket.ticketPrice.toLocaleString()}`
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Barcode</p>
                          <p className="font-mono font-bold text-sm mt-0.5">{modalTicket.barcode}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Group</p>
                          <p className="font-mono font-semibold text-sm mt-0.5">{modalTicket.ticketGroupCode}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Customer</p>
                          <p className="font-semibold text-sm mt-0.5">{modalTicket.customerMobile}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dismiss button */}
                <div className="p-6 pt-4">
                  <button
                    onClick={dismissModal}
                    className={`w-full py-3.5 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                      modalStatus === "success"
                        ? "bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] hover:from-[#7c3aed] hover:to-[#6d28d9] text-white shadow-lg"
                        : modalStatus === "already"
                        ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg"
                        : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg"
                    }`}
                  >
                    <Camera className="w-5 h-5" />
                    <span>Continue Scanning</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ────────────────────── M-PESA PAYMENT MODE ──────────────────────── */}
        {scanMode === "payment" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
              <div className="text-center mb-4">
                <CreditCard className="w-12 h-12 mx-auto mb-3 text-[#8b5cf6]" />
                <h3 className="text-lg font-semibold">M-Pesa STK Push</h3>
                <p className="text-sm text-muted-foreground">Sell tickets at the gate</p>
              </div>

              {isLoadingEvents ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#8b5cf6]" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Select Event</label>
                    <select
                      value={selectedEvent?.id || ""}
                      onChange={(e) => {
                        const event = events.find((ev) => ev.id === Number(e.target.value))
                        setSelectedEvent(event || null)
                      }}
                      className="w-full px-4 py-3 text-sm sm:text-base bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                    >
                      <option value="">Select an event</option>
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {isLoadingTickets ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-[#8b5cf6]" />
                    </div>
                  ) : tickets.length > 0 ? (
                    <div>
                      <label className="block text-sm font-medium mb-2">Select Ticket Type</label>
                      <select
                        value={selectedTicket?.id || ""}
                        onChange={(e) => {
                          const ticket = tickets.find((t) => t.id === Number(e.target.value))
                          setSelectedTicket(ticket || null)
                        }}
                        className="w-full px-4 py-3 text-sm sm:text-base bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                      >
                        {tickets.map((ticket) => (
                          <option key={ticket.id} value={ticket.id}>
                            {ticket.ticketName} - KES {ticket.ticketPrice.toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : selectedEvent ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No tickets available for this event</p>
                    </div>
                  ) : null}

                  <div>
                    <label className="block text-sm font-medium mb-2">Customer Phone Number *</label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => {
                        const formatted = formatPhoneNumber(e.target.value)
                        setCustomerPhone(formatted)
                      }}
                      placeholder="254712345678"
                      className="w-full px-4 py-3 text-sm sm:text-base bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Format: 254XXXXXXXXX (auto-corrects from 0712345678)
                    </p>
                  </div>

                  <button
                    onClick={handleMpesaPurchase}
                    disabled={isPurchasing || !selectedEvent || !selectedTicket || !customerPhone}
                    className="w-full py-3 sm:py-4 bg-green-600 hover:bg-green-700 text-white text-sm sm:text-base font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isPurchasing ? (
                      <>
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>Send M-Pesa STK Push</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ────────────────────── GROUP CODE MODE ──────────────────────── */}
        {scanMode === "manual" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
              <div className="text-center mb-4">
                <Keyboard className="w-12 h-12 mx-auto mb-3 text-[#8b5cf6]" />
                <h3 className="text-lg font-semibold">Lookup Group Tickets</h3>
                <p className="text-sm text-muted-foreground">Enter ticket group code</p>
              </div>

              {/* Event selector for group mode */}
              {isLoadingEvents ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#8b5cf6]" />
                </div>
              ) : events.length > 0 ? (
                <div>
                  <label className="block text-sm font-medium mb-2">Select Event</label>
                  <select
                    value={selectedEvent?.id || ""}
                    onChange={(e) => {
                      const event = events.find((ev) => ev.id === Number(e.target.value))
                      setSelectedEvent(event || null)
                    }}
                    className="w-full px-4 py-3 text-sm sm:text-base bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                  >
                    <option value="">Select an event</option>
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Group Code</label>
                  <input
                    type="text"
                    value={manualGroupCode}
                    onChange={(e) => setManualGroupCode(e.target.value.toUpperCase())}
                    placeholder="e.g. HCGF08"
                    className="w-full px-4 py-3 text-sm sm:text-base bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Fetch all tickets in the group
                  </p>
                </div>
              </div>
              <button
                onClick={handleManualGroupCodeLookup}
                disabled={isValidating || !manualGroupCode.trim()}
                className="w-full py-3 sm:py-4 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white text-sm sm:text-base font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    <span>Loading Tickets...</span>
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Load Group Tickets</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* ────────────────────── GROUP TICKETS RESULT ──────────────────────── */}
        <AnimatePresence>
          {groupTickets && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-card border-2 border-[#8b5cf6] rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="px-6 py-4 bg-[#8b5cf6]/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Ticket className="w-6 h-6 text-[#8b5cf6]" />
                    <div>
                      <h3 className="font-bold text-lg">Group Tickets</h3>
                      <p className="text-sm text-muted-foreground">
                        {groupTickets.event} • {groupTickets.tickets.length} ticket(s)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#8b5cf6]/20 text-[#8b5cf6] rounded-full">
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-medium">{groupTickets.tickets[0]?.ticketGroupCode}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Event</p>
                    <p className="font-semibold">{groupTickets.event}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ticket Price</p>
                    <p className="font-semibold">KES {groupTickets.ticketPrice.toLocaleString()}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Customer Mobile</p>
                    <p className="font-semibold">{groupTickets.tickets[0]?.customerMobile}</p>
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="pt-4 border-t border-border space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-base sm:text-lg">Select Tickets to Redeem</h4>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {selectedBarcodes.length} of{" "}
                      {groupTickets.tickets.filter((t) => t.status === "VALID").length} selected
                    </span>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {groupTickets.tickets.map((ticket) => (
                      <div
                        key={ticket.barcode}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                          ticket.status === "REDEEMED"
                            ? "border-gray-300 bg-gray-50 opacity-60 cursor-not-allowed"
                            : selectedBarcodes.includes(ticket.barcode)
                            ? "border-[#8b5cf6] bg-[#8b5cf6]/10"
                            : "border-border hover:border-[#8b5cf6]/50 cursor-pointer"
                        }`}
                        onClick={() =>
                          ticket.status === "VALID" && toggleBarcodeSelection(ticket.barcode)
                        }
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              ticket.status === "REDEEMED"
                                ? "border-gray-400 bg-gray-200"
                                : selectedBarcodes.includes(ticket.barcode)
                                ? "border-[#8b5cf6] bg-[#8b5cf6]"
                                : "border-border"
                            }`}
                          >
                            {(selectedBarcodes.includes(ticket.barcode) ||
                              ticket.status === "REDEEMED") && (
                              <CheckCircle
                                className={`w-3 h-3 ${
                                  ticket.status === "REDEEMED" ? "text-gray-600" : "text-white"
                                }`}
                              />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {ticket.ticketName} - {ticket.barcode}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {ticket.isComplementary
                                ? "Complementary"
                                : `KES ${ticket.ticketPrice.toLocaleString()}`}{" "}
                              • Created: {new Date(ticket.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {ticket.status === "REDEEMED" ? (
                          <span className="text-xs font-medium text-gray-600 px-2 py-1 bg-gray-200 rounded">
                            Redeemed
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-green-600 px-2 py-1 bg-green-100 rounded">
                            Valid
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {selectedBarcodes.length > 0 && (
                    <button
                      onClick={handleRedeemBarcodes}
                      disabled={isRedeeming}
                      className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isRedeeming ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Redeeming...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          <span>
                            Redeem {selectedBarcodes.length} Ticket
                            {selectedBarcodes.length > 1 ? "s" : ""}
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </motion.div>

                <button
                  onClick={() => {
                    setManualGroupCode("")
                    setGroupTickets(null)
                    setSelectedBarcodes([])
                  }}
                  className="w-full py-3 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-xl transition-all"
                >
                  Lookup Another Group
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ────────────────────── HOW TO USE ──────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-muted/30 border border-border rounded-xl p-4 sm:p-6 space-y-3 sm:space-y-4"
        >
          <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
            <Ticket className="w-5 h-5 text-[#8b5cf6]" />
            How to Use
          </h3>
          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex gap-3 p-3 bg-card rounded-lg border border-border">
              <CreditCard className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground mb-1">M-Pesa Payment Mode</p>
                <p className="text-muted-foreground">
                  Sell tickets at the gate: Select event → Select ticket type → Enter customer details →
                  Send STK push
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-3 bg-card rounded-lg border border-border">
              <Camera className="w-5 h-5 text-[#8b5cf6] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground mb-1">QR Scan Mode</p>
                <p className="text-muted-foreground">
                  Select event → Camera opens continuously → Scan QR → Review ticket in popup →
                  Dismiss & scan next
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-3 bg-card rounded-lg border border-border">
              <Keyboard className="w-5 h-5 text-[#8b5cf6] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground mb-1">Group Code Mode</p>
                <p className="text-muted-foreground">
                  Lookup group tickets: Enter group code → System loads all tickets → Select valid
                  tickets → Redeem
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

