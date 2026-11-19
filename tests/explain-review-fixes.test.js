import { test } from "node:test";
import assert from "node:assert/strict";
import { validateExplanation } from "../src/explain/validate.js";
import { createRequestGate } from "../src/app/requestGate.js";

// Fictional contexts (same shape as buildExplanationContext output).
const CONFLICT = Object.freeze({ roomId: "R202", roomName: "Birch Computer Lab", requestedStart: "10:00", requestedEnd: "11:00",
  currentTime: "09:00", decision: "UNAVAILABLE", reasonCode: "CONFLICT", conflict: { start: "09:30", end: "11:30" }, maxDurationMinutes: 120 });
const AVAILABLE = Object.freeze({ roomId: "R505", roomName: "Echo Studio", requestedStart: "12:30", requestedEnd: "13:30",
  currentTime: "09:00", decision: "AVAILABLE", reasonCode: "AVAILABLE", conflict: null, maxDurationMinutes: 120 });

// ---------- Review fix R2: reworded contradictions and unsupported claims ----------
test("R2: double negation that means 'available' is rejected for an UNAVAILABLE decision", () => {
  assert.equal(validateExplanation("Birch Computer Lab is not unavailable.", CONFLICT).ok, false);
});
test("R2: 'not available? No, you may reserve it now' is rejected", () => {
  assert.equal(validateExplanation("Birch Computer Lab is not available? No, you may reserve it now.", CONFLICT).ok, false);
});
test("R2: invented alternative room is rejected", () => {
  const t = "Birch Computer Lab is not available because it is already booked from 09:30 to 11:30. Try Cedar Lecture Hall instead.";
  assert.equal(validateExplanation(t, CONFLICT).reason, "unsupported-claim");
});
test("R2: invented reason without the conflicting booking is rejected", () => {
  assert.equal(validateExplanation("Birch Computer Lab is not available because it is reserved for exams by the dean.", CONFLICT).reason, "missing-fact");
});
test("R2: promise of an action on an AVAILABLE decision is rejected (the demo cannot book)", () => {
  assert.equal(validateExplanation("Echo Studio is available from 12:30 to 13:30, so you can go ahead and reserve it.", AVAILABLE).reason, "unsupported-claim");
});
test("R2: a correct, fact-based explanation is still accepted", () => {
  const t = "Birch Computer Lab is not available 10:00–11:00 because it is already booked 09:30–11:30, which overlaps your request.";
  assert.deepEqual(validateExplanation(t, CONFLICT), { ok: true, text: t });
  assert.equal(validateExplanation("Echo Studio is available 12:30–13:30.", AVAILABLE).ok, true);
});

// ---------- Review fix R1: only the newest Explain request may update the page ----------
test("R1: an older request is not current once a newer one starts", () => {
  const gate = createRequestGate();
  const a = gate.begin();
  const b = gate.begin();
  assert.equal(gate.isCurrent(a), false);
  assert.equal(gate.isCurrent(b), true);
});
test("R1: invalidate() (any input change) makes every pending request stale", () => {
  const gate = createRequestGate();
  const a = gate.begin();
  gate.invalidate();
  assert.equal(gate.isCurrent(a), false);
  assert.equal(gate.pending(), false);
});
test("R1: pending() is true only while the newest request is unresolved", () => {
  const gate = createRequestGate();
  const a = gate.begin();
  const b = gate.begin();
  gate.finish(a); // the stale reply arrives first: must NOT clear the pending state of b
  assert.equal(gate.pending(), true);
  gate.finish(b);
  assert.equal(gate.pending(), false);
});
