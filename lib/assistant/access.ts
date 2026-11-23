import type { Auth } from '@/lib/auth/server'
import { soldOutJson } from '@/lib/soldout-proxy'
import { canSeeFinancials } from '@/lib/assistant/tools'

/**
 * Who is using the assistant, from what the server can trust: the user and
 * company come from the Keycloak sign-in (never from the request body), and
 * the role is looked up fresh from core's company roster with the user's own
 * token, so a demoted or deactivated teammate loses access on their next message.
 */
export interface AssistantUser {
  userId: number
  companyId: number
  role: string
  financials: boolean
  email?: string
}

export type AccessResult = { ok: true; user: AssistantUser } | { ok: false; status: number; message: string }

export async function assistantUser(auth: Auth): Promise<AccessResult> {
  const userId = Number(auth.user.user_id)
  const companyId = Number(auth.user.company_id)
  if (!userId || !companyId) {
    return { ok: false, status: 403, message: 'Your account is not linked to a company.' }
  }

  const roster = await soldOutJson(`/company/fetch/users?companyId=${companyId}`, auth.accessToken)
  if (!roster.ok) {
    return { ok: false, status: roster.status >= 500 ? 502 : roster.status, message: "Couldn't check your access right now. Please try again." }
  }

  const users = Array.isArray(roster.data.users) ? (roster.data.users as Array<Record<string, unknown>>) : []
  const me = users.find((u) => Number(u.id) === userId)
  if (!me || me.active === false) {
    return { ok: false, status: 401, message: 'Your account is no longer active at this company. Sign in again.' }
  }

  const role = String(me.roles ?? '')
  return {
    ok: true,
    user: {
      userId,
      companyId,
      role,
      financials: canSeeFinancials(role),
      email: typeof me.emailAddress === 'string' ? me.emailAddress : auth.user.email || undefined,
    },
  }
}
