import { NextRequest, NextResponse } from 'next/server'
import { readSession } from './dashboard-session'
import { soldOutJson } from './soldout-proxy'

/**
 * Who may manage gate scanner accounts from the dashboard, and over what.
 *
 * Core's /gate/admin/** endpoints are SUPER_ADMIN-only and take any company or
 * event id, and the dashboard reaches them with its service login. So every
 * scanner route takes the company from the signed session cookie (never from
 * the request), re-checks with core that the person is still an active owner
 * there, and checks any scanner or event id it is given belongs to that
 * company before acting on it.
 */

const MANAGERS = new Set(['COMPANY_OWNER', 'SUPER_ADMIN'])

export interface ScannerAccess {
  companyId: number
  userId: number
}

const fail = (status: number, message: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ status: false, message, ...extra }, { status })

/** The caller's company when they may manage its scanners, or the response refusing them. */
export async function scannerAccess(request: NextRequest): Promise<ScannerAccess | NextResponse> {
  const session = readSession(request)
  if (!session) {
    return fail(401, 'Sign in again to manage scanners.', { signIn: true })
  }

  const roster = await soldOutJson(`/company/fetch/users?companyId=${session.companyId}`)
  if (!roster.ok) return fail(roster.status >= 500 ? 502 : roster.status, roster.message)

  const users = Array.isArray(roster.data.users) ? (roster.data.users as Array<Record<string, unknown>>) : []
  const me = users.find((u) => Number(u.id) === session.userId)
  if (!me || me.active === false) {
    return fail(401, 'Your account is no longer active at this company. Sign in again.', { signIn: true })
  }
  if (!MANAGERS.has(String(me.roles))) {
    return fail(403, 'Only a company owner can manage scanners.')
  }
  return { companyId: session.companyId, userId: session.userId }
}

/** Null when the scanner belongs to the company, otherwise the response to send. */
export async function requireOwnScanner(companyId: number, scannerId: number): Promise<NextResponse | null> {
  const r = await soldOutJson(`/gate/admin/scanners?companyId=${companyId}`)
  if (!r.ok) return fail(r.status >= 500 ? 502 : r.status, r.message)
  const scanners = Array.isArray(r.data.scanners) ? (r.data.scanners as Array<Record<string, unknown>>) : []
  return scanners.some((s) => Number(s.id) === scannerId) ? null : fail(404, 'Scanner not found.')
}

/** Null when the event belongs to the company, otherwise the response to send. */
export async function requireOwnEvent(companyId: number, eventId: number): Promise<NextResponse | null> {
  const r = await soldOutJson(`/event/get?eventId=${eventId}`)
  if (!r.ok) return fail(r.status >= 500 ? 502 : 404, r.status >= 500 ? r.message : 'Event not found.')
  const event = r.data.event as Record<string, unknown> | undefined
  return event && Number(event.companyId) === companyId ? null : fail(404, 'Event not found.')
}

/** A positive whole-number id from a path or query value, or null. */
export function idFrom(value: string | null | undefined): number | null {
  if (!value || !/^\d{1,15}$/.test(value)) return null
  const id = Number(value)
  return id > 0 ? id : null
}
