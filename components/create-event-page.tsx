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
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DateTimePicker, DatePicker, TimePicker } from "@/components/ui/date-time-picker"

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

  // Form state
  const [eventName, setEventName] = useState("")
  const [eventDate, setEventDate] = useState<Date | undefined>(undefined)
  const [venue, setVenue] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [saleStartDateTime, setSaleStartDateTime] = useState<Date | undefined>(undefined)
  const [saleEndDateTime, setSaleEndDateTime] = useState<Date | undefined>(undefined)
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([
    { id: "1", name: "", price: "", quantity: "", description: "", saleStartDate: undefined, saleEndDate: undefined },
  ])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
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

    // Simulate API call
    setTimeout(() => {
      toast.success("Event created successfully!", {
        description: "Your event has been submitted for review and will be live once approved.",
      })
      setIsSubmitting(false)
      router.push("/dashboard/events")
    }, 1500)
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
          Fill in the details below to create your event. It will be reviewed before going live.
        </p>
      </div>

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
                <option value="music">Music & Concerts</option>
                <option value="sports">Sports & Fitness</option>
                <option value="food">Food & Drink</option>
                <option value="arts">Arts & Culture</option>
                <option value="business">Business & Networking</option>
                <option value="tech">Technology</option>
                <option value="education">Education</option>
                <option value="other">Other</option>
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
                minDate={new Date()}
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
                  <label className="flex flex-col items-center justify-center w-full h-64 rounded-xl border-2 border-dashed border-border hover:border-[#8b5cf6] transition-colors cursor-pointer bg-secondary/30">
                    <ImageIcon className="w-12 h-12 text-muted-foreground mb-3" />
                    <p className="text-sm font-medium mb-1">Click to upload image</p>
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
                          minDate={ticket.saleStartDate}
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
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 sm:flex-auto px-6 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating Event..." : "Create Event"}
          </button>
        </motion.div>
      </form>
    </div>
  )
}

