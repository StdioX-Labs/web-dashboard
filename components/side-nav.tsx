"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Home, Calendar, Megaphone, Users, LogOut, X, Menu, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

type NavItem = {
  name: string
  icon: React.ElementType
  href: string
}

const navItems: NavItem[] = [
  { name: "Home", icon: Home, href: "/dashboard" },
  { name: "Events", icon: Calendar, href: "/dashboard/events" },
  { name: "Promotions", icon: Megaphone, href: "/dashboard/promotions" },
  { name: "Users", icon: Users, href: "/dashboard/users" },
]

// Mock user data - replace with actual user data
const user = {
  name: "John Doe",
  email: "john@example.com",
  avatar: "/placeholder-user.jpg",
}

type NavContentProps = {
  isCollapsed: boolean
  setIsCollapsed: (value: boolean) => void
  setIsMobileOpen: (value: boolean) => void
}

function NavContent({ isCollapsed, setIsCollapsed, setIsMobileOpen }: NavContentProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Logo Section - Always visible */}
      <div className="p-4 sm:p-6 border-b border-border flex items-center justify-center relative">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center w-full"
        >
          <Image
            src="/soldoutafrica-black.png"
            alt="SoldOutAfrica"
            width={isCollapsed ? 36 : 180}
            height={isCollapsed ? 36 : 41}
            className={cn("transition-all duration-300 dark:invert", isCollapsed ? "h-9 w-9 object-contain" : "h-8 sm:h-10 w-auto")}
            priority
          />
        </motion.div>

        {/* Sleek Expand/Collapse Button - Desktop only, subtle but visible */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted hover:bg-[#8b5cf6] text-muted-foreground hover:text-white items-center justify-center transition-all duration-200 hover:scale-105 z-10"
        >
          {isCollapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>

        {/* Mobile Close Button */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-3 sm:p-4 space-y-1 sm:space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              title={isCollapsed ? item.name : undefined}
              className={cn(
                "relative flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white shadow-lg shadow-[#8b5cf6]/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                isCollapsed && "justify-center"
              )}
            >
              <div className="relative z-10 flex items-center gap-3">
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="font-medium text-sm sm:text-base">
                    {item.name}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* User Profile & Logout */}
      <div className="p-3 sm:p-4 border-t border-border space-y-2">
        {/* User Profile */}
        <Link
          href="/dashboard/profile"
          onClick={() => setIsMobileOpen(false)}
          title={isCollapsed ? 'Profile' : undefined}
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors",
            isCollapsed && "justify-center"
          )}
        >
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] flex items-center justify-center text-white font-bold text-sm sm:text-base">
              {user.name.charAt(0)}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-card rounded-full" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          )}
        </Link>

        {/* Logout Button */}
        <button
          onClick={() => {
            setIsMobileOpen(false)
            console.log("Logout clicked")
            // TODO: Implement logout logic
          }}
          title={isCollapsed ? 'Logout' : undefined}
          className={cn(
            "w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
            isCollapsed && "justify-center"
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium text-sm sm:text-base">Logout</span>}
        </button>
      </div>
    </>
  )
}

export default function SideNav() {
  const [isCollapsed, setIsCollapsed] = useState(true) // Default to collapsed
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile Menu Button - Only show when menu is closed */}
      {!isMobileOpen && (
        <button
          onClick={() => setIsMobileOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-card border border-border shadow-lg hover:bg-secondary transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      )}

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={cn(
          "hidden lg:flex h-screen bg-card border-r border-border flex-col transition-all duration-300",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <NavContent
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          setIsMobileOpen={setIsMobileOpen}
        />
      </motion.div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="lg:hidden fixed left-0 top-0 h-screen w-72 bg-card border-r border-border flex flex-col z-50 shadow-2xl overflow-hidden"
          >
            <NavContent
              isCollapsed={false}
              setIsCollapsed={setIsCollapsed}
              setIsMobileOpen={setIsMobileOpen}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

