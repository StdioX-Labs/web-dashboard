"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { User, Mail, Phone, Lock, Building, Loader2, ArrowRight, CheckCircle, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { api, apiErrorField } from "@/lib/api-client"
import { FieldError, FormError, errorInputClass, type FieldErrors } from "@/components/form-errors"
import { cn } from "@/lib/utils"
import { normalizeEmail } from "@/lib/email"
import { formatPhoneNumber, isValidPhoneNumber, PHONE_NUMBER_HINT } from "@/lib/phone"
import { GADS_SIGNUP_CONVERSION } from "@/lib/google-ads"

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

type SignupStep = "user" | "company" | "success"

const STEP_ORDER: SignupStep[] = ["user", "company", "success"]

export default function SignupPage() {
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

  // Reasons the API gave, keyed by field. Company fields are prefixed so the
  // company's email can't be confused with the owner's.
  const [serverErrors, setServerErrors] = useState<FieldErrors>({})
  const clearServerError = (key: string) =>
    setServerErrors((prev) => {
      if (!prev[key] && !prev.form) return prev
      const next = { ...prev }
      delete next[key]
      delete next.form
      return next
    })

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
      setEmailAddress(normalizeEmail(email))
      setCompanyEmail(normalizeEmail(email))
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

    if (!isValidPhoneNumber(mobileNumber)) {
      toast.error("Please enter a valid mobile number", { description: PHONE_NUMBER_HINT })
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

    if (idNumber.trim() && (idNumber.trim().length < 6 || idNumber.trim().length > 12)) {
      toast.error("ID number must be 6 to 12 characters")
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

    if (!isValidPhoneNumber(companyPhone)) {
      toast.error("Please enter a valid company phone number", { description: PHONE_NUMBER_HINT })
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


  /**
   * Step 1 -> step 2. Whether the email already has an account is no longer
   * checked here (that used the old OTP login, which is gone); signup itself
   * reports a taken email beside the field.
   */
  const handleUserFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateUserForm()) return
    setStep("company")
  }

  /**
   * After signup the new owner signs in at Keycloak, which emails them a code:
   * that both signs them in and proves they can read the inbox they gave.
   */
  const continueToSignIn = (email: string) => {
    const params = new URLSearchParams({ returnTo: "/dashboard", login_hint: email })
    window.location.assign(`/api/auth/login?${params}`)
  }

  const USER_FIELDS = ["fullName", "idNumber", "mobileNumber", "emailAddress"]
  const COMPANY_FIELDS = ["companyName", "phoneNumber", "emailAddress", "physicalAddress", "postalAddress"]

  const handleCompanyFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateCompanyForm()) return

    setIsSubmitting(true)
    setServerErrors({})

    // The company and its owner are created in one request, so a failure
    // leaves neither behind. Creating them one after the other used to strand
    // a company with nobody able to sign in to it whenever the second step
    // failed, and its name was then "already registered" to every retry.
    try {
      const response = await api.company.signup({
        company: {
          companyName: companyName.trim(),
          physicalAddress: physicalAddress || "PENDING",
          postalAddress: postalAddress || "PENDING",
          phoneNumber: formatPhoneNumber(companyPhone),
          emailAddress: normalizeEmail(companyEmail),
          currency: currency,
          profileType: "EVENT_ORGANIZER",
          billingAccountType: "MPESA",
          bio: "Company description here",
          profilePhoto: "https://example.com/photo.jpg",
          legalDocuments: "https://example.com/docs.pdf",
        },
        user: {
          fullName: fullName.trim(),
          // The API requires one; the field is optional here, so stand in the
          // same placeholder the Users page uses until it is given for payouts.
          idNumber: idNumber.trim() || "00000000",
          mobileNumber: formatPhoneNumber(mobileNumber),
          password,
          emailAddress: normalizeEmail(emailAddress),
          isExternal: false,
        },
      })

      if (!response.status || !response.user) {
        throw new Error(response.message || "We couldn't create your account")
      }

      toast.success("Account created successfully!")

      window.gtag?.("event", "conversion", { send_to: GADS_SIGNUP_CONVERSION })

      // The second step of the funnel: Lead fires on the landing page,
      // CompleteRegistration when they actually finish creating an account.
      // Browser-only on purpose — this is post-form, low volume, and not
      // what campaigns optimise on.
      window.fbq?.("track", "CompleteRegistration")

      // The account exists now. Signing in at Keycloak sends a code to the
      // address, which is what verifies it; no session is created here.
      setStep("success")
      setIsSubmitting(false)

      const email = normalizeEmail(emailAddress)
      setTimeout(() => continueToSignIn(email), 2000)
    } catch (error) {
      console.error("Signup error:", error)
      const message = error instanceof Error ? error.message : "We couldn't create your account. Please try again."
      const field = apiErrorField(error)
      if (field && USER_FIELDS.includes(field)) {
        // About the owner's details: take them back to that step, with the
        // reason beside the input. Nothing was created, so the retry is clean.
        setServerErrors({ [field]: message })
        setStep("user")
      } else if (field?.startsWith("company.") && COMPANY_FIELDS.includes(field.slice("company.".length))) {
        setServerErrors({ [field]: message })
      } else {
        setServerErrors({ form: message })
      }
      toast.error("Couldn't create your account", { description: message })
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-zinc-700 to-zinc-900 bg-clip-text text-transparent mb-2">
            SoldOut Africa
          </h1>
          <p className="text-muted-foreground">
            Create your account
          </p>
        </motion.div>

        {/* Progress Steps */}
        {(
          <div className="flex items-center justify-center mb-8 gap-2">
            {STEP_ORDER.map((s, i) => (
              <React.Fragment key={s}>
                {i > 0 && (
                  <div className={`h-0.5 w-8 ${
                    stepIndex >= i ? "bg-zinc-700" : "bg-secondary"
                  }`} />
                )}
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  stepIndex >= i
                    ? "bg-zinc-700 text-white"
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
                    onChange={(e) => { setFullName(e.target.value); clearServerError("fullName") }}
                    placeholder="John Doe"
                    className={cn("w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/25 transition-all", serverErrors["fullName"] && errorInputClass)}
                  />
                </div>
                <FieldError message={serverErrors["fullName"]} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">ID Number (optional)</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={idNumber}
                    onChange={(e) => { setIdNumber(e.target.value); clearServerError("idNumber") }}
                    placeholder="12345678 — needed later for payouts"
                    className={cn("w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/25 transition-all", serverErrors["idNumber"] && errorInputClass)}
                  />
                </div>
                <FieldError message={serverErrors["idNumber"]} />
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
                      clearServerError("mobileNumber")
                    }}
                    placeholder="254712345678"
                    className={cn("w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/25 transition-all", serverErrors["mobileNumber"] && errorInputClass)}
                  />
                </div>
                <FieldError message={serverErrors["mobileNumber"]} />
                <p className="text-xs text-muted-foreground mt-1">Format: 254XXXXXXXXX (auto-corrects from 0712345678)</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => { setEmailAddress(normalizeEmail(e.target.value)); clearServerError("emailAddress") }}
                    placeholder="john@example.com"
                    className={cn("w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/25 transition-all", serverErrors["emailAddress"] && errorInputClass)}
                  />
                </div>
                <FieldError message={serverErrors["emailAddress"]} />
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
                    className="w-full h-12 pl-11 pr-11 rounded-xl border border-border bg-background text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/25 transition-all"
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
                    className="w-full h-12 pl-11 pr-11 rounded-xl border border-border bg-background text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/25 transition-all"
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
                className="w-full py-3 bg-gradient-to-r from-zinc-700 to-zinc-900 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-zinc-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                    onChange={(e) => { setCompanyName(e.target.value); clearServerError("company.companyName") }}
                    placeholder="Acme Events"
                    className={cn("w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/25 transition-all", serverErrors["company.companyName"] && errorInputClass)}
                  />
                </div>
                <FieldError message={serverErrors["company.companyName"]} />
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
                      clearServerError("company.phoneNumber")
                    }}
                    placeholder="254712345678"
                    className={cn("w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/25 transition-all", serverErrors["company.phoneNumber"] && errorInputClass)}
                  />
                </div>
                <FieldError message={serverErrors["company.phoneNumber"]} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Company Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={companyEmail}
                    onChange={(e) => { setCompanyEmail(normalizeEmail(e.target.value)); clearServerError("company.emailAddress") }}
                    placeholder="info@acmeevents.com"
                    className={cn("w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/25 transition-all", serverErrors["company.emailAddress"] && errorInputClass)}
                  />
                </div>
                <FieldError message={serverErrors["company.emailAddress"]} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Physical Address</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={physicalAddress}
                    onChange={(e) => { setPhysicalAddress(e.target.value); clearServerError("company.physicalAddress") }}
                    placeholder="123 Main St, Nairobi"
                    className={cn("w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/25 transition-all", serverErrors["company.physicalAddress"] && errorInputClass)}
                  />
                </div>
                <FieldError message={serverErrors["company.physicalAddress"]} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Postal Address</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={postalAddress}
                    onChange={(e) => { setPostalAddress(e.target.value); clearServerError("company.postalAddress") }}
                    placeholder="P.O. Box 123, Nairobi"
                    className={cn("w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/25 transition-all", serverErrors["company.postalAddress"] && errorInputClass)}
                  />
                </div>
                <FieldError message={serverErrors["company.postalAddress"]} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Currency *</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/25 transition-all"
                >
                  <option value="KES">KES - Kenyan Shilling</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>

              <FormError message={serverErrors.form} />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-zinc-700 to-zinc-900 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-zinc-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              <h2 className="text-2xl font-bold mb-2">You&apos;re All Set!</h2>
              <p className="text-muted-foreground mb-6">
                Your account is ready. Sign in next: we&apos;ll send a code to{" "}
                <span className="font-medium text-foreground">{emailAddress}</span> to confirm it&apos;s yours.
              </p>
              <button
                type="button"
                onClick={() => continueToSignIn(normalizeEmail(emailAddress))}
                className="inline-flex items-center justify-center gap-2 text-sm text-zinc-300 hover:underline"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                Taking you to sign in
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

