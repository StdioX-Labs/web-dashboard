"use client"

import React, { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { User, Mail, Phone, Lock, Building, Loader2, ArrowRight, CheckCircle, Eye, EyeOff, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { api, ApiError } from "@/lib/api-client"
import { sessionManager } from "@/lib/session-manager"
import { formatPhoneNumber } from "@/lib/phone"
import { GADS_SIGNUP_CONVERSION } from "@/lib/google-ads"

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

type SignupStep = "user" | "company" | "verify" | "success"

/**
 * Why the code box is showing: a brand-new account proving it can read the
 * inbox it signed up with, or an existing account being signed in rather than
 * signed up.
 */
type VerifyReason = "signup" | "existing"

const STEP_ORDER: SignupStep[] = ["user", "company", "verify", "success"]

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<SignupStep>("user")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const stepIndex = STEP_ORDER.indexOf(step)

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

  // Email verification
  const [isCheckingAccount, setIsCheckingAccount] = useState(false)
  const [verifyReason, setVerifyReason] = useState<VerifyReason>("signup")
  const [loginToken, setLoginToken] = useState<string | null>(null)
  const [otp, setOtp] = useState("")
  const [otpError, setOtpError] = useState("")
  const [otpTouched, setOtpTouched] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  // Set when the account is real but no code could be sent (rate limit, outage).
  // Unlocks the "sign in later" escape hatch so nobody is stranded on a step
  // that cannot issue a code for an account they already own.
  const [codeSendFailed, setCodeSendFailed] = useState(false)
  const otpInputRef = useRef<HTMLInputElement>(null)

  // Prefilled by /get-started so a lead who just gave us their details does
  // not retype them. useSearchParams would force a Suspense boundary here;
  // reading location directly does not.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const name = params.get("name")
    const email = params.get("email")
    const phone = params.get("phone")
    const company = params.get("company")

    if (name) setFullName(name)
    if (email) {
      setEmailAddress(email)
      setCompanyEmail(email)
    }
    if (phone) {
      setMobileNumber(phone)
      setCompanyPhone(phone)
    }
    if (company) setCompanyName(company)
  }, [])

  const validateUserForm = (): boolean => {
    if (!fullName.trim()) {
      toast.error("Please enter your full name")
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

  const retryAfterMinutes = (error: ApiError): number => {
    const retryAfter = (error.response as { retryAfter?: number } | null)?.retryAfter
    return retryAfter ? Math.ceil(retryAfter / 60) : 15
  }

  /**
   * Step 1 -> step 2, but only once we know this email does not already have an
   * account. There is no dedicated "does this user exist" endpoint; the
   * OTP-login endpoint only issues a code for an account that exists, so it
   * answers the question.
   *
   * Asking here rather than at the end matters: creating a user with a taken
   * email fails *after* a company has already been created for it. And when the
   * account does exist, the code that request just emailed is exactly what they
   * need next, so they go straight to the code box instead of being bounced to
   * the login page to start over.
   */
  const handleUserFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateUserForm()) return

    const email = emailAddress.toLowerCase().trim()
    setIsCheckingAccount(true)

    try {
      const response = await api.auth.requestOtp(email, 'email')

      if (response.status) {
        // Account exists - sign them in instead of signing them up.
        if (response.loginToken) setLoginToken(response.loginToken)

        setVerifyReason("existing")
        setStep("verify")
        setIsCheckingAccount(false)

        toast.info("You already have an account", {
          description: `We've sent a sign-in code to ${email}.`,
        })

        setTimeout(() => otpInputRef.current?.focus(), 100)
        return
      }

      // Reported failure without an exception - treat as "no account yet"
      setIsCheckingAccount(false)
      setStep("company")
    } catch (error) {
      console.error('Error checking for an existing account:', error)
      setIsCheckingAccount(false)

      if (error instanceof ApiError) {
        // Don't mistake "we couldn't ask" for "no account exists" - carrying on
        // with an email that is already taken only fails later, once a company
        // has been created for it.
        if (error.statusCode === 429) {
          const minutes = retryAfterMinutes(error)
          toast.error("Too many requests", {
            description: `Please wait ${minutes} minute${minutes > 1 ? 's' : ''} before trying again.`,
            duration: 10000,
          })
          return
        }

        if (error.statusCode === 0 || (error.statusCode ?? 0) >= 500) {
          toast.error("Could not reach the server", {
            description: "Please check your connection and try again.",
          })
          return
        }
      }

      // A 4xx from the OTP endpoint for a well-formed email means no such user
      setStep("company")
    }
  }

  /**
   * Email a verification code and remember the token it will be checked
   * against.
   *
   * A failure here is not fatal and must not be presented as one: by the time
   * this runs the account has been created, so this is a real user who can sign
   * in whenever they like. `codeSendFailed` surfaces that way out rather than
   * leaving them stuck on a step that cannot issue a code.
   */
  const sendVerificationCode = async (email: string) => {
    setIsSendingCode(true)
    setOtp("")
    setOtpError("")
    setOtpTouched(false)

    try {
      const response = await api.auth.requestOtp(email, 'email')

      if (response.status) {
        if (response.loginToken) setLoginToken(response.loginToken)
        setCodeSendFailed(false)
        setIsSendingCode(false)
        setTimeout(() => otpInputRef.current?.focus(), 100)
        return
      }

      setCodeSendFailed(true)
      setIsSendingCode(false)
      toast.error("Could not send the code", {
        description: response.message || "Please try again.",
      })
    } catch (error) {
      console.error('Error sending the verification code:', error)
      setCodeSendFailed(true)
      setIsSendingCode(false)

      if (error instanceof ApiError && error.statusCode === 429) {
        const minutes = retryAfterMinutes(error)
        toast.error("Too many requests", {
          description: `Please wait ${minutes} minute${minutes > 1 ? 's' : ''} before asking for another code.`,
          duration: 10000,
        })
        return
      }

      toast.error("Could not send the code", {
        description: error instanceof ApiError
          ? error.message
          : "Please check your connection and try again.",
      })
    }
  }

  const handleOtpChange = (value: string) => {
    // Only allow numbers, max 4 digits
    const numericValue = value.replace(/\D/g, "").slice(0, 4)
    setOtp(numericValue)

    if (otpTouched) {
      if (!numericValue) {
        setOtpError("Enter the code we emailed you")
      } else if (numericValue.length !== 4) {
        setOtpError("The code is 4 digits")
      } else {
        setOtpError("")
      }
    }
  }

  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    setOtpTouched(true)

    if (!otp || otp.length !== 4) {
      setOtpError("Please enter a valid 4-digit code")
      return
    }

    if (!loginToken) {
      setOtpError("That code has expired. Please request a new one.")
      return
    }

    setIsVerifyingOtp(true)

    try {
      const response = await api.auth.verifyOtp(loginToken, otp)

      if (!response.status || !response.user) {
        setOtpError(response.message || "Invalid verification code. Please try again.")
        setIsVerifyingOtp(false)
        return
      }

      // Belt and braces - the verify route already rejects deactivated accounts.
      if (response.user.is_active === false) {
        setOtpError("This account has been deactivated.")
        toast.error("Account deactivated", {
          description: "Please contact your administrator to regain access.",
        })
        setIsVerifyingOtp(false)
        return
      }

      // The session comes from the verified response rather than the create
      // response, so it only exists once the address has been proved. The
      // company was created moments ago, so fall back to the currency just
      // picked if the user record has not caught up with it yet.
      sessionManager.createSession(
        verifyReason === "signup"
          ? { ...response.user, currency: response.user.currency || currency }
          : response.user
      )

      setStep("success")

      setTimeout(() => {
        router.push("/dashboard")
      }, 2000)
    } catch (error) {
      console.error('Error verifying the code:', error)

      if (error instanceof ApiError && error.statusCode === 429) {
        const minutes = retryAfterMinutes(error)
        toast.error("Too many attempts", {
          description: `Please wait ${minutes} minute${minutes > 1 ? 's' : ''} before trying again.`,
          duration: 10000,
        })
      } else {
        setOtpError(error instanceof ApiError
          ? error.message
          : "Verification failed. Please try again.")
      }

      setIsVerifyingOtp(false)
    }
  }

  /** Only reachable on the existing-account path, where nothing was created. */
  const backToUserStep = () => {
    setStep("user")
    // Back to signing up, so the header and progress bar stop reading as a login
    setVerifyReason("signup")
    setLoginToken(null)
    setOtp("")
    setOtpError("")
    setOtpTouched(false)
    setCodeSendFailed(false)
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
        emailAddress: companyEmail.toLowerCase().trim(),
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
        emailAddress: emailAddress.toLowerCase().trim(),
        isExternal: false,
        company: { id: companyId },
        roles: "COMPANY_OWNER",
      }

      console.log("Step 2: Creating user with data:", userData)

      const userResponse = await api.user.create(userData)

      console.log("User creation response:", userResponse)

      if (userResponse.status && userResponse.user) {
        toast.success("User account created successfully!")

        window.gtag?.("event", "conversion", { send_to: GADS_SIGNUP_CONVERSION })

        // The second step of the funnel: Lead fires on the landing page,
        // CompleteRegistration when they actually finish creating an account.
        // Browser-only on purpose — this is post-form, low volume, and not
        // what campaigns optimise on.
        window.fbq?.("track", "CompleteRegistration")

        // The account exists now, but nothing has yet proved this person can
        // read the inbox they signed up with. The OTP-login endpoint issues a
        // code for an account that exists - which this one now does - so the
        // code that signs them in is also what verifies the address. No session
        // is minted here; that happens once the code checks out.
        setVerifyReason("signup")
        setStep("verify")
        setIsSubmitting(false)

        await sendVerificationCode(emailAddress.toLowerCase().trim())
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
          <p className="text-muted-foreground">
            {verifyReason === "existing" ? "Sign in to your account" : "Create your account"}
          </p>
        </motion.div>

        {/* Progress Steps. Hidden on the existing-account path, where the
            company step is skipped and this is a sign-in, not a sign-up. */}
        {verifyReason !== "existing" && (
          <div className="flex items-center justify-center mb-8 gap-2">
            {STEP_ORDER.map((s, i) => (
              <React.Fragment key={s}>
                {i > 0 && (
                  <div className={`h-0.5 w-8 ${
                    stepIndex >= i ? "bg-[#8b5cf6]" : "bg-secondary"
                  }`} />
                )}
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  stepIndex >= i
                    ? "bg-[#8b5cf6] text-white"
                    : "bg-secondary text-muted-foreground"
                }`}>
                  {stepIndex > i || step === "success"
                    ? <CheckCircle className="w-4 h-4" />
                    : i + 1}
                </div>
              </React.Fragment>
            ))}
          </div>
        )}

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
                <label className="block text-sm font-medium mb-2">ID Number (optional)</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="12345678 — needed later for payouts"
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
                disabled={isCheckingAccount}
                className="w-full py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCheckingAccount ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Checking your email...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
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

          {/* Step 3: Verify the email address */}
          {step === "verify" && (
            <form onSubmit={handleOtpVerification} className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">
                  {verifyReason === "existing" ? "Sign in instead" : "Verify your email"}
                </h2>
                {/* Only the existing-account path can go back - on the signup
                    path the account has already been created. */}
                {verifyReason === "existing" && (
                  <button
                    type="button"
                    onClick={backToUserStep}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    ← Back
                  </button>
                )}
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/40 p-3">
                <ShieldCheck className="w-5 h-5 text-[#8b5cf6] shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  {verifyReason === "existing" ? (
                    <>
                      An account already exists for{" "}
                      <span className="font-medium text-foreground">{emailAddress}</span>.
                      Enter the sign-in code we just emailed you.
                    </>
                  ) : (
                    <>
                      Your account is ready. Enter the 4-digit code we sent to{" "}
                      <span className="font-medium text-foreground">{emailAddress}</span>{" "}
                      to confirm the address is yours.
                    </>
                  )}
                </p>
              </div>

              <div>
                <label htmlFor="signup-otp" className="block text-sm font-medium mb-2">
                  Verification Code *
                </label>
                <input
                  ref={otpInputRef}
                  id="signup-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => handleOtpChange(e.target.value)}
                  onBlur={() => setOtpTouched(true)}
                  placeholder="0000"
                  maxLength={4}
                  aria-invalid={!!otpError && otpTouched}
                  aria-describedby={otpError && otpTouched ? "signup-otp-error" : undefined}
                  className={`w-full h-12 px-4 rounded-xl border bg-background text-center text-lg tracking-[0.5em] outline-none transition-all ${
                    otpError && otpTouched
                      ? "border-destructive ring-4 ring-destructive/10"
                      : "border-border focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10"
                  }`}
                />
                <AnimatePresence mode="wait">
                  {otpError && otpTouched && (
                    <motion.p
                      id="signup-otp-error"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="text-xs text-destructive mt-2"
                      role="alert"
                    >
                      {otpError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <button
                type="submit"
                disabled={isVerifyingOtp || isSendingCode || otp.length !== 4}
                className="w-full py-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-[#8b5cf6]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isVerifyingOtp ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    {verifyReason === "existing" ? "Sign In" : "Verify Email"}
                    <CheckCircle className="w-5 h-5" />
                  </>
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => sendVerificationCode(emailAddress.toLowerCase().trim())}
                  disabled={isSendingCode || isVerifyingOtp}
                  className="text-sm text-[#8b5cf6] hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {isSendingCode ? "Sending..." : "Resend code"}
                </button>
              </div>

              {/* The account exists whether or not a code ever arrives, so never
                  leave them stranded here. */}
              {codeSendFailed && verifyReason === "signup" && (
                <p className="text-xs text-muted-foreground text-center">
                  Your account has already been created. If the code does not
                  arrive, you can{" "}
                  <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="text-[#8b5cf6] hover:underline"
                  >
                    sign in
                  </button>{" "}
                  with this email at any time.
                </p>
              )}
            </form>
          )}

          {/* Step 4: Success */}
          {step === "success" && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {verifyReason === "existing" ? "Welcome Back!" : "You're All Set!"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {verifyReason === "existing"
                  ? "You're signed in. Redirecting to dashboard..."
                  : "Your email is verified and your account is ready. Redirecting to dashboard..."}
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

