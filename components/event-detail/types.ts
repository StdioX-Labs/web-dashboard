// Type definitions for Event Detail components

export interface TicketType {
  id: number
  name: string
  price: number
  totalAvailable: number
  sold: number
  revenue: number
  status: string
  quantityAvailable: number
}

export interface EventData {
  id: number
  name: string
  date: string
  time: string
  venue: string
  description: string
  status: string
  balance: number
  pendingBalance: number
  totalRevenue: number
  image: string
  currency: string
  tickets: TicketType[]
  totalTicketsSold: number
  eventStartDate: string
  eventEndDate: string
}

export interface Transaction {
  id: string
  buyer: string
  email: string
  ticketType: string
  quantity: number
  amount: number
  date: string
  status: string
}

export interface Attendee {
  id: number
  name: string
  email: string
  phone: string
  ticketType: string
  ticketNumber: string
  purchaseDate: string
  checkedIn: boolean
  checkedInTime: string | null
}

export type TabType = "overview" | "tickets" | "transactions" | "attendees"
export type ActionType = "suspend" | "activate"
export type SuspendType = "event" | "ticket"
export type SuspendStep = "confirm" | "otp"

