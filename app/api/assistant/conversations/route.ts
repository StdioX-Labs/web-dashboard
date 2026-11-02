import { NextRequest, NextResponse } from 'next/server'
import { proxyToSoldOut } from '@/lib/soldout-proxy'
import { CONVERSATION_ID } from '@/lib/assistant/chat-log'

// GET /api/assistant/conversations?companyId=&userId=          the organizer's recent assistant chats
// GET /api/assistant/conversations?companyId=&userId=&id=      one chat with its transcript, to continue it
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const companyId = Number(params.get('companyId'))
  const userId = Number(params.get('userId'))
  const id = params.get('id')

  if (!Number.isInteger(companyId) || !Number.isInteger(userId) || companyId <= 0 || userId <= 0) {
    return NextResponse.json({ status: false, message: 'Your session has expired. Please sign in again.' }, { status: 401 })
  }
  if (id !== null && !CONVERSATION_ID.test(id)) {
    return NextResponse.json({ status: false, message: 'Conversation not found' }, { status: 404 })
  }

  const scope = `companyId=${companyId}&userId=${userId}`
  return proxyToSoldOut(request, id ? `/ai/assistant/conversation?id=${id}&${scope}` : `/ai/assistant/conversations?${scope}`)
}
