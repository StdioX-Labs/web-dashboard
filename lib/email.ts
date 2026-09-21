/**
 * Canonical form for an email address: trimmed and lower-cased.
 *
 * Strictly, RFC 5321 makes only the domain case-insensitive — the local part
 * is the mailbox owner's business, and a host is entitled to treat `Foo@` and
 * `foo@` as different people. In practice no provider anyone signs up with
 * does, and the backend here already expects addresses pre-normalised, so the
 * whole address is lower-cased rather than just the domain. The alternative —
 * preserving local-part case — means the same person fails to match their own
 * account after typing their address with a capital on a phone keyboard.
 *
 * Applied at the boundaries (the API client and the login proxy) so no call
 * site has to remember to, and at the inputs so what someone sees is what is
 * actually sent.
 */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

/** Phone-or-email login identifiers: only normalise the ones that are emails. */
export function normalizeLoginId(id: string, method: 'email' | 'phone'): string {
  return method === 'email' ? normalizeEmail(id) : id.trim()
}
