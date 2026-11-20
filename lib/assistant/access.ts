import type { NextRequest } from 'next/server'
import { readSession } from '@/lib/dashboard-session'
import { soldOutJson } from '@/lib/soldout-proxy'
import { canSeeFinancials } from '@/lib/assistant/tools'

/**
 * Who is using the assistant, from what the server can trust: the user and
 * company come from the signed session cookie set at sign-in (never from the
 * request body), and the role is looked up fresh from core's company roster,
 * so a demoted or deactivated teammate loses access on their next message.
 */
export interface AssistantUser {
  userId: number
  companyId: number
  role: string
  financials: boolean
  email?: string
}

export type AccessResult = { ok: true; user: AssistantUser } | { ok: false; status: number; message: string }

export async function assistantUser(request: NextRequest): Promise<AccessResult> {
  const session = readSession(request)
  if (!session) return { ok: false, status: 401, message: 'Your session has expired. Please sign in again.' }

  const roster = await soldOutJson(`/company/fetch/users?companyId=${session.companyId}`)
  if (!roster.ok) {
    return { ok: false, status: roster.status >= 500 ? 502 : roster.status, message: "Couldn't check your access right now. Please try again." }
  }

  const users = Array.isArray(roster.data.users) ? (roster.data.users as Array<Record<string, unknown>>) : []
  const me = users.find((u) => Number(u.id) === session.userId)
  if (!me || me.active === false) {
    return { ok: false, status: 401, message: 'Your account is no longer active at this company. Sign in again.' }
  }

  const role = String(me.roles ?? '')
  return {
    ok: true,
    user: {
      userId: session.userId,
      companyId: session.companyId,
      role,
      financials: canSeeFinancials(role),
      email: typeof me.emailAddress === 'string' ? me.emailAddress : undefined,
    },
  }
}
