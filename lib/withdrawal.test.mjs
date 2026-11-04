import { test } from "node:test"
import assert from "node:assert/strict"
import {
  buildWithdrawalRequest,
  canRequestWithdrawal,
  confirmationSummary,
  parseWithdrawalNotes,
  toWithdrawalRecords,
  validateWithdrawal,
  withdrawalStatusLabel,
} from "./withdrawal.ts"

const form = (over = {}) => ({
  amount: "5000",
  method: "MPESA_TILL",
  tillNumber: "123456",
  paybillNumber: "",
  accountNumber: "",
  mobileNumber: "",
  recipientName: "",
  ...over,
})

test("staff cannot request a withdrawal; owners, organizers and super admins can", () => {
  assert.equal(canRequestWithdrawal({ role: "STAFF", roles: ["STAFF"] }), false)
  assert.equal(canRequestWithdrawal(null), false)
  for (const role of ["COMPANY_OWNER", "EVENT_ORGANIZER", "SUPER_ADMIN"]) {
    assert.ok(canRequestWithdrawal({ role }))
    assert.ok(canRequestWithdrawal({ role: "STAFF", roles: [role] }))
  }
})

test("a valid till withdrawal has no errors", () => {
  assert.deepEqual(validateWithdrawal(form(), 10000), {})
})

test("M-Pesa needs whole shillings", () => {
  assert.match(validateWithdrawal(form({ amount: "100.50" }), 10000).amount, /whole shillings/)
})

test("amount must be positive and within the balance", () => {
  assert.ok(validateWithdrawal(form({ amount: "0" }), 10000).amount)
  assert.ok(validateWithdrawal(form({ amount: "abc" }), 10000).amount)
  assert.match(validateWithdrawal(form({ amount: "20000" }), 10000).amount, /available balance/)
  assert.equal(validateWithdrawal(form({ amount: "20000" }), null).amount, undefined)
})

test("till and paybill numbers are 5 to 8 digits; paybill needs an account", () => {
  assert.ok(validateWithdrawal(form({ tillNumber: "1234" }), null).tillNumber)
  assert.ok(validateWithdrawal(form({ tillNumber: "123456789" }), null).tillNumber)
  const paybill = validateWithdrawal(form({ method: "MPESA_PAYBILL", paybillNumber: "12a45" }), null)
  assert.ok(paybill.paybillNumber)
  assert.ok(paybill.accountNumber)
})

test("Paystack M-Pesa needs a Kenyan number and the line's name", () => {
  const errors = validateWithdrawal(form({ method: "PAYSTACK_MPESA", mobileNumber: "12345" }), null)
  assert.ok(errors.mobileNumber)
  assert.ok(errors.recipientName)
  assert.deepEqual(
    validateWithdrawal(form({ method: "PAYSTACK_MPESA", mobileNumber: "0712 345 678", recipientName: "Jane" }), null),
    {}
  )
})

test("the request carries only the chosen method's fields", () => {
  const request = buildWithdrawalRequest(
    form({ method: "MPESA_PAYBILL", paybillNumber: " 400200 ", accountNumber: " ACC1 ", tillNumber: "999999" }),
    "key-1"
  )
  assert.deepEqual(request, {
    amount: 5000,
    idempotentKey: "key-1",
    method: "MPESA_PAYBILL",
    paybillNumber: "400200",
    accountNumber: "ACC1",
  })
})

test("the confirmation reads like core's SMS", () => {
  assert.equal(confirmationSummary(buildWithdrawalRequest(form(), "k")), "Withdraw KES 5,000 to till 123456")
  assert.equal(
    confirmationSummary(buildWithdrawalRequest(form({ method: "PAYSTACK_MPESA", mobileNumber: "0712345678", recipientName: "Jane Doe" }), "k")),
    "Withdraw KES 5,000 to M-Pesa 254712345678 (Jane Doe)"
  )
})

test("withdrawal notes decode form-style values", () => {
  assert.deepEqual(parseWithdrawalNotes("requested_by=7;method=PAYSTACK_MPESA;recipientName=Jane+Doe%26Co"), {
    requested_by: "7",
    method: "PAYSTACK_MPESA",
    recipientName: "Jane Doe&Co",
  })
  assert.deepEqual(parseWithdrawalNotes(null), {})
})

test("history keeps withdrawals only, newest first, without the requester", () => {
  const records = toWithdrawalRecords([
    { transactionReference: "A", transactionTypes: "WITHDRAWAL", status: "COMPLETED", amount: 100, currency: "KES", description: "requested_by=7;method=MPESA_TILL;tillNumber=123456" },
    { transactionReference: "B", transactionTypes: "DEPOSIT", status: "COMPLETED", amount: 5 },
    { transactionReference: "C", transactionTypes: "WITHDRAWAL", status: "PROCESSING", amount: "250", description: "" },
  ])
  assert.deepEqual(records.map((r) => r.reference), ["C", "A"])
  assert.equal(records[1].destination, "to till 123456")
  assert.equal(records[0].amount, 250)
  assert.ok(!JSON.stringify(records).includes("requested_by"))
})

test("statuses read as the organiser expects", () => {
  assert.equal(withdrawalStatusLabel("PROCESSING"), "Waiting for approval")
  assert.equal(withdrawalStatusLabel("COMPLETED"), "Paid")
  assert.equal(withdrawalStatusLabel("FAILED"), "Rejected / refunded")
})
