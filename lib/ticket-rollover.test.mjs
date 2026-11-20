import { test } from "node:test"
import assert from "node:assert/strict"
import { rolloverBadge, rolloverChoices, rolloverOrder, rolloverSteps } from "./ticket-rollover.ts"

const node = (key, after = null) => ({ key, name: `T${key}`, after })
const keys = (nodes) => nodes.map((n) => n.key)

test("a ticket can't open after itself, a ticket with another follower, or its own follower", () => {
  // 1 → 2 → 3, and 4 sells on its own
  const nodes = [node(1), node(2, 1), node(3, 2), node(4)]
  assert.deepEqual(keys(rolloverChoices(nodes, 4)), [3])
  // 2 keeps its current predecessor, and can't follow 3, which follows it
  assert.deepEqual(keys(rolloverChoices(nodes, 2)), [1, 4])
  assert.deepEqual(keys(rolloverChoices(nodes, 1)), [4])
})

test("predecessors are created before their followers", () => {
  const nodes = [node("gate", "advance"), node("advance", "early"), node("early"), node("vip")]
  assert.deepEqual(keys(rolloverOrder(nodes)), ["early", "vip", "advance", "gate"])
})

test("a ticket gives up its predecessor before another takes it", () => {
  const saved = new Map([[1, null], [2, 1], [3, null]])
  // 2 stops following 1, and 3 starts
  const steps = rolloverSteps(saved, [{ id: 3, to: 1 }, { id: 2, to: null }])
  assert.deepEqual(steps, [{ id: 2, to: null }, { id: 3, to: 1 }])
})

test("two tickets swapping predecessors unlink one first", () => {
  const saved = new Map([[1, null], [2, null], [3, 1], [4, 2]])
  const steps = rolloverSteps(saved, [{ id: 3, to: 2 }, { id: 4, to: 1 }])
  assert.deepEqual(steps, [{ id: 3, to: null }, { id: 4, to: 1 }, { id: 3, to: 2 }])
})

test("a queued ticket says what it waits for", () => {
  const nameOf = (id) => (id === 7 ? "Early Bird" : undefined)
  assert.deepEqual(rolloverBadge("PENDING", 7, nameOf), { queued: true, label: "Queued · opens after Early Bird" })
  assert.deepEqual(rolloverBadge("ACTIVE", 7, nameOf), { queued: false, label: "After Early Bird" })
  assert.equal(rolloverBadge("PENDING", null, nameOf), null)
})
