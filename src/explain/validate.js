// Output validator: decides whether adapter text may be shown (EX-3, EX-4, EX-5).
// It can only accept or reject text; it never touches the decision.

export const MAX_EXPLANATION_LENGTH = 300;
export const MAX_SENTENCES = 2;

// Phrases that state each decision. Heuristic, English-only (see report/limitations).
const NEGATIVE = /\b(unavailable|not available|isn't available|not free|isn't free|cannot be booked|can't be booked|is blocked|already booked)\b/i;
const POSITIVE = /\b(is available|is free|can be booked|you can book|go ahead and book)\b/i;
const DISRESPECTFUL = /\b(stupid|idiot|dumb|moron|shut up)\b/i;
// Review fix R2: the model may only explain. Promises of an action (the demo cannot book) and
// alternatives (other rooms, other slots it was not given) are unsupported claims.
const UNSUPPORTED_CLAIM = /\b(you (?:can|may|could|should) (?:still )?(?:book|reserve|use|take)|reserve it|book it|go ahead|instead|another room|other room|try room)\b/i;
const TIME_PATTERN = /\b\d{1,2}:\d{2}\b/g;
const ROOM_ID_PATTERN = /\bR\d{3}\b/g;

export function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function countSentences(text) {
  return text.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim() !== "").length;
}

/** Facts the text is allowed to mention as times. */
function allowedTimes(ctx) {
  const times = [ctx.requestedStart, ctx.requestedEnd, ctx.currentTime];
  if (ctx.conflict) times.push(ctx.conflict.start, ctx.conflict.end);
  return new Set(times);
}

/** Review fix R2: the reply must open with the decision sentence for THIS room, e.g. "Aurora Seminar Room is not available". */
function decisionPrefix(ctx) {
  return `${ctx.roomName} is ${ctx.decision === "AVAILABLE" ? "available" : "not available"}`.toLowerCase();
}

/** Review fix R2: facts the explanation must contain for reason codes that have one. */
function requiredFacts(ctx) {
  switch (ctx.reasonCode) {
    case "CONFLICT": return ctx.conflict ? [ctx.conflict.start, ctx.conflict.end] : [];
    case "TOO_LONG": return [String(ctx.maxDurationMinutes)];
    case "IN_PAST": return [ctx.currentTime];
    case "AVAILABLE": return [ctx.requestedStart, ctx.requestedEnd];
    default: return [];
  }
}

/**
 * Returns { ok: true, text } with normalized text, or { ok: false, reason }.
 * Reasons: not-string, empty, too-long, too-many-sentences, contradicts-decision,
 * missing-decision, unsupported-claim, unsupported-fact, missing-fact, disrespectful.
 */
export function validateExplanation(raw, ctx) {
  if (typeof raw !== "string") return { ok: false, reason: "not-string" };
  const text = normalizeText(raw);
  if (text === "") return { ok: false, reason: "empty" };
  if (text.length > MAX_EXPLANATION_LENGTH) return { ok: false, reason: "too-long" };
  if (countSentences(text) > MAX_SENTENCES) return { ok: false, reason: "too-many-sentences" };
  if (DISRESPECTFUL.test(text)) return { ok: false, reason: "disrespectful" };

  const saysNo = NEGATIVE.test(text);
  const saysYes = POSITIVE.test(text);
  if (ctx.decision === "AVAILABLE" && saysNo) return { ok: false, reason: "contradicts-decision" };
  if (ctx.decision === "UNAVAILABLE" && saysYes) return { ok: false, reason: "contradicts-decision" };
  if (UNSUPPORTED_CLAIM.test(text)) return { ok: false, reason: "unsupported-claim" };
  if (!text.toLowerCase().startsWith(decisionPrefix(ctx))) return { ok: false, reason: "missing-decision" };
  if (ctx.decision === "AVAILABLE" ? !saysYes : !saysNo) return { ok: false, reason: "missing-decision" };

  const times = allowedTimes(ctx);
  if ((text.match(TIME_PATTERN) ?? []).some((t) => !times.has(t))) return { ok: false, reason: "unsupported-fact" };
  if ((text.match(ROOM_ID_PATTERN) ?? []).some((id) => id !== ctx.roomId)) return { ok: false, reason: "unsupported-fact" };

  if (requiredFacts(ctx).some((fact) => !text.includes(fact))) return { ok: false, reason: "missing-fact" };

  return { ok: true, text };
}
