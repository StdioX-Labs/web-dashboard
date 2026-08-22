import type { Metadata } from "next"
import GetStartedPage from "@/components/get-started-page"

export const metadata: Metadata = {
  title: "Get paid the day after your event",
  description:
    "Real-time M-Pesa settlement and event prefinancing for organisers selling 100+ tickets. Tell us about your next event and we will call you today.",
  // Paid-traffic destination, not an organic page — the marketplace's
  // /organizers page is the one that should rank.
  robots: { index: false, follow: false },
}

export default function Page() {
  return <GetStartedPage />
}
