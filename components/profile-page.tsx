"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import {
  User,
  Mail,
  Phone,
  Building,
  Camera,
  Save,
  Shield,
  Bell,
  CreditCard,
  Edit2,
  Check,
  X,
  FileText,
  Download,
  Eye,
  CheckCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// Mock contracts data - replace with actual API data
const mockContracts = [
  {
    id: 1,
    title: "Event Organizer Master Agreement",
    description: "Primary agreement governing all events created on SoldOutAfrica platform",
    type: "master",
    status: "active",
    acceptedDate: "2024-03-15",
    effectiveDate: "2024-03-15",
    expiryDate: null,
    version: "2.1",
    documentUrl: "/contracts/master-agreement-v2.1.pdf",
  },
  {
    id: 2,
    title: "Summer Music Festival 2026 - Event Contract",
    description: "Specific agreement for Summer Music Festival 2026 event",
    type: "event",
    status: "active",
    eventId: 1,
    eventName: "Summer Music Festival 2026",
    acceptedDate: "2025-12-20",
    effectiveDate: "2026-01-01",
    expiryDate: "2026-03-01",
    version: "1.0",
    documentUrl: "/contracts/event-1-contract.pdf",
  },
  {
    id: 3,
    title: "Tech Conference Nairobi - Event Contract",
    description: "Specific agreement for Tech Conference Nairobi event",
    type: "event",
    status: "active",
    eventId: 2,
    eventName: "Tech Conference Nairobi",
    acceptedDate: "2025-12-28",
    effectiveDate: "2026-01-05",
    expiryDate: "2026-02-25",
    version: "1.0",
    documentUrl: "/contracts/event-2-contract.pdf",
  },
  {
    id: 4,
    title: "Data Processing Agreement",
    description: "Agreement for processing customer and attendee data",
    type: "dpa",
    status: "active",
    acceptedDate: "2024-03-15",
    effectiveDate: "2024-03-15",
    expiryDate: null,
    version: "1.5",
    documentUrl: "/contracts/dpa-v1.5.pdf",
  },
  {
    id: 5,
    title: "Payment Terms & Conditions",
    description: "Terms governing payment processing and payouts",
    type: "payment",
    status: "active",
    acceptedDate: "2024-03-15",
    effectiveDate: "2024-03-15",
    expiryDate: null,
    version: "3.0",
    documentUrl: "/contracts/payment-terms-v3.0.pdf",
  },
]

// Mock user data - replace with actual API data
const mockUserData = {
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  phone: "+254 712 345 678",
  company: "Event Masters Kenya",
  bio: "Passionate event organizer with over 5 years of experience creating memorable experiences across East Africa.",
  avatar: null,

  // Account settings
  emailNotifications: true,
  smsNotifications: false,
  marketingEmails: true,

  // Stats
  totalEvents: 12,
  totalRevenue: 2450000,
  totalTicketsSold: 3420,
  memberSince: "2024-03-15",
}

type TabType = "profile" | "security" | "notifications" | "billing" | "legal"

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<TabType>("profile")
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Form states
  const [formData, setFormData] = useState(mockUserData)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const handleSaveProfile = async () => {
    setIsSaving(true)

    // Simulate API call
    setTimeout(() => {
      toast.success("Profile updated successfully!")
      setIsEditing(false)
      setIsSaving(false)
    }, 1000)
  }

  const handleCancelEdit = () => {
    setFormData(mockUserData)
    setIsEditing(false)
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    setIsSaving(true)

    // Simulate API call
    setTimeout(() => {
      toast.success("Password changed successfully!")
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
      setIsSaving(false)
    }, 1000)
  }

  const handleNotificationToggle = (key: keyof typeof formData) => {
    setFormData(prev => ({
      ...prev,
      [key]: !prev[key],
    }))
    toast.success("Notification settings updated")
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 sm:mb-8"
      >
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">My Profile</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-4"
        >
          <div className="rounded-2xl border border-border bg-card p-6">
            {/* Avatar */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] flex items-center justify-center text-white font-bold text-3xl">
                  {formData.firstName.charAt(0)}{formData.lastName.charAt(0)}
                </div>
                <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#8b5cf6] text-white flex items-center justify-center hover:bg-[#7c3aed] transition-colors">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <h3 className="text-xl font-bold">{formData.firstName} {formData.lastName}</h3>
              <p className="text-sm text-muted-foreground">{formData.email}</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>Member since {new Date(formData.memberSince).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-3 pt-6 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Events</span>
                <span className="font-semibold">{formData.totalEvents}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tickets Sold</span>
                <span className="font-semibold">{formData.totalTicketsSold.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Revenue</span>
                <span className="font-semibold">KES {formData.totalRevenue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-8"
        >
          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
            {[
              { label: "Profile", value: "profile" as TabType, icon: User },
              { label: "Security", value: "security" as TabType, icon: Shield },
              { label: "Notifications", value: "notifications" as TabType, icon: Bell },
              { label: "Billing", value: "billing" as TabType, icon: CreditCard },
              { label: "Legal", value: "legal" as TabType, icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 whitespace-nowrap",
                    activeTab === tab.value
                      ? "bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white shadow-lg shadow-[#8b5cf6]/25"
                      : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-[#8b5cf6]/30"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Tab Content */}
          <div className="rounded-2xl border border-border bg-card p-6">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Personal Information</h2>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit Profile
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancelEdit}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-secondary transition-colors text-sm font-medium"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all text-sm font-medium disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {isSaving ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">First Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        disabled={!isEditing}
                        className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Last Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        disabled={!isEditing}
                        className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        disabled={!isEditing}
                        className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        disabled={!isEditing}
                        className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Company</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        disabled={!isEditing}
                        className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Bio</label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    disabled={!isEditing}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold mb-6">Change Password</h2>

                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Current Password</label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">New Password</label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all disabled:opacity-50"
                  >
                    {isSaving ? "Updating..." : "Update Password"}
                  </button>
                </form>

                <div className="pt-6 border-t border-border">
                  <h3 className="text-lg font-semibold mb-4">Two-Factor Authentication</h3>
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-secondary/50">
                    <Shield className="w-5 h-5 text-[#8b5cf6] flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium mb-1">Secure your account</p>
                      <p className="text-sm text-muted-foreground mb-3">
                        Add an extra layer of security to your account by enabling two-factor authentication.
                      </p>
                      <button className="px-4 py-2 bg-[#8b5cf6] text-white rounded-lg text-sm font-medium hover:bg-[#7c3aed] transition-colors">
                        Enable 2FA
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold mb-6">Notification Preferences</h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">Email Notifications</h3>
                      <p className="text-sm text-muted-foreground">
                        Receive email updates about your events and ticket sales
                      </p>
                    </div>
                    <button
                      onClick={() => handleNotificationToggle("emailNotifications")}
                      className={cn(
                        "relative w-14 h-7 rounded-full transition-colors",
                        formData.emailNotifications ? "bg-[#8b5cf6]" : "bg-secondary"
                      )}
                    >
                      <div
                        className={cn(
                          "absolute top-1 w-5 h-5 rounded-full bg-white transition-transform shadow-sm",
                          formData.emailNotifications ? "translate-x-8" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">SMS Notifications</h3>
                      <p className="text-sm text-muted-foreground">
                        Get text messages for important updates and alerts
                      </p>
                    </div>
                    <button
                      onClick={() => handleNotificationToggle("smsNotifications")}
                      className={cn(
                        "relative w-14 h-7 rounded-full transition-colors",
                        formData.smsNotifications ? "bg-[#8b5cf6]" : "bg-secondary"
                      )}
                    >
                      <div
                        className={cn(
                          "absolute top-1 w-5 h-5 rounded-full bg-white transition-transform shadow-sm",
                          formData.smsNotifications ? "translate-x-8" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">Marketing Emails</h3>
                      <p className="text-sm text-muted-foreground">
                        Receive tips, offers, and news about SoldOutAfrica
                      </p>
                    </div>
                    <button
                      onClick={() => handleNotificationToggle("marketingEmails")}
                      className={cn(
                        "relative w-14 h-7 rounded-full transition-colors",
                        formData.marketingEmails ? "bg-[#8b5cf6]" : "bg-secondary"
                      )}
                    >
                      <div
                        className={cn(
                          "absolute top-1 w-5 h-5 rounded-full bg-white transition-transform shadow-sm",
                          formData.marketingEmails ? "translate-x-8" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === "billing" && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold mb-6">Billing Information</h2>

                <div className="p-6 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] text-white">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm opacity-90 mb-1">Total Revenue</p>
                      <p className="text-3xl font-bold">KES {formData.totalRevenue.toLocaleString()}</p>
                    </div>
                    <CreditCard className="w-8 h-8 opacity-80" />
                  </div>
                  <p className="text-sm opacity-90">
                    From {formData.totalEvents} events • {formData.totalTicketsSold.toLocaleString()} tickets sold
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Payment Methods</h3>
                  <div className="p-4 rounded-xl border border-border flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-[#8b5cf6]" />
                      </div>
                      <div>
                        <p className="font-semibold">M-Pesa</p>
                        <p className="text-sm text-muted-foreground">+254 712 *** 678</p>
                      </div>
                    </div>
                    <button className="text-sm text-[#8b5cf6] hover:underline font-medium">
                      Edit
                    </button>
                  </div>

                  <button className="w-full p-4 rounded-xl border-2 border-dashed border-border hover:border-[#8b5cf6] hover:bg-[#8b5cf6]/5 transition-all text-muted-foreground hover:text-[#8b5cf6] font-medium">
                    + Add Payment Method
                  </button>
                </div>
              </div>
            )}

            {/* Legal Tab */}
            {activeTab === "legal" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold">Legal Documents & Contracts</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      View and manage your contracts and agreements with SoldOutAfrica
                    </p>
                  </div>
                </div>

                {/* Active Contracts Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {mockContracts.filter(c => c.status === "active").length}
                        </p>
                        <p className="text-xs text-muted-foreground">Active Agreements</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-gradient-to-br from-[#8b5cf6]/10 to-[#7c3aed]/10 border border-[#8b5cf6]/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#8b5cf6]/20 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-[#8b5cf6]" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-[#8b5cf6]">{mockContracts.length}</p>
                        <p className="text-xs text-muted-foreground">Total Documents</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contracts List */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Your Contracts</h3>

                  {mockContracts.map((contract) => (
                    <div
                      key={contract.id}
                      className="p-4 rounded-xl border border-border bg-card transition-all duration-200 hover:shadow-md"
                    >
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Icon */}
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed]">
                            <FileText className="w-6 h-6 text-white" />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-base mb-1">{contract.title}</h4>
                              <p className="text-sm text-muted-foreground">{contract.description}</p>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900 text-xs font-medium whitespace-nowrap">
                              <CheckCircle className="w-3 h-3" />
                              Active
                            </div>
                          </div>

                          {/* Event Name (for event contracts) */}
                          {contract.type === "event" && contract.eventName && (
                            <div className="mb-2">
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary text-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]"></span>
                                {contract.eventName}
                              </span>
                            </div>
                          )}

                          {/* Metadata */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-muted-foreground mb-3">
                            <div>
                              <p className="mb-0.5">Version</p>
                              <p className="font-medium text-foreground">{contract.version}</p>
                            </div>
                            {contract.acceptedDate && (
                              <div>
                                <p className="mb-0.5">Accepted Date</p>
                                <p className="font-medium text-foreground">
                                  {new Date(contract.acceptedDate).toLocaleDateString()}
                                </p>
                              </div>
                            )}
                            {contract.effectiveDate && (
                              <div>
                                <p className="mb-0.5">Effective</p>
                                <p className="font-medium text-foreground">
                                  {new Date(contract.effectiveDate).toLocaleDateString()}
                                </p>
                              </div>
                            )}
                            {contract.expiryDate && (
                              <div>
                                <p className="mb-0.5">Expires</p>
                                <p className="font-medium text-foreground">
                                  {new Date(contract.expiryDate).toLocaleDateString()}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => {
                                toast.success("Opening document...")
                                // window.open(contract.documentUrl, '_blank')
                              }}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#8b5cf6] text-white text-xs font-medium hover:bg-[#7c3aed] transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </button>
                            <button
                              onClick={() => {
                                toast.success("Downloading document...")
                                // Trigger download
                              }}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-secondary text-xs font-medium transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Legal Notice */}
                <div className="mt-6 p-4 rounded-xl bg-secondary/50 border border-border">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-[#8b5cf6] flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-1 text-sm">Consent by Use</h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        By continuing to use SoldOutAfrica's services, you automatically agree to and accept all terms and conditions outlined in these documents.
                        No signature is required. Please review all agreements to understand your rights and obligations.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        If you have any questions, contact our legal team at legal@soldoutafrica.com. All documents are stored securely and comply with data protection regulations.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

