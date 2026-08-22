import type { Metadata } from "next"
import GetStartedPage from "@/components/get-started-page"

export const metadata: Metadata = {
  title: "Access your ticket money as it sells",
  description:
    "Withdraw ticket sales to M-Pesa as they come in, get your event funded, secure equipment, and see deep analytics on every buyer. For organisers selling 100+ tickets.",
  // Paid-traffic destination, not an organic page — the marketplace's
  // /organizers page is the one that should rank.
  robots: { index: false, follow: false },
}

export default function Page() {
  return <GetStartedPage />
}
