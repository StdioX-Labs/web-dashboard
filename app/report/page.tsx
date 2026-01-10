"use client"

import { useEffect, useRef } from "react"

export default function ReportPage() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Get the report HTML from sessionStorage
    const html = sessionStorage.getItem("reportHTML")
    if (html && containerRef.current) {
      containerRef.current.innerHTML = html
      // Clear it after retrieving
      sessionStorage.removeItem("reportHTML")

      // Remove default body styles for clean report display
      document.body.style.margin = "0"
      document.body.style.padding = "0"
      document.body.style.width = "100%"
      document.body.style.height = "100%"

      // Auto-print after a short delay
      setTimeout(() => {
        window.print()
      }, 500)
    }
  }, [])

  // Render empty container that will be filled with HTML
  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        margin: 0,
        padding: '30px 40px'
      }}
    />
  )
}

