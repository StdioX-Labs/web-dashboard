import { NextRequest, NextResponse } from 'next/server'
import { proxyToSoldOut } from '@/lib/soldout-proxy'
import { CONVERSATION_ID } from '@/lib/assistant/chat-log'
import { readSession } from '@/lib/dashboard-session'

// GET /api/assistant/conversations?companyId=&userId=          the organizer's recent assistant chats
// GET /api/assistant/conversations?companyId=&userId=&id=      one chat with its transcript, to continue it
//
// The user and company come from the signed session cookie, so nobody can read
// another teammate's chats (which may hold revenue figures) by changing the ids.
// The query ids, when given, must match it.
export async function GET(request: NextRequest) {
  const session = readSession(request)
  if (!session) {
    return NextResponse.json({ status: false, message: 'Your session has expired. Please sign in again.' }, { status: 401 })
  }

  const params = request.nextUrl.searchParams
  const companyId = params.get('companyId')
  const userId = params.get('userId')
  const id = params.get('id')

  if ((companyId !== null && Number(companyId) !== session.companyId) || (userId !== null && Number(userId) !== session.userId)) {
    return NextResponse.json({ status: false, message: 'Your session has changed. Please sign in again.' }, { status: 401 })
  }
  if (id !== null && !CONVERSATION_ID.test(id)) {
    return NextResponse.json({ status: false, message: 'Conversation not found' }, { status: 404 })
  }

  const scope = `companyId=${session.companyId}&userId=${session.userId}`
  return proxyToSoldOut(request, id ? `/ai/assistant/conversation?id=${id}&${scope}` : `/ai/assistant/conversations?${scope}`)
}
