import { test } from "node:test";
import assert from "node:assert/strict";
import { ROOMS, CURRENT_TIME } from "../src/data/rooms.js";
import { checkAvailability } from "../src/core/availability.js";

const room = ROOMS.find((r) => r.id === "R101"); // bookings 10:00–11:00, 13:00–14:30
const check = (s, e, r = room) => checkAvailability(r, s, e, CURRENT_TIME);

test("AC1: malformed times are rejected", () => {
  assert.equal(check("25:00", "10:00").code, "INVALID_TIME");
  assert.equal(check("abc", "10:00").code, "INVALID_TIME");
});
test("AC1: end must be after start", () => {
  assert.equal(check("15:00", "14:00").code, "END_BEFORE_START");
  assert.equal(check("15:00", "15:00").code, "END_BEFORE_START");
});
test("AC1: start cannot be before the fixed current time", () => {
  assert.equal(check("08:30", "09:30").code, "IN_PAST");
});
test("AC2 boundary: exactly 120 minutes is allowed", () => {
  assert.equal(check("15:00", "17:00").available, true);
});
test("AC2 boundary: 121 minutes is rejected", () => {
  assert.equal(check("15:00", "17:01").code, "TOO_LONG");
});
test("AC3: a blocked room is never available", () => {
  const blocked = ROOMS.find((r) => r.blocked);
  assert.equal(check("15:00", "16:00", blocked).code, "BLOCKED");
});
test("AC4 boundary: touching intervals do not conflict", () => {
  assert.equal(check("09:00", "10:00").available, true); // ends as a booking starts
  assert.equal(check("11:00", "12:00").available, true); // starts as a booking ends
});
test("AC4 boundary: overlapping intervals conflict", () => {
  assert.equal(check("10:59", "11:30").code, "CONFLICT");
  assert.equal(check("12:30", "14:30").code, "CONFLICT");
});
test("AC5: checks never mutate booking data, and data is frozen", () => {
  const before = JSON.stringify(ROOMS);
  check("10:30", "11:30");
  check("15:00", "16:00");
  assert.equal(JSON.stringify(ROOMS), before);
  assert.throws(() => room.bookings.push({ start: "18:00", end: "19:00" }), TypeError);
});
