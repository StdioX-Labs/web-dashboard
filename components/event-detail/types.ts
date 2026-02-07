// Type definitions for Event Detail components

export interface TicketType {
  id: number
  name: string
  price: number
  totalAvailable: number
  sold: number
  revenue: number
  status: "active" | "sold_out" | "suspended" | "inactive"
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
  apiStatus?: string
  balance: number
  pendingBalance: number
  totalRevenue: number
  totalPlatformFee?: number
  image: string
  currency: string
  tickets: TicketType[]
  totalTicketsSold: number
  eventStartDate: string
  eventEndDate: string
  slug?: string
}

export interface Attendee {
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
  checkedIn?: boolean
  checkedInTime?: string
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
  barcode: string
  platformFee: number
}

export interface TransactionsStats {
  ticketsSold: number
  platformLiability: number
  totalSales: number
}

export type TabType = "overview" | "tickets" | "transactions" | "attendees"
export type SuspendType = "event" | "ticket"
export type ActionType = "suspend" | "activate"
export type SuspendStep = "confirm" | "otp"

