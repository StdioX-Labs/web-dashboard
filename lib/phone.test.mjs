import { test } from "node:test"
import assert from "node:assert/strict"
import { formatPhoneNumber, isValidPhoneNumber } from "./phone.ts"

test("every common shape formats to 254XXXXXXXXX", () => {
  for (const input of ["0712345678", "254712345678", "+254 712 345 678", "712345678", "+254 0712 345 678"]) {
    assert.equal(formatPhoneNumber(input), "254712345678")
  }
})

test("accepts exactly one Kenyan number", () => {
  assert.ok(isValidPhoneNumber("0712345678"))
  assert.ok(isValidPhoneNumber("0110 000 000"))
})

test("refuses numbers that are too long, too short or empty", () => {
  assert.ok(!isValidPhoneNumber("07123456789"))
  assert.ok(!isValidPhoneNumber("2547123456789"))
  assert.ok(!isValidPhoneNumber("0712345"))
  assert.ok(!isValidPhoneNumber(""))
})
