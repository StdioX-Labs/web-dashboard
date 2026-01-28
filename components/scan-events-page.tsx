"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Camera, Keyboard, CheckCircle, Loader2, CreditCard, Users, Ticket, AlertCircle } from "lucide-react"
import { Html5Qrcode } from "html5-qrcode"
import { toast } from "sonner"
import { api } from "@/lib/api-client"
import { sessionManager } from "@/lib/session-manager"

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
}

interface GroupTickets {
  tickets: ScannedTicket[]
  posterUrl: string
  ticketPrice: number
  event: string
}

export default function ScanEventsPage() {
  const [scanMode, setScanMode] = useState<ScanMode>("payment")
  const [isScanning, setIsScanning] = useState(false)
  const [manualBarcode, setManualBarcode] = useState<string>("")
  const [manualGroupCode, setManualGroupCode] = useState<string>("")
  const [isValidating, setIsValidating] = useState(false)
  const [selectedBarcodes, setSelectedBarcodes] = useState<string[]>([])
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [groupTickets, setGroupTickets] = useState<GroupTickets | null>(null)

  // M-Pesa Purchase States
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [tickets, setTickets] = useState<TicketType[]>([])
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null)
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [isLoadingEvents, setIsLoadingEvents] = useState(false)
  const [isLoadingTickets, setIsLoadingTickets] = useState(false)
  const [isPurchasing, setIsPurchasing] = useState(false)

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const scannerRef = useRef<HTMLDivElement>(null)

  // Load events on mount
  useEffect(() => {
    if (scanMode === "payment") {
      fetchEvents()
    }
  }, [scanMode])

  // Load tickets when event is selected
  useEffect(() => {
    if (selectedEvent) {
      fetchTickets(selectedEvent.id)
    }
  }, [selectedEvent])

  const fetchEvents = async () => {
    setIsLoadingEvents(true)
    try {
      const user = sessionManager.getUser()
      if (!user || !user.company_id) {
        toast.error("Unable to identify company")
        return
      }

      const response = await api.company.getEvents()

      if (response.events) {
        // Filter events to only show active events belonging to the user's company
        const activeEvents = response.events
          .filter((event) => event.isActive && event.companyId === user.company_id)
          .map((event) => ({
            id: event.id,
            name: event.eventName,
            date: event.eventStartDate,
            location: event.eventLocation,
          }))

        setEvents(activeEvents)

        if (activeEvents.length > 0) {
          setSelectedEvent(activeEvents[0])
        } else {
          toast.info("No active events found for your company")
        }
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
        const availableTickets = response.event.tickets
          .filter((ticket) => ticket.isActive && ticket.quantityAvailable > 0)
          .map((ticket) => ({
            id: ticket.id,
            ticketName: ticket.ticketName,
            ticketPrice: ticket.ticketPrice,
            quantityAvailable: ticket.quantityAvailable,
          }))

        setTickets(availableTickets)
        if (availableTickets.length > 0) {
          setSelectedTicket(availableTickets[0])
        }
      }
    } catch (error) {
      console.error("Error fetching tickets:", error)
      toast.error("Failed to load tickets")
    } finally {
      setIsLoadingTickets(false)
    }
  }

  const handleMpesaPurchase = async () => {
    if (!selectedEvent || !selectedTicket) {
      toast.error("Please select an event and ticket")
      return
    }

    if (!customerPhone || !customerEmail) {
      toast.error("Please provide customer phone and email")
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
        amountDisplayed: selectedTicket.ticketPrice,
        coupon_code: "",
        channel: "mpesa" as const,
        customer: {
          mobile_number: customerPhone,
          email: customerEmail,
        },
        tickets: [
          {
            ticketId: selectedTicket.id,
            quantity: 1,
          },
        ],
      }

      const response = await api.ticket.purchase(purchaseData)

      if (response.status) {
        toast.success(response.message || "M-Pesa STK push sent successfully!")
        // Reset form
        setCustomerPhone("")
        setCustomerEmail("")
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

  const startScanning = async () => {
    try {
      setIsScanning(true)
      const html5QrCode = new Html5Qrcode("qr-reader")
      html5QrCodeRef.current = html5QrCode

      const devices = await Html5Qrcode.getCameras()
      const barcodeScanner = devices.find(device =>
        device.label.toLowerCase().includes('barcode') ||
        device.label.toLowerCase().includes('scanner')
      )

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        formatsToSupport: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
      }

      const cameraId = barcodeScanner ? barcodeScanner.id : { facingMode: "environment" }

      await html5QrCode.start(cameraId, config, (decodedText) => {
        handleScanBarcode(decodedText)
      }, undefined)

      if (barcodeScanner) {
        toast.success("Barcode Scanner Connected", {
          description: "Using dedicated barcode scanner device"
        })
      }
    } catch (err) {
      console.error("Error starting scanner:", err)
      toast.error("Failed to start camera", {
        description: "Please check camera permissions"
      })
      setIsScanning(false)
    }
  }

  const stopScanning = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop()
        html5QrCodeRef.current = null
      } catch (err) {
        console.error("Error stopping scanner:", err)
      }
    }
    setIsScanning(false)
  }

  const handleScanBarcode = async (code: string) => {
    if (!code || code.trim().length === 0) return
    
    await stopScanning()
    
    setTimeout(async () => {
      await scanTicket(code)
    }, 200)
  }

  const scanTicket = async (barcode: string) => {
    setIsValidating(true)
    setGroupTickets(null)
    setSelectedBarcodes([])

    try {
      const user = sessionManager.getUser()
      if (!user || !user.user_id) {
        toast.error("User not logged in")
        return
      }

      const response = await api.scanner.scan({
        userId: user.user_id,
        barcode: barcode.trim(),
      })

      if (response.status && response.ticket && response.ticket.length > 0) {
        const ticket = response.ticket[0]
        
        // Fetch the group tickets to get event name
        let eventName = "Event"
        try {
          if (ticket.ticketGroupCode) {
            const groupResponse = await api.scanner.getGroupTickets(ticket.ticketGroupCode)
            if (groupResponse.status && groupResponse.event) {
              eventName = groupResponse.event
            }
          }
        } catch (err) {
          console.error("Error fetching event name:", err)
        }

        // Build detailed ticket information
        const ticketStatus = ticket.status === "REDEEMED" ? "Already Scanned" : "Active"
        const priceInfo = ticket.isComplementary ? "Complementary" : `KES ${ticket.ticketPrice.toLocaleString()}`

        toast.success("Ticket Scanned Successfully!", {
          description: `Event: ${eventName}\nTicket: ${ticket.ticketName}\nPrice: ${priceInfo}\nStatus: ${ticketStatus}`,
          duration: 5000,
        })

        // Reset the barcode input
        setManualBarcode("")

        // Restart camera for next scan if in camera mode
        if (scanMode === "camera" && !isScanning) {
          setTimeout(() => {
            startScanning()
          }, 2000)
        }
      } else {
        // Ticket already scanned or invalid
        if (response.ticket && response.ticket.length > 0) {
          const ticket = response.ticket[0]

          // Fetch event name even for already scanned tickets
          let eventName = "Event"
          try {
            if (ticket.ticketGroupCode) {
              const groupResponse = await api.scanner.getGroupTickets(ticket.ticketGroupCode)
              if (groupResponse.status && groupResponse.event) {
                eventName = groupResponse.event
              }
            }
          } catch (err) {
            console.error("Error fetching event name:", err)
          }

          const priceInfo = ticket.isComplementary ? "Complementary" : `KES ${ticket.ticketPrice.toLocaleString()}`

          toast.error("Ticket Already Scanned", {
            description: `Event: ${eventName}\nTicket: ${ticket.ticketName}\nPrice: ${priceInfo}\nStatus: Already Redeemed`,
            duration: 5000,
          })
        } else {
          toast.error(response.error || "Invalid Ticket", {
            description: response.error || "This ticket could not be verified"
          })
        }

        // Restart camera even on error
        if (scanMode === "camera" && !isScanning) {
          setTimeout(() => {
            startScanning()
          }, 2000)
        }
      }
    } catch (error) {
      console.error("Scan error:", error)
      toast.error("Scan Failed", {
        description: "Could not scan ticket. Please try again."
      })

      // Restart camera even on error
      if (scanMode === "camera" && !isScanning) {
        setTimeout(() => {
          startScanning()
        }, 2000)
      }
    } finally {
      setIsValidating(false)
    }
  }

  const handleManualBarcodeScan = async () => {
    if (!manualBarcode.trim()) {
      toast.error("Please enter a barcode")
      return
    }
    await scanTicket(manualBarcode)
  }

  const fetchGroupTickets = async (groupCode: string) => {
    setIsValidating(true)
    try {
      const response = await api.scanner.getGroupTickets(groupCode)

      if (response.status && response.tickets) {
        setGroupTickets(response)
        toast.success("Group Tickets Loaded", {
          description: `Found ${response.tickets.length} ticket(s) in group`
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
    setSelectedBarcodes(prev => {
      if (prev.includes(barcode)) {
        return prev.filter(b => b !== barcode)
      } else {
        return [...prev, barcode]
      }
    })
  }

  const handleRedeemBarcodes = async () => {
    if (selectedBarcodes.length === 0) {
      toast.error("Please select at least one ticket to redeem")
      return
    }

    if (!groupTickets) {
      toast.error("No group tickets loaded")
      return
    }

    setIsRedeeming(true)

    try {
      const user = sessionManager.getUser()
      if (!user || !user.user_id) {
        toast.error("User not logged in")
        return
      }

      // Scan each selected barcode
      const results = await Promise.all(
        selectedBarcodes.map(barcode => 
          api.scanner.scan({
            userId: user.user_id,
            barcode,
          })
        )
      )

      const successCount = results.filter(r => r.status).length
      const failedCount = results.length - successCount

      if (successCount > 0) {
        toast.success(`Successfully redeemed ${successCount} ticket(s)`)
      }

      if (failedCount > 0) {
        toast.error(`Failed to redeem ${failedCount} ticket(s)`)
      }

      // Refresh group tickets
      await fetchGroupTickets(groupTickets.tickets[0].ticketGroupCode)
      setSelectedBarcodes([])
    } catch (error) {
      console.error("Redemption error:", error)
      toast.error("Redemption Failed", {
        description: "Could not redeem tickets. Please try again."
      })
    } finally {
      setIsRedeeming(false)
    }
  }

  useEffect(() => {
    return () => {
      stopScanning()
    }
  }, [])

  useEffect(() => {
    // Clear group tickets when switching modes
    setGroupTickets(null)
    setSelectedBarcodes([])

    if (scanMode === "camera" && !isScanning) {
      startScanning()
    } else if (scanMode !== "camera" && isScanning) {
      stopScanning()
    }
  }, [scanMode])

  const resetScanner = () => {
    setManualBarcode("")
    setManualGroupCode("")
    setGroupTickets(null)
    setSelectedBarcodes([])
    setCustomerPhone("")
    setCustomerEmail("")
    if (scanMode === "camera") {
      startScanning()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-3 sm:p-4 md:p-6 lg:p-8 pt-20 sm:pt-24 lg:pt-8">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-2 p-1.5 sm:p-2 bg-muted/50 rounded-xl sm:rounded-2xl"
        >
          <button
            onClick={() => setScanMode("payment")}
            className={`flex flex-col items-center justify-center gap-1 px-2 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
              scanMode === "payment"
                ? "bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
            <span>M-Pesa</span>
          </button>
          <button
            onClick={() => setScanMode("camera")}
            className={`flex flex-col items-center justify-center gap-1 px-2 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
              scanMode === "camera"
                ? "bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
            <span>QR Scan</span>
          </button>
          <button
            onClick={() => setScanMode("manual")}
            className={`flex flex-col items-center justify-center gap-1 px-2 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
              scanMode === "manual"
                ? "bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Keyboard className="w-5 h-5 sm:w-6 sm:h-6" />
            <span>Group Code</span>
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
        >
          {scanMode === "payment" ? (
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
                        const event = events.find(ev => ev.id === Number(e.target.value))
                        setSelectedEvent(event || null)
                      }}
                      className="w-full px-4 py-3 text-sm sm:text-base bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                    >
                      {events.map(event => (
                        <option key={event.id} value={event.id}>{event.name}</option>
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
                          const ticket = tickets.find(t => t.id === Number(e.target.value))
                          setSelectedTicket(ticket || null)
                        }}
                        className="w-full px-4 py-3 text-sm sm:text-base bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                      >
                        {tickets.map(ticket => (
                          <option key={ticket.id} value={ticket.id}>
                            {ticket.ticketName} - KES {ticket.ticketPrice.toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No tickets available for this event</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2">Customer Phone Number *</label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="254712345678"
                      className="w-full px-4 py-3 text-sm sm:text-base bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Format: 254XXXXXXXXX</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Customer Email *</label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="customer@example.com"
                      className="w-full px-4 py-3 text-sm sm:text-base bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                    />
                  </div>

                  <button
                    onClick={handleMpesaPurchase}
                    disabled={isPurchasing || !selectedEvent || !selectedTicket || !customerPhone || !customerEmail}
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
          ) : scanMode === "camera" ? (
            <div className="relative">
              <div id="qr-reader" ref={scannerRef} className="w-full" style={{ minHeight: "300px" }} />
              {isScanning && (
                <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                  <div className="px-4 py-2 bg-black/70 text-white text-sm rounded-full backdrop-blur-sm">
                    📷 Scanning barcode...
                  </div>
                  <button
                    onClick={stopScanning}
                    className="px-4 py-2 bg-red-500 text-white text-sm rounded-full hover:bg-red-600 transition-colors"
                  >
                    Stop
                  </button>
                </div>
              )}
              {!isScanning && (
                <div className="p-6 text-center text-muted-foreground">
                  <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Camera will start automatically</p>
                  <p className="text-sm mt-1">Point at ticket barcode to scan</p>
                </div>
              )}
              {/* Manual barcode input for camera mode */}
              <div className="p-4 border-t border-border">
                <label className="block text-sm font-medium mb-2">Or enter barcode manually:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value.toUpperCase())}
                    placeholder="e.g. 5VBM0W"
                    className="flex-1 px-4 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
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
          ) : (
            <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
              <div className="text-center mb-4">
                <Keyboard className="w-12 h-12 mx-auto mb-3 text-[#8b5cf6]" />
                <h3 className="text-lg font-semibold">Lookup Group Tickets</h3>
                <p className="text-sm text-muted-foreground">Enter ticket group code</p>
              </div>
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
          )}
        </motion.div>

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
                      {selectedBarcodes.length} of {groupTickets.tickets.filter(t => t.status === "VALID").length} selected
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
                        onClick={() => ticket.status === "VALID" && toggleBarcodeSelection(ticket.barcode)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            ticket.status === "REDEEMED"
                              ? "border-gray-400 bg-gray-200"
                              : selectedBarcodes.includes(ticket.barcode)
                              ? "border-[#8b5cf6] bg-[#8b5cf6]"
                              : "border-border"
                          }`}>
                            {(selectedBarcodes.includes(ticket.barcode) || ticket.status === "REDEEMED") && (
                              <CheckCircle className={`w-3 h-3 ${ticket.status === "REDEEMED" ? "text-gray-600" : "text-white"}`} />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {ticket.ticketName} - {ticket.barcode}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {ticket.isComplementary ? "Complementary" : `KES ${ticket.ticketPrice.toLocaleString()}`} • 
                              Created: {new Date(ticket.createdAt).toLocaleDateString()}
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
                          <span>Redeem {selectedBarcodes.length} Ticket{selectedBarcodes.length > 1 ? 's' : ''}</span>
                        </>
                      )}
                    </button>
                  )}
                </motion.div>

                <button
                  onClick={resetScanner}
                  className="w-full py-3 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-xl transition-all"
                >
                  {scanMode === "payment" ? "Process Another Payment" : "Scan Another Ticket"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                <p className="text-muted-foreground">Sell tickets at the gate: Select event → Select ticket type → Enter customer details → Send STK push</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 bg-card rounded-lg border border-border">
              <Camera className="w-5 h-5 text-[#8b5cf6] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground mb-1">QR Scan Mode</p>
                <p className="text-muted-foreground">Scan and redeem tickets: Point camera at barcode → System validates and redeems automatically → Ready for next scan</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 bg-card rounded-lg border border-border">
              <Keyboard className="w-5 h-5 text-[#8b5cf6] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground mb-1">Group Code Mode</p>
                <p className="text-muted-foreground">Lookup group tickets: Enter group code → System loads all tickets → Select valid tickets → Redeem</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

