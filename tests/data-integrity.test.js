import { test } from "node:test";
import assert from "node:assert/strict";
import { checkAvailability } from "../src/core/availability.js";

// R1: malformed data must fail closed (never "available"). Fictional probe rooms only.
const room = (bookings) => ({ id: "T1", name: "Test Room", capacity: 10, equipment: [], blocked: false, bookings });

test("R1: malformed booking END is reported as DATA_ERROR, not available", () => {
  const r = checkAvailability(room([{ start: "09:30", end: "11:3" }]), "10:00", "11:00", "09:00");
  assert.equal(r.available, false);
  assert.equal(r.code, "DATA_ERROR");
});
test("R1: malformed booking START is reported as DATA_ERROR", () => {
  assert.equal(checkAvailability(room([{ start: "9:30", end: "11:30" }]), "10:00", "11:00", "09:00").code, "DATA_ERROR");
});
test("R1: a booking whose end is not after its start is reported as DATA_ERROR", () => {
  assert.equal(checkAvailability(room([{ start: "12:00", end: "11:00" }]), "15:00", "16:00", "09:00").code, "DATA_ERROR");
});
test("R1: malformed current time fails closed instead of skipping the past-time check", () => {
  assert.equal(checkAvailability(room([]), "07:00", "08:00", "9:00").code, "DATA_ERROR");
});
test("R1: valid data behaves exactly as before (touching allowed, overlap rejected)", () => {
  const r = room([{ start: "10:00", end: "11:00" }]);
  assert.equal(checkAvailability(r, "11:00", "12:00", "09:00").available, true);
  assert.equal(checkAvailability(r, "10:30", "11:30", "09:00").code, "CONFLICT");
});
