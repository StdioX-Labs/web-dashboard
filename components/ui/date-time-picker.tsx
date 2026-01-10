"use client"

import React, { useState, useEffect } from "react"
import { DayPicker } from "react-day-picker"
import { format } from "date-fns"
import { Calendar, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import "react-day-picker/dist/style.css"

interface DatePickerProps {
  selected: Date | undefined
  onChange: (date: Date | undefined) => void
  placeholderText?: string
  minDate?: Date
  maxDate?: Date
  className?: string
  disabled?: boolean
}

export function DatePicker({
  selected,
  onChange,
  placeholderText = "Select date",
  minDate,
  maxDate,
  className,
  disabled = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Lock body scroll when picker is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm text-left outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
      >
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        {selected ? format(selected, "MMMM d, yyyy") : <span className="text-muted-foreground">{placeholderText}</span>}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-2rem)] max-w-md p-4 bg-card border border-border rounded-xl shadow-2xl">
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={(date) => {
                onChange(date)
                setIsOpen(false)
              }}
              disabled={[
                ...(minDate ? [{ before: minDate }] : []),
                ...(maxDate ? [{ after: maxDate }] : []),
              ]}
              className="rdp-custom"
            />
          </div>
        </>
      )}
    </div>
  )
}

interface TimePickerProps {
  selected: Date | undefined
  onChange: (date: Date | undefined) => void
  placeholderText?: string
  className?: string
  disabled?: boolean
}

export function TimePicker({
  selected,
  onChange,
  placeholderText = "Select time",
  className,
  disabled = false,
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Lock body scroll when picker is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Initialize with selected time or default to 9:00 AM
  const initHour = selected ? (selected.getHours() % 12 || 12) : 9
  const initMinute = selected ? selected.getMinutes() : 0
  const initPeriod = selected && selected.getHours() >= 12 ? "PM" : "AM"

  const [selectedHour, setSelectedHour] = useState<number>(initHour)
  const [selectedMinute, setSelectedMinute] = useState<number>(initMinute)
  const [selectedPeriod, setSelectedPeriod] = useState<"AM" | "PM">(initPeriod)

  const hours = Array.from({ length: 12 }, (_, i) => i + 1) // 1-12
  const minutes = [0, 15, 30, 45]

  const handleApply = () => {
    const date = new Date()
    let hour24 = selectedHour
    if (selectedPeriod === "PM" && selectedHour !== 12) {
      hour24 += 12
    } else if (selectedPeriod === "AM" && selectedHour === 12) {
      hour24 = 0
    }
    date.setHours(hour24, selectedMinute, 0, 0)
    onChange(date)
    setIsOpen(false)
  }

  const displayTime = selected ? format(selected, "h:mm a") : placeholderText

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm text-left outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
      >
        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        <span className={selected ? "" : "text-muted-foreground"}>{displayTime}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm p-4 sm:p-5 bg-card border border-border rounded-xl shadow-2xl">
            <div className="space-y-3 sm:space-y-4">
              {/* Current Selection Display */}
              <div className="text-center pb-2 sm:pb-3 border-b border-border">
                <div className="text-xl sm:text-2xl font-bold text-[#8b5cf6]">
                  {selectedHour}:{selectedMinute.toString().padStart(2, "0")} {selectedPeriod}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Selected Time</p>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {/* Hour Selector */}
                <div>
                  <label className="text-xs font-semibold block mb-1.5 sm:mb-2 text-foreground">Hour</label>
                  <div className="h-32 sm:h-40 overflow-y-auto border border-border rounded-lg bg-secondary/30 scrollbar-thin scrollbar-thumb-[#8b5cf6] scrollbar-track-transparent">
                    {hours.map((hour) => (
                      <button
                        key={hour}
                        type="button"
                        onClick={() => setSelectedHour(hour)}
                        className={cn(
                          "w-full px-2 sm:px-3 py-2 sm:py-2.5 text-sm font-medium text-center transition-all",
                          selectedHour === hour
                            ? "bg-[#8b5cf6] text-white font-bold shadow-sm"
                            : "hover:bg-secondary/70 text-foreground"
                        )}
                      >
                        {hour}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Minute Selector */}
                <div>
                  <label className="text-xs font-semibold block mb-1.5 sm:mb-2 text-foreground">Min</label>
                  <div className="space-y-1 sm:space-y-1.5">
                    {minutes.map((minute) => (
                      <button
                        key={minute}
                        type="button"
                        onClick={() => setSelectedMinute(minute)}
                        className={cn(
                          "w-full px-2 sm:px-3 py-2 sm:py-2.5 text-sm font-medium text-center transition-all rounded-lg",
                          selectedMinute === minute
                            ? "bg-[#8b5cf6] text-white font-bold shadow-md"
                            : "hover:bg-secondary border border-border text-foreground"
                        )}
                      >
                        {minute.toString().padStart(2, "0")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AM/PM Selector */}
                <div>
                  <label className="text-xs font-semibold block mb-1.5 sm:mb-2 text-foreground">Period</label>
                  <div className="space-y-1 sm:space-y-1.5">
                    {(["AM", "PM"] as const).map((period) => (
                      <button
                        key={period}
                        type="button"
                        onClick={() => setSelectedPeriod(period)}
                        className={cn(
                          "w-full px-2 sm:px-3 py-2.5 sm:py-3 text-sm sm:text-base font-bold text-center transition-all rounded-lg",
                          selectedPeriod === period
                            ? "bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] text-white shadow-lg shadow-[#8b5cf6]/30"
                            : "hover:bg-secondary border-2 border-border text-foreground hover:border-[#8b5cf6]/50"
                        )}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1 sm:pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-secondary text-foreground rounded-lg font-semibold text-sm hover:bg-secondary/80 transition-all border border-border"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-lg font-semibold text-sm hover:shadow-lg hover:shadow-[#8b5cf6]/30 transition-all"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

interface DateTimePickerProps {
  selected: Date | undefined
  onChange: (date: Date | undefined) => void
  placeholderText?: string
  minDate?: Date
  maxDate?: Date
  className?: string
  disabled?: boolean
}

export function DateTimePicker({
  selected,
  onChange,
  placeholderText = "Select date and time",
  minDate,
  maxDate,
  className,
  disabled = false,
}: DateTimePickerProps) {
  const [tempDate, setTempDate] = useState<Date | undefined>(selected)

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      const newDate = new Date(date)
      if (selected) {
        newDate.setHours(selected.getHours(), selected.getMinutes())
      }
      setTempDate(newDate)
      onChange(newDate)
    }
  }

  const handleTimeChange = (time: Date | undefined) => {
    if (time) {
      const newDate = tempDate ? new Date(tempDate) : new Date()
      newDate.setHours(time.getHours(), time.getMinutes(), 0, 0)
      setTempDate(newDate)
      onChange(newDate)
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <DatePicker
        selected={tempDate}
        onChange={handleDateChange}
        placeholderText="Select date"
        minDate={minDate}
        maxDate={maxDate}
        disabled={disabled}
        className={className}
      />
      <TimePicker
        selected={tempDate}
        onChange={handleTimeChange}
        placeholderText="Select time"
        disabled={disabled}
        className={className}
      />
    </div>
  )
}

