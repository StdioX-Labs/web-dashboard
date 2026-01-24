"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  ArrowLeft,
  MapPin,
  Upload,
  X,
  Plus,
  Minus,
  Image as ImageIcon,
  Info,
  Loader2,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DateTimePicker, DatePicker, TimePicker } from "@/components/ui/date-time-picker"
import { api } from "@/lib/api-client"
import { sessionManager } from "@/lib/session-manager"
import { uploadToContabo, validateImageFile } from "@/lib/contabo-uploader"

interface TicketType {
  id: string
  name: string
  price: string
  quantity: string
  description: string
  saleStartDate: Date | undefined
  saleEndDate: Date | undefined
}

export default function CreateEventPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadedImageFile, setUploadedImageFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Step management
  const [currentStep, setCurrentStep] = useState<'event' | 'tickets' | 'complete'>('event')
  const [createdEventId, setCreatedEventId] = useState<number | null>(null)
  const [createdEventName, setCreatedEventName] = useState<string>("")

  // Form state
  const [eventName, setEventName] = useState("")
  const [eventStartDate, setEventStartDate] = useState<Date | undefined>(undefined)
  const [eventEndDate, setEventEndDate] = useState<Date | undefined>(undefined)
  const [venue, setVenue] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("1")
  const [commission, setCommission] = useState("5.0")
  const [slug, setSlug] = useState("")
  const [currency, setCurrency] = useState("KES")
  const [saleStartDateTime, setSaleStartDateTime] = useState<Date | undefined>(undefined)
  const [saleEndDateTime, setSaleEndDateTime] = useState<Date | undefined>(undefined)
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([
    { id: "1", name: "", price: "", quantity: "", description: "", saleStartDate: undefined, saleEndDate: undefined },
  ])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file
      const validation = validateImageFile(file)
      if (!validation.valid) {
        toast.error(validation.error)
        return
      }

      setUploadedImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const addTicketType = () => {
    setTicketTypes([
      ...ticketTypes,
      { id: Date.now().toString(), name: "", price: "", quantity: "", description: "", saleStartDate: undefined, saleEndDate: undefined },
    ])
  }

  const removeTicketType = (id: string) => {
    if (ticketTypes.length > 1) {
      setTicketTypes(ticketTypes.filter((ticket) => ticket.id !== id))
    }
  }

  const updateTicketType = (id: string, field: keyof TicketType, value: string | Date | undefined) => {
    setTicketTypes(
      ticketTypes.map((ticket) =>
        ticket.id === id ? { ...ticket, [field]: value } : ticket
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (currentStep === 'event') {
      await handleCreateEvent()
    } else if (currentStep === 'tickets') {
      await handleAddTickets()
    }
  }

  const handleCreateEvent = async () => {
    setIsSubmitting(true)

    try {
      // Get user session
      const user = sessionManager.getUser()
      if (!user) {
        toast.error("Please log in to create an event")
        router.push("/")
        return
      }

      // Validation
      if (!eventName || !eventStartDate || !eventEndDate || !venue || !description) {
        toast.error("Please fill in all required fields")
        setIsSubmitting(false)
        return
      }

      // Validate sale period
      if (!saleStartDateTime || !saleEndDateTime) {
        toast.error("Please set the ticket sales period")
        setIsSubmitting(false)
        return
      }

      // Validate image
      if (!uploadedImageFile) {
        toast.error("Please upload an event poster image")
        setIsSubmitting(false)
        return
      }

      // Generate slug from event name if not provided
      const eventSlug = slug || eventName.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      // Step 1: Upload image to Contabo
      setIsUploading(true)
      toast.info("Uploading event poster...")
      const uploadResult = await uploadToContabo(uploadedImageFile)
      setIsUploading(false)

      if (!uploadResult.success || !uploadResult.url) {
        toast.error(uploadResult.error || "Failed to upload image")
        setIsSubmitting(false)
        return
      }

      // Step 2: Create the event
      toast.info("Creating event...")
      const eventResponse = await api.company.createEvent({
        eventName,
        eventDescription: description,
        eventPosterUrl: uploadResult.url,
        eventCategory: { id: parseInt(category) },
        ticketSaleStartDate: saleStartDateTime.toISOString(),
        ticketSaleEndDate: saleEndDateTime.toISOString(),
        eventLocation: venue,
        eventStartDate: eventStartDate.toISOString(),
        eventEndDate: eventEndDate.toISOString(),
        percentageComission: parseFloat(commission),
        users: { id: user.user_id },
        company: { id: user.company_id },
        slug: eventSlug,
        currency: currency,
      })

      console.log("Event creation response:", eventResponse)

      if (!eventResponse.status) {
        throw new Error(eventResponse.message || "Failed to create event")
      }

      // The API returns event_id instead of event.id
      const eventId = (eventResponse as any).event_id || eventResponse.event?.id

      if (!eventId) {
        throw new Error("Event created but no event ID was returned")
      }

      setCreatedEventId(eventId)
      setCreatedEventName(eventName)
      toast.success("✅ Event created successfully!")

      // Move to tickets step
      setCurrentStep('tickets')
      setIsSubmitting(false)
    } catch (error) {
      console.error("Error creating event:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to create event. Please try again."
      )
      setIsSubmitting(false)
    }
  }

  const handleAddTickets = async () => {
    setIsSubmitting(true)

    try {
      if (!createdEventId) {
        toast.error("Event ID is missing")
        setIsSubmitting(false)
        return
      }

      // Validate at least one ticket type
      const validTickets = ticketTypes.filter(
        (ticket) => ticket.name && ticket.price && ticket.quantity
      )

      if (validTickets.length === 0) {
        toast.error("Please add at least one valid ticket type")
        setIsSubmitting(false)
        return
      }

      // Create tickets one by one
      toast.info(`Creating ${validTickets.length} ticket type(s)...`)
      let ticketsCreated = 0

      for (let i = 0; i < validTickets.length; i++) {
        const ticket = validTickets[i]
        try {
          toast.info(`Creating ticket ${i + 1}/${validTickets.length}: ${ticket.name}`)

          await api.company.createTicket({
            event: { id: createdEventId },
            ticketName: ticket.name,
            ticketPrice: parseFloat(ticket.price),
            quantityAvailable: parseInt(ticket.quantity),
            ticketsToIssue: 1,
            ticketLimitPerPerson: 0,
            numberOfComplementary: 0,
            ticketSaleStartDate: (ticket.saleStartDate || saleStartDateTime!).toISOString(),
            ticketSaleEndDate: (ticket.saleEndDate || saleEndDateTime!).toISOString(),
            isFree: parseFloat(ticket.price) === 0,
          })

          ticketsCreated++
          toast.success(`✓ Ticket created: ${ticket.name}`)
        } catch (ticketError) {
          console.error(`Error creating ticket "${ticket.name}":`, ticketError)
          toast.error(`Failed to create ticket: ${ticket.name}`)
        }
      }

      if (ticketsCreated === 0) {
        toast.warning("No tickets were added. You can add tickets later from the event page.")
      } else if (ticketsCreated < validTickets.length) {
        toast.warning(`${ticketsCreated}/${validTickets.length} ticket type(s) created. Some tickets failed.`)
      } else {
        toast.success(`🎉 All done! ${ticketsCreated} ticket type(s) created successfully!`)
      }

      // Move to complete step
      setCurrentStep('complete')
      setIsSubmitting(false)

      // Redirect after a moment
      setTimeout(() => {
        router.push("/dashboard/events")
      }, 2000)
    } catch (error) {
      console.error("Error adding tickets:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to add tickets. Please try again."
      )
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/events"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Events
        </Link>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Create New Event</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">
          {currentStep === 'event' && "Step 1: Fill in the event details"}
          {currentStep === 'tickets' && `Step 2: Add tickets for "${createdEventName}"`}
          {currentStep === 'complete' && "Event created successfully!"}
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
              currentStep === 'event' ? 'bg-[#8b5cf6] text-white' : 'bg-green-500 text-white'
            }`}>
              {currentStep === 'event' ? '1' : <Check className="w-5 h-5" />}
            </div>
            <span className={`text-sm font-medium ${currentStep === 'event' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Event Details
            </span>
          </div>
          <div className={`h-0.5 w-16 sm:w-24 transition-all ${
            currentStep === 'event' ? 'bg-border' : 'bg-[#8b5cf6]'
          }`} />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
              currentStep === 'event' ? 'bg-border text-muted-foreground' : 
              currentStep === 'tickets' ? 'bg-[#8b5cf6] text-white' : 
              'bg-green-500 text-white'
            }`}>
              {currentStep === 'complete' ? <Check className="w-5 h-5" /> : '2'}
            </div>
            <span className={`text-sm font-medium ${currentStep === 'tickets' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Add Tickets
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Event Details */}
        {currentStep === 'event' && (
          <>
        {/* Event Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-4 sm:p-6"
        >
          <h2 className="text-xl font-bold mb-4">Event Details</h2>

          <div className="space-y-4">
            {/* Event Name */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Event Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g., Summer Music Festival 2026"
                className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3c%2Fsvg%3E')] bg-[length:1rem] bg-[center_right_1rem] bg-no-repeat pr-12"
                required
              >
                <option value="">Select a category</option>
                <option value="1">Music Events</option>
                <option value="2">Sports Events</option>
                <option value="3">Cultural & Community Events</option>
                <option value="4">Business & Networking Events</option>
                <option value="5">Entertainment & Arts</option>
                <option value="6">Food & Drink Events</option>
                <option value="7">Workshops & Training</option>
                <option value="8">Family & Kids</option>
                <option value="9">Conventions & Expos</option>
                <option value="10">Virtual & Online Events</option>
                <option value="11">Health & Wellness Events</option>
                <option value="12">Fashion & Beauty</option>
                <option value="13">Nightlife & Social Events</option>
                <option value="14">Academic & Educational Events</option>
                <option value="15">Private Events</option>
                <option value="16">Seasonal & Holiday Events</option>
                <option value="17">Adventure & Outdoor Events</option>
                <option value="18">Fundraisers & Charity Events</option>
                <option value="19">Professional Competitions</option>
              </select>
            </div>

            {/* Event Start Date & Time */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Event Start Date & Time <span className="text-red-500">*</span>
              </label>
              <DateTimePicker
                selected={eventStartDate}
                onChange={(date) => setEventStartDate(date)}
                placeholderText="Select event start date and time"
              />
            </div>

            {/* Event End Date & Time */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Event End Date & Time <span className="text-red-500">*</span>
              </label>
              <DateTimePicker
                selected={eventEndDate}
                onChange={(date) => setEventEndDate(date)}
                placeholderText="Select event end date and time"
              />
            </div>

            {/* Venue */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Venue <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g., Uhuru Gardens, Nairobi"
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Event Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your event in detail..."
                rows={5}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all resize-none"
                required
              />
              <p className="text-xs text-muted-foreground mt-2">
                {description.length} / 1000 characters
              </p>
            </div>

            {/* Ticket Sales Period */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-muted-foreground" />
                <label className="text-sm font-medium">Ticket Sales Period <span className="text-red-500">*</span></label>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-2 block">Sales Start Date & Time <span className="text-red-500">*</span></label>
                  <DateTimePicker
                    selected={saleStartDateTime}
                    onChange={(date) => setSaleStartDateTime(date)}
                    placeholderText="Select start date & time"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-2 block">Sales End Date & Time <span className="text-red-500">*</span></label>
                  <DateTimePicker
                    selected={saleEndDateTime}
                    onChange={(date) => setSaleEndDateTime(date)}
                    placeholderText="Select end date & time"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Set when ticket sales should begin and end for this event
              </p>
            </div>

            {/* Event Image */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Event Poster <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                {imagePreview ? (
                  <div className="space-y-3">
                    <div className="relative w-full rounded-xl overflow-hidden border-2 border-[#8b5cf6] bg-black">
                      <img
                        src={imagePreview}
                        alt="Event poster preview"
                        className="w-full h-auto object-contain max-h-[600px]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null)
                          setUploadedImageFile(null)
                        }}
                        className="flex-1 px-4 py-2 bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-950/50 transition-colors flex items-center justify-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Remove Image
                      </button>
                      <label className="flex-1 px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors cursor-pointer text-center flex items-center justify-center gap-2">
                        <Upload className="w-4 h-4" />
                        Change Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      ✓ Your poster will be displayed exactly as shown above
                    </p>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-64 rounded-xl border-2 border-dashed border-border hover:border-[#8b5cf6] transition-colors cursor-pointer bg-secondary/30">
                    <ImageIcon className="w-12 h-12 text-muted-foreground mb-3" />
                    <p className="text-sm font-medium mb-1">Click to upload event poster</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, WebP up to 10MB</p>
                    <p className="text-xs text-muted-foreground mt-2 px-4 text-center">
                      Recommended: 1080x1080px or 1920x1080px
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Form Actions for Event Step */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-3 pt-4"
        >
          <button
            type="button"
            onClick={() => router.push("/dashboard/events")}
            className="flex-1 sm:flex-none px-6 py-3 bg-secondary text-foreground rounded-xl font-semibold text-sm hover:bg-secondary/80 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 sm:flex-auto px-6 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating Event..." : "Create Event & Continue"}
          </button>
        </motion.div>
        </>
        )}

        {/* Step 2: Add Tickets */}
        {currentStep === 'tickets' && (
          <>
        {/* Ticket Types Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-4 sm:p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
            <div>
              <h2 className="text-xl font-bold">Ticket Types</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Add different ticket types with prices and quantities
              </p>
            </div>
            <button
              type="button"
              onClick={addTicketType}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all cursor-pointer w-full sm:w-auto whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add Ticket Type
            </button>
          </div>

          <div className="space-y-4">
            {ticketTypes.map((ticket, index) => (
              <div
                key={ticket.id}
                className="p-4 rounded-xl border border-border bg-secondary/30 relative"
              >
                {ticketTypes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTicketType(ticket.id)}
                    className="absolute top-4 right-4 p-1.5 bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-950/50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <div className="space-y-3 pr-10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1.5 block">
                        Ticket Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={ticket.name}
                        onChange={(e) =>
                          updateTicketType(ticket.id, "name", e.target.value)
                        }
                        placeholder="e.g., VIP Pass"
                        className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/10 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1.5 block">
                        Price (KES) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={ticket.price}
                        onChange={(e) =>
                          updateTicketType(ticket.id, "price", e.target.value)
                        }
                        placeholder="e.g., 2500"
                        min="0"
                        className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/10 transition-all"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1.5 block">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={ticket.quantity}
                        onChange={(e) =>
                          updateTicketType(ticket.id, "quantity", e.target.value)
                        }
                        placeholder="e.g., 100"
                        min="1"
                        className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/10 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={ticket.description}
                      onChange={(e) =>
                        updateTicketType(ticket.id, "description", e.target.value)
                      }
                      placeholder="e.g., Includes backstage access"
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/10 transition-all"
                    />
                  </div>

                  {/* Ticket Sale Period */}
                  <div className="pt-2 border-t border-border">
                    <label className="text-xs font-medium mb-2 block text-muted-foreground">
                      Ticket Sale Period (Optional - overrides event sale period)
                    </label>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs mb-1.5 block opacity-75">Sale Start Date & Time</label>
                        <DateTimePicker
                          selected={ticket.saleStartDate}
                          onChange={(date) => updateTicketType(ticket.id, "saleStartDate", date)}
                          placeholderText="Select start date & time"
                          className="h-9 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs mb-1.5 block opacity-75">Sale End Date & Time</label>
                        <DateTimePicker
                          selected={ticket.saleEndDate}
                          onChange={(date) => updateTicketType(ticket.id, "saleEndDate", date)}
                          placeholderText="Select end date & time"
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 dark:text-blue-300">
                <span className="font-semibold">Tip:</span> Create different ticket types to cater to different audiences. VIP, Early Bird, and General Admission are common options.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Form Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-3 pt-4"
        >
          <button
            type="button"
            onClick={() => router.push("/dashboard/events")}
            className="flex-1 sm:flex-none px-6 py-3 bg-secondary text-foreground rounded-xl font-semibold text-sm hover:bg-secondary/80 transition-all cursor-pointer"
          >
            Skip & Finish
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 sm:flex-auto px-6 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Adding Tickets..." : "Add Tickets & Complete"}
          </button>
        </motion.div>
        </>
        )}

        {/* Step 3: Complete */}
        {currentStep === 'complete' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20 p-8 text-center"
          >
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Event Created Successfully!</h2>
            <p className="text-muted-foreground mb-6">
              Your event &ldquo;{createdEventName}&rdquo; is now live and ready for ticket sales.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting you to events page...
            </p>
          </motion.div>
        )}
      </form>
    </div>
  )
}

