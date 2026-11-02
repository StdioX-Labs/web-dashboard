import { test } from "node:test"
import assert from "node:assert/strict"
import { startDateError } from "./event-dates.ts"

const now = new Date("2026-11-02T12:00:00Z")
const hoursFromNow = (h) => new Date(now.getTime() + h * 3600_000)

test("a new event can't start in the past", () => {
  assert.ok(startDateError(hoursFromNow(-24), undefined, now))
  assert.equal(startDateError(hoursFromNow(24), undefined, now), null)
})

test("a start a few minutes ago is allowed, for the upload in between", () => {
  assert.equal(startDateError(new Date(now.getTime() - 5 * 60_000), undefined, now), null)
})

test("an event that already started keeps or corrects its start", () => {
  assert.equal(startDateError(hoursFromNow(-2), hoursFromNow(-2), now), null)
  assert.equal(startDateError(hoursFromNow(-3), hoursFromNow(-2), now), null)
})

test("an upcoming event can't be moved into the past", () => {
  assert.ok(startDateError(hoursFromNow(-2), hoursFromNow(48), now))
  assert.equal(startDateError(hoursFromNow(72), hoursFromNow(48), now), null)
})
