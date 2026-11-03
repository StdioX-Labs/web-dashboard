import { NextRequest, NextResponse } from 'next/server'
import { proxyToSoldOut } from '@/lib/soldout-proxy'
import { requireAuth } from '@/lib/auth/server'
import { CONVERSATION_ID } from '@/lib/assistant/chat-log'

// GET /api/assistant/conversations          the organizer's recent assistant chats
// GET /api/assistant/conversations?id=      one chat with its transcript, to continue it
// companyId/userId are taken from the session; any sent by the browser are ignored.
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const { company_id: companyId, user_id: userId } = auth.user
  const id = request.nextUrl.searchParams.get('id')

  if (!companyId || !userId) {
    return NextResponse.json({ status: false, message: 'Your account is not linked to a company.' }, { status: 403 })
  }
  if (id !== null && !CONVERSATION_ID.test(id)) {
    return NextResponse.json({ status: false, message: 'Conversation not found' }, { status: 404 })
  }

  const scope = `companyId=${companyId}&userId=${userId}`
  return proxyToSoldOut(
    request,
    id ? `/ai/assistant/conversation?id=${id}&${scope}` : `/ai/assistant/conversations?${scope}`,
    { accessToken: auth.accessToken }
  )
}
