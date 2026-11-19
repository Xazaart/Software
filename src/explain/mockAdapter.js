// MOCK LLM adapter. No network, no keys: it builds text from the structured context only.
// A real model adapter must expose the same generate(context, { signal }) contract and run server-side.

export const MOCK_MODES = Object.freeze([
  "normal",      // good explanation
  "throw",       // adapter / API failure
  "slow",        // answers after delayMs (default 2500 ms, beyond the 2000 ms timeout)
  "empty",       // whitespace only
  "long",        // more than 300 characters
  "contradict",  // states the opposite decision
  "hallucinate", // invents a time that is not in the context
  "non-string",  // returns a non-string value
]);

function normalText(c) {
  const slot = `from ${c.requestedStart} to ${c.requestedEnd}`;
  switch (c.reasonCode) {
    case "AVAILABLE":
      return `${c.roomName} is available ${slot} because the slot is within the ${c.maxDurationMinutes}-minute limit and does not overlap any existing booking.`;
    case "CONFLICT":
      return c.conflict
        ? `${c.roomName} is not available ${slot} because it is already booked from ${c.conflict.start} to ${c.conflict.end}. Please try a slot that does not overlap that booking.`
        : `${c.roomName} is not available ${slot} because it is already booked at an overlapping time.`;
    case "BLOCKED":
      return `${c.roomName} is not available because the room is blocked and cannot be booked today.`;
    case "INVALID_TIME":
      return `${c.roomName} is not available for this request because the start or end time is not in HH:MM format. Please enter both times as hours and minutes.`;
    case "END_BEFORE_START":
      return `${c.roomName} is not available ${slot} because the end time must be after the start time.`;
    case "IN_PAST":
      return `${c.roomName} is not available ${slot} because the start time is before the current time ${c.currentTime}.`;
    case "TOO_LONG":
      return `${c.roomName} is not available ${slot} because bookings can last at most ${c.maxDurationMinutes} minutes.`;
    default:
      return `${c.roomName} is not available because its schedule data could not be verified.`;
  }
}

function contradictText(c) {
  return c.decision === "AVAILABLE"
    ? `${c.roomName} is not available at that time.`
    : `Good news: ${c.roomName} is available, go ahead and book it.`;
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new Error("aborted"));
    }, { once: true });
  });
}

/** createMockAdapter({ mode, delayMs }) -> { name, generate(context, { signal }) => Promise<string> } */
export function createMockAdapter({ mode = "normal", delayMs } = {}) {
  if (!MOCK_MODES.includes(mode)) throw new TypeError(`Unknown mock mode: ${mode}`);
  return Object.freeze({
    name: "llm-mock",
    mode,
    async generate(context, { signal } = {}) {
      const delay = delayMs ?? (mode === "slow" ? 2500 : 0);
      if (delay > 0) await wait(delay, signal);
      switch (mode) {
        case "throw": throw new Error("Mock adapter failure (simulated API error)");
        case "empty": return "   \n ";
        case "long": return `${normalText(context)} ${"This sentence only pads the answer. ".repeat(10)}`;
        case "contradict": return contradictText(context);
        case "hallucinate": return `${context.roomName} is not available because it is booked from 17:45 to 18:15.`;
        case "non-string": return { text: normalText(context) };
        default: return normalText(context);
      }
    },
  });
}
