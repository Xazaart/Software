import { test } from "node:test";
import assert from "node:assert/strict";
import { room, checkAvailability as check } from "./app.js";

test("AC1: malformed times are rejected", () => {
  assert.match(check("25:00", "10:00").message, /HH:MM/);
  assert.match(check("abc", "10:00").message, /HH:MM/);
});
test("AC1: end must be after start", () => {
  assert.equal(check("15:00", "14:00").available, false);
  assert.equal(check("15:00", "15:00").available, false);
});
test("AC1: start cannot be before current time", () => {
  assert.match(check("08:30", "09:30").message, /past/);
});
test("AC2 boundary: exactly 120 minutes allowed", () => {
  assert.equal(check("15:00", "17:00").available, true);
});
test("AC2 boundary: 121 minutes rejected", () => {
  assert.match(check("15:00", "17:01").message, /120/);
});
test("AC3: blocked room is never available", () => {
  assert.match(check("15:00", "16:00", { ...room, blocked: true }).message, /blocked/);
});
test("AC4 boundary: touching intervals allowed", () => {
  assert.equal(check("09:00", "10:00").available, true);
  assert.equal(check("11:00", "12:00").available, true);
});
test("AC4 boundary: overlapping intervals rejected", () => {
  assert.equal(check("10:59", "11:30").available, false);
  assert.equal(check("12:30", "14:30").available, false);
});
test("AC5: checks do not mutate bookings; data is frozen", () => {
  const before = JSON.stringify(room);
  check("10:30", "11:30");
  assert.equal(JSON.stringify(room), before);
  assert.throws(() => room.bookings.push({ start: "18:00", end: "19:00" }), TypeError);
});
