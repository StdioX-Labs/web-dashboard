import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from './auth/server'
import { soldOutJson } from './soldout-proxy'

/**
 * Who may manage gate scanner accounts from the dashboard, and over what.
 *
 * Core's /gate/admin/** endpoints take company owners' tokens and refuse any
 * company, event, scanner or photo id that isn't theirs. Every scanner route
 * also takes the company from the signed-in session (never from the request),
 * checks the person is an owner, and checks any scanner or event id it is given
 * belongs to that company before acting on it, so a refusal reads clearly.
 */

const MANAGERS = new Set(['COMPANY_OWNER', 'SUPER_ADMIN'])

export interface ScannerAccess {
  companyId: number
  userId: number
  accessToken: string
}

const fail = (status: number, message: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ status: false, message, ...extra }, { status })

/** The caller's company when they may manage its scanners, or the response refusing them. */
export async function scannerAccess(request: NextRequest): Promise<ScannerAccess | NextResponse> {
  const auth = await getAuth(request)
  if (!auth) {
    return fail(401, 'Sign in again to manage scanners.', { signIn: true })
  }
  const roles = auth.user.roles ?? [auth.user.role]
  if (!roles.some((role) => MANAGERS.has(role))) {
    return fail(403, 'Only a company owner can manage scanners.')
  }
  return { companyId: auth.user.company_id, userId: auth.user.user_id, accessToken: auth.accessToken }
}

/** Null when the scanner belongs to the company, otherwise the response to send. */
export async function requireOwnScanner(access: ScannerAccess, scannerId: number): Promise<NextResponse | null> {
  const r = await soldOutJson(`/gate/admin/scanners?companyId=${access.companyId}`, access.accessToken)
  if (!r.ok) return fail(r.status >= 500 ? 502 : r.status, r.message)
  const scanners = Array.isArray(r.data.scanners) ? (r.data.scanners as Array<Record<string, unknown>>) : []
  return scanners.some((s) => Number(s.id) === scannerId) ? null : fail(404, 'Scanner not found.')
}

/** Null when the event belongs to the company, otherwise the response to send. */
export async function requireOwnEvent(access: ScannerAccess, eventId: number): Promise<NextResponse | null> {
  const r = await soldOutJson(`/event/get?eventId=${eventId}`, access.accessToken)
  if (!r.ok) return fail(r.status >= 500 ? 502 : 404, r.status >= 500 ? r.message : 'Event not found.')
  const event = r.data.event as Record<string, unknown> | undefined
  return event && Number(event.companyId) === access.companyId ? null : fail(404, 'Event not found.')
}

/** A positive whole-number id from a path or query value, or null. */
export function idFrom(value: string | null | undefined): number | null {
  if (!value || !/^\d{1,15}$/.test(value)) return null
  const id = Number(value)
  return id > 0 ? id : null
}
