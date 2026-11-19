import { toMinutes } from "../core/time.js";
import { overlaps, MAX_DURATION_MINUTES } from "../core/availability.js";

// Builds the ONLY facts an explanation adapter may use (EXPLAIN_FEATURE.md "Inputs").
// It copies the decision from checkAvailability(); it never re-decides availability.

export const REASON_CODES = Object.freeze([
  "AVAILABLE", "CONFLICT", "BLOCKED", "INVALID_TIME", "END_BEFORE_START", "IN_PAST", "TOO_LONG", "DATA_ERROR",
]);

/** Bound user-entered text so garbage input cannot bloat the context or the explanation. */
const MAX_FIELD_LENGTH = 16;
function boundText(value) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").slice(0, MAX_FIELD_LENGTH);
}

const isNonEmptyString = (v) => typeof v === "string" && v.trim() !== "";

/** Returns true only for a result object that looks like checkAvailability() output and is self-consistent. */
export function isValidResult(result) {
  return Boolean(result)
    && typeof result.available === "boolean"
    && REASON_CODES.includes(result.code)
    && result.available === (result.code === "AVAILABLE");
}

/** First booking that overlaps the request (same order and rule as checkAvailability). */
function findConflict(room, start, end) {
  const s = toMinutes(start), e = toMinutes(end);
  if (s === null || e === null || !Array.isArray(room.bookings)) return null;
  const hit = room.bookings.find((b) => {
    const bs = toMinutes(b.start), be = toMinutes(b.end);
    return bs !== null && be !== null && overlaps(s, e, bs, be);
  });
  return hit ? Object.freeze({ start: hit.start, end: hit.end }) : null;
}

/**
 * room: catalog entry; request: { start, end } as entered; result: checkAvailability() output;
 * now: "HH:MM" current time. Returns a frozen context, or null when inputs are missing/invalid
 * (nothing to explain -> the UI keeps the button disabled).
 */
export function buildExplanationContext(room, request, result, now) {
  if (!room || !isNonEmptyString(room.id) || !isNonEmptyString(room.name)) return null;
  if (!request || typeof request !== "object") return null;
  if (!isValidResult(result)) return null;
  return Object.freeze({
    roomId: room.id,
    roomName: room.name,
    requestedStart: boundText(request.start),
    requestedEnd: boundText(request.end),
    currentTime: boundText(now),
    decision: result.available ? "AVAILABLE" : "UNAVAILABLE",
    reasonCode: result.code,
    conflict: result.code === "CONFLICT" ? findConflict(room, request.start, request.end) : null,
    maxDurationMinutes: MAX_DURATION_MINUTES,
  });
}

/** Structural check used by the service before calling any adapter. */
export function isValidContext(ctx) {
  return Boolean(ctx)
    && isNonEmptyString(ctx.roomId)
    && isNonEmptyString(ctx.roomName)
    && typeof ctx.requestedStart === "string"
    && typeof ctx.requestedEnd === "string"
    && typeof ctx.currentTime === "string"
    && (ctx.decision === "AVAILABLE" || ctx.decision === "UNAVAILABLE")
    && REASON_CODES.includes(ctx.reasonCode)
    && (ctx.decision === "AVAILABLE") === (ctx.reasonCode === "AVAILABLE")
    && Number.isInteger(ctx.maxDurationMinutes);
}
