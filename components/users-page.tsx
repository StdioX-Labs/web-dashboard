"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Plus, Edit, Ban, Shield, User, Users as UsersIcon, CheckCircle, XCircle, X, Mail, Phone, TrendingUp, Copy, Link as LinkIcon, DollarSign, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { api } from "@/lib/api-client"
import { sessionManager } from "@/lib/session-manager"

type UserRole = "SUPER_ADMIN" | "COMPANY_OWNER" | "STAFF"

interface User {
  id: number
  fullName: string
  idNumber: string
  mobileNumber: string
  emailAddress: string
  roles: UserRole
  companyName: string
  kycStatus: string
  currency: string
  role: string | null
  active: boolean
}

interface Affiliate {
  id: string
  name: string
  email: string
  phone: string
  status: "active" | "suspended"
  joinedDate: string
  events: string[]
  affiliateLink: string
  totalSales: number
  totalRevenue: number
  commission: number
}


const generateMockAffiliates = (): Affiliate[] => [
  { id: "AFF-001", name: "John Marketing", email: "john@marketing.com", phone: "+254722123456", status: "active", joinedDate: "2025-11-01", events: ["1", "2"], affiliateLink: "https://soldoutafrica.com/aff/john-marketing", totalSales: 45, totalRevenue: 135000, commission: 13500 },
  { id: "AFF-002", name: "Emma Promoter", email: "emma@promo.com", phone: "+254733456789", status: "active", joinedDate: "2025-12-15", events: ["3"], affiliateLink: "https://soldoutafrica.com/aff/emma-promoter", totalSales: 28, totalRevenue: 84000, commission: 8400 },
  { id: "AFF-003", name: "Mike Influencer", email: "mike@influence.com", phone: "+254744789012", status: "suspended", joinedDate: "2025-10-20", events: ["1"], affiliateLink: "https://soldoutafrica.com/aff/mike-influencer", totalSales: 12, totalRevenue: 36000, commission: 3600 },
]

const roleDetails: Record<string, { label: string; description: string; color: string; bg: string; icon: any }> = {
  SUPER_ADMIN: { label: "Super Admin", description: "Full system access across all companies", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-950/30", icon: Shield },
  COMPANY_OWNER: { label: "Company Owner", description: "Full access to all features including withdrawals and financial reports", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-950/30", icon: Shield },
  STAFF: { label: "Event Staff", description: "Can view attendees and scan tickets", color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-950/30", icon: UsersIcon },
  // Add lowercase aliases for compatibility with form inputs
  owner: { label: "Company Owner", description: "Full access to all features including withdrawals and financial reports", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-950/30", icon: Shield },
  organizer: { label: "Event Organizer", description: "Can create and manage events", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-950/30", icon: User },
  staff: { label: "Event Staff", description: "Can view attendees and scan tickets", color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-950/30", icon: UsersIcon },
}

// Mock active events - replace with actual API data
const activeEvents = [
  { id: "1", name: "Nura Fest 2026", status: "active" },
  { id: "2", name: "Tech Summit Nairobi", status: "active" },
  { id: "3", name: "Jazz Night Live", status: "active" },
  { id: "4", name: "Summer Music Festival", status: "active" },
  { id: "5", name: "Art Exhibition", status: "active" },
]

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [affiliates, setAffiliates] = useState<Affiliate[]>(generateMockAffiliates())
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"users" | "affiliates">("users")

  const fetchUsers = async () => {
    try {
      const user = sessionManager.getUser()

      if (!user || !user.company_id) {
        setIsLoading(false)
        return
      }

      console.log('Fetching users for company:', user.company_id)
      const response = await api.company.getUsers(user.company_id)

      if (response.status && response.users) {
        console.log('Users fetched:', response.users.length)
        setUsers(response.users as User[])
      } else {
        toast.error('Failed to load users')
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // ...existing code...
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null)
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", role: "STAFF" as UserRole, idNumber: "" })
  const [affiliateFormData, setAffiliateFormData] = useState({ name: "", email: "", phone: "", events: [] as string[], eventId: "" })
  const [otpInput, setOtpInput] = useState("")
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")

  const filteredUsers = users.filter(u =>
    u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.emailAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.mobileNumber.includes(searchQuery)
  )
  const filteredAffiliates = affiliates.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.email.toLowerCase().includes(searchQuery.toLowerCase()) || a.id.toLowerCase().includes(searchQuery.toLowerCase()))

  const totalUsers = users.length
  const activeUsers = users.filter(u => u.active).length
  const suspendedUsers = users.filter(u => !u.active).length
  const superAdminCount = users.filter(u => u.roles === "SUPER_ADMIN").length
  const ownerCount = users.filter(u => u.roles === "COMPANY_OWNER").length
  const staffCount = users.filter(u => u.roles === "STAFF").length
  const totalAffiliates = affiliates.length
  const activeAffiliates = affiliates.filter(a => a.status === "active").length
  const suspendedAffiliates = affiliates.filter(a => a.status === "suspended").length
  const totalAffiliateSales = affiliates.reduce((sum, a) => sum + a.totalSales, 0)
  const totalAffiliateRevenue = affiliates.reduce((sum, a) => sum + a.totalRevenue, 0)
  const totalCommissionPaid = affiliates.reduce((sum, a) => sum + a.commission, 0)

  const handleAddUser = async () => {
    if (!formData.name || !formData.email || !formData.phone || !formData.role) {
      return toast.error("Please fill all required fields")
    }

    try {
      const currentUser = sessionManager.getUser()
      if (!currentUser) {
        toast.error("Unable to identify current user")
        return
      }

      // Call the create user API
      const response = await api.user.create({
        fullName: formData.name,
        idNumber: formData.idNumber || "00000000",
        mobileNumber: formData.phone,
        password: "s0ascAnn3r@56YearsLater!", // Default password
        emailAddress: formData.email,
        isExternal: false,
        company: { id: currentUser.company_id },
        roles: formData.role,
      })

      if (response.status) {
        toast.success(response.message || "User added successfully!")
        setShowAddModal(false)
        setFormData({ name: "", email: "", phone: "", role: "STAFF", idNumber: "" })
        // Refresh the users list
        fetchUsers()
      } else {
        toast.error(response.message || "Failed to create user")
      }
    } catch (error) {
      console.error('Error creating user:', error)
      toast.error("An error occurred while creating user")
    }
  }

  const handleEditUser = async () => {
    if (!selectedUser) return

    if (!formData.name || !formData.email || !formData.phone || !formData.role) {
      return toast.error("Please fill all required fields")
    }

    try {
      const currentUser = sessionManager.getUser()
      if (!currentUser) {
        toast.error("Unable to identify current user")
        return
      }

      // Call the edit user API
      const response = await api.user.edit(
        selectedUser.id,
        currentUser.user_id,
        {
          fullName: formData.name,
          emailAddress: formData.email,
          mobileNumber: formData.phone,
          idNumber: formData.idNumber || selectedUser.idNumber,
          roles: formData.role,
          // Include password only if it's been changed (you may want to add a password field to the form)
        }
      )

      if (response.status) {
        toast.success(response.message || "User updated successfully!")
        setShowEditModal(false)
        setSelectedUser(null)
        setFormData({ name: "", email: "", phone: "", role: "STAFF", idNumber: "" })
        // Refresh the users list
        fetchUsers()
      } else {
        toast.error(response.message || "Failed to update user")
      }
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error("An error occurred while updating user")
    }
  }

  const handleSuspendUser = async () => {
    if (!selectedUser) return

    try {
      const currentUser = sessionManager.getUser()
      if (!currentUser) {
        toast.error("Unable to identify current user")
        return
      }

      // Call the void API with userId and requesterUserId
      const response = await api.user.void(selectedUser.id, currentUser.user_id)

      if (response.status) {
        // Toggle the active status locally
        const newActiveStatus = !selectedUser.active
        setUsers(users.map(u => u.id === selectedUser.id ? { ...u, active: newActiveStatus } : u))

        toast.success(response.message || `User ${newActiveStatus ? "activated" : "suspended"} successfully!`)
      } else {
        toast.error("Failed to update user status")
      }
    } catch (error) {
      console.error('Error suspending/activating user:', error)
      toast.error("An error occurred while updating user status")
    } finally {
      setShowSuspendModal(false)
      setSelectedUser(null)
    }
  }

  const handleAddAffiliate = () => {
    if (!affiliateFormData.name || !affiliateFormData.email || !affiliateFormData.phone || !affiliateFormData.eventId) return toast.error("Please fill all required fields and select an event")
    const affiliateSlug = affiliateFormData.name.toLowerCase().replace(/\s+/g, '-')
    const newAffiliate: Affiliate = { id: `AFF-${String(affiliates.length + 1).padStart(3, '0')}`, name: affiliateFormData.name, email: affiliateFormData.email, phone: affiliateFormData.phone, events: [affiliateFormData.eventId], status: "active", joinedDate: new Date().toISOString().split('T')[0], affiliateLink: `https://soldoutafrica.com/aff/${affiliateSlug}`, totalSales: 0, totalRevenue: 0, commission: 0 }
    setAffiliates([...affiliates, newAffiliate])
    setShowAddModal(false)
    setAffiliateFormData({ name: "", email: "", phone: "", events: [], eventId: "" })
    toast.success("Affiliate added successfully!")
  }

  const handleEditAffiliate = () => {
    if (!selectedAffiliate) return
    setAffiliates(affiliates.map(a => a.id === selectedAffiliate.id ? { ...a, name: affiliateFormData.name, email: affiliateFormData.email, phone: affiliateFormData.phone, events: affiliateFormData.eventId ? [affiliateFormData.eventId] : a.events } : a))
    setShowEditModal(false)
    setSelectedAffiliate(null)
    setAffiliateFormData({ name: "", email: "", phone: "", events: [], eventId: "" })
    toast.success("Affiliate updated successfully!")
  }

  const handleSuspendAffiliate = () => {
    if (otpInput !== "0000") return toast.error("Invalid OTP")
    if (!selectedAffiliate) return
    const newStatus = selectedAffiliate.status === "active" ? "suspended" : "active"
    setAffiliates(affiliates.map(a => a.id === selectedAffiliate.id ? { ...a, status: newStatus } : a))
    setShowSuspendModal(false)
    setShowOtpInput(false)
    setOtpInput("")
    setSelectedAffiliate(null)
    toast.success(`Affiliate ${newStatus === "suspended" ? "suspended" : "activated"} successfully!`)
  }

  const openEditModal = (user: User) => {
    setSelectedUser(user)
    setFormData({
      name: user.fullName,
      email: user.emailAddress,
      phone: user.mobileNumber,
      role: user.roles,
      idNumber: user.idNumber
    })
    setShowEditModal(true)
  }
  const openSuspendModal = (user: User) => {
    setSelectedUser(user)
    setShowSuspendModal(true)
  }

  // Check if current user can edit/suspend another user based on roles
  const canManageUser = (targetUser: User): boolean => {
    const currentUser = sessionManager.getUser()
    if (!currentUser) return false

    const currentUserRole = currentUser.role
    const targetUserRole = targetUser.roles

    // Super Admin can manage everyone
    if (currentUserRole === "SUPER_ADMIN") return true

    // Company Owner (COMPANY_OWNER) can manage everyone except Super Admins
    if (currentUserRole === "COMPANY_OWNER") {
      return targetUserRole !== "SUPER_ADMIN"
    }

    // Staff can only manage themselves
    if (currentUserRole === "STAFF") {
      return targetUser.id === currentUser.user_id
    }

    return false
  }

  const openEditAffiliateModal = (affiliate: Affiliate) => { setSelectedAffiliate(affiliate); setAffiliateFormData({ name: affiliate.name, email: affiliate.email, phone: affiliate.phone, events: affiliate.events, eventId: affiliate.events[0] || "" }); setShowEditModal(true) }
  const openSuspendAffiliateModal = (affiliate: Affiliate) => { setSelectedAffiliate(affiliate); setShowSuspendModal(true); setShowOtpInput(false); setOtpInput("") }
  const copyAffiliateLink = (link: string) => { navigator.clipboard.writeText(link); toast.success("Affiliate link copied!") }

  const openPaymentModal = (affiliate: Affiliate) => {
    setSelectedAffiliate(affiliate)
    setPaymentAmount(affiliate.commission.toString())
    setShowPaymentModal(true)
    setShowOtpInput(false)
    setOtpInput("")
  }

  const handlePayAffiliate = () => {
    if (otpInput !== "0000") {
      toast.error("Invalid OTP")
      return
    }

    if (!selectedAffiliate || !paymentAmount) return

    // Create payout request
    const payoutRequest = {
      id: `PAY-${Date.now()}`,
      type: "affiliate_payment",
      affiliateId: selectedAffiliate.id,
      affiliateName: selectedAffiliate.name,
      amount: Number(paymentAmount),
      status: "pending",
      requestedAt: new Date().toISOString(),
      requestedBy: "Current User"
    }

    // Store in localStorage for demo (replace with API call)
    const existingPayouts = JSON.parse(localStorage.getItem("payoutRequests") || "[]")
    localStorage.setItem("payoutRequests", JSON.stringify([payoutRequest, ...existingPayouts]))

    toast.success("Payment request submitted!", {
      description: "The payout will be reviewed and processed within 24 hours",
    })

    // Reset modal
    setShowPaymentModal(false)
    setSelectedAffiliate(null)
    setPaymentAmount("")
    setOtpInput("")
    setShowOtpInput(false)
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 max-w-[1600px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">{activeTab === "users" ? "Users" : "Affiliates"}</h1>
          <button onClick={() => setShowAddModal(true)} className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all cursor-pointer">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{activeTab === "users" ? "Add User" : "Add Affiliate"}</span>
          </button>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground">{activeTab === "users" ? "Manage team members and their access levels" : "Manage affiliates and track their sales performance"}</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-6">
        <div className="inline-flex rounded-xl border border-border bg-card p-1">
          <button onClick={() => setActiveTab("users")} className={cn("px-6 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer", activeTab === "users" ? "bg-[#8b5cf6] text-white shadow-lg shadow-[#8b5cf6]/25" : "text-muted-foreground hover:text-foreground")}>Users</button>
          <button onClick={() => setActiveTab("affiliates")} className={cn("px-6 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer", activeTab === "affiliates" ? "bg-[#8b5cf6] text-white shadow-lg shadow-[#8b5cf6]/25" : "text-muted-foreground hover:text-foreground")}>Affiliates</button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {(activeTab === "users" ? [
          { label: "Total Users", value: totalUsers, icon: UsersIcon, color: "text-[#8b5cf6]", bg: "bg-purple-50 dark:bg-purple-950/30" },
          { label: "Active", value: activeUsers, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
          { label: "Inactive", value: suspendedUsers, icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
          { label: "Super Admins", value: superAdminCount, icon: Shield, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
          { label: "Owners", value: ownerCount, icon: Shield, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
          { label: "Staff", value: staffCount, icon: UsersIcon, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
        ] : [
          { label: "Total Affiliates", value: totalAffiliates, icon: UsersIcon, color: "text-[#8b5cf6]", bg: "bg-purple-50 dark:bg-purple-950/30" },
          { label: "Active", value: activeAffiliates, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
          { label: "Suspended", value: suspendedAffiliates, icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
          { label: "Total Sales", value: totalAffiliateSales, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Total Revenue", value: `KES ${(totalAffiliateRevenue / 1000).toFixed(0)}K`, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
          { label: "Commission Paid", value: `KES ${(totalCommissionPaid / 1000).toFixed(0)}K`, icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
        ]).map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + index * 0.05 }} className="rounded-xl border border-border bg-card p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("p-1.5 sm:p-2 rounded-lg", stat.bg)}><Icon className={cn("w-3 h-3 sm:w-4 sm:h-4", stat.color)} /></div>
              </div>
              <p className="text-xs text-muted-foreground mb-0.5">{stat.label}</p>
              <p className="text-lg sm:text-xl font-bold">{stat.value}</p>
            </motion.div>
          )
        })}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl border border-border bg-card p-4 sm:p-6 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input type="text" placeholder="Search by name, email, or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/10 transition-all" />
        </div>
      </motion.div>

      {activeTab === "users" ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-[#8b5cf6]" />
                <p className="text-muted-foreground">Loading users...</p>
              </div>
            </div>
          ) : filteredUsers.map((user, index) => {
            const RoleIcon = roleDetails[user.roles]?.icon || User
            const roleInfo = roleDetails[user.roles] || roleDetails.STAFF
            return (
              <motion.div key={user.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + index * 0.05 }} className="rounded-xl border border-border bg-card p-4 sm:p-6 hover:border-[#8b5cf6]/30 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={cn("w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0", roleInfo.bg)}><RoleIcon className={cn("w-6 h-6", roleInfo.color)} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-bold text-base sm:text-lg">{user.fullName}</h3>
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", user.active ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400")}>
                            {user.active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {user.active ? "Active" : "Inactive"}
                          </span>
                          {user.kycStatus === "PASSED" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                              <CheckCircle className="w-3 h-3" />
                              KYC Verified
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-2"><Mail className="w-4 h-4" /><span className="break-all">{user.emailAddress}</span></div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-3"><Phone className="w-4 h-4" /><span>{user.mobileNumber}</span></div>
                        <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold", roleInfo.bg, roleInfo.color)}><RoleIcon className="w-4 h-4" />{roleInfo.label}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground pl-15">
                      <div><span className="font-medium">Company:</span> {user.companyName}</div>
                      <div><span className="font-medium">KYC Status:</span> {user.kycStatus}</div>
                    </div>
                  </div>
                  {canManageUser(user) && (
                    <div className="flex sm:flex-col gap-2 sm:gap-3">
                      <button onClick={() => openEditModal(user)} className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-semibold hover:bg-blue-200 dark:hover:bg-blue-950/50 transition-all cursor-pointer border border-blue-200 dark:border-blue-900"><Edit className="w-4 h-4" />Edit</button>
                      <button onClick={() => openSuspendModal(user)} className={cn("flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border", user.active ? "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-950/50 border-red-200 dark:border-red-900" : "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-950/50 border-green-200 dark:border-green-900")}>
                        {user.active ? <><Ban className="w-4 h-4" />Suspend</> : <><CheckCircle className="w-4 h-4" />Activate</>}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
          {!isLoading && filteredUsers.length === 0 && <div className="text-center py-12 text-muted-foreground"><UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No users found</p></div>}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-4">
          {filteredAffiliates.map((affiliate, index) => (
            <motion.div key={affiliate.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + index * 0.05 }} className="rounded-xl border border-border bg-card p-4 sm:p-6 hover:border-[#8b5cf6]/30 transition-all">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] flex items-center justify-center flex-shrink-0"><LinkIcon className="w-6 h-6 text-white" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-bold text-base sm:text-lg">{affiliate.name}</h3>
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", affiliate.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400")}>
                            {affiliate.status === "active" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {affiliate.status.charAt(0).toUpperCase() + affiliate.status.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-2"><Mail className="w-4 h-4" /><span className="break-all">{affiliate.email}</span></div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-3"><Phone className="w-4 h-4" /><span>{affiliate.phone}</span></div>
                      </div>
                    </div>
                    <div className="bg-secondary/30 rounded-lg p-3 mb-3">
                      <p className="text-xs text-muted-foreground mb-1">Affiliate Link</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs sm:text-sm font-mono text-[#8b5cf6] break-all">{affiliate.affiliateLink}</code>
                        <button onClick={() => copyAffiliateLink(affiliate.affiliateLink)} className="flex-shrink-0 p-2 hover:bg-secondary rounded-lg transition-colors cursor-pointer" title="Copy link"><Copy className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3"><p className="text-xs text-muted-foreground mb-1">Sales</p><p className="text-lg font-bold text-blue-600 dark:text-blue-400">{affiliate.totalSales}</p></div>
                      <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3"><p className="text-xs text-muted-foreground mb-1">Revenue</p><p className="text-lg font-bold text-green-600 dark:text-green-400">KES {(affiliate.totalRevenue / 1000).toFixed(0)}K</p></div>
                      <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3"><p className="text-xs text-muted-foreground mb-1">Commission</p><p className="text-lg font-bold text-orange-600 dark:text-orange-400">KES {(affiliate.commission / 1000).toFixed(0)}K</p></div>
                    </div>
                    <div className="text-xs text-muted-foreground"><span className="font-medium">Joined:</span> {new Date(affiliate.joinedDate).toLocaleDateString()} • <span className="font-medium">Events:</span> {affiliate.events.length}</div>
                  </div>
                  <div className="flex sm:flex-col gap-2 sm:gap-3">
                    <button onClick={() => openPaymentModal(affiliate)} className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all cursor-pointer"><DollarSign className="w-4 h-4" />Pay</button>
                    <button onClick={() => openEditAffiliateModal(affiliate)} className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-semibold hover:bg-blue-200 dark:hover:bg-blue-950/50 transition-all cursor-pointer border border-blue-200 dark:border-blue-900"><Edit className="w-4 h-4" />Edit</button>
                    <button onClick={() => openSuspendAffiliateModal(affiliate)} className={cn("flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border", affiliate.status === "active" ? "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-950/50 border-red-200 dark:border-red-900" : "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-950/50 border-green-200 dark:border-green-900")}>
                      {affiliate.status === "active" ? <><Ban className="w-4 h-4" />Suspend</> : <><CheckCircle className="w-4 h-4" />Activate</>}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {filteredAffiliates.length === 0 && <div className="text-center py-12 text-muted-foreground"><UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No affiliates found</p></div>}
        </motion.div>
      )}

      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card rounded-2xl border border-border p-6 z-50 shadow-2xl max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-lg transition-colors"><X className="w-5 h-5" /></button>
              <h3 className="text-xl font-bold mb-6">{activeTab === "users" ? "Add New User" : "Add New Affiliate"}</h3>
              {activeTab === "users" ? (
                <div className="space-y-4">
                  <div><label className="text-sm font-medium mb-2 block">Full Name *</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="John Doe" className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all" /></div>
                  <div><label className="text-sm font-medium mb-2 block">Email Address *</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="john@example.com" className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all" /></div>
                  <div><label className="text-sm font-medium mb-2 block">Phone Number *</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+254712345678" className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all" /></div>
                  <div><label className="text-sm font-medium mb-2 block">Role *</label><div className="space-y-3">{(["COMPANY_OWNER", "STAFF"] as const).map((role) => { const RoleIcon = roleDetails[role].icon; return (<label key={role} className={cn("flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all", formData.role === role ? "border-[#8b5cf6] bg-[#8b5cf6]/5" : "border-border hover:border-[#8b5cf6]/50")}><input type="radio" name="role" value={role} checked={formData.role === role} onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })} className="mt-1" /><div className="flex-1"><div className="flex items-center gap-2 mb-1"><RoleIcon className={cn("w-4 h-4", roleDetails[role].color)} /><span className="font-semibold">{roleDetails[role].label}</span></div><p className="text-xs text-muted-foreground">{roleDetails[role].description}</p></div></label>)})}</div></div>
                  <div className="flex gap-3 pt-4"><button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl font-semibold hover:bg-secondary/80 transition-all">Cancel</button><button onClick={handleAddUser} className="flex-1 px-4 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-[#8b5cf6]/30 transition-all">Add User</button></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div><label className="text-sm font-medium mb-2 block">Full Name *</label><input type="text" value={affiliateFormData.name} onChange={(e) => setAffiliateFormData({ ...affiliateFormData, name: e.target.value })} placeholder="John Marketing" className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all" /></div>
                  <div><label className="text-sm font-medium mb-2 block">Email Address *</label><input type="email" value={affiliateFormData.email} onChange={(e) => setAffiliateFormData({ ...affiliateFormData, email: e.target.value })} placeholder="john@marketing.com" className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all" /></div>
                  <div><label className="text-sm font-medium mb-2 block">Phone Number *</label><input type="tel" value={affiliateFormData.phone} onChange={(e) => setAffiliateFormData({ ...affiliateFormData, phone: e.target.value })} placeholder="+254712345678" className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all" /></div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Attach to Event *</label>
                    <select
                      value={affiliateFormData.eventId}
                      onChange={(e) => setAffiliateFormData({ ...affiliateFormData, eventId: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3c%2Fsvg%3E')] bg-[length:1rem] bg-[center_right_1rem] bg-no-repeat pr-12"
                    >
                      <option value="">Select an active event</option>
                      {activeEvents.map((event) => (
                        <option key={event.id} value={event.id}>{event.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3 pt-4"><button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl font-semibold hover:bg-secondary/80 transition-all">Cancel</button><button onClick={handleAddAffiliate} className="flex-1 px-4 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-[#8b5cf6]/30 transition-all">Add Affiliate</button></div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditModal && (selectedUser || selectedAffiliate) && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditModal(false)} className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card rounded-2xl border border-border p-6 z-50 shadow-2xl max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowEditModal(false)} className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-lg transition-colors"><X className="w-5 h-5" /></button>
              <h3 className="text-xl font-bold mb-6">{activeTab === "users" ? "Edit User" : "Edit Affiliate"}</h3>
              {activeTab === "users" ? (
                <div className="space-y-4">
                  <div><label className="text-sm font-medium mb-2 block">Full Name *</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all" /></div>
                  <div><label className="text-sm font-medium mb-2 block">Email Address *</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all" /></div>
                  <div><label className="text-sm font-medium mb-2 block">Phone Number *</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all" /></div>
                  <div><label className="text-sm font-medium mb-2 block">ID Number</label><input type="text" value={formData.idNumber} onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })} placeholder="12345678" className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all" /></div>
                  <div><label className="text-sm font-medium mb-2 block">Role *</label><div className="space-y-3">{(["COMPANY_OWNER", "STAFF"] as const).map((role) => { const RoleIcon = roleDetails[role].icon; return (<label key={role} className={cn("flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all", formData.role === role ? "border-[#8b5cf6] bg-[#8b5cf6]/5" : "border-border hover:border-[#8b5cf6]/50")}><input type="radio" name="role" value={role} checked={formData.role === role} onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })} className="mt-1" /><div className="flex-1"><div className="flex items-center gap-2 mb-1"><RoleIcon className={cn("w-4 h-4", roleDetails[role].color)} /><span className="font-semibold">{roleDetails[role].label}</span></div><p className="text-xs text-muted-foreground">{roleDetails[role].description}</p></div></label>)})}</div></div>
                  <div className="flex gap-3 pt-4"><button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl font-semibold hover:bg-secondary/80 transition-all">Cancel</button><button onClick={handleEditUser} className="flex-1 px-4 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-[#8b5cf6]/30 transition-all">Save Changes</button></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div><label className="text-sm font-medium mb-2 block">Full Name *</label><input type="text" value={affiliateFormData.name} onChange={(e) => setAffiliateFormData({ ...affiliateFormData, name: e.target.value })} className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all" /></div>
                  <div><label className="text-sm font-medium mb-2 block">Email Address *</label><input type="email" value={affiliateFormData.email} onChange={(e) => setAffiliateFormData({ ...affiliateFormData, email: e.target.value })} className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all" /></div>
                  <div><label className="text-sm font-medium mb-2 block">Phone Number *</label><input type="tel" value={affiliateFormData.phone} onChange={(e) => setAffiliateFormData({ ...affiliateFormData, phone: e.target.value })} className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all" /></div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Attach to Event *</label>
                    <select
                      value={affiliateFormData.eventId}
                      onChange={(e) => setAffiliateFormData({ ...affiliateFormData, eventId: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3c%2Fsvg%3E')] bg-[length:1rem] bg-[center_right_1rem] bg-no-repeat pr-12"
                    >
                      <option value="">Select an active event</option>
                      {activeEvents.map((event) => (
                        <option key={event.id} value={event.id}>{event.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3 pt-4"><button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl font-semibold hover:bg-secondary/80 transition-all">Cancel</button><button onClick={handleEditAffiliate} className="flex-1 px-4 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-[#8b5cf6]/30 transition-all">Save Changes</button></div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuspendModal && (selectedUser || selectedAffiliate) && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSuspendModal(false)} className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-2xl border border-border p-6 z-50 shadow-2xl">
              <button onClick={() => setShowSuspendModal(false)} className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-lg transition-colors"><X className="w-5 h-5" /></button>
              <h3 className="text-xl font-bold mb-4">
                {activeTab === "users"
                  ? (selectedUser?.active ? "Suspend User" : "Activate User")
                  : (selectedAffiliate?.status === "active" ? "Suspend Affiliate" : "Activate Affiliate")
                }
              </h3>
              <p className="text-muted-foreground mb-6">
                {activeTab === "users"
                  ? (selectedUser?.active
                    ? `Are you sure you want to suspend ${selectedUser?.fullName}? They will no longer be able to access the system.`
                    : `Are you sure you want to activate ${selectedUser?.fullName}? They will regain access to the system.`)
                  : (selectedAffiliate?.status === "active"
                    ? `Are you sure you want to suspend ${selectedAffiliate?.name}? Their affiliate links will no longer work.`
                    : `Are you sure you want to activate ${selectedAffiliate?.name}? Their affiliate links will become active.`)
                }
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowSuspendModal(false)} className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl font-semibold hover:bg-secondary/80 transition-all">Cancel</button>
                <button onClick={activeTab === "users" ? handleSuspendUser : handleSuspendAffiliate} className={cn("flex-1 px-4 py-3 rounded-xl font-semibold transition-all",
                  (activeTab === "users" ? selectedUser?.active : selectedAffiliate?.status === "active")
                    ? "bg-gradient-to-r from-red-600 to-red-700 text-white hover:shadow-lg hover:shadow-red-600/30"
                    : "bg-gradient-to-r from-green-600 to-green-700 text-white hover:shadow-lg hover:shadow-green-600/30"
                )}>Confirm</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Affiliate Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && selectedAffiliate && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !showOtpInput && setShowPaymentModal(false)} className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card rounded-2xl border border-border p-6 z-50 shadow-2xl">
              <button onClick={() => { setShowPaymentModal(false); setSelectedAffiliate(null); setPaymentAmount(""); setShowOtpInput(false); setOtpInput(""); }} className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-lg transition-colors"><X className="w-5 h-5" /></button>
              {!showOtpInput ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-[#8b5cf6]/10 flex items-center justify-center mx-auto mb-4">
                      <DollarSign className="w-8 h-8 text-[#8b5cf6]" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Pay Affiliate Commission</h3>
                    <p className="text-sm text-muted-foreground">Review and submit payment request for approval</p>
                  </div>

                  <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                    <h4 className="text-sm font-semibold mb-3">Payment Details</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Affiliate</span>
                        <span className="font-medium">{selectedAffiliate.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Email</span>
                        <span className="font-medium">{selectedAffiliate.email}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Sales</span>
                        <span className="font-medium">{selectedAffiliate.totalSales} tickets</span>
                      </div>
                      <div className="pt-2 border-t border-border flex justify-between">
                        <span className="font-semibold">Commission</span>
                        <span className="font-bold text-lg text-[#8b5cf6]">KES {Number(paymentAmount).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Payment Amount (KES)</label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] text-lg font-semibold"
                      placeholder="Enter amount"
                    />
                    <p className="text-xs text-muted-foreground mt-2">You can adjust the payment amount if needed</p>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => { setShowPaymentModal(false); setSelectedAffiliate(null); setPaymentAmount(""); }} className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl font-semibold hover:bg-secondary/80 transition-all">Cancel</button>
                    <button onClick={() => setShowOtpInput(true)} disabled={!paymentAmount || Number(paymentAmount) <= 0} className="flex-1 px-4 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-[#8b5cf6]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed">Submit Request</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-[#8b5cf6]/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-[#8b5cf6]" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Verify Payment Request</h3>
                    <p className="text-sm text-muted-foreground">Enter the OTP sent to your email to confirm</p>
                  </div>

                  <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Paying to</span>
                      <span className="font-medium">{selectedAffiliate.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Amount</span>
                      <span className="font-bold text-lg text-[#8b5cf6]">KES {Number(paymentAmount).toLocaleString()}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Enter OTP</label>
                    <input
                      type="text"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] text-center text-2xl font-bold tracking-widest"
                      placeholder="0000"
                      maxLength={4}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => { setShowOtpInput(false); setOtpInput(""); }} className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl font-semibold hover:bg-secondary/80 transition-all">Back</button>
                    <button onClick={handlePayAffiliate} disabled={otpInput.length !== 4} className="flex-1 px-4 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-[#8b5cf6]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed">Confirm Request</button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

