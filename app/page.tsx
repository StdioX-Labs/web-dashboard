import LoginPage from "@/components/login-page"

// Signed-in visitors never reach this page: proxy.ts sends them to /dashboard.
export default function Home() {
  return <LoginPage />
}
