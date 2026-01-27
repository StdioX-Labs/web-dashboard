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
        /* Print-specific container reset */
        @media print {
          #report-container {
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
            overflow: visible !important;
          }
        }
        
        @media screen {
          /* Mobile-friendly container */
          body {
            overflow-x: hidden;
            background: #ffffff;
          }
          
          #report-container {
            padding: 20px 15px;
            max-width: 100%;
            overflow-x: hidden;
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
            padding: 0 !important;
            margin: 0 !important;
          }
          
          /* Reset all container modifications */
          .report-header {
            padding: 20px 35px !important;
          }
          
          .event-info {
            padding: 20px 25px !important;
            margin: 25px 30px !important;
          }
          
          .info-section, .summary-section, .table-section {
            margin: 25px 30px !important;
            padding: 20px !important;
          }
          
          /* Reset grid layouts */
          .info-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 15px 30px !important;
          }
          
          .summary-grid, .summary-content {
            flex-direction: row !important;
            gap: 50px !important;
          }
          
          .summary-item {
            flex: 1 !important;
            padding: 15px !important;
          }
          
          /* Reset header layout */
          .header-top {
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
          }
          
          .report-meta {
            text-align: right !important;
          }
          
          /* Reset font sizes */
          .brand-name {
            font-size: 26px !important;
          }
          
          .report-title {
            font-size: 30px !important;
          }
          
          .info-label {
            font-size: 10px !important;
          }
          
          .info-value {
            font-size: 15px !important;
          }
          
          .summary-value {
            font-size: 32px !important;
          }
          
          .section-title {
            font-size: 13px !important;
          }
          
          /* Reset table display */
          table {
            display: table !important;
            min-width: auto !important;
            font-size: 11px !important;
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }
          
          th, td {
            white-space: normal !important;
            word-wrap: break-word !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            padding: 8px 6px !important;
            font-size: 10px !important;
            vertical-align: top !important;
          }
          
          /* Specific column widths for transaction report */
          thead th:nth-child(1), tbody td:nth-child(1) { width: 12% !important; } /* Transaction ID */
          thead th:nth-child(2), tbody td:nth-child(2) { width: 20% !important; } /* Buyer Information */
          thead th:nth-child(3), tbody td:nth-child(3) { width: 18% !important; } /* Ticket Type */
          thead th:nth-child(4), tbody td:nth-child(4) { width: 8% !important; } /* Qty */
          thead th:nth-child(5), tbody td:nth-child(5) { width: 12% !important; } /* Amount */
          thead th:nth-child(6), tbody td:nth-child(6) { width: 18% !important; } /* Date & Time */
          thead th:nth-child(7), tbody td:nth-child(7) { width: 12% !important; } /* Status */
          
          /* Specific column widths for attendee report (5 columns) */
          table:has(th:nth-child(5):not(:nth-child(6))) th:nth-child(1),
          table:has(th:nth-child(5):not(:nth-child(6))) td:nth-child(1) { width: 15% !important; } /* Name */
          table:has(th:nth-child(5):not(:nth-child(6))) th:nth-child(2),
          table:has(th:nth-child(5):not(:nth-child(6))) td:nth-child(2) { width: 25% !important; } /* Contact */
          table:has(th:nth-child(5):not(:nth-child(6))) th:nth-child(3),
          table:has(th:nth-child(5):not(:nth-child(6))) td:nth-child(3) { width: 25% !important; } /* Ticket Details */
          table:has(th:nth-child(5):not(:nth-child(6))) th:nth-child(4),
          table:has(th:nth-child(5):not(:nth-child(6))) td:nth-child(4) { width: 15% !important; } /* Purchase Date */
          table:has(th:nth-child(5):not(:nth-child(6))) th:nth-child(5),
          table:has(th:nth-child(5):not(:nth-child(6))) td:nth-child(5) { width: 20% !important; } /* Check-in Status */
          
          /* Ensure nothing is cut off */
          * {
            overflow: visible !important;
          }
          
          .table-section {
            overflow: visible !important;
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
      id="report-container"
      ref={containerRef}
      className="w-full min-h-screen"
    />
  )
}

