import { toMinutes } from "./time.js";

export const MAX_DURATION_MINUTES = 120;

export function validateRequest(start, end, now) {
  const s = toMinutes(start), e = toMinutes(end), n = toMinutes(now);
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
  const conflict = room.bookings.find((b) =>
    overlaps(v.start, v.end, toMinutes(b.start), toMinutes(b.end))
  );
  if (conflict) {
    return { available: false, code: "CONFLICT", message: `${room.name} is already booked ${conflict.start}–${conflict.end}.` };
  }
  return { available: true, code: "AVAILABLE", message: `${room.name} is free ${start}–${end}.` };
}
