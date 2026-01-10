"use client"

import React, { useState } from "react"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { DateTimePicker } from "@/components/ui/date-time-picker"

// Mock data - replace with actual API data
const allEventsData = [
  {
    id: 1,
    name: "Summer Music Festival 2026",
    date: "2026-02-15",
    time: "18:00",
    venue: "Uhuru Gardens, Nairobi",
    description: "Join us for an unforgettable evening of music, culture, and celebration.",
    status: "active",
    balance: 135000,
    pendingBalance: 12000,
    totalRevenue: 147000,
    image: "/placeholder.jpg",
  },
  {
    id: 2,
    name: "Tech Conference Nairobi",
    date: "2026-02-20",
    time: "09:00",
    venue: "KICC, Nairobi",
    description: "The premier technology conference bringing together innovators, developers, and entrepreneurs from across East Africa.",
    status: "active",
    balance: 96000,
    pendingBalance: 8000,
    totalRevenue: 104000,
    image: "/placeholder.jpg",
  },
  {
    id: 3,
    name: "Food & Wine Expo",
    date: "2026-03-01",
    time: "12:00",
    venue: "Sarit Centre, Nairobi",
    description: "Experience the finest culinary delights and premium wines from local and international vendors.",
    status: "pending",
    balance: 0,
    pendingBalance: 0,
    totalRevenue: 0,
    image: "/placeholder.jpg",
  },
  {
    id: 4,
    name: "Art Gallery Exhibition",
    date: "2026-03-10",
    time: "15:00",
    venue: "National Museum, Nairobi",
    description: "A showcase of contemporary African art featuring emerging and established artists.",
    status: "pending",
    balance: 0,
    pendingBalance: 0,
    totalRevenue: 0,
    image: "/placeholder.jpg",
  },
  {
    id: 5,
    name: "Jazz Night Live",
    date: "2026-01-02",
    time: "20:00",
    venue: "Alliance Française, Nairobi",
    description: "An intimate evening of smooth jazz featuring renowned local and international jazz musicians.",
    status: "active",
    balance: 60000,
    pendingBalance: 5000,
    totalRevenue: 65000,
    image: "/placeholder.jpg",
  },
  {
    id: 6,
    name: "Comedy Night Special",
    date: "2026-02-25",
    time: "19:30",
    venue: "Kenya National Theatre, Nairobi",
    description: "A hilarious night of stand-up comedy featuring the best comedians from Kenya and East Africa.",
    status: "suspended",
    balance: 45000,
    pendingBalance: 0,
    totalRevenue: 45000,
    image: "/placeholder.jpg",
  },
]

// Define ticket type interface
type TicketType = {
  id: number
  name: string
  price: number
  totalAvailable: number
  sold: number
  revenue: number
  status: "active" | "sold_out" | "suspended"
}

const ticketTypesData: { [key: number]: TicketType[] } = {
  1: [
    {
      id: 1,
      name: "VIP Pass",
      price: 5000,
      totalAvailable: 100,
      sold: 85,
      revenue: 425000,
      status: "active",
    },
    {
      id: 2,
      name: "General Admission",
      price: 2000,
      totalAvailable: 300,
      sold: 265,
      revenue: 530000,
      status: "active",
    },
    {
      id: 3,
      name: "Early Bird",
      price: 1500,
      totalAvailable: 100,
      sold: 100,
      revenue: 150000,
      status: "sold_out",
    },
  ],
  2: [
    {
      id: 1,
      name: "Conference Pass",
      price: 3500,
      totalAvailable: 250,
      sold: 210,
      revenue: 735000,
      status: "active",
    },
    {
      id: 2,
      name: "Workshop Bundle",
      price: 5000,
      totalAvailable: 100,
      sold: 85,
      revenue: 425000,
      status: "active",
    },
    {
      id: 3,
      name: "Student Pass",
      price: 1500,
      totalAvailable: 50,
      sold: 25,
      revenue: 37500,
      status: "active",
    },
  ],
  3: [
    {
      id: 1,
      name: "VIP Experience",
      price: 4000,
      totalAvailable: 50,
      sold: 30,
      revenue: 120000,
      status: "active",
    },
    {
      id: 2,
      name: "General Entry",
      price: 1500,
      totalAvailable: 200,
      sold: 120,
      revenue: 180000,
      status: "active",
    },
    {
      id: 3,
      name: "Tasting Pass",
      price: 2500,
      totalAvailable: 50,
      sold: 30,
      revenue: 75000,
      status: "active",
    },
  ],
  4: [
    {
      id: 1,
      name: "Opening Night",
      price: 2500,
      totalAvailable: 100,
      sold: 60,
      revenue: 150000,
      status: "active",
    },
    {
      id: 2,
      name: "General Admission",
      price: 1500,
      totalAvailable: 50,
      sold: 25,
      revenue: 37500,
      status: "active",
    },
  ],
  5: [
    {
      id: 1,
      name: "Premium Seating",
      price: 3500,
      totalAvailable: 80,
      sold: 80,
      revenue: 280000,
      status: "sold_out",
    },
    {
      id: 2,
      name: "Standard Entry",
      price: 2000,
      totalAvailable: 120,
      sold: 120,
      revenue: 240000,
      status: "sold_out",
    },
  ],
  6: [
    {
      id: 1,
      name: "VIP Experience",
      price: 2500,
      totalAvailable: 100,
      sold: 60,
      revenue: 150000,
      status: "active",
    },
    {
      id: 2,
      name: "General Admission",
      price: 1500,
      totalAvailable: 200,
      sold: 90,
      revenue: 135000,
      status: "active",
    },
  ],
}

const transactions = [
  {
    id: "TXN001",
    buyer: "John Doe",
    email: "john@example.com",
    ticketType: "VIP Pass",
    quantity: 2,
    amount: 10000,
    date: "2026-01-05 14:30",
    status: "completed",
  },
  {
    id: "TXN002",
    buyer: "Jane Smith",
    email: "jane@example.com",
    ticketType: "General Admission",
    quantity: 4,
    amount: 8000,
    date: "2026-01-05 12:15",
    status: "completed",
  },
  {
    id: "TXN003",
    buyer: "Mike Johnson",
    email: "mike@example.com",
    ticketType: "VIP Pass",
    quantity: 1,
    amount: 5000,
    date: "2026-01-04 18:45",
    status: "pending",
  },
  {
    id: "TXN004",
    buyer: "Sarah Williams",
    email: "sarah@example.com",
    ticketType: "General Admission",
    quantity: 2,
    amount: 4000,
    date: "2026-01-04 10:20",
    status: "completed",
  },
  {
    id: "TXN005",
    buyer: "David Brown",
    email: "david@example.com",
    ticketType: "VIP Pass",
    quantity: 3,
    amount: 15000,
    date: "2026-01-03 16:30",
    status: "completed",
  },
  {
    id: "TXN006",
    buyer: "Emily Davis",
    email: "emily@example.com",
    ticketType: "General Admission",
    quantity: 1,
    amount: 2000,
    date: "2026-01-03 14:20",
    status: "completed",
  },
  {
    id: "TXN007",
    buyer: "Robert Wilson",
    email: "robert@example.com",
    ticketType: "VIP Pass",
    quantity: 2,
    amount: 10000,
    date: "2026-01-03 09:45",
    status: "pending",
  },
  {
    id: "TXN008",
    buyer: "Lisa Anderson",
    email: "lisa@example.com",
    ticketType: "General Admission",
    quantity: 5,
    amount: 10000,
    date: "2026-01-02 20:15",
    status: "completed",
  },
  {
    id: "TXN009",
    buyer: "James Taylor",
    email: "james@example.com",
    ticketType: "VIP Pass",
    quantity: 1,
    amount: 5000,
    date: "2026-01-02 18:30",
    status: "completed",
  },
  {
    id: "TXN010",
    buyer: "Mary Thomas",
    email: "mary@example.com",
    ticketType: "General Admission",
    quantity: 3,
    amount: 6000,
    date: "2026-01-02 15:45",
    status: "completed",
  },
  {
    id: "TXN011",
    buyer: "William Moore",
    email: "william@example.com",
    ticketType: "VIP Pass",
    quantity: 2,
    amount: 10000,
    date: "2026-01-02 11:20",
    status: "pending",
  },
  {
    id: "TXN012",
    buyer: "Patricia Martin",
    email: "patricia@example.com",
    ticketType: "General Admission",
    quantity: 2,
    amount: 4000,
    date: "2026-01-01 19:30",
    status: "completed",
  },
  {
    id: "TXN013",
    buyer: "Richard Jackson",
    email: "richard@example.com",
    ticketType: "VIP Pass",
    quantity: 1,
    amount: 5000,
    date: "2026-01-01 16:45",
    status: "completed",
  },
  {
    id: "TXN014",
    buyer: "Jennifer White",
    email: "jennifer@example.com",
    ticketType: "General Admission",
    quantity: 4,
    amount: 8000,
    date: "2026-01-01 14:10",
    status: "completed",
  },
  {
    id: "TXN015",
    buyer: "Thomas Harris",
    email: "thomas@example.com",
    ticketType: "VIP Pass",
    quantity: 3,
    amount: 15000,
    date: "2025-12-31 22:30",
    status: "completed",
  },
  {
    id: "TXN016",
    buyer: "Linda Clark",
    email: "linda@example.com",
    ticketType: "General Admission",
    quantity: 1,
    amount: 2000,
    date: "2025-12-31 20:15",
    status: "pending",
  },
  {
    id: "TXN017",
    buyer: "Charles Lewis",
    email: "charles@example.com",
    ticketType: "VIP Pass",
    quantity: 2,
    amount: 10000,
    date: "2025-12-31 18:45",
    status: "completed",
  },
  {
    id: "TXN018",
    buyer: "Barbara Walker",
    email: "barbara@example.com",
    ticketType: "General Admission",
    quantity: 6,
    amount: 12000,
    date: "2025-12-31 15:30",
    status: "completed",
  },
  {
    id: "TXN019",
    buyer: "Christopher Hall",
    email: "christopher@example.com",
    ticketType: "VIP Pass",
    quantity: 1,
    amount: 5000,
    date: "2025-12-30 21:20",
    status: "completed",
  },
  {
    id: "TXN020",
    buyer: "Susan Allen",
    email: "susan@example.com",
    ticketType: "General Admission",
    quantity: 2,
    amount: 4000,
    date: "2025-12-30 19:45",
    status: "pending",
  },
  {
    id: "TXN021",
    buyer: "Daniel Young",
    email: "daniel@example.com",
    ticketType: "VIP Pass",
    quantity: 4,
    amount: 20000,
    date: "2025-12-30 17:10",
    status: "completed",
  },
  {
    id: "TXN022",
    buyer: "Jessica King",
    email: "jessica@example.com",
    ticketType: "General Admission",
    quantity: 3,
    amount: 6000,
    date: "2025-12-30 14:30",
    status: "completed",
  },
  {
    id: "TXN023",
    buyer: "Matthew Wright",
    email: "matthew@example.com",
    ticketType: "VIP Pass",
    quantity: 1,
    amount: 5000,
    date: "2025-12-29 20:15",
    status: "completed",
  },
  {
    id: "TXN024",
    buyer: "Nancy Lopez",
    email: "nancy@example.com",
    ticketType: "General Admission",
    quantity: 5,
    amount: 10000,
    date: "2025-12-29 18:45",
    status: "pending",
  },
  {
    id: "TXN025",
    buyer: "Anthony Hill",
    email: "anthony@example.com",
    ticketType: "VIP Pass",
    quantity: 2,
    amount: 10000,
    date: "2025-12-29 16:20",
    status: "completed",
  },
]

const attendees = [
  {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    phone: "+254712345001",
    ticketType: "VIP Pass",
    ticketNumber: "VIP-001",
    purchaseDate: "2026-01-05",
    checkedIn: true,
    checkedInTime: "2026-02-15 18:15",
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane@example.com",
    phone: "+254712345002",
    ticketType: "General Admission",
    ticketNumber: "GA-045",
    purchaseDate: "2026-01-05",
    checkedIn: true,
    checkedInTime: "2026-02-15 18:30",
  },
  {
    id: 3,
    name: "Mike Johnson",
    email: "mike@example.com",
    phone: "+254712345003",
    ticketType: "VIP Pass",
    ticketNumber: "VIP-012",
    purchaseDate: "2026-01-04",
    checkedIn: false,
    checkedInTime: null,
  },
  {
    id: 4,
    name: "Sarah Williams",
    email: "sarah@example.com",
    phone: "+254712345004",
    ticketType: "General Admission",
    ticketNumber: "GA-023",
    purchaseDate: "2026-01-04",
    checkedIn: true,
    checkedInTime: "2026-02-15 18:45",
  },
  {
    id: 5,
    name: "David Brown",
    email: "david@example.com",
    phone: "+254712345005",
    ticketType: "VIP Pass",
    ticketNumber: "VIP-002",
    purchaseDate: "2026-01-03",
    checkedIn: false,
    checkedInTime: null,
  },
  {
    id: 6,
    name: "Emily Davis",
    email: "emily@example.com",
    phone: "+254712345006",
    ticketType: "General Admission",
    ticketNumber: "GA-067",
    purchaseDate: "2026-01-03",
    checkedIn: true,
    checkedInTime: "2026-02-15 19:00",
  },
  {
    id: 7,
    name: "Robert Wilson",
    email: "robert@example.com",
    phone: "+254712345007",
    ticketType: "VIP Pass",
    ticketNumber: "VIP-003",
    purchaseDate: "2026-01-03",
    checkedIn: false,
    checkedInTime: null,
  },
  {
    id: 8,
    name: "Lisa Anderson",
    email: "lisa@example.com",
    phone: "+254712345008",
    ticketType: "General Admission",
    ticketNumber: "GA-089",
    purchaseDate: "2026-01-02",
    checkedIn: true,
    checkedInTime: "2026-02-15 19:15",
  },
  {
    id: 9,
    name: "James Taylor",
    email: "james@example.com",
    phone: "+254712345009",
    ticketType: "VIP Pass",
    ticketNumber: "VIP-004",
    purchaseDate: "2026-01-02",
    checkedIn: true,
    checkedInTime: "2026-02-15 19:30",
  },
  {
    id: 10,
    name: "Mary Thomas",
    email: "mary@example.com",
    phone: "+254712345010",
    ticketType: "General Admission",
    ticketNumber: "GA-101",
    purchaseDate: "2026-01-02",
    checkedIn: false,
    checkedInTime: null,
  },
  {
    id: 11,
    name: "William Moore",
    email: "william@example.com",
    phone: "+254712345011",
    ticketType: "VIP Pass",
    ticketNumber: "VIP-005",
    purchaseDate: "2026-01-02",
    checkedIn: true,
    checkedInTime: "2026-02-15 19:45",
  },
  {
    id: 12,
    name: "Patricia Martin",
    email: "patricia@example.com",
    phone: "+254712345012",
    ticketType: "General Admission",
    ticketNumber: "GA-112",
    purchaseDate: "2026-01-01",
    checkedIn: false,
    checkedInTime: null,
  },
  {
    id: 13,
    name: "Richard Jackson",
    email: "richard@example.com",
    phone: "+254712345013",
    ticketType: "VIP Pass",
    ticketNumber: "VIP-006",
    purchaseDate: "2026-01-01",
    checkedIn: true,
    checkedInTime: "2026-02-15 20:00",
  },
  {
    id: 14,
    name: "Jennifer White",
    email: "jennifer@example.com",
    phone: "+254712345014",
    ticketType: "General Admission",
    ticketNumber: "GA-134",
    purchaseDate: "2026-01-01",
    checkedIn: true,
    checkedInTime: "2026-02-15 20:15",
  },
  {
    id: 15,
    name: "Thomas Harris",
    email: "thomas@example.com",
    phone: "+254712345015",
    ticketType: "VIP Pass",
    ticketNumber: "VIP-007",
    purchaseDate: "2025-12-31",
    checkedIn: false,
    checkedInTime: null,
  },
  {
    id: 16,
    name: "Linda Clark",
    email: "linda@example.com",
    phone: "+254712345016",
    ticketType: "General Admission",
    ticketNumber: "GA-156",
    purchaseDate: "2025-12-31",
    checkedIn: true,
    checkedInTime: "2026-02-15 20:30",
  },
  {
    id: 17,
    name: "Charles Lewis",
    email: "charles@example.com",
    phone: "+254712345017",
    ticketType: "VIP Pass",
    ticketNumber: "VIP-008",
    purchaseDate: "2025-12-31",
    checkedIn: true,
    checkedInTime: "2026-02-15 20:45",
  },
  {
    id: 18,
    name: "Barbara Walker",
    email: "barbara@example.com",
    phone: "+254712345018",
    ticketType: "General Admission",
    ticketNumber: "GA-178",
    purchaseDate: "2025-12-31",
    checkedIn: false,
    checkedInTime: null,
  },
  {
    id: 19,
    name: "Christopher Hall",
    email: "christopher@example.com",
    phone: "+254712345019",
    ticketType: "VIP Pass",
    ticketNumber: "VIP-009",
    purchaseDate: "2025-12-30",
    checkedIn: true,
    checkedInTime: "2026-02-15 21:00",
  },
  {
    id: 20,
    name: "Susan Allen",
    email: "susan@example.com",
    phone: "+254712345020",
    ticketType: "General Admission",
    ticketNumber: "GA-190",
    purchaseDate: "2025-12-30",
    checkedIn: false,
    checkedInTime: null,
  },
  {
    id: 21,
    name: "Daniel Young",
    email: "daniel@example.com",
    phone: "+254712345021",
    ticketType: "VIP Pass",
    ticketNumber: "VIP-010",
    purchaseDate: "2025-12-30",
    checkedIn: true,
    checkedInTime: "2026-02-15 21:15",
  },
  {
    id: 22,
    name: "Jessica King",
    email: "jessica@example.com",
    phone: "+254712345022",
    ticketType: "General Admission",
    ticketNumber: "GA-201",
    purchaseDate: "2025-12-30",
    checkedIn: true,
    checkedInTime: "2026-02-15 21:30",
  },
  {
    id: 23,
    name: "Matthew Wright",
    email: "matthew@example.com",
    phone: "+254712345023",
    ticketType: "VIP Pass",
    ticketNumber: "VIP-011",
    purchaseDate: "2025-12-29",
    checkedIn: false,
    checkedInTime: null,
  },
  {
    id: 24,
    name: "Nancy Lopez",
    email: "nancy@example.com",
    phone: "+254712345024",
    ticketType: "General Admission",
    ticketNumber: "GA-223",
    purchaseDate: "2025-12-29",
    checkedIn: true,
    checkedInTime: "2026-02-15 21:45",
  },
  {
    id: 25,
    name: "Anthony Hill",
    email: "anthony@example.com",
    phone: "+254712345025",
    ticketType: "VIP Pass",
    ticketNumber: "VIP-013",
    purchaseDate: "2025-12-29",
    checkedIn: false,
    checkedInTime: null,
  },
  {
    id: 26,
    name: "Karen Scott",
    email: "karen@example.com",
    phone: "+254712345026",
    ticketType: "General Admission",
    ticketNumber: "GA-245",
    purchaseDate: "2025-12-28",
    checkedIn: true,
    checkedInTime: "2026-02-15 22:00",
  },
  {
    id: 27,
    name: "Mark Green",
    email: "mark@example.com",
    phone: "+254712345027",
    ticketType: "VIP Pass",
    ticketNumber: "VIP-014",
    purchaseDate: "2025-12-28",
    checkedIn: true,
    checkedInTime: "2026-02-15 22:15",
  },
  {
    id: 28,
    name: "Betty Adams",
    email: "betty@example.com",
    phone: "+254712345028",
    ticketType: "General Admission",
    ticketNumber: "GA-267",
    purchaseDate: "2025-12-28",
    checkedIn: false,
    checkedInTime: null,
  },
]

export default function EventDetailPage({ eventId = 1 }: { eventId?: number }) {
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

  const [showAddTicketModal, setShowAddTicketModal] = useState(false)
  const [addTicketName, setAddTicketName] = useState("")
  const [addTicketPrice, setAddTicketPrice] = useState("")
  const [addTicketQuantity, setAddTicketQuantity] = useState("")
  const [addTicketDescription, setAddTicketDescription] = useState("")
  const [addTicketSaleStart, setAddTicketSaleStart] = useState<Date | undefined>(undefined)
  const [addTicketSaleEnd, setAddTicketSaleEnd] = useState<Date | undefined>(undefined)

  // Pagination state
  const [transactionsPage, setTransactionsPage] = useState(1)
  const [attendeesPage, setAttendeesPage] = useState(1)
  const itemsPerPage = 10

  // Get the event data based on eventId
  const eventData = allEventsData.find(e => e.id === eventId) || allEventsData[0]
  const ticketTypes = ticketTypesData[eventId] || ticketTypesData[1]

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

  const handleEditTicket = (ticket: any) => {
    setEditingTicket(ticket)
    setEditTicketName(ticket.name)
    setEditTicketPrice(ticket.price.toString())
    setEditTicketQuantity(ticket.totalAvailable.toString())
    setEditTicketDescription("")
    setEditTicketSaleStart(undefined)
    setEditTicketSaleEnd(undefined)
    setShowEditTicketModal(true)
  }

  const handleSaveTicket = () => {
    if (!editTicketName || !editTicketPrice || !editTicketQuantity) {
      toast.error("Please fill in all required fields")
      return
    }

    if (!editTicketSaleStart || !editTicketSaleEnd) {
      toast.error("Please set the ticket sale period")
      return
    }

    toast.success("Ticket updated successfully!", {
      description: "Your changes have been saved.",
    })
    setShowEditTicketModal(false)
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
  const paginatedTransactions = getPaginatedData(transactions, transactionsPage)
  const paginatedAttendees = getPaginatedData(attendees, attendeesPage)
  const transactionsTotalPages = getTotalPages(transactions.length)
  const attendeesTotalPages = getTotalPages(attendees.length)

  // Export functions
  // Export functions - Professional PDF reports using /report page
  const exportTransactionsToPDF = () => {
    try {

      const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0)

      // Generate unique report ID
      const reportId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Transaction Report - ${eventData.name}</title>
          <style>
            @page { margin: 20mm; size: A4; }
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

            /* Print styles */
            @media print {
              body { padding: 0; }
              .report-header { page-break-after: avoid; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              thead { display: table-header-group; }
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
                <div class="info-value">${eventData.name}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Event Date</div>
                <div class="info-value">${new Date(eventData.date).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Venue</div>
                <div class="info-value">${eventData.venue || 'N/A'}</div>
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
              <div class="summary-value">${transactions.length}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Total Revenue</div>
              <div class="summary-value">KES ${totalRevenue.toLocaleString()}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Avg. Transaction</div>
              <div class="summary-value">KES ${Math.round(totalRevenue / transactions.length).toLocaleString()}</div>
            </div>
          </div>

          <!-- Transactions Table -->
          <div class="table-section">
            <div class="section-title">Transaction Details</div>
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
                ${transactions.map(txn => `
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
      const checkedInCount = attendees.filter(a => a.checkedIn).length
      const notCheckedInCount = attendees.length - checkedInCount

      // Generate unique report ID
      const reportId = `ATT-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Attendees Report - ${eventData.name}</title>
          <style>
            @page { margin: 20mm; size: A4; }
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
            .status-checked-in {
              background: #d1fae5;
              color: #065f46;
            }
            .status-not-checked-in {
              background: #fee2e2;
              color: #991b1b;
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

            /* Print styles */
            @media print {
              body { padding: 0; }
              .report-header { page-break-after: avoid; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              thead { display: table-header-group; }
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
              <div class="report-title">Attendees Report</div>
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
                <div class="info-value">${eventData.name}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Event Date</div>
                <div class="info-value">${new Date(eventData.date).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Venue</div>
                <div class="info-value">${eventData.venue || 'N/A'}</div>
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
              <div class="summary-label">Total Attendees</div>
              <div class="summary-value">${attendees.length}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Checked In</div>
              <div class="summary-value">${checkedInCount}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Check-in Rate</div>
              <div class="summary-value">${Math.round((checkedInCount / attendees.length) * 100)}%</div>
            </div>
          </div>

          <!-- Attendees Table -->
          <div class="table-section">
            <div class="section-title">Attendee Details</div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact Information</th>
                  <th>Ticket Details</th>
                  <th>Purchase Date</th>
                  <th>Check-in Status</th>
                  <th>Check-in Time</th>
                </tr>
              </thead>
              <tbody>
                ${attendees.map(attendee => `
                  <tr>
                    <td style="font-weight: 600;">${attendee.name}</td>
                    <td>
                      <div style="font-size: 12px;">${attendee.email}</div>
                      <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">${attendee.phone || 'N/A'}</div>
                    </td>
                    <td>
                      <div style="font-weight: 600;">${attendee.ticketType}</div>
                      <div style="font-size: 11px; font-family: 'Courier New', monospace; color: #6b7280;">${attendee.ticketNumber}</div>
                    </td>
                    <td style="font-size: 12px;">${new Date(attendee.purchaseDate).toLocaleDateString()}</td>
                    <td>
                      <span class="status-badge status-${attendee.checkedIn ? 'checked-in' : 'not-checked-in'}">
                        ${attendee.checkedIn ? '✓ Checked In' : '✗ Not Checked In'}
                      </span>
                    </td>
                    <td style="font-size: 12px;">${attendee.checkedInTime || '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Footer -->
          <div class="report-footer">
            <div class="footer-text">
              <div class="footer-company">SoldOutAfrica Event Management Platform</div>
              <div>This is an official attendee report. For inquiries, contact support@soldoutafrica.com</div>
            </div>
          </div>

          <script>
            // Override about:blank title
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
          {eventData.status !== "pending" && (
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
            </div>
          )}
        </div>

        {/* Pending Approval Notification */}
        {eventData.status === "pending" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 p-4 sm:p-6">
              <div className="flex items-start gap-3 sm:gap-4">

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
                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-orange-900 dark:text-orange-200 mb-1">
                    Pending Approval
                  </h3>
                  <p className="text-sm sm:text-base text-orange-800 dark:text-orange-300">
                    The SoldOutAfrica team is currently reviewing your event. You&apos;ll be notified once your event has been approved and is live on the platform.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs sm:text-sm text-orange-700 dark:text-orange-400">
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
                    ? `KES ${eventData.totalRevenue.toLocaleString()}`
                    : '••••••••'}
                </p>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-4 sm:pt-6 border-t border-white/20">
                <div className="pb-4 border-b border-white/10 sm:border-b-0">
                  <p className="text-xs opacity-75 mb-1">Commission & Fees (12.5%)</p>
                  <p className="text-base sm:text-lg lg:text-xl xl:text-2xl font-semibold break-words">
                    {showBalance
                      ? `- KES ${(eventData.totalRevenue * 0.125).toLocaleString()}`
                      : '- ••••••'}
                  </p>
                </div>
                <div className="sm:border-l sm:border-white/20 sm:pl-6">
                  <p className="text-xs opacity-75 mb-1">Net Amount</p>
                  <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-green-300 break-words">
                    {showBalance
                      ? `KES ${(eventData.totalRevenue * 0.875).toLocaleString()}`
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
      </motion.div>

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
            {/* Event Image */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="relative w-full h-48 sm:h-64 lg:h-80 bg-gradient-to-br from-[#8b5cf6]/20 to-[#7c3aed]/20">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Calendar className="w-16 h-16 sm:w-24 sm:h-24 text-[#8b5cf6]/40" />
                </div>
                {/* Placeholder for actual event image */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
                  <h3 className="text-white text-xl sm:text-2xl font-bold">{eventData.name}</h3>
                  <p className="text-white/80 text-sm mt-1">{eventData.venue}</p>
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
                    <p className="text-sm text-muted-foreground mb-1">Total Tickets</p>
                    <p className="text-2xl font-bold">{ticketTypes.reduce((sum, t) => sum + t.totalAvailable, 0)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50">
                    <p className="text-sm text-muted-foreground mb-1">Tickets Sold</p>
                    <p className="text-2xl font-bold">{ticketTypes.reduce((sum, t) => sum + t.sold, 0)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50">
                    <p className="text-sm text-muted-foreground mb-1">Capacity</p>
                    <p className="text-2xl font-bold">
                      {Math.round(
                        (ticketTypes.reduce((sum, t) => sum + t.sold, 0) /
                          ticketTypes.reduce((sum, t) => sum + t.totalAvailable, 0)) *
                          100
                      )}
                      %
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50">
                    <p className="text-sm text-muted-foreground mb-1">Revenue</p>
                    <p className="text-2xl font-bold">KES {eventData.totalRevenue.toLocaleString()}</p>
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
            </div>

            {/* Ticket Cards */}
            <div className="grid gap-4">
              {ticketTypes.map((ticket) => (
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
                          <p className="font-semibold">KES {ticket.price.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Sold</p>
                          <p className="font-semibold">
                            {ticket.sold} / {ticket.totalAvailable}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                          <p className="font-semibold">KES {ticket.revenue.toLocaleString()}</p>
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
            {eventData.status === "pending" || transactions.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-card/50">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary/50 flex items-center justify-center">
                  <Download className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No Transactions Yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {eventData.status === "pending"
                    ? "Transactions will appear here once your event is approved and tickets start selling."
                    : "Transactions will appear here once tickets are sold."}
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
                            <td className="p-4 text-sm font-semibold">KES {txn.amount.toLocaleString()}</td>
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
                          <p className="text-sm font-bold">KES {txn.amount.toLocaleString()}</p>
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
                {transactions.length > itemsPerPage && (
                  <div className="pagination-container">
                    <p className="pagination-info">
                      Showing <span className="font-semibold text-foreground">{((transactionsPage - 1) * itemsPerPage) + 1}</span> to <span className="font-semibold text-foreground">{Math.min(transactionsPage * itemsPerPage, transactions.length)}</span> of <span className="font-semibold text-foreground">{transactions.length}</span> transactions
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
                        {Array.from({ length: transactionsTotalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setTransactionsPage(page)}
                            className={cn(
                              "pagination-button",
                              page === transactionsPage && "pagination-button-active"
                            )}
                          >
                            {page}
                          </button>
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
            {eventData.status === "pending" || attendees.length === 0 ? (
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
                        {paginatedAttendees.map((attendee) => (
                          <tr key={attendee.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                            <td className="p-4 text-sm font-medium">{attendee.name}</td>
                            <td className="p-4 text-sm text-muted-foreground">{attendee.email}</td>
                            <td className="p-4 text-sm text-muted-foreground">{attendee.phone || 'N/A'}</td>
                            <td className="p-4 text-sm">{attendee.ticketType}</td>
                            <td className="p-4 text-sm font-mono">{attendee.ticketNumber}</td>
                            <td className="p-4 text-sm text-muted-foreground">
                              {new Date(attendee.purchaseDate).toLocaleDateString()}
                            </td>
                            <td className="p-4">
                              {attendee.checkedIn ? (
                                <div>
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-xs font-medium">
                                    <CheckCircle className="w-3 h-3" />
                                    Checked In
                                  </span>
                                  <p className="text-xs text-muted-foreground mt-1">{attendee.checkedInTime}</p>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-muted-foreground text-xs font-medium">
                                  <XCircle className="w-3 h-3" />
                                  Not Checked In
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
                  {paginatedAttendees.map((attendee) => (
                    <div key={attendee.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{attendee.name}</p>
                          <p className="text-sm text-muted-foreground">{attendee.email}</p>
                          <p className="text-sm text-muted-foreground">{attendee.phone || 'N/A'}</p>
                        </div>
                        {attendee.checkedIn ? (
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
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Ticket Type</p>
                          <p className="text-sm">{attendee.ticketType}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Ticket Number</p>
                          <p className="text-sm font-mono">{attendee.ticketNumber}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Purchase Date</p>
                          <p className="text-sm">{new Date(attendee.purchaseDate).toLocaleDateString()}</p>
                        </div>
                        {attendee.checkedIn && attendee.checkedInTime && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Check-in Time</p>
                            <p className="text-sm">{attendee.checkedInTime}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
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
                        {Array.from({ length: attendeesTotalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setAttendeesPage(page)}
                            className={cn(
                              "pagination-button",
                              page === attendeesPage && "pagination-button-active"
                            )}
                          >
                            {page}
                          </button>
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
                    {ticketTypes.map((ticket) => (
                      <option key={ticket.id} value={ticket.id}>
                        {ticket.name} - KES {ticket.price.toLocaleString()}
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
                      className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
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
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Description (Optional)
                  </label>
                  <textarea
                    value={editTicketDescription}
                    onChange={(e) => setEditTicketDescription(e.target.value)}
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

                <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-800 dark:text-orange-300">
                      <span className="font-semibold">Note:</span> Changes to price or quantity will not affect tickets already sold. Only future sales will use the updated values.
                    </p>
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
  )
}

