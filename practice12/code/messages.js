// Exact visible messages from practice12/CONTRACT.md. Do not reword them.
export const MESSAGES = Object.freeze({
  available: (roomName, start, end) => `Available: ${roomName} is free ${start}–${end}.`,
  conflict: (b) => `Unavailable: overlaps the existing booking ${b.start}–${b.end}.`,
  blocked: "Unavailable: the room is blocked.",
  inPast: (now) => `Invalid input: start time must be after the current time ${now}.`,
  invalidDuration: "Invalid input: duration must be a whole number from 1 to 120 minutes.",
  invalidStart: "Invalid input: enter the start time as HH:MM.",
  endsAfterMidnight: "Invalid input: the booking must end by 24:00.",
});
