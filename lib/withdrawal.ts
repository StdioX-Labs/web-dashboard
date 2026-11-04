// Treasury withdrawals: the rules the payouts page and its API route share.
// Mirrors core's PayoutDestination so a request that passes here reads the
// same way core will describe it in the confirmation SMS.
// Self-contained (no imports) so `node --test` can load it directly.

export type WithdrawalMethod = 'MPESA_TILL' | 'MPESA_PAYBILL' | 'PAYSTACK_MPESA'

export const WITHDRAWAL_METHODS: Array<{ value: WithdrawalMethod; label: string; hint: string }> = [
  { value: 'MPESA_TILL', label: 'M-Pesa till', hint: 'Buy Goods till number' },
  { value: 'MPESA_PAYBILL', label: 'M-Pesa paybill', hint: 'Paybill number and account' },
  { value: 'PAYSTACK_MPESA', label: 'M-Pesa number', hint: 'Sent to a phone number via Paystack' },
]

export interface WithdrawalForm {
  amount: string
  method: WithdrawalMethod
  tillNumber: string
  paybillNumber: string
  accountNumber: string
  mobileNumber: string
  recipientName: string
}

/** The body core's /transaction/withdraw/initialize takes, minus companyId (added server-side). */
export interface WithdrawalRequest {
  amount: number
  idempotentKey: string
  method: WithdrawalMethod
  tillNumber?: string
  paybillNumber?: string
  accountNumber?: string
  mobileNumber?: string
  recipientName?: string
  stepUpChallengeId?: string
  stepUpCode?: string
}

/** Roles core lets request a withdrawal. STAFF (and anyone else) may not. */
export const WITHDRAWAL_ROLES = ['COMPANY_OWNER', 'EVENT_ORGANIZER', 'SUPER_ADMIN']

export function canRequestWithdrawal(user: { role?: string; roles?: string[] } | null | undefined): boolean {
  if (!user) return false
  const roles = [...(user.roles ?? []), ...(user.role ? [user.role] : [])]
  return roles.some((role) => WITHDRAWAL_ROLES.includes(role))
}

export function isWithdrawalMethod(value: unknown): value is WithdrawalMethod {
  return WITHDRAWAL_METHODS.some((m) => m.value === value)
}

/** Every method pays out to M-Pesa, which only moves whole shillings. */
export function requiresWholeAmount(method: WithdrawalMethod): boolean {
  return method === 'MPESA_TILL' || method === 'MPESA_PAYBILL' || method === 'PAYSTACK_MPESA'
}

const digitsOnly = (value: string) => value.replace(/\D/g, '')

/** Kenyan mobile in 254XXXXXXXXX form; core normalises again, this is for display and checks. */
export function normaliseKenyanMobile(input: string): string {
  let cleaned = digitsOnly(input)
  if (cleaned.startsWith('0')) cleaned = '254' + cleaned.slice(1)
  if (!cleaned.startsWith('254')) cleaned = '254' + cleaned
  if (cleaned.startsWith('2540')) cleaned = '254' + cleaned.slice(4)
  return cleaned
}

export type FormErrors = Partial<Record<keyof WithdrawalForm, string>>

/** Field-by-field problems with the form; empty when it can be sent. */
export function validateWithdrawal(form: WithdrawalForm, balance: number | null): FormErrors {
  const errors: FormErrors = {}
  const raw = form.amount.trim().replace(/,/g, '')
  const amount = Number(raw)

  if (!raw || !Number.isFinite(amount) || amount <= 0) {
    errors.amount = 'Enter an amount to withdraw'
  } else if (requiresWholeAmount(form.method) && !Number.isInteger(amount)) {
    errors.amount = 'M-Pesa pays whole shillings only. Enter a whole amount'
  } else if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
    errors.amount = 'Use at most two decimal places'
  } else if (balance !== null && amount > balance) {
    errors.amount = 'That is more than your available balance'
  }

  switch (form.method) {
    case 'MPESA_TILL':
      if (!/^\d{5,8}$/.test(form.tillNumber.trim())) errors.tillNumber = 'A till number is 5 to 8 digits'
      break
    case 'MPESA_PAYBILL':
      if (!/^\d{5,8}$/.test(form.paybillNumber.trim())) errors.paybillNumber = 'A paybill number is 5 to 8 digits'
      if (!form.accountNumber.trim()) errors.accountNumber = 'Enter the paybill account number'
      break
    case 'PAYSTACK_MPESA':
      if (!/^254[17]\d{8}$/.test(normaliseKenyanMobile(form.mobileNumber))) {
        errors.mobileNumber = 'Enter a Kenyan M-Pesa number, e.g. 0712 345 678'
      }
      if (!form.recipientName.trim()) errors.recipientName = 'Enter the name registered on that M-Pesa line'
      break
  }
  return errors
}

/** The request for this form. The same key is reused for the code step of one attempt. */
export function buildWithdrawalRequest(form: WithdrawalForm, idempotentKey: string): WithdrawalRequest {
  const request: WithdrawalRequest = {
    amount: Number(form.amount.trim().replace(/,/g, '')),
    idempotentKey,
    method: form.method,
  }
  if (form.method === 'MPESA_TILL') request.tillNumber = form.tillNumber.trim()
  if (form.method === 'MPESA_PAYBILL') {
    request.paybillNumber = form.paybillNumber.trim()
    request.accountNumber = form.accountNumber.trim()
  }
  if (form.method === 'PAYSTACK_MPESA') {
    request.mobileNumber = form.mobileNumber.trim()
    request.recipientName = form.recipientName.trim()
  }
  return request
}

/** "to till 123456", worded like core's confirmation SMS. */
export function describeDestination(fields: Partial<Record<string, string>>): string {
  switch (fields.method) {
    case 'MPESA_TILL':
      return `to till ${fields.tillNumber ?? ''}`.trim()
    case 'MPESA_PAYBILL':
      return `to paybill ${fields.paybillNumber ?? ''} acc ${fields.accountNumber ?? ''}`.trim()
    case 'PAYSTACK_MPESA':
      return `to M-Pesa ${fields.mobileNumber ?? ''}${fields.recipientName ? ` (${fields.recipientName})` : ''}`
    case 'MANUAL':
      return 'paid manually'
    default:
      return ''
  }
}

export function formatMoney(amount: number, currency = 'KES'): string {
  const whole = Number.isInteger(amount)
  return `${currency} ${amount.toLocaleString('en-KE', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
}

/** "Withdraw KES 5,000 to till 123456" */
export function confirmationSummary(request: WithdrawalRequest, currency = 'KES'): string {
  const destination = describeDestination({
    method: request.method,
    tillNumber: request.tillNumber,
    paybillNumber: request.paybillNumber,
    accountNumber: request.accountNumber,
    mobileNumber: request.mobileNumber ? normaliseKenyanMobile(request.mobileNumber) : undefined,
    recipientName: request.recipientName,
  })
  return `Withdraw ${formatMoney(request.amount, currency)} ${destination}`
}

/**
 * Core keeps a withdrawal's destination in its description as
 * key=value;key=value with URL-encoded (form-style, + for space) values.
 */
export function parseWithdrawalNotes(notes: string | null | undefined): Record<string, string> {
  const fields: Record<string, string> = {}
  if (!notes) return fields
  for (const pair of notes.split(';')) {
    const at = pair.indexOf('=')
    if (at <= 0) continue
    const key = pair.slice(0, at).trim()
    try {
      fields[key] = decodeURIComponent(pair.slice(at + 1).replace(/\+/g, ' '))
    } catch {
      fields[key] = pair.slice(at + 1)
    }
  }
  return fields
}

export type WithdrawalStatus = 'INITIATED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, string> = {
  INITIATED: 'Requested',
  PROCESSING: 'Waiting for approval',
  COMPLETED: 'Paid',
  FAILED: 'Rejected / refunded',
}

export function withdrawalStatusLabel(status: string): string {
  return WITHDRAWAL_STATUS_LABELS[status as WithdrawalStatus] ?? status
}

/** One withdrawal as the payouts page shows it (built server-side from core's wallet transactions). */
export interface WithdrawalRecord {
  reference: string
  amount: number
  currency: string
  status: string
  destination: string
  method: string | null
  errorMessage: string | null
}

interface CoreTransaction {
  transactionReference?: string
  transactionTypes?: string
  status?: string
  currency?: string
  amount?: number | string
  description?: string | null
  errorMessage?: string | null
}

/** Withdrawals out of core's wallet transactions, newest first; who requested it is dropped. */
export function toWithdrawalRecords(transactions: CoreTransaction[] | undefined, fallbackCurrency = 'KES'): WithdrawalRecord[] {
  return (transactions ?? [])
    .filter((t) => t.transactionTypes === 'WITHDRAWAL')
    .map((t) => {
      const fields = parseWithdrawalNotes(t.description)
      return {
        reference: t.transactionReference ?? '',
        amount: Number(t.amount ?? 0),
        currency: t.currency || fallbackCurrency,
        status: t.status ?? 'INITIATED',
        destination: describeDestination(fields),
        method: fields.method ?? null,
        errorMessage: t.errorMessage ?? null,
      }
    })
    .reverse()
}
