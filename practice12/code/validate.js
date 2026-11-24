// Layer 1: validation of RAW inputs (strings from the form or from test-cases.json).
// Pure: no DOM, no fixture data, no clock. Never throws for user input.
import { toMinutes } from "../../src/core/time.js";
import { MESSAGES } from "./messages.js";

export const MIN_DURATION = 1;
export const MAX_DURATION = 120;

const WHOLE_NUMBER_RE = /^\d+$/;

/** Raw start → minutes since midnight, or null when missing/malformed. Uses the shared parser. */
export function parseStart(raw) {
  if (typeof raw !== "string") return null;
  return toMinutes(raw.trim());
}

/** Raw duration → whole minutes 1–120, or null. Accepts digits only ("60"), so "1.5", "-5", "1e2", "abc", "" fail. */
export function parseDuration(raw) {
  const text = typeof raw === "number" ? String(raw) : typeof raw === "string" ? raw.trim() : "";
  if (!WHOLE_NUMBER_RE.test(text)) return null;
  const minutes = Number(text);
  return minutes >= MIN_DURATION && minutes <= MAX_DURATION ? minutes : null;
}

/**
 * Contract rule order, input part: INVALID_INPUT (start) → INVALID_DURATION.
 * Returns { ok: true, start, duration, blocked } or { ok: false, available: false, code, message }.
 */
export function validateRawInput(raw = {}) {
  const start = parseStart(raw.start);
  if (start === null) return { ok: false, available: false, code: "INVALID_INPUT", message: MESSAGES.invalidStart };
  const duration = parseDuration(raw.duration);
  if (duration === null) return { ok: false, available: false, code: "INVALID_DURATION", message: MESSAGES.invalidDuration };
  return { ok: true, start, duration, blocked: raw.blocked === true };
}
