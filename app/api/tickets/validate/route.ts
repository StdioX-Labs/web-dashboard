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

    // Mock validation response with proper test data
    const isGroupTicket = true
    const isPaid = true
    const isComplementary = Math.random() > 0.7 // 30% chance of complementary

    const mockTicket = {
      barcode: `VT${Date.now().toString().slice(-6)}`,
      groupCode: groupCode || `GRP${Date.now().toString().slice(-6)}`,
      status: 'valid', // valid, invalid, used
      eventName: 'Nairobi Tech Summit 2026',
      ticketType: isGroupTicket ? 'VIP Group Pass' : 'Regular Entry',
      holderName: 'John Doe',
      price: isComplementary ? 0 : (isGroupTicket ? 2500 : 500),
      isComplementary: isComplementary,
      isGroupTicket: isGroupTicket,
      groupSize: isGroupTicket ? 4 : 1,
      eventDate: '2026-06-15T18:00:00Z',
      venue: 'KICC, Nairobi',
      // Add group barcodes if it's a group ticket
      groupBarcodes: isGroupTicket ? [
        { barcode: 'VT123001', isScanned: false, holderName: 'John Doe' },
        { barcode: 'VT123002', isScanned: false, holderName: 'Jane Smith' },
        { barcode: 'VT123003', isScanned: Math.random() > 0.7, holderName: 'Bob Johnson' },
        { barcode: 'VT123004', isScanned: false, holderName: 'Alice Williams' },
      ] : undefined
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

