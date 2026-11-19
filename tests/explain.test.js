import { test } from "node:test";
import assert from "node:assert/strict";
import { ROOMS, CURRENT_TIME } from "../src/data/rooms.js";
import { checkAvailability } from "../src/core/availability.js";
import { buildExplanationContext, isValidContext, REASON_CODES } from "../src/explain/context.js";
import { createMockAdapter, MOCK_MODES } from "../src/explain/mockAdapter.js";
import { validateExplanation, MAX_EXPLANATION_LENGTH } from "../src/explain/validate.js";
import { fallbackExplanation } from "../src/explain/fallback.js";
import { explainAvailability, EXPLAIN_TIMEOUT_MS } from "../src/explain/service.js";
import * as app from "../src/app/controller.js";
import { renderExplanation, renderResult } from "../src/ui/render.js";

const room = (id) => ROOMS.find((r) => r.id === id);
function ctxFor(id, start, end, now = CURRENT_TIME) {
  const r = room(id);
  return buildExplanationContext(r, { start, end }, checkAvailability(r, start, end, now), now);
}
// One fictional request per reason code (except DATA_ERROR, built from a bad clock).
const CASES = {
  AVAILABLE: () => ctxFor("R101", "11:00", "13:00"),
  CONFLICT: () => ctxFor("R202", "10:00", "11:00"),
  BLOCKED: () => ctxFor("R404", "10:00", "11:00"),
  INVALID_TIME: () => ctxFor("R101", "9am", "10:00"),
  END_BEFORE_START: () => ctxFor("R101", "11:00", "10:00"),
  IN_PAST: () => ctxFor("R101", "08:00", "08:30"),
  TOO_LONG: () => ctxFor("R303", "09:00", "11:01"),
  DATA_ERROR: () => ctxFor("R101", "10:00", "11:00", "bad"),
};
const mock = (mode, opts = {}) => createMockAdapter({ mode, ...opts });

// ---------- Context builder ----------
test("context: copies decision and code from checkAvailability, frozen, only contract fields", () => {
  const ctx = CASES.CONFLICT();
  assert.ok(Object.isFrozen(ctx));
  assert.deepEqual(Object.keys(ctx).sort(), ["conflict", "currentTime", "decision", "maxDurationMinutes",
    "reasonCode", "requestedEnd", "requestedStart", "roomId", "roomName"]);
  assert.equal(ctx.decision, "UNAVAILABLE");
  assert.equal(ctx.reasonCode, "CONFLICT");
  assert.deepEqual(ctx.conflict, { start: "09:30", end: "11:30" });
  assert.equal(ctx.maxDurationMinutes, 120);
  assert.equal(ctx.currentTime, "09:00");
});
test("context: every reason code is reachable and valid; conflict is null unless CONFLICT", () => {
  for (const code of REASON_CODES) {
    const ctx = CASES[code]();
    assert.equal(ctx.reasonCode, code);
    assert.equal(ctx.decision, code === "AVAILABLE" ? "AVAILABLE" : "UNAVAILABLE");
    assert.ok(isValidContext(ctx));
    if (code !== "CONFLICT") assert.equal(ctx.conflict, null);
  }
});
test("context: the overlapping booking is reported, touching is not a conflict (R101 has two bookings)", () => {
  assert.deepEqual(ctxFor("R101", "10:30", "11:30").conflict, { start: "10:00", end: "11:00" });
  assert.deepEqual(ctxFor("R101", "12:30", "13:30").conflict, { start: "13:00", end: "14:30" });
  const touching = ctxFor("R101", "11:00", "13:00");
  assert.equal(touching.reasonCode, "AVAILABLE");
  assert.equal(touching.conflict, null);
});
test("context: missing or invalid inputs give null (nothing to explain, EX-2)", () => {
  const r = room("R101");
  const ok = checkAvailability(r, "11:00", "12:00", CURRENT_TIME);
  assert.equal(buildExplanationContext(undefined, { start: "11:00", end: "12:00" }, ok, CURRENT_TIME), null);
  assert.equal(buildExplanationContext(r, null, ok, CURRENT_TIME), null);
  assert.equal(buildExplanationContext(r, { start: "", end: "" }, null, CURRENT_TIME), null);
  assert.equal(buildExplanationContext(r, {}, { available: true, code: "CONFLICT" }, CURRENT_TIME), null);
  assert.equal(buildExplanationContext(r, {}, { available: false, code: "MAYBE" }, CURRENT_TIME), null);
  assert.equal(buildExplanationContext({ id: "", name: "X" }, {}, ok, CURRENT_TIME), null);
});
test("context: very long / garbage time input is INVALID_TIME and stays bounded", () => {
  const junk = `<script>${"9".repeat(5000)}\u0000`;
  const ctx = ctxFor("R101", junk, "10:00");
  assert.equal(ctx.reasonCode, "INVALID_TIME");
  assert.ok(ctx.requestedStart.length <= 16);
  assert.doesNotMatch(ctx.requestedStart, /\u0000/);
});
test("context: building it never mutates the frozen catalog", () => {
  const before = JSON.stringify(ROOMS);
  CASES.CONFLICT();
  assert.equal(JSON.stringify(ROOMS), before);
});

// ---------- Mock adapter + service: normal path ----------
test("EX-3/EX-4: normal mock text is accepted for every reason code, states the decision, ≤300 chars", async () => {
  for (const code of REASON_CODES) {
    const ctx = CASES[code]();
    const out = await explainAvailability(ctx, mock("normal"));
    assert.equal(out.source, "llm-mock", code);
    assert.equal(out.decision, ctx.decision);
    assert.equal(out.reasonCode, code);
    assert.ok(out.text.length > 0 && out.text.length <= MAX_EXPLANATION_LENGTH, code);
    assert.ok(out.text.includes(ctx.roomName), code);
    assert.ok(Object.isFrozen(out));
  }
});
test("EX-3: explanation mentions the supplied facts (conflict times, limit, current time)", async () => {
  assert.match((await explainAvailability(CASES.CONFLICT(), mock("normal"))).text, /09:30 to 11:30/);
  assert.match((await explainAvailability(CASES.TOO_LONG(), mock("normal"))).text, /120 minutes/);
  assert.match((await explainAvailability(CASES.IN_PAST(), mock("normal"))).text, /09:00/);
  assert.doesNotMatch((await explainAvailability(CASES.INVALID_TIME(), mock("normal"))).text, /9am/);
});
test("output contract: exactly text, source, decision, reasonCode", async () => {
  const out = await explainAvailability(CASES.AVAILABLE(), mock("normal"));
  assert.deepEqual(Object.keys(out).sort(), ["decision", "reasonCode", "source", "text"]);
});

// ---------- Failure behaviour (EX-5) ----------
async function expectFallback(ctx, adapter, reason, options = {}) {
  let seen = null;
  const out = await explainAvailability(ctx, adapter, { ...options, onFallback: (r) => { seen = r; } });
  assert.equal(out.source, "fallback");
  assert.equal(out.text, fallbackExplanation(ctx));
  assert.equal(out.decision, ctx.decision);
  assert.equal(out.reasonCode, ctx.reasonCode);
  assert.equal(seen, reason);
  return out;
}
test("EX-5: adapter throws -> fallback", async () => {
  await expectFallback(CASES.CONFLICT(), mock("throw"), "adapter-error");
});
test("EX-5: adapter throws synchronously or is missing -> fallback, never rejects", async () => {
  const sync = { generate() { throw new Error("boom"); } };
  await expectFallback(CASES.AVAILABLE(), sync, "adapter-error");
  await expectFallback(CASES.AVAILABLE(), null, "no-adapter");
  await expectFallback(CASES.AVAILABLE(), {}, "no-adapter");
});
test("EX-5: adapter slower than the timeout -> fallback (and is aborted)", async () => {
  assert.equal(EXPLAIN_TIMEOUT_MS, 2000);
  let aborted = false;
  const slow = { generate: (_c, { signal }) => new Promise((resolve) => {
    const t = setTimeout(() => resolve("Aurora Seminar Room is available."), 200);
    signal.addEventListener("abort", () => { aborted = true; clearTimeout(t); });
  }) };
  await expectFallback(CASES.AVAILABLE(), slow, "timeout", { timeoutMs: 30 });
  assert.ok(aborted);
  await expectFallback(CASES.BLOCKED(), mock("slow", { delayMs: 100 }), "timeout", { timeoutMs: 20 });
});
test("EX-5: answer just inside the timeout is accepted", async () => {
  const out = await explainAvailability(CASES.BLOCKED(), mock("normal", { delayMs: 10 }), { timeoutMs: 500 });
  assert.equal(out.source, "llm-mock");
});
test("EX-5: empty / whitespace text -> fallback", async () => {
  await expectFallback(CASES.CONFLICT(), mock("empty"), "empty");
});
test("EX-5: text longer than 300 characters -> fallback", async () => {
  await expectFallback(CASES.CONFLICT(), mock("long"), "too-long");
});
test("EX-5: text contradicting the decision -> fallback (both directions)", async () => {
  await expectFallback(CASES.CONFLICT(), mock("contradict"), "contradicts-decision");
  await expectFallback(CASES.BLOCKED(), mock("contradict"), "contradicts-decision");
  await expectFallback(CASES.AVAILABLE(), mock("contradict"), "contradicts-decision");
});
test("EX-3: invented facts or non-string output -> fallback", async () => {
  await expectFallback(CASES.CONFLICT(), mock("hallucinate"), "unsupported-fact");
  await expectFallback(CASES.CONFLICT(), mock("non-string"), "not-string");
});
test("invalid context -> null, adapter is never called", async () => {
  let called = false;
  const spy = { generate: async () => { called = true; return "x"; } };
  assert.equal(await explainAvailability(null, spy), null);
  assert.equal(await explainAvailability({ ...CASES.AVAILABLE(), decision: "UNAVAILABLE" }, spy), null);
  assert.equal(called, false);
});
test("a throwing onFallback hook does not break the fallback", async () => {
  const out = await explainAvailability(CASES.BLOCKED(), mock("throw"), { onFallback: () => { throw new Error("log"); } });
  assert.equal(out.source, "fallback");
});
test("mock adapter rejects unknown modes and lists all simulated failures", () => {
  assert.throws(() => createMockAdapter({ mode: "network" }), TypeError);
  for (const m of ["throw", "slow", "empty", "long", "contradict"]) assert.ok(MOCK_MODES.includes(m));
});

// ---------- Validator and fallback units ----------
test("validator: boundaries for length and sentence count", () => {
  const ctx = CASES.BLOCKED();
  const base = `${ctx.roomName} is not available`;
  const exact = `${base} ${"x".repeat(MAX_EXPLANATION_LENGTH - base.length - 2)}.`;
  assert.equal(exact.length, MAX_EXPLANATION_LENGTH);
  assert.equal(validateExplanation(exact, ctx).ok, true); // exactly 300 allowed
  assert.equal(validateExplanation(`x${exact}`, ctx).reason, "too-long"); // 301 rejected
  assert.equal(validateExplanation(`${base}.`, ctx).ok, true);
  assert.equal(validateExplanation(`${base}. Second sentence here.`, ctx).ok, true);
  assert.equal(validateExplanation(`${base}. Two. Three.`, ctx).reason, "too-many-sentences");
  assert.equal(validateExplanation(`${base} ${"a".repeat(MAX_EXPLANATION_LENGTH)}.`, ctx).reason, "too-long");
});
test("validator: negated phrasing is not mistaken for the opposite decision", () => {
  const ctx = CASES.CONFLICT();
  // Updated after review fix R2: a CONFLICT explanation must name the conflicting booking,
  // and must open with the decision sentence (stricter than the AI's first version).
  assert.equal(validateExplanation(`${ctx.roomName} is not available because it is already booked from 09:30 to 11:30.`, ctx).ok, true);
  assert.equal(validateExplanation(`${ctx.roomName} is not available at 10:00.`, ctx).reason, "missing-fact");
  assert.equal(validateExplanation(`${ctx.roomName} cannot be booked now.`, ctx).reason, "missing-decision");
  assert.equal(validateExplanation(`${ctx.roomName} is free.`, ctx).reason, "contradicts-decision");
  assert.equal(validateExplanation("The weather is nice.", ctx).reason, "missing-decision");
  assert.equal(validateExplanation(`${ctx.roomName} is not available, try R303.`, ctx).reason, "unsupported-fact");
  assert.equal(validateExplanation(`${ctx.roomName} is not available, stupid.`, ctx).reason, "disrespectful");
});
test("fallback texts are deterministic, non-empty and pass the validator for every code", () => {
  for (const code of REASON_CODES) {
    const ctx = CASES[code]();
    const text = fallbackExplanation(ctx);
    assert.equal(text, fallbackExplanation(ctx));
    assert.equal(validateExplanation(text, ctx).ok, true, `${code}: ${text}`);
  }
  assert.match(fallbackExplanation(null), /not available/);
});

// ---------- Controller + render integration (EX-1, EX-2, EX-6) ----------
function checked() {
  return app.setRequest(app.selectRoom(app.createInitialState(), "R202"), "10:00", "11:00");
}
test("EX-2: explaining is only possible when a result exists for the selected room", () => {
  let s = app.createInitialState();
  assert.equal(app.canExplain(s), false);
  s = app.selectRoom(s, "R101");
  assert.equal(app.canExplain(s), false); // no check yet
  s = app.setRequest(s, "11:00", "12:00");
  assert.equal(app.canExplain(s), true);
});
test("EX-1: storing an explanation (even fallback) never changes the result", async () => {
  const s = checked();
  const resultBefore = s.result;
  const ctx = app.explanationContext(s);
  for (const mode of ["normal", "contradict", "throw"]) {
    const next = app.setExplanation(s, ctx, await explainAvailability(ctx, mock(mode)));
    assert.equal(next.result, resultBefore);
    assert.equal(next.result.code, "CONFLICT");
    assert.equal(renderResult(next.result, true), renderResult(resultBefore, true));
    assert.ok(next.explanation);
  }
});
test("EX-6: changing room, times or filters removes the explanation", async () => {
  const s0 = checked();
  const ctx = app.explanationContext(s0);
  const s = app.setExplanation(s0, ctx, await explainAvailability(ctx, mock("normal")));
  assert.ok(s.explanation);
  assert.equal(app.selectRoom(s, "R101").explanation, null);
  assert.equal(app.setRequest(s, "12:00", "13:00").explanation, null);
  assert.equal(app.setCriteria(s, { attendees: 2, equipment: [] }).explanation, null);
});
test("EX-6: a late explanation for old inputs is discarded", async () => {
  const s0 = checked();
  const ctx = app.explanationContext(s0);
  const late = await explainAvailability(ctx, mock("normal"));
  const moved = app.selectRoom(s0, "R101");
  assert.equal(app.setExplanation(moved, ctx, late), moved);
  // explanation whose decision disagrees with the current result is rejected too
  assert.equal(app.setExplanation(s0, ctx, { ...late, decision: "AVAILABLE" }), s0);
});
test("render: explanation box is separate, escaped, and labels the fallback", () => {
  assert.equal(renderExplanation(null), "");
  assert.match(renderExplanation(null, { pending: true }), /Preparing explanation/);
  const fb = renderExplanation({ text: "<b>x</b>", source: "fallback", decision: "UNAVAILABLE", reasonCode: "BLOCKED" });
  assert.match(fb, /AI explanation unavailable/);
  assert.match(fb, /&lt;b&gt;x&lt;\/b&gt;/);
  assert.doesNotMatch(fb, /class="result/);
  assert.doesNotMatch(renderExplanation({ text: "ok", source: "llm-mock" }), /unavailable/);
});
test("EX-7: explain modules contain no network calls or secrets", async () => {
  const { readFile, readdir } = await import("node:fs/promises");
  const dir = new URL("../src/explain/", import.meta.url);
  for (const f of await readdir(dir)) {
    const src = await readFile(new URL(f, dir), "utf8");
    assert.doesNotMatch(src, /\bfetch\s*\(|XMLHttpRequest|WebSocket|https?:\/\//, f);
    assert.doesNotMatch(src, /api[_-]?key|secret|token|password/i, f);
  }
});
