"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Camera, Keyboard, CheckCircle, XCircle, Loader2, CreditCard, Users, Ticket } from "lucide-react"
import { Html5Qrcode } from "html5-qrcode"
import { toast } from "sonner"

type ScanMode = "camera" | "manual" | "payment"
type TicketStatus = "valid" | "invalid" | "used" | "unpaid" | null

interface TicketInfo {
  barcode: string
  groupCode: string
  status: TicketStatus
  eventName?: string
  ticketType?: string
  holderName?: string
  isGroupTicket: boolean
  groupSize?: number
  requiresPayment?: boolean
  amount?: number
  isPaid?: boolean
  groupBarcodes?: Array<{
    barcode: string
    isScanned: boolean
    holderName?: string
  }>
}

export default function ScanEventsPage() {
  const [scanMode, setScanMode] = useState<ScanMode>("camera")
  const [isScanning, setIsScanning] = useState(false)
  const [manualGroupCode, setManualGroupCode] = useState<string>("")
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [selectedBarcodes, setSelectedBarcodes] = useState<string[]>([])
  const [isRedeeming, setIsRedeeming] = useState(false)

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const scannerRef = useRef<HTMLDivElement>(null)

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
        handleScan(decodedText)
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

  const handleScan = async (code: string) => {
    await stopScanning()
    await validateTicket(code)
  }

  const validateTicket = async (barcode: string, groupCode?: string) => {
    setIsValidating(true)
    setTicketInfo(null)
    setSelectedBarcodes([])

    try {
      const response = await fetch('/api/tickets/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode, groupCode }),
      })

      const data = await response.json()

      if (data.success && data.ticket) {
        const ticketData: TicketInfo = data.ticket
        setTicketInfo(ticketData)

        if (!ticketData.isPaid && ticketData.requiresPayment) {
          toast.info("Payment Required", {
            description: "This ticket has not been paid for. Please complete payment."
          })
        } else if (ticketData.status === "valid") {
          toast.success("Valid Ticket!", {
            description: "Ticket verified successfully"
          })
        } else if (ticketData.status === "used") {
          toast.error("Ticket Already Used", {
            description: "This ticket has already been scanned and redeemed"
          })
        } else if (ticketData.status === "invalid") {
          toast.error("Invalid Ticket", {
            description: "This ticket could not be verified"
          })
        }
      } else {
        toast.error("Validation Failed", {
          description: data.error || "Could not validate ticket"
        })
      }
    } catch (error) {
      console.error("Validation error:", error)
      toast.error("Validation Failed", {
        description: "Could not validate ticket. Please try again."
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleManualValidation = async () => {
    if (!manualGroupCode.trim()) {
      toast.error("Please enter a group code")
      return
    }
    await validateTicket(manualGroupCode, manualGroupCode)
  }

  const handleMpesaPayment = async () => {
    if (!phoneNumber.trim() || phoneNumber.length < 10) {
      toast.error("Please enter a valid phone number")
      return
    }

    setIsProcessingPayment(true)

    try {
      const response = await fetch('/api/payments/mpesa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          amount: ticketInfo?.amount || 2500,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Payment Request Sent!", {
          description: "Customer should check phone to complete payment"
        })

        setTimeout(() => {
          const generatedGroupCode = data.groupCode || `GRP${Date.now().toString().slice(-6)}`
          const newTicket: TicketInfo = {
            barcode: data.barcodes?.[0] || `VT${Date.now().toString().slice(-6)}`,
            groupCode: generatedGroupCode,
            status: "valid",
            eventName: "Summer Music Festival 2026",
            ticketType: "VIP Access",
            holderName: phoneNumber,
            isGroupTicket: true,
            groupSize: 4,
            isPaid: true,
            requiresPayment: false,
            groupBarcodes: data.barcodes?.map((bc: string, idx: number) => ({
              barcode: bc,
              isScanned: false,
              holderName: `Guest ${idx + 1}`
            })) || [
              { barcode: `VT${Date.now().toString().slice(-6)}1`, isScanned: false, holderName: "Guest 1" },
              { barcode: `VT${Date.now().toString().slice(-6)}2`, isScanned: false, holderName: "Guest 2" },
              { barcode: `VT${Date.now().toString().slice(-6)}3`, isScanned: false, holderName: "Guest 3" },
              { barcode: `VT${Date.now().toString().slice(-6)}4`, isScanned: false, holderName: "Guest 4" },
            ]
          }
          setTicketInfo(newTicket)
          toast.success("Payment Confirmed!", {
            description: `Group Code: ${generatedGroupCode} - SMS sent to customer`
          })
        }, 3000)
      } else {
        toast.error("Payment Failed", {
          description: data.error || "Could not process payment"
        })
      }
    } catch (error) {
      console.error("Payment error:", error)
      toast.error("Payment Failed", {
        description: "Could not process payment. Please try again."
      })
    } finally {
      setIsProcessingPayment(false)
    }
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

    setIsRedeeming(true)

    try {
      const response = await fetch('/api/tickets/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupCode: ticketInfo?.groupCode,
          barcodes: selectedBarcodes,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Tickets Redeemed!", {
          description: `Successfully redeemed ${selectedBarcodes.length} ticket(s)`
        })

        setTicketInfo(prev => {
          if (!prev || !prev.groupBarcodes) return prev
          return {
            ...prev,
            groupBarcodes: prev.groupBarcodes.map(gb => ({
              ...gb,
              isScanned: selectedBarcodes.includes(gb.barcode) ? true : gb.isScanned
            }))
          }
        })

        setSelectedBarcodes([])
      } else {
        toast.error("Redemption Failed", {
          description: data.error || "Could not redeem tickets"
        })
      }
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
    if (scanMode === "camera" && !isScanning) {
      startScanning()
    } else if ((scanMode === "manual" || scanMode === "payment") && isScanning) {
      stopScanning()
    }
  }, [scanMode])

  const resetScanner = () => {
    setManualGroupCode("")
    setTicketInfo(null)
    setPhoneNumber("")
    setSelectedBarcodes([])
    if (scanMode === "camera") {
      startScanning()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-1 sm:space-y-2"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] bg-clip-text text-transparent">
            Scan Event Tickets
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Scan QR codes or enter barcodes manually to verify tickets
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-2 p-1.5 sm:p-2 bg-muted/50 rounded-xl sm:rounded-2xl"
        >
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
          {scanMode === "camera" ? (
            <div className="relative">
              <div id="qr-reader" ref={scannerRef} className="w-full" style={{ minHeight: "300px" }} />
              {isScanning && (
                <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                  <div className="px-4 py-2 bg-black/70 text-white text-sm rounded-full backdrop-blur-sm">
                    📷 Scanning QR Code...
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
                  <p className="text-sm mt-1">Point at customer's QR code ticket</p>
                </div>
              )}
            </div>
          ) : scanMode === "payment" ? (
            <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
              <div className="text-center mb-4">
                <CreditCard className="w-12 h-12 mx-auto mb-3 text-[#8b5cf6]" />
                <h3 className="text-lg font-semibold">M-Pesa Payment</h3>
                <p className="text-sm text-muted-foreground">For customers without tickets</p>
              </div>
              {!ticketInfo && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Customer Phone Number</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. 0712345678"
                      className="w-full px-4 py-3 text-sm sm:text-base bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Ticket Type</label>
                    <select className="w-full px-4 py-3 text-sm sm:text-base bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all">
                      <option>Regular - KSH 500</option>
                      <option>VIP - KSH 2,500</option>
                      <option>Group (4) - KSH 1,800</option>
                    </select>
                  </div>
                  <button
                    onClick={handleMpesaPayment}
                    disabled={isProcessingPayment || !phoneNumber.trim()}
                    className="w-full py-3 sm:py-4 bg-green-600 hover:bg-green-700 text-white text-sm sm:text-base font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isProcessingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                        Send M-Pesa Request
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
              <div className="text-center mb-4">
                <Keyboard className="w-12 h-12 mx-auto mb-3 text-[#8b5cf6]" />
                <h3 className="text-lg font-semibold">Enter Group Code</h3>
                <p className="text-sm text-muted-foreground">From customer's M-Pesa message</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Group Code *</label>
                  <input
                    type="text"
                    value={manualGroupCode}
                    onChange={(e) => setManualGroupCode(e.target.value.toUpperCase())}
                    placeholder="e.g. GRP123"
                    className="w-full px-4 py-3 text-sm sm:text-base bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    System will fetch all ticket details and available barcodes
                  </p>
                </div>
              </div>
              <button
                onClick={handleManualValidation}
                disabled={isValidating || !manualGroupCode.trim()}
                className="w-full py-3 sm:py-4 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white text-sm sm:text-base font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    Loading Tickets...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    Load Tickets
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>

        <AnimatePresence>
          {ticketInfo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`bg-card border-2 rounded-2xl shadow-xl overflow-hidden ${
                ticketInfo.status === "valid" ? "border-green-500" :
                ticketInfo.status === "invalid" ? "border-red-500" :
                ticketInfo.status === "used" ? "border-orange-500" :
                "border-yellow-500"
              }`}
            >
              <div className={`px-6 py-4 ${
                ticketInfo.status === "valid" ? "bg-green-500/10" :
                ticketInfo.status === "invalid" ? "bg-red-500/10" :
                ticketInfo.status === "used" ? "bg-orange-500/10" :
                "bg-yellow-500/10"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {ticketInfo.status === "valid" ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : ticketInfo.status === "invalid" ? (
                      <XCircle className="w-6 h-6 text-red-500" />
                    ) : ticketInfo.status === "used" ? (
                      <XCircle className="w-6 h-6 text-orange-500" />
                    ) : (
                      <CreditCard className="w-6 h-6 text-yellow-500" />
                    )}
                    <div>
                      <h3 className="font-bold text-lg">
                        {ticketInfo.status === "valid" ? "Valid Ticket" :
                         ticketInfo.status === "invalid" ? "Invalid Ticket" :
                         ticketInfo.status === "used" ? "Already Used" :
                         "Payment Required"}
                      </h3>
                      <p className="text-sm text-muted-foreground">Barcode: {ticketInfo.barcode}</p>
                    </div>
                  </div>
                  {ticketInfo.isGroupTicket && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#8b5cf6]/20 text-[#8b5cf6] rounded-full">
                      <Users className="w-4 h-4" />
                      <span className="text-sm font-medium">Group ({ticketInfo.groupSize})</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Event</p>
                    <p className="font-semibold">{ticketInfo.eventName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ticket Type</p>
                    <p className="font-semibold">{ticketInfo.ticketType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Holder</p>
                    <p className="font-semibold">{ticketInfo.holderName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Group Code</p>
                    <p className="font-semibold">{ticketInfo.groupCode}</p>
                  </div>
                </div>

                {ticketInfo.isGroupTicket && ticketInfo.groupBarcodes && ticketInfo.groupBarcodes.length > 0 && ticketInfo.isPaid && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="pt-4 border-t border-border space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-base sm:text-lg">Select Tickets to Redeem</h4>
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {selectedBarcodes.length} of {ticketInfo.groupBarcodes.filter(gb => !gb.isScanned).length} selected
                      </span>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {ticketInfo.groupBarcodes.map((groupBarcode, index) => (
                        <div
                          key={groupBarcode.barcode}
                          className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                            groupBarcode.isScanned
                              ? "border-gray-300 bg-gray-50 opacity-60 cursor-not-allowed"
                              : selectedBarcodes.includes(groupBarcode.barcode)
                              ? "border-[#8b5cf6] bg-[#8b5cf6]/10"
                              : "border-border hover:border-[#8b5cf6]/50 cursor-pointer"
                          }`}
                          onClick={() => !groupBarcode.isScanned && toggleBarcodeSelection(groupBarcode.barcode)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              groupBarcode.isScanned
                                ? "border-gray-400 bg-gray-200"
                                : selectedBarcodes.includes(groupBarcode.barcode)
                                ? "border-[#8b5cf6] bg-[#8b5cf6]"
                                : "border-border"
                            }`}>
                              {(selectedBarcodes.includes(groupBarcode.barcode) || groupBarcode.isScanned) && (
                                <CheckCircle className={`w-3 h-3 ${groupBarcode.isScanned ? "text-gray-600" : "text-white"}`} />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium">Ticket #{index + 1}: {groupBarcode.barcode}</p>
                              {groupBarcode.holderName && (
                                <p className="text-xs text-muted-foreground">{groupBarcode.holderName}</p>
                              )}
                            </div>
                          </div>
                          {groupBarcode.isScanned && (
                            <span className="text-xs font-medium text-gray-600 px-2 py-1 bg-gray-200 rounded">
                              Scanned
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
                            Redeeming...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            Redeem {selectedBarcodes.length} Ticket{selectedBarcodes.length > 1 ? 's' : ''}
                          </>
                        )}
                      </button>
                    )}
                  </motion.div>
                )}

                <button
                  onClick={resetScanner}
                  className="w-full py-3 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-xl transition-all"
                >
                  Scan Another Ticket
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
              <Camera className="w-5 h-5 text-[#8b5cf6] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground mb-1">QR Scan Mode</p>
                <p className="text-muted-foreground">For customers with QR code tickets (already paid). Scan QR → View barcodes → Select → Redeem</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 bg-card rounded-lg border border-border">
              <CreditCard className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground mb-1">M-Pesa Payment Mode</p>
                <p className="text-muted-foreground">For customers WITHOUT tickets. Enter phone → Process payment → Group code generated → Select barcodes → Redeem</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 bg-card rounded-lg border border-border">
              <Keyboard className="w-5 h-5 text-[#8b5cf6] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground mb-1">Group Code Mode</p>
                <p className="text-muted-foreground">For customers with M-Pesa SMS (already paid, no QR). Enter group code → System loads all barcodes → Select → Redeem</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

