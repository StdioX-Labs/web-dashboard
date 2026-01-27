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

      // Ensure viewport meta tag is set for mobile
      let viewport = document.querySelector('meta[name="viewport"]')
      if (!viewport) {
        viewport = document.createElement('meta')
        viewport.setAttribute('name', 'viewport')
        document.head.appendChild(viewport)
      }
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes')

      // Remove default body styles for clean report display
      document.body.style.margin = "0"
      document.body.style.padding = "0"
      document.body.style.width = "100%"
      document.body.style.height = "100%"

      // Add mobile-friendly styles (only for screen, not print)
      const style = document.createElement('style')
      style.textContent = `
        @media screen {
          /* Mobile-friendly container */
          body {
            overflow-x: hidden;
            background: #ffffff;
          }
          
          /* Responsive tables */
          table {
            display: block;
            width: 100% !important;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            border: 1px solid #e5e7eb;
          }
          
          /* Make summary sections stack better on mobile */
          .summary-content {
            flex-direction: column !important;
            gap: 15px !important;
          }
          
          @media (max-width: 768px) {
            /* Reduce padding on mobile */
            .report-header {
              padding: 15px 20px !important;
            }
            
            .event-info {
              padding: 15px 20px !important;
              margin: 15px 20px !important;
            }
            
            .info-section, .summary-section, .table-section {
              margin: 15px 20px !important;
            }
            
            /* Make info grids stack on mobile */
            .info-grid {
              grid-template-columns: 1fr !important;
              gap: 12px !important;
            }
            
            .summary-grid {
              flex-direction: column !important;
            }
            
            .summary-item {
              padding: 12px !important;
            }
            
            /* Adjust font sizes for mobile */
            .brand-name {
              font-size: 20px !important;
            }
            
            .report-title {
              font-size: 22px !important;
            }
            
            .info-value {
              font-size: 14px !important;
            }
            
            .summary-value {
              font-size: 24px !important;
            }
            
            .section-title {
              font-size: 14px !important;
            }
            
            /* Make table scrollable horizontally */
            .table-section {
              overflow-x: auto;
              -webkit-overflow-scrolling: touch;
            }
            
            table {
              font-size: 12px !important;
              min-width: 600px;
            }
            
            th, td {
              padding: 8px 6px !important;
              font-size: 11px !important;
              white-space: nowrap;
            }
            
            /* Stack header on mobile */
            .header-top {
              flex-direction: column !important;
              align-items: flex-start !important;
              gap: 10px !important;
            }
            
            .report-meta {
              text-align: left !important;
            }
          }
          
          @media (max-width: 480px) {
            /* Extra small devices */
            .report-header {
              padding: 12px 15px !important;
            }
            
            .event-info {
              padding: 12px 15px !important;
              margin: 12px 15px !important;
            }
            
            .info-section, .summary-section, .table-section {
              margin: 12px 15px !important;
              padding: 15px !important;
            }
            
            .brand-name {
              font-size: 18px !important;
            }
            
            .report-title {
              font-size: 18px !important;
            }
            
            .info-label {
              font-size: 9px !important;
            }
            
            .info-value {
              font-size: 13px !important;
            }
            
            .summary-value {
              font-size: 20px !important;
            }
            
            th, td {
              padding: 6px 4px !important;
              font-size: 10px !important;
            }
            
            table {
              min-width: 550px;
            }
          }
        }
        
        /* Keep print styles perfect - no changes */
        @media print {
          body {
            overflow: visible !important;
          }
          
          table {
            display: table !important;
            min-width: auto !important;
          }
          
          th, td {
            white-space: normal !important;
          }
        }
      `
      document.head.appendChild(style)

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
      className="w-full min-h-screen"
      style={{
        margin: 0,
        padding: '20px 15px',
        maxWidth: '100%',
        overflowX: 'hidden'
      }}
    />
  )
}

