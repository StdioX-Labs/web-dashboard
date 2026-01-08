"use client"

import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mail, ArrowRight, Calendar, Ticket, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"

type AuthMode = "signin" | "signup"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [mode, setMode] = useState<AuthMode>("signin")
  const [isFocused, setIsFocused] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [touched, setTouched] = useState(false)
  const [cursorType, setCursorType] = useState<"default" | "pointer" | "text">("default")
  const inputRef = useRef<HTMLInputElement>(null)

  // OTP state
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [otp, setOtp] = useState("")
  const [otpError, setOtpError] = useState("")
  const [otpTouched, setOtpTouched] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const otpInputRef = useRef<HTMLInputElement>(null)

  // Update cursor style
  useEffect(() => {
    document.body.style.cursor = cursorType
    return () => {
      document.body.style.cursor = "default"
    }
  }, [cursorType])

  // Email validation function
  const validateEmail = (email: string): boolean => {
    if (!email) {
      setEmailError("Email is required")
      return false
    }

    // Comprehensive email regex pattern
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address")
      return false
    }

    // Additional checks
    if (email.length > 254) {
      setEmailError("Email address is too long")
      return false
    }

    const [localPart, domain] = email.split("@")

    if (localPart.length > 64) {
      setEmailError("Email address is invalid")
      return false
    }

    if (domain.split(".").some(part => part.length > 63)) {
      setEmailError("Email domain is invalid")
      return false
    }

    setEmailError("")
    return true
  }

  // Handle email change with validation
  const handleEmailChange = (value: string) => {
    setEmail(value)
    if (touched) {
      validateEmail(value)
    }
  }

  // Handle blur to show validation
  const handleBlur = () => {
    setIsFocused(false)
    setTouched(true)
    validateEmail(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)

    if (!validateEmail(email)) {
      return
    }

    setIsSubmitting(true)

    // Simulate API call to send OTP
    await new Promise((resolve) => setTimeout(resolve, 1500))

    if (mode === "signin") {
      // For sign in, show OTP input
      setShowOtpInput(true)
      setIsSubmitting(false)
      // Focus on OTP input
      setTimeout(() => otpInputRef.current?.focus(), 100)
    } else {
      // For sign up, proceed with registration
      setIsSubmitting(false)
      console.log(`Sign up with email:`, email)
      // TODO: Implement sign up flow
    }
  }

  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    setOtpTouched(true)

    if (!otp || otp.length !== 4) {
      setOtpError("Please enter a valid 4-digit OTP")
      return
    }

    setIsVerifyingOtp(true)

    // Simulate API call to verify OTP
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Test OTP verification - only "0000" is valid
    if (otp === "0000") {
      console.log(`OTP verified successfully for email:`, email)
      // Redirect to dashboard
      window.location.href = "/dashboard"
    } else {
      setOtpError("Invalid OTP. Please try again.")
      setIsVerifyingOtp(false)
    }
  }

  const handleOtpChange = (value: string) => {
    // Only allow numbers and max 4 digits
    const numericValue = value.replace(/\D/g, "").slice(0, 4)
    setOtp(numericValue)

    if (otpTouched) {
      if (!numericValue) {
        setOtpError("OTP is required")
      } else if (numericValue.length !== 4) {
        setOtpError("OTP must be 4 digits")
      } else {
        setOtpError("")
      }
    }
  }

  const handleResendOtp = async () => {
    setIsSubmitting(true)
    // Simulate API call to resend OTP
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSubmitting(false)
    setOtp("")
    setOtpError("")
    setOtpTouched(false)
    console.log(`Resent OTP to:`, email)
  }

  const handleBackToEmail = () => {
    setShowOtpInput(false)
    setOtp("")
    setOtpError("")
    setOtpTouched(false)
  }

  return (
    <div className="h-screen bg-background text-foreground overflow-hidden relative">
      {/* Enhanced animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute inset-0 opacity-20"
          animate={{
            background: [
              "radial-gradient(circle at 20% 30%, hsl(0 0% 40% / 0.12) 0%, transparent 40%), radial-gradient(circle at 80% 70%, hsl(0 0% 30% / 0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 40%, hsl(0 0% 35% / 0.12) 0%, transparent 40%), radial-gradient(circle at 20% 80%, hsl(0 0% 25% / 0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 50% 50%, hsl(0 0% 30% / 0.12) 0%, transparent 40%), radial-gradient(circle at 50% 90%, hsl(0 0% 35% / 0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 20% 30%, hsl(0 0% 40% / 0.12) 0%, transparent 40%), radial-gradient(circle at 80% 70%, hsl(0 0% 30% / 0.1) 0%, transparent 50%)",
            ],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        {/* Floating orbs - smaller */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-foreground/5 blur-3xl"
          animate={{
            x: [0, 80, 0],
            y: [0, -40, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/3 w-56 h-56 rounded-full bg-foreground/5 blur-3xl"
          animate={{
            x: [0, -60, 0],
            y: [0, 60, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative z-10 h-full flex items-center justify-center">
        {/* Main container with max-width for large monitors */}
        <div className="w-full max-w-[1920px] h-full flex">
          {/* Left side - Branding - Properly sized to fit */}
          <div
            className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-16 2xl:px-24 relative"
            onMouseEnter={() => setCursorType("default")}
          >
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Logo - Bigger for desktop */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Image
                  src="/soldoutafrica-white.png"
                  alt="SoldOutAfrica"
                  width={340}
                  height={77}
                  className="h-20 xl:h-24 w-auto rounded-2xl"
                  priority
                  style={{ filter: 'none' }}
                />
              </motion.div>

              {/* Main heading - Clean and minimal */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <motion.h1
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-5xl xl:text-6xl 2xl:text-7xl leading-[1.05] pt-8 xl:pt-12 2xl:pt-16"
                    style={{
                      fontFamily: "'MontserratAlt1', sans-serif",
                      fontWeight: 200,
                      letterSpacing: '-0.02em'
                    }}
                  >
                    Your events,
                    <br />
                    simplified.
                  </motion.h1>
                </div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="text-base xl:text-lg 2xl:text-xl text-muted-foreground leading-relaxed max-w-lg"
                >
                  Everything you need to create, manage, and scale your events—all in one place.
                </motion.p>
              </motion.div>

              {/* Stats - Elegant card design that fits container */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="grid grid-cols-3 gap-3 xl:gap-4 py-2 max-w-lg"
              >
                {[
                  { label: "Events", value: "100+", Icon: Calendar },
                  { label: "Tickets", value: "100K+", Icon: Ticket },
                  { label: "Rating", value: "99%", Icon: TrendingUp },
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                    whileHover={{ y: -2, scale: 1.02 }}
                    className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm p-3 xl:p-4 hover:border-[#8b5cf6]/30 transition-all duration-300"
                  >
                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#8b5cf6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="relative flex flex-col items-center justify-center text-center space-y-1">
                      <div className="w-8 h-8 xl:w-9 xl:h-9 rounded-lg bg-[#8b5cf6]/10 flex items-center justify-center group-hover:bg-[#8b5cf6]/20 transition-colors">
                        <stat.Icon className="w-4 h-4 xl:w-5 xl:h-5 text-[#8b5cf6]" />
                      </div>
                      <div className="text-lg xl:text-xl 2xl:text-2xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                        {stat.value}
                      </div>
                      <div className="text-[9px] xl:text-[10px] 2xl:text-xs text-muted-foreground uppercase tracking-wider leading-tight">
                        {stat.label}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Footer text */}

            </div>
          </div>

          {/* Right side - Auth Form - Sleeker design */}
          <div
            className="w-full lg:w-1/2 flex items-center justify-center px-6 lg:px-12 xl:px-16 2xl:px-24"
            onMouseEnter={() => setCursorType("default")}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="w-full max-w-md xl:max-w-lg"
            >
            {/* Mobile Logo - Circular container with black background */}
            <div className="lg:hidden mb-10 text-center">
              <div className="inline-flex items-center justify-center w-40 h-40 rounded-full bg-foreground p-8">
                <Image
                  src="/soldoutafrica-black.png"
                  alt="SoldOutAfrica"
                  width={320}
                  height={72}
                  className="w-full h-auto invert"
                  priority
                />
              </div>
            </div>

            {/* Auth card - Sleeker styling with increased height */}
            <div className="relative">
              {/* Subtle gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.03] to-foreground/[0.06] rounded-3xl" />
              <div className="absolute inset-[1px] bg-background rounded-3xl" />

              <div className="relative px-6 py-16 sm:px-8 sm:py-20 xl:px-10 xl:py-24 2xl:px-12 2xl:py-28">
                {/* Mode switcher - Sleeker thinner tabs with centered text */}
                <div
                  className="flex gap-1 p-1 bg-secondary/50 rounded-2xl mb-10"
                  onMouseEnter={() => setCursorType("pointer")}
                  onMouseLeave={() => setCursorType("default")}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signin")
                      // Reset OTP state when switching modes
                      setShowOtpInput(false)
                      setOtp("")
                      setOtpError("")
                      setOtpTouched(false)
                    }}
                    className={cn(
                      "flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 text-center",
                      mode === "signin"
                        ? "bg-foreground text-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup")
                      // Reset OTP state when switching modes
                      setShowOtpInput(false)
                      setOtp("")
                      setOtpError("")
                      setOtpTouched(false)
                    }}
                    className={cn(
                      "flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 text-center",
                      mode === "signup"
                        ? "bg-foreground text-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Sign Up
                  </button>
                </div>

                {/* Form heading - Centered */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={showOtpInput ? "otp" : mode}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="mb-10 text-center"
                  >
                    <h2 className="text-3xl sm:text-4xl font-bold mb-3">
                      {showOtpInput 
                        ? "Enter verification code" 
                        : mode === "signin" 
                        ? "Welcome back" 
                        : "Get started"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {showOtpInput
                        ? `We've sent a 4-digit code to ${email}`
                        : mode === "signin"
                        ? "Enter your email to access your dashboard"
                        : "Enter your email to create your account"}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* Conditional Form - Email or OTP */}
                <AnimatePresence mode="wait">
                  {!showOtpInput ? (
                    // Email Input Form
                    <motion.form
                      key="email-form"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      onSubmit={handleSubmit}
                      className="space-y-6"
                    >
                      <div>
                        <div
                          className="relative"
                          onMouseEnter={() => setCursorType("text")}
                          onMouseLeave={() => setCursorType("default")}
                        >
                          <input
                            ref={inputRef}
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => handleEmailChange(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={handleBlur}
                            placeholder="you@example.com"
                            className={cn(
                              "w-full h-12 px-4 pl-11 rounded-xl border bg-background",
                              "transition-all duration-200 outline-none text-sm",
                              "placeholder:text-muted-foreground text-center",
                              emailError && touched
                                ? "border-destructive ring-4 ring-destructive/10"
                                : isFocused
                                ? "border-[#8b5cf6] ring-4 ring-[#8b5cf6]/10"
                                : "border-border hover:border-[#8b5cf6]/30"
                            )}
                            aria-invalid={!!emailError && touched}
                            aria-describedby={emailError && touched ? "email-error" : undefined}
                          />
                          <Mail
                            className={cn(
                              "absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors pointer-events-none",
                              emailError && touched
                                ? "text-destructive"
                                : isFocused
                                ? "text-[#8b5cf6]"
                                : "text-muted-foreground"
                            )}
                          />
                        </div>

                        {/* Error message */}
                        <AnimatePresence mode="wait">
                          {emailError && touched && (
                            <motion.p
                              id="email-error"
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                              className="text-xs text-destructive mt-2 text-center"
                              role="alert"
                            >
                              {emailError}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Submit button */}
                      <motion.button
                        type="submit"
                        disabled={isSubmitting || !email || (touched && !!emailError)}
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onMouseEnter={() => setCursorType("pointer")}
                        onMouseLeave={() => setCursorType("default")}
                        className={cn(
                          "relative w-full h-12 px-6 rounded-xl font-semibold text-sm overflow-hidden",
                          "flex items-center justify-center gap-2",
                          "transition-all duration-300",
                          "bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white",
                          "hover:shadow-lg hover:shadow-[#8b5cf6]/25",
                          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:y-0"
                        )}
                      >
                        {/* Shimmer effect on hover */}
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                        {isSubmitting ? (
                          <>
                            <motion.div
                              className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            <span>Sending code...</span>
                          </>
                        ) : (
                          <>
                            <span>{mode === "signin" ? "Continue" : "Create account"}</span>
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </motion.button>
                    </motion.form>
                  ) : (
                    // OTP Input Form
                    <motion.form
                      key="otp-form"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      onSubmit={handleOtpVerification}
                      className="space-y-6"
                    >
                      <div>
                        <div
                          className="relative"
                          onMouseEnter={() => setCursorType("text")}
                          onMouseLeave={() => setCursorType("default")}
                        >
                          <input
                            ref={otpInputRef}
                            id="otp"
                            type="text"
                            inputMode="numeric"
                            value={otp}
                            onChange={(e) => handleOtpChange(e.target.value)}
                            onFocus={() => setOtpTouched(true)}
                            placeholder="0000"
                            maxLength={4}
                            className={cn(
                              "w-full h-14 px-4 rounded-xl border bg-background",
                              "transition-all duration-200 outline-none text-2xl font-bold",
                              "placeholder:text-muted-foreground text-center tracking-widest",
                              otpError && otpTouched
                                ? "border-destructive ring-4 ring-destructive/10"
                                : "border-[#8b5cf6] ring-4 ring-[#8b5cf6]/10"
                            )}
                            aria-invalid={!!otpError && otpTouched}
                            aria-describedby={otpError && otpTouched ? "otp-error" : undefined}
                          />
                        </div>

                        {/* Error message */}
                        <AnimatePresence mode="wait">
                          {otpError && otpTouched && (
                            <motion.p
                              id="otp-error"
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                              className="text-xs text-destructive mt-2 text-center"
                              role="alert"
                            >
                              {otpError}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Verify button */}
                      <motion.button
                        type="submit"
                        disabled={isVerifyingOtp || otp.length !== 4}
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onMouseEnter={() => setCursorType("pointer")}
                        onMouseLeave={() => setCursorType("default")}
                        className={cn(
                          "relative w-full h-12 px-6 rounded-xl font-semibold text-sm overflow-hidden",
                          "flex items-center justify-center gap-2",
                          "transition-all duration-300",
                          "bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white",
                          "hover:shadow-lg hover:shadow-[#8b5cf6]/25",
                          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:y-0"
                        )}
                      >
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                        {isVerifyingOtp ? (
                          <>
                            <motion.div
                              className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <span>Verify & Login</span>
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </motion.button>

                      {/* Resend and Back buttons */}
                      <div className="flex items-center justify-center gap-4 text-sm">
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={isSubmitting}
                          onMouseEnter={() => setCursorType("pointer")}
                          onMouseLeave={() => setCursorType("default")}
                          className="text-muted-foreground hover:text-[#8b5cf6] transition-colors disabled:opacity-50"
                        >
                          Resend code
                        </button>
                        <span className="text-muted-foreground">•</span>
                        <button
                          type="button"
                          onClick={handleBackToEmail}
                          onMouseEnter={() => setCursorType("pointer")}
                          onMouseLeave={() => setCursorType("default")}
                          className="text-muted-foreground hover:text-[#8b5cf6] transition-colors"
                        >
                          Change email
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </div>

              {/* Mobile footer - Only visible on mobile */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="text-xs text-muted-foreground text-center mt-12 lg:hidden"
              >
                © 2026 SoldOutAfrica. All rights reserved.
              </motion.p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

