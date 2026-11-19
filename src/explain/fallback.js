// Deterministic explanations, one per reason code. Used whenever the adapter output is rejected (EX-5).
// They only use context facts and never echo free-form user input for INVALID_TIME.

const TEMPLATES = {
  AVAILABLE: (c) => `${c.roomName} is available from ${c.requestedStart} to ${c.requestedEnd}: the slot passed every booking rule.`,
  CONFLICT: (c) => (c.conflict
    ? `${c.roomName} is not available because it is already booked from ${c.conflict.start} to ${c.conflict.end}.`
    : `${c.roomName} is not available because it is already booked at an overlapping time.`),
  BLOCKED: (c) => `${c.roomName} is not available because the room is blocked for booking.`,
  INVALID_TIME: (c) => `${c.roomName} is not available for this request because the times are not in HH:MM format.`,
  END_BEFORE_START: (c) => `${c.roomName} is not available for this request because the end time must be after the start time.`,
  IN_PAST: (c) => `${c.roomName} is not available for this request because the start time is before the current time (${c.currentTime}).`,
  TOO_LONG: (c) => `${c.roomName} is not available for this request because bookings can last at most ${c.maxDurationMinutes} minutes.`,
  DATA_ERROR: (c) => `${c.roomName} is not available because its schedule data could not be verified.`,
};

export function fallbackExplanation(ctx) {
  const template = TEMPLATES[ctx?.reasonCode];
  if (!template) return "This room is not available: the booking could not be confirmed.";
  return template(ctx);
}
