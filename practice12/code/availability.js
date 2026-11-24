// Layer 2: deterministic availability calculation. Pure: no DOM, no clock, no randomness.
// The fixture (now, bookings, room name) is passed in, so the same input always gives the same output.
import { toMinutes } from "../../src/core/time.js";
import { overlaps } from "../../src/core/availability.js";
import { MESSAGES } from "./messages.js";
import { validateRawInput } from "./validate.js";

export const END_OF_DAY = 24 * 60;

/** Minutes since midnight → "HH:MM". 1440 is shown as "24:00" (a booking may end exactly at midnight). */
export function formatMinutes(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Rules after input validation, in contract order:
 * IN_PAST → INVALID_INPUT (ends after 24:00) → BLOCKED → CONFLICT → AVAILABLE.
 * `request` = { start, duration, blocked } in minutes (output of validateRawInput).
 */
export function checkRequest(request, fixture) {
  const { start, duration, blocked } = request;
  const now = toMinutes(fixture.now);
  // AC1: strictly after now. A misconfigured `now` fails closed (treated as "too late for anything").
  if (now === null || start <= now) {
    return { available: false, code: "IN_PAST", message: MESSAGES.inPast(fixture.now) };
  }
  const end = start + duration;
  if (end > END_OF_DAY) {
    return { available: false, code: "INVALID_INPUT", message: MESSAGES.endsAfterMidnight };
  }
  if (blocked) return { available: false, code: "BLOCKED", message: MESSAGES.blocked };
  // AC3: half-open intervals via the shared overlaps(); touching is allowed.
  // Fail closed: a booking that cannot be parsed counts as a conflict, never as "free".
  const conflict = fixture.bookings.find((b) => {
    const bs = toMinutes(b.start), be = toMinutes(b.end);
    return bs === null || be === null || be <= bs || overlaps(start, end, bs, be);
  });
  if (conflict) return { available: false, code: "CONFLICT", message: MESSAGES.conflict(conflict) };
  return {
    available: true,
    code: "AVAILABLE",
    message: MESSAGES.available(fixture.roomName, formatMinutes(start), formatMinutes(end)),
  };
}

/** Full contract: raw form/test input → { available, code, message }. Never mutates the fixture. */
export function evaluate(raw, fixture) {
  const v = validateRawInput(raw);
  if (!v.ok) return { available: v.available, code: v.code, message: v.message };
  return checkRequest(v, fixture);
}
