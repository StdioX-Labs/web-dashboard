import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { barcode, groupCode } = await request.json()

    // Validate inputs
    if (!barcode) {
      return NextResponse.json(
        { error: 'Barcode is required' },
        { status: 400 }
      )
    }

    // TODO: Implement actual ticket validation logic
    // This should:
    // 1. If groupCode provided (from M-Pesa SMS):
    //    - Look up all tickets with that group code
    //    - Return event details, ticket type, and ALL barcodes in group
    //    - Include which barcodes are already scanned
    //    - Include holder names for each barcode
    // 2. If barcode provided:
    //    - Look up specific ticket by barcode
    //    - Return group code and fetch all related barcodes
    // 3. Verify payment status (isPaid field)
    // 4. Check ticket validity period
    // 5. Check if tickets have been used/scanned

    // Mock validation response
    const isGroupTicket = true // Group codes always mean group tickets
    const isPaid = Math.random() > 0.2 // Most are paid since they have group code

    const mockTicket = {
      barcode: barcode,
      groupCode: groupCode || barcode,
      status: isPaid ? 'valid' : 'unpaid', // valid, invalid, used, unpaid
      eventName: 'Summer Music Festival 2026',
      ticketType: 'VIP Access',
      holderName: 'John Doe',
      isGroupTicket: isGroupTicket,
      groupSize: isGroupTicket ? Math.floor(Math.random() * 4) + 2 : 1,
      requiresPayment: !isPaid,
      isPaid: isPaid,
      amount: 2500,
      eventDate: '2026-06-15T18:00:00Z',
      venue: 'Uhuru Gardens',
      // Add group barcodes if it's a group ticket
      groupBarcodes: isGroupTicket ? [
        { barcode: 'VT67PD', isScanned: false, holderName: 'John Doe' },
        { barcode: 'VT68PD', isScanned: false, holderName: 'Jane Smith' },
        { barcode: 'VT69PD', isScanned: Math.random() > 0.5, holderName: 'Bob Johnson' },
        { barcode: 'VT70PD', isScanned: false, holderName: 'Alice Williams' },
      ].slice(0, isGroupTicket ? Math.floor(Math.random() * 3) + 2 : 1) : undefined
    }

    return NextResponse.json({
      success: true,
      ticket: mockTicket
    })
  } catch (error) {
    console.error('Ticket validation error:', error)
    return NextResponse.json(
      { error: 'Failed to validate ticket' },
      { status: 500 }
    )
  }
}

