"use client"

import React, { useState, useEffect, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { toast } from "sonner"
import {
  ArrowLeft,
  MapPin,
  Upload,
  X,
  Plus,
  Image as ImageIcon,
  Info,
  Save,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { api } from "@/lib/api-client"
import { uploadToContabo } from "@/lib/contabo-uploader"
import { EVENT_CATEGORIES, findCategoryIdByName } from "@/lib/event-categories"
import { clampTicketsToIssue, TICKET_FIELD_HELP } from "@/lib/ticket-limits"

interface TicketType {
  id: string
  name: string
  price: string
  quantity: string
  description: string
  saleStartDate: Date | undefined
  saleEndDate: Date | undefined
  limitPerPerson: string
  complementary: string
  ticketsToIssue: string
  isFree: boolean
  isGroupTicket: boolean
  restrictLimitPerPerson: boolean
}

export default function EditEventPage({ eventId = 1 }: { eventId?: number }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Poster: the url already on the event, plus a file if one has just been
  // picked. The file is uploaded on save, not on selection, so backing out of
  // the form does not leave an orphaned upload behind.
  const [posterUrl, setPosterUrl] = useState("")
  const [uploadedImageFile, setUploadedImageFile] = useState<File | null>(null)

  // Ids the API gave us. Anything not in here was added in this session and has
  // to be created rather than updated.
  const [existingTicketIds, setExistingTicketIds] = useState<Set<string>>(new Set())

  // Form state
  const [eventName, setEventName] = useState("")
  const [eventDate, setEventDate] = useState<Date | undefined>(undefined)
  const [venue, setVenue] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [saleStartDateTime, setSaleStartDateTime] = useState<Date | undefined>(undefined)
  const [saleEndDateTime, setSaleEndDateTime] = useState<Date | undefined>(undefined)
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])

  // Load event data from API
  useEffect(() => {
    const fetchEventData = async () => {
      if (!eventId) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        console.log('Fetching event details for eventId:', eventId)

        // Call the API directly
        const response = await api.event.getById(eventId)

        console.log('API Response:', response)

        if (response.status && response.event) {
          const eventDetails = response.event

          console.log('Setting form data from:', eventDetails)

          // Set event basic info
          setEventName(eventDetails.eventName || "")
          setVenue(eventDetails.eventLocation || "")
          setDescription(eventDetails.eventDescription || "")
          // The form posts a category id. Prefer the id the API gives us and
          // fall back to matching on the display name.
          const categoryId =
            eventDetails.eventCategoryId || findCategoryIdByName(eventDetails.category)
          setCategory(categoryId ? String(categoryId) : "")

          // Set event poster image
          if (eventDetails.eventPosterUrl) {
            setPosterUrl(eventDetails.eventPosterUrl)
            setImagePreview(eventDetails.eventPosterUrl)
          }

          // Parse event date/time
          if (eventDetails.eventStartDate) {
            setEventDate(new Date(eventDetails.eventStartDate))
          }

          // Parse sale start date/time
          if (eventDetails.ticketSaleStartDate) {
            setSaleStartDateTime(new Date(eventDetails.ticketSaleStartDate))
          }

          // Parse sale end date/time
          if (eventDetails.ticketSaleEndDate) {
            setSaleEndDateTime(new Date(eventDetails.ticketSaleEndDate))
          }

          // Load tickets with full details
          if (eventDetails.tickets && eventDetails.tickets.length > 0) {
            const formattedTickets: TicketType[] = eventDetails.tickets.map(ticket => ({
              id: ticket.id.toString(),
              name: ticket.ticketName || "",
              price: ticket.ticketPrice?.toString() || "0",
              quantity: ticket.quantityAvailable?.toString() || "0",
              description: "", // API doesn't provide description
              limitPerPerson: ticket.ticketLimitPerPerson?.toString() || "0",
              complementary: ticket.numberOfComplementary?.toString() || "0",
              ticketsToIssue: ticket.ticketsToIssue?.toString() || "1",
              isFree: ticket.isFree || false,
              isGroupTicket: (ticket.ticketsToIssue || 1) > 1,
              restrictLimitPerPerson: (ticket.ticketLimitPerPerson || 0) > 0,
              saleStartDate: ticket.ticketSaleStartDate ? new Date(ticket.ticketSaleStartDate) : undefined,
              saleEndDate: ticket.ticketSaleEndDate ? new Date(ticket.ticketSaleEndDate) : undefined,
            }))

            console.log('Setting tickets:', formattedTickets)
            setTicketTypes(formattedTickets)
            setExistingTicketIds(new Set(formattedTickets.map((t) => t.id)))
          }
        } else {
          const errorMsg = response.message || 'Failed to fetch event details'
          setError(errorMsg)
          toast.error(errorMsg)
        }
      } catch (err) {
        console.error('Error fetching event:', err)
        const errorMsg = err instanceof Error ? err.message : 'Failed to load event'
        setError(errorMsg)
        toast.error(errorMsg)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEventData()
  }, [eventId])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Id of the ticket form just added, so it can be highlighted and scrolled to
  const [newTicketId, setNewTicketId] = useState<string | null>(null)
  const ticketRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Bring a freshly added ticket form into view and put the cursor in it. The
  // entry animation reads as "something appeared"; this makes sure it is not
  // missed when the new card lands below the fold.
  useEffect(() => {
    if (!newTicketId) return

    const card = ticketRefs.current.get(newTicketId)
    card?.scrollIntoView({ behavior: "smooth", block: "center" })
    card?.querySelector("input")?.focus({ preventScroll: true })

    const timer = setTimeout(() => setNewTicketId(null), 1400)
    return () => clearTimeout(timer)
  }, [newTicketId])

  const addTicketType = () => {
    const id = Date.now().toString()
    setTicketTypes((prev) => [
      ...prev,
      {
        id,
        name: "",
        price: "",
        quantity: "",
        description: "",
        limitPerPerson: "0",
        complementary: "0",
        ticketsToIssue: "1",
        isFree: false,
        isGroupTicket: false,
        restrictLimitPerPerson: false,
        saleStartDate: undefined,
        saleEndDate: undefined
      },
    ])
    setNewTicketId(id)
  }

  const removeTicketType = (id: string) => {
    if (ticketTypes.length > 1) {
      setTicketTypes((prev) => prev.filter((ticket) => ticket.id !== id))
    }
  }

  /**
   * Patch one field. Functional so that two calls in the same event handler
   * compose instead of the second silently discarding the first — reading
   * `ticketTypes` from the render closure made batched updates clobber
   * each other.
   */
  const updateTicketType = (id: string, field: keyof TicketType, value: string | Date | undefined | boolean) => {
    setTicketTypes((prev) =>
      prev.map((ticket) =>
        ticket.id === id ? { ...ticket, [field]: value } : ticket
      )
    )
  }

  /** Patch several fields at once, for toggles that also seed a companion value. */
  const patchTicketType = (id: string, patch: Partial<TicketType>) => {
    setTicketTypes((prev) =>
      prev.map((ticket) => (ticket.id === id ? { ...ticket, ...patch } : ticket))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Validation
    if (!eventName || !eventDate || !venue || !description || !category) {
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

    // Validate at least one ticket type
    const validTickets = ticketTypes.filter(
      (ticket) => ticket.name && ticket.price && ticket.quantity
    )
    if (validTickets.length === 0) {
      toast.error("Please add at least one valid ticket type")
      setIsSubmitting(false)
      return
    }

    try {
      // 1. Upload a new poster, if one was picked. Done first so a failure here
      // stops the save rather than leaving the event pointing at the old image
      // while the form claims everything was saved.
      let eventPosterUrl = posterUrl
      if (uploadedImageFile) {
        toast.info("Uploading event poster...")
        const uploadResult = await uploadToContabo(uploadedImageFile)

        if (!uploadResult.success || !uploadResult.url) {
          throw new Error(uploadResult.error || "Failed to upload the event poster")
        }

        eventPosterUrl = uploadResult.url
      }

      // 2. Update Event
      console.log('Updating event...')
      const eventUpdateData: Record<string, unknown> = {
        eventName,
        eventDescription: description,
        eventLocation: venue,
        eventStartDate: eventDate.toISOString(),
        eventEndDate: eventDate.toISOString(), // You may want to add separate end date
        ticketSaleStartDate: saleStartDateTime.toISOString(),
        ticketSaleEndDate: saleEndDateTime.toISOString(),
      }

      // Both were collected and validated by the form but never sent, so
      // changing either silently did nothing.
      if (eventPosterUrl) eventUpdateData.eventPosterUrl = eventPosterUrl
      if (category) eventUpdateData.eventCategoryId = parseInt(category)

      const eventResponse = await api.event.update(eventId, eventUpdateData)

      if (!eventResponse.status) {
        throw new Error(eventResponse.message || 'Failed to update event')
      }

      console.log('Event updated successfully')

      // 3. Save each ticket. Ones the API gave us are updated; ones added in
      // this session have no server id yet — their `id` is a timestamp from
      // addTicketType — so they have to be created. Updating against that
      // timestamp is what used to make new ticket types vanish on save.
      console.log('Saving tickets...')
      const ticketResults = await Promise.all(
        validTickets.map(async (ticket) => {
          const price = parseFloat(ticket.price) || 0
          const isFree = price === 0
          const quantity = parseInt(ticket.quantity) || 0

          const common = {
            ticketName: ticket.name,
            ticketPrice: price,
            quantityAvailable: quantity,
            ticketsToIssue: clampTicketsToIssue(ticket.ticketsToIssue, quantity),
            ticketLimitPerPerson: parseInt(ticket.limitPerPerson || "0"),
            numberOfComplementary: parseInt(ticket.complementary || "0"),
            isFree,
          }

          // Fall back to the event-wide sale window, as creating does.
          const startDate = ticket.saleStartDate || saleStartDateTime
          const endDate = ticket.saleEndDate || saleEndDateTime

          try {
            if (existingTicketIds.has(ticket.id)) {
              const payload: Record<string, unknown> = { ...common }
              if (ticket.saleStartDate) {
                payload.ticketSaleStartDate = ticket.saleStartDate.toISOString()
              }
              if (ticket.saleEndDate) {
                payload.ticketSaleEndDate = ticket.saleEndDate.toISOString()
              }

              console.log('Updating ticket:', ticket.id, payload)
              const response = await api.ticket.update(parseInt(ticket.id), payload)
              return { name: ticket.name, ok: response.status, message: response.message }
            }

            console.log('Creating ticket:', ticket.name)
            const response = await api.company.createTicket({
              ...common,
              event: { id: eventId },
              ticketSaleStartDate: startDate.toISOString(),
              ticketSaleEndDate: endDate.toISOString(),
            })
            return { name: ticket.name, ok: response.status, message: response.message }
          } catch (ticketError) {
            console.error(`Error saving ticket "${ticket.name}":`, ticketError)
            return {
              name: ticket.name,
              ok: false,
              message: ticketError instanceof Error ? ticketError.message : undefined,
            }
          }
        })
      )

      const failed = ticketResults.filter((r) => !r.ok)

      // The event itself saved, so this is a partial success — say so rather
      // than following the failure with a blanket "updated successfully".
      if (failed.length > 0) {
        console.error('Some tickets failed to save:', failed)
        toast.error(`${failed.length} of ${ticketResults.length} ticket(s) could not be saved`, {
          description: failed[0].message
            ? `${failed[0].name}: ${failed[0].message}`
            : `Check ${failed.map((f) => f.name).join(", ")} and try again.`,
          duration: 10000,
        })
        return
      }

      toast.success("Event and tickets updated successfully!", {
        description: "Your changes have been saved.",
      })

      // Redirect to event detail page
      setTimeout(() => {
        router.push(`/dashboard/events/${eventId}`)
      }, 1000)

    } catch (error) {
      console.error('Error updating event/tickets:', error)
      toast.error(error instanceof Error ? error.message : "Failed to update event")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/dashboard/events/${eventId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Event Details
        </Link>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Edit Event</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">
          Update your event details and ticket information.
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-500"></div>
            <p className="mt-4 text-muted-foreground">Loading event details...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 p-6"
        >
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-200 mb-1">Failed to Load Event</h3>
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Form - Only show when data is loaded */}
      {!isLoading && !error && (
        <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/25 transition-all"
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
                  className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/25 transition-all appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3c%2Fsvg%3E')] bg-[length:1rem] bg-[center_right_1rem] bg-no-repeat pr-12"
                  required
                >
                  <option value="">Select a category</option>
                  {EVENT_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date and Time */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Event Date & Time <span className="text-red-500">*</span>
                </label>
                <DateTimePicker
                  selected={eventDate}
                  onChange={(date) => setEventDate(date)}
                  placeholderText="Select event date and time"
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
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/25 transition-all"
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
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/25 transition-all resize-none"
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
                      maxDate={eventDate}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-2 block">Sales End Date & Time <span className="text-red-500">*</span></label>
                    <DateTimePicker
                      selected={saleEndDateTime}
                      onChange={(date) => setSaleEndDateTime(date)}
                      placeholderText="Select end date & time"
                      minDate={saleStartDateTime}
                      maxDate={eventDate}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Set when ticket sales should begin and end for this event
                </p>
              </div>

              {/* Event Image */}
              <div>
                <label className="text-sm font-medium mb-2 block">Event Image</label>
                <div className="relative">
                  {imagePreview ? (
                    <div className="relative w-full h-64 rounded-xl overflow-hidden border border-border">
                      <img
                        src={imagePreview}
                        alt="Event preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setImagePreview(null)}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-64 rounded-xl border-2 border-dashed border-border hover:border-zinc-500 transition-colors cursor-pointer bg-secondary/30">
                      <ImageIcon className="w-12 h-12 text-muted-foreground mb-3" />
                      <p className="text-sm font-medium mb-1">Click to upload new image</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
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

          {/* Ticket Types Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border bg-card p-4 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
              <div>
                <h2 className="text-xl font-bold">Ticket Types</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage ticket types, prices, and quantities
                </p>
              </div>
              <button
                type="button"
                onClick={addTicketType}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-gradient-to-r from-zinc-700 to-zinc-900 text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-zinc-500/25 transition-all cursor-pointer w-full sm:w-auto whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Add Ticket Type
              </button>
            </div>

            <div className="space-y-4">
              <AnimatePresence initial={false}>
              {ticketTypes.map((ticket) => (
                <motion.div
                  key={ticket.id}
                  ref={(el) => {
                    if (el) ticketRefs.current.set(ticket.id, el)
                    else ticketRefs.current.delete(ticket.id)
                  }}
                  layout
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className={`p-4 rounded-xl border bg-secondary/30 relative transition-colors ${
                    newTicketId === ticket.id
                      ? "border-zinc-500 ring-2 ring-zinc-400/30"
                      : "border-border"
                  }`}
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
                          className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 transition-all"
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
                          className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 transition-all"
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
                          className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1.5 block">
                          Complementary Tickets
                        </label>
                        <input
                          type="number"
                          value={ticket.complementary}
                          onChange={(e) =>
                            updateTicketType(ticket.id, "complementary", e.target.value)
                          }
                          placeholder="0"
                          min="0"
                          className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Group ticket toggle */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ticket.isGroupTicket}
                            onChange={(e) =>
                              patchTicketType(ticket.id, {
                                isGroupTicket: e.target.checked,
                                ticketsToIssue: e.target.checked
                                  ? (ticket.ticketsToIssue === "1" ? "2" : ticket.ticketsToIssue)
                                  : "1",
                              })
                            }
                            className="w-4 h-4 rounded border-border text-zinc-300 focus:ring-brand focus:ring-offset-0"
                          />
                          <span className="text-xs font-medium">Group ticket</span>
                        </label>
                        {!ticket.isGroupTicket && (
                          <p className="text-xs text-muted-foreground">
                            {TICKET_FIELD_HELP.groupOff}
                          </p>
                        )}
                        {ticket.isGroupTicket && (
                          <div>
                            <label className="text-xs font-medium mb-1.5 block">Group of</label>
                            <input
                              type="number"
                              value={ticket.ticketsToIssue}
                              onChange={(e) =>
                                updateTicketType(ticket.id, "ticketsToIssue", e.target.value)
                              }
                              min="2"
                              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 transition-all"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {TICKET_FIELD_HELP.groupOn}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Restrict tickets per person toggle */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ticket.restrictLimitPerPerson}
                            onChange={(e) =>
                              patchTicketType(ticket.id, {
                                restrictLimitPerPerson: e.target.checked,
                                limitPerPerson: e.target.checked
                                  ? (ticket.limitPerPerson === "0" ? "1" : ticket.limitPerPerson)
                                  : "0",
                              })
                            }
                            className="w-4 h-4 rounded border-border text-zinc-300 focus:ring-brand focus:ring-offset-0"
                          />
                          <span className="text-xs font-medium">Restrict tickets per person</span>
                        </label>
                        {!ticket.restrictLimitPerPerson && (
                          <p className="text-xs text-muted-foreground">
                            {TICKET_FIELD_HELP.limitOff}
                          </p>
                        )}
                        {ticket.restrictLimitPerPerson && (
                          <div>
                            <label className="text-xs font-medium mb-1.5 block">Limit to</label>
                            <input
                              type="number"
                              value={ticket.limitPerPerson}
                              onChange={(e) =>
                                updateTicketType(ticket.id, "limitPerPerson", e.target.value)
                              }
                              min="1"
                              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 transition-all"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {TICKET_FIELD_HELP.limitOn}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ticket.isFree}
                          onChange={(e) =>
                            updateTicketType(ticket.id, "isFree", e.target.checked)
                          }
                          className="w-4 h-4 rounded border-border text-zinc-300 focus:ring-brand focus:ring-offset-0"
                        />
                        <span className="text-xs font-medium">This is a free ticket</span>
                      </label>
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
                        className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 transition-all"
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
                            minDate={ticket.saleStartDate}
                            className="h-9 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              </AnimatePresence>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-orange-800 dark:text-orange-300">
                  <span className="font-semibold">Note:</span> Changing ticket quantities or prices may affect existing sales. Proceed with caution.
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
              onClick={() => router.push(`/dashboard/events/${eventId}`)}
              className="flex-1 sm:flex-none px-6 py-3 bg-secondary text-foreground rounded-xl font-semibold text-sm hover:bg-secondary/80 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-auto px-6 py-3 bg-gradient-to-r from-zinc-700 to-zinc-900 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-zinc-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? "Saving Changes..." : "Save Changes"}
            </button>
          </motion.div>
        </form>
      )}
    </div>
  )
}

