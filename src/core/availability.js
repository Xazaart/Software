import { toMinutes } from "./time.js";

export const MAX_DURATION_MINUTES = 120;

export function validateRequest(start, end, now) {
  const s = toMinutes(start), e = toMinutes(end), n = toMinutes(now);
  if (n === null) return { ok: false, code: "DATA_ERROR", message: "Current time is not configured correctly." };
  if (s === null || e === null) return { ok: false, code: "INVALID_TIME", message: "Enter times in HH:MM format." };
  if (e <= s) return { ok: false, code: "END_BEFORE_START", message: "End time must be after start time." };
  if (s < n) return { ok: false, code: "IN_PAST", message: `Start time cannot be before the current time (${now}).` };
  if (e - s > MAX_DURATION_MINUTES) {
    return { ok: false, code: "TOO_LONG", message: `Bookings can last at most ${MAX_DURATION_MINUTES} minutes.` };
  }
  return { ok: true, start: s, end: e };
}

/** Half-open intervals: touching (end === start) is NOT an overlap. */
export function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

export function checkAvailability(room, start, end, now) {
  const v = validateRequest(start, end, now);
  if (!v.ok) return { available: false, code: v.code, message: v.message };
  if (room.blocked) {
    return { available: false, code: "BLOCKED", message: `${room.name} is blocked and cannot be booked.` };
  }
  // Fail closed: a booking we cannot parse must never be treated as "no conflict".
  const parsed = room.bookings.map((b) => ({ b, s: toMinutes(b.start), e: toMinutes(b.end) }));
  if (parsed.some(({ s, e }) => s === null || e === null || e <= s)) {
    return { available: false, code: "DATA_ERROR", message: `${room.name} has invalid booking data; availability cannot be confirmed.` };
  }
  const conflict = parsed.find(({ s, e }) => overlaps(v.start, v.end, s, e))?.b;
  if (conflict) {
    return { available: false, code: "CONFLICT", message: `${room.name} is already booked ${conflict.start}–${conflict.end}.` };
  }
  return { available: true, code: "AVAILABLE", message: `${room.name} is free ${start}–${end}.` };
}
