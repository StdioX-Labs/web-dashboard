"use client"

import { toast } from "sonner"
import { EventData, Transaction, Attendee } from "./types"

export class ReportExporter {
  static exportTransactionsToPDF(
    eventData: EventData | null,
    transactions: Transaction[]
  ) {
    try {
      const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0)
      const reportId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Transaction Report - ${eventData?.name ?? 'Untitled Event'}</title>
  <style>
    @page { margin: 20mm; size: A4; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: #ffffff;
      padding: 20px;
    }
    .report-header {
      border-bottom: 3px solid #8b5cf6;
      padding-bottom: 20px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-name {
      font-size: 28px;
      font-weight: 700;
      color: #8b5cf6;
      margin-bottom: 4px;
    }
    .report-title {
      font-size: 24px;
      font-weight: 700;
      color: #1a1a1a;
    }
    .info-section {
      background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
    .info-item {
      border-left: 3px solid #8b5cf6;
      padding-left: 12px;
    }
    .info-label {
      font-size: 11px;
      color: #6b7280;
      text-transform: uppercase;
    }
    .info-value {
      font-size: 16px;
      color: #1a1a1a;
      font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background: #8b5cf6;
      color: white;
      padding: 12px;
      text-align: left;
      font-size: 11px;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #f3f4f6;
    }
    .footer-company {
      font-weight: 600;
      color: #8b5cf6;
      margin-top: 40px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div>
      <div class="brand-name">SOLDOUTAFRICA</div>
    </div>
    <div style="text-align: right;">
      <div class="report-title">Transaction Report</div>
      <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">${new Date().toLocaleDateString()}</div>
    </div>
  </div>

  <div class="info-section">
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Event Name</div>
        <div class="info-value">${eventData?.name ?? 'Untitled Event'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Total Transactions</div>
        <div class="info-value">${transactions.length}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Total Revenue</div>
        <div class="info-value">KES ${totalRevenue.toLocaleString()}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Report ID</div>
        <div class="info-value">${reportId}</div>
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Transaction ID</th>
        <th>Buyer</th>
        <th>Ticket Type</th>
        <th>Qty</th>
        <th>Amount</th>
        <th>Date</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
${transactions.map(txn => `      <tr>
        <td>${txn.id}</td>
        <td>${txn.buyer}<br><small>${txn.email}</small></td>
        <td>${txn.ticketType}</td>
        <td>${txn.quantity}</td>
        <td>KES ${txn.amount.toLocaleString()}</td>
        <td>${txn.date}</td>
        <td>${txn.status}</td>
      </tr>`).join('\n')}
    </tbody>
  </table>

  <div class="footer-company">
    SoldOutAfrica Event Management Platform
  </div>

  <script>
    document.title = 'SoldOutAfrica - Transaction Report';
    window.onload = function() {
      setTimeout(function() { window.print(); }, 500);
    }
  </script>
</body>
</html>`

      sessionStorage.setItem("reportHTML", html)
      window.open("/report", "_blank")

      toast.success("Transaction report ready!", {
        description: "Opening in new tab...",
      })
    } catch (error) {
      console.error("Error exporting transactions:", error)
      toast.error("Failed to export transactions")
    }
  }

  static exportAttendeesToPDF(
    eventData: EventData | null,
    attendees: Attendee[]
  ) {
    try {
      const checkedInCount = attendees.filter(a => a.checkedIn).length
      const reportId = `ATT-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Attendees Report - ${eventData?.name ?? 'Untitled Event'}</title>
  <style>
    @page { margin: 20mm; size: A4; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: #ffffff;
      padding: 20px;
    }
    .report-header {
      border-bottom: 3px solid #8b5cf6;
      padding-bottom: 20px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-name {
      font-size: 28px;
      font-weight: 700;
      color: #8b5cf6;
    }
    .report-title {
      font-size: 24px;
      font-weight: 700;
      color: #1a1a1a;
    }
    .info-section {
      background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
    .info-item {
      border-left: 3px solid #8b5cf6;
      padding-left: 12px;
    }
    .info-label {
      font-size: 11px;
      color: #6b7280;
      text-transform: uppercase;
    }
    .info-value {
      font-size: 16px;
      color: #1a1a1a;
      font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background: #8b5cf6;
      color: white;
      padding: 12px;
      text-align: left;
      font-size: 11px;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #f3f4f6;
    }
    .footer-company {
      font-weight: 600;
      color: #8b5cf6;
      margin-top: 40px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div>
      <div class="brand-name">SOLDOUTAFRICA</div>
    </div>
    <div style="text-align: right;">
      <div class="report-title">Attendees Report</div>
      <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">${new Date().toLocaleDateString()}</div>
    </div>
  </div>

  <div class="info-section">
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Event Name</div>
        <div class="info-value">${eventData?.name ?? 'Untitled Event'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Total Attendees</div>
        <div class="info-value">${attendees.length}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Checked In</div>
        <div class="info-value">${checkedInCount}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Report ID</div>
        <div class="info-value">${reportId}</div>
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Email</th>
        <th>Phone</th>
        <th>Ticket Type</th>
        <th>Status</th>
        <th>Check-in Time</th>
      </tr>
    </thead>
    <tbody>
${attendees.map(attendee => `      <tr>
        <td>${attendee.firstName} ${attendee.lastName}</td>
        <td>${attendee.email}</td>
        <td>${attendee.mobileNumber}</td>
        <td>${attendee.ticketName}<br><small>${attendee.ticketId}</small></td>
        <td>${attendee.checkedIn ? '✓ Checked In' : '✗ Not Checked In'}</td>
        <td>${attendee.checkedInTime || '—'}</td>
      </tr>`).join('\n')}
    </tbody>
  </table>

  <div class="footer-company">
    SoldOutAfrica Event Management Platform
  </div>

  <script>
    document.title = 'SoldOutAfrica - Attendees Report';
    window.onload = function() {
      setTimeout(function() { window.print(); }, 500);
    }
  </script>
</body>
</html>`

      sessionStorage.setItem("reportHTML", html)
      window.open("/report", "_blank")

      toast.success("Attendees report ready!", {
        description: "Opening in new tab...",
      })
    } catch (error) {
      console.error("Error exporting attendees:", error)
      toast.error("Failed to export attendees")
    }
  }
}

