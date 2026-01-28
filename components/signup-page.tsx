"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { User, Mail, Phone, Lock, Building, Loader2, ArrowRight, CheckCircle, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api-client"
import { sessionManager } from "@/lib/session-manager"

type SignupStep = "user" | "company" | "success"

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<SignupStep>("user")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // User form data
  const [fullName, setFullName] = useState("")
  const [idNumber, setIdNumber] = useState("")
  const [mobileNumber, setMobileNumber] = useState("")
  const [emailAddress, setEmailAddress] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Company form data
  const [companyName, setCompanyName] = useState("")
  const [companyPhone, setCompanyPhone] = useState("")
  const [companyEmail, setCompanyEmail] = useState("")
  const [physicalAddress, setPhysicalAddress] = useState("")
  const [postalAddress, setPostalAddress] = useState("")
  const [currency, setCurrency] = useState("KES")

  // Format phone number to 254XXXXXXXXX format
  const formatPhoneNumber = (input: string): string => {
    // Remove all non-digit characters
    let cleaned = input.replace(/\D/g, '')

    // If starts with 0, replace with 254
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1)
    }

    // If doesn't start with 254, add it
    if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned
    }

    return cleaned
  }

  const validateUserForm = (): boolean => {
    if (!fullName.trim()) {
      toast.error("Please enter your full name")
      return false
    }

    if (!idNumber.trim()) {
      toast.error("Please enter your ID number")
      return false
    }

    if (!mobileNumber.trim()) {
      toast.error("Please enter your mobile number")
      return false
    }

    const formattedPhone = formatPhoneNumber(mobileNumber)
    if (formattedPhone.length < 12) {
      toast.error("Please enter a valid mobile number")
      return false
    }

    if (!emailAddress.trim()) {
      toast.error("Please enter your email address")
      return false
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) {
      toast.error("Please enter a valid email address")
      return false
    }

    if (!password) {
      toast.error("Please enter a password")
      return false
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long")
      return false
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      return false
    }

    return true
  }

  const validateCompanyForm = (): boolean => {
    if (!companyName.trim()) {
      toast.error("Please enter your company name")
      return false
    }

    if (!companyPhone.trim()) {
      toast.error("Please enter your company phone number")
      return false
    }

    const formattedPhone = formatPhoneNumber(companyPhone)
    if (formattedPhone.length < 12) {
      toast.error("Please enter a valid company phone number")
      return false
    }

    if (!companyEmail.trim()) {
      toast.error("Please enter your company email address")
      return false
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyEmail)) {
      toast.error("Please enter a valid company email address")
      return false
    }

    return true
  }

  const handleUserFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateUserForm()) return

    // Move to company form step first
    setStep("company")
  }

  const handleCompanyFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateCompanyForm()) return

    setIsSubmitting(true)

    try {
      // Step 1: Create company first
      const companyData = {
        companyName: companyName,
        physicalAddress: physicalAddress || "PENDING",
        postalAddress: postalAddress || "PENDING",
        phoneNumber: formatPhoneNumber(companyPhone),
        emailAddress: companyEmail,
        currency: currency,
        profileType: "EVENT_ORGANIZER",
        billingAccountType: "MPESA",
        bio: "Company description here",
        profilePhoto: "https://example.com/photo.jpg",
        legalDocuments: "https://example.com/docs.pdf"
      }

      console.log("Step 1: Creating company with data:", companyData)

      const companyResponse = await api.company.create(companyData)

      console.log("Company creation response:", companyResponse)

      if (!companyResponse.status || !companyResponse.company) {
        toast.error(companyResponse.message || "Failed to create company")
        setIsSubmitting(false)
        return
      }

      toast.success("Company created successfully!")
      const companyId = companyResponse.company.id

      // Step 2: Create user with the company ID from step 1
      const userData = {
        fullName,
        idNumber,
        mobileNumber: formatPhoneNumber(mobileNumber),
        password,
        emailAddress,
        isExternal: false,
        company: { id: companyId },
        roles: "COMPANY_OWNER",
      }

      console.log("Step 2: Creating user with data:", userData)

      const userResponse = await api.user.create(userData)

      console.log("User creation response:", userResponse)

      if (userResponse.status && userResponse.user) {
        toast.success("User account created successfully!")

        // Create session with the user data
        sessionManager.createSession({
          phoneNumber: userResponse.user.phoneNumber,
          role: userResponse.user.role,
          is_active: userResponse.user.is_active,
          kycStatus: userResponse.user.kycStatus,
          profile_type: userResponse.user.profile_type,
          company_id: userResponse.user.company_id,
          user_id: userResponse.user.user_id,
          company_name: userResponse.user.company_name,
          currency: currency,
          email: userResponse.user.email,
        })

        setStep("success")

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push("/dashboard")
        }, 2000)
      } else {
        toast.error(userResponse.message || "Failed to create user account")
        setIsSubmitting(false)
      }
    } catch (error) {
      console.error("Signup error:", error)
      toast.error("An error occurred during signup")
      setIsSubmitting(false)
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] bg-clip-text text-transparent mb-2">
            SoldOut Africa
          </h1>
          <p className="text-muted-foreground">Create your account</p>
        </motion.div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8 gap-2">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            step === "user" || step === "company" || step === "success"
              ? "bg-[#8b5cf6] text-white"
              : "bg-secondary text-muted-foreground"
          }`}>
            {step === "success" ? <CheckCircle className="w-4 h-4" /> : "1"}
          </div>
          <div className={`h-0.5 w-12 ${
            step === "company" || step === "success" ? "bg-[#8b5cf6]" : "bg-secondary"
          }`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            step === "company" || step === "success"
              ? "bg-[#8b5cf6] text-white"
              : "bg-secondary text-muted-foreground"
          }`}>
            {step === "success" ? <CheckCircle className="w-4 h-4" /> : "2"}
          </div>
          <div className={`h-0.5 w-12 ${
            step === "success" ? "bg-[#8b5cf6]" : "bg-secondary"
          }`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            step === "success"
              ? "bg-[#8b5cf6] text-white"
              : "bg-secondary text-muted-foreground"
          }`}>
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-card border border-border rounded-2xl p-6 shadow-xl"
        >
          {/* Step 1: User Information */}
          {step === "user" && (
            <form onSubmit={handleUserFormSubmit} className="space-y-4">
              <h2 className="text-xl font-bold mb-4">Personal Information</h2>

              <div>
                <label className="block text-sm font-medium mb-2">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">ID Number *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="12345678"
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Mobile Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => {
                      const formatted = formatPhoneNumber(e.target.value)
                      setMobileNumber(formatted)
                    }}
                    placeholder="254712345678"
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Format: 254XXXXXXXXX (auto-corrects from 0712345678)</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full h-12 pl-11 pr-11 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">At least 8 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Confirm Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full h-12 pl-11 pr-11 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          )}

          {/* Step 2: Company Information */}
          {step === "company" && (
            <form onSubmit={handleCompanyFormSubmit} className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Company Information</h2>
                <button
                  type="button"
                  onClick={() => setStep("user")}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Back
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Company Name *</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Events"
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Company Phone *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="tel"
                    value={companyPhone}
                    onChange={(e) => {
                      const formatted = formatPhoneNumber(e.target.value)
                      setCompanyPhone(formatted)
                    }}
                    placeholder="254712345678"
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Company Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="info@acmeevents.com"
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Physical Address</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={physicalAddress}
                    onChange={(e) => setPhysicalAddress(e.target.value)}
                    placeholder="123 Main St, Nairobi"
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Postal Address</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={postalAddress}
                    onChange={(e) => setPostalAddress(e.target.value)}
                    placeholder="P.O. Box 123, Nairobi"
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Currency *</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all"
                >
                  <option value="KES">KES - Kenyan Shilling</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account
                    <CheckCircle className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 3: Success */}
          {step === "success" && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Account Created!</h2>
              <p className="text-muted-foreground mb-6">
                Your account has been successfully created. Redirecting to dashboard...
              </p>
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#8b5cf6]" />
                <span className="text-sm text-muted-foreground">Loading dashboard</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

