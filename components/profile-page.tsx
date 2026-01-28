"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { User, Mail, Phone, Building, Briefcase, Globe } from "lucide-react"
import { sessionManager } from "@/lib/session-manager"

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const userData = sessionManager.getUser()
    setUser(userData)
  }, [])

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 sm:p-6 lg:p-8 pt-20 sm:pt-24 lg:pt-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] bg-clip-text text-transparent">
            Profile
          </h1>
          <p className="text-muted-foreground">Your account information</p>
        </motion.div>

        {/* User Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] p-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-2xl border-2 border-white/30">
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="text-white">
                <h2 className="text-2xl font-bold mb-1">User Details</h2>
                <p className="text-white/80 text-sm">Personal information</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-secondary/50">
              <Mail className="w-5 h-5 text-[#8b5cf6] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Email</p>
                <p className="font-semibold">{user.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-secondary/50">
              <Phone className="w-5 h-5 text-[#8b5cf6] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Phone Number</p>
                <p className="font-semibold">{user.phoneNumber}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-secondary/50">
              <Briefcase className="w-5 h-5 text-[#8b5cf6] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Role</p>
                <p className="font-semibold capitalize">{user.role}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-secondary/50">
              <Globe className="w-5 h-5 text-[#8b5cf6] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Currency</p>
                <p className="font-semibold">{user.currency}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-secondary/50">
              <User className="w-5 h-5 text-[#8b5cf6] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Account Status</p>
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                  user.is_active 
                    ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                }`}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Company Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] p-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white border-2 border-white/30">
                <Building className="w-10 h-10" />
              </div>
              <div className="text-white">
                <h2 className="text-2xl font-bold mb-1">Company Details</h2>
                <p className="text-white/80 text-sm">Organization information</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">

            <div className="flex items-start gap-4 p-4 rounded-xl bg-secondary/50">
              <Building className="w-5 h-5 text-[#7c3aed] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Company Name</p>
                <p className="font-semibold text-lg">{user.company_name}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

