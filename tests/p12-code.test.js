// Practice #12 (code-based): every case in practice12/test-cases.json against the rule functions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FIXTURE } from "../practice12/code/data.js";
import { evaluate, checkRequest, formatMinutes } from "../practice12/code/availability.js";
import { validateRawInput, parseDuration, parseStart } from "../practice12/code/validate.js";
import { renderResult, renderBookings, verdictLabel } from "../practice12/code/render.js";

const spec = JSON.parse(readFileSync(new URL("../practice12/test-cases.json", import.meta.url), "utf8"));
const snapshot = JSON.parse(JSON.stringify(FIXTURE.bookings));
const ruleCases = [...spec.cases.filter((c) => c.id !== "T8"), ...spec.extra];

test("fixture matches the shared contract fixture", () => {
  assert.equal(`${FIXTURE.roomName} (${FIXTURE.roomId})`, spec.fixture.room);
  assert.equal(FIXTURE.now, spec.fixture.now);
  assert.deepEqual(FIXTURE.bookings, spec.fixture.bookings);
});

test("test-cases.json contains T1–T8 and E1–E7", () => {
  assert.deepEqual(spec.cases.map((c) => c.id), ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"]);
  assert.deepEqual(spec.extra.map((c) => c.id), ["E1", "E2", "E3", "E4", "E5", "E6", "E7"]);
});

for (const c of ruleCases) {
  test(`${c.id}: ${c.name}`, () => {
    assert.deepEqual(evaluate(c.input, FIXTURE), c.expected);
  });
}

test("T8: booking data unchanged after running T1–T7 and E1–E7 (twice)", () => {
  for (let i = 0; i < 2; i++) ruleCases.forEach((c) => evaluate(c.input, FIXTURE));
  assert.deepEqual(FIXTURE.bookings, spec.cases.find((c) => c.id === "T8").expected.bookings);
  assert.deepEqual(FIXTURE.bookings, snapshot);
  assert.ok(Object.isFrozen(FIXTURE.bookings) && FIXTURE.bookings.every(Object.isFrozen));
  assert.throws(() => FIXTURE.bookings.push({ start: "15:00", end: "16:00" }), TypeError);
});

test("deterministic: same input gives the same result", () => {
  const input = { start: "11:30", duration: "60", blocked: false };
  assert.deepEqual(evaluate(input, FIXTURE), evaluate(input, FIXTURE));
});

// Mandatory boundaries (AGENTS.md §7)
test("boundary: touching before a booking is allowed, 1 minute more overlaps", () => {
  assert.equal(evaluate({ start: "09:30", duration: "30" }, FIXTURE).code, "AVAILABLE");
  assert.deepEqual(evaluate({ start: "09:30", duration: "31" }, FIXTURE), {
    available: false, code: "CONFLICT", message: "Unavailable: overlaps the existing booking 10:00–11:00.",
  });
});
test("boundary: starting exactly at a booking's end is allowed (14:30)", () => {
  assert.equal(evaluate({ start: "14:30", duration: "30" }, FIXTURE).code, "AVAILABLE");
  assert.equal(evaluate({ start: "14:29", duration: "30" }, FIXTURE).message,
    "Unavailable: overlaps the existing booking 13:00–14:30.");
});
test("boundary: 120 allowed, 121 rejected; 1 allowed, 0 rejected", () => {
  assert.equal(parseDuration("120"), 120);
  assert.equal(parseDuration("121"), null);
  assert.equal(parseDuration("1"), 1);
  assert.equal(parseDuration("0"), null);
});
test("boundary: 09:01 is the first future start; 09:00 is IN_PAST", () => {
  assert.equal(evaluate({ start: "09:01", duration: "30" }, FIXTURE).code, "AVAILABLE");
  assert.equal(evaluate({ start: "09:00", duration: "30" }, FIXTURE).code, "IN_PAST");
});
test("boundary: ending exactly at 24:00 is allowed, 24:01 is not", () => {
  assert.deepEqual(evaluate({ start: "23:00", duration: "60" }, FIXTURE), {
    available: true, code: "AVAILABLE", message: "Available: Aurora Seminar Room is free 23:00–24:00.",
  });
  assert.equal(evaluate({ start: "23:01", duration: "60" }, FIXTURE).message, "Invalid input: the booking must end by 24:00.");
});
test("a slot that contains a whole booking is a conflict", () => {
  assert.equal(evaluate({ start: "12:30", duration: "120" }, FIXTURE).message,
    "Unavailable: overlaps the existing booking 13:00–14:30.");
});

// Rule order: INVALID_INPUT → INVALID_DURATION → IN_PAST → INVALID_INPUT (24:00) → BLOCKED → CONFLICT
test("rule order: malformed start wins over bad duration", () => {
  assert.equal(evaluate({ start: "7pm", duration: "abc", blocked: true }, FIXTURE).code, "INVALID_INPUT");
});
test("rule order: bad duration wins over past start", () => {
  assert.equal(evaluate({ start: "08:00", duration: "0", blocked: true }, FIXTURE).code, "INVALID_DURATION");
});
test("rule order: ends after 24:00 wins over blocked", () => {
  assert.equal(evaluate({ start: "23:30", duration: "60", blocked: true }, FIXTURE).message,
    "Invalid input: the booking must end by 24:00.");
});
test("rule order: blocked wins over conflict", () => {
  assert.equal(evaluate({ start: "10:30", duration: "60", blocked: true }, FIXTURE).code, "BLOCKED");
});

test("validation: malformed starts and durations", () => {
  for (const s of ["", "9:30", "24:00", "12:60", "1130", "11:30:00", null, undefined, 1130]) {
    assert.equal(parseStart(s), null, `start ${String(s)}`);
  }
  assert.equal(parseStart(" 11:30 "), 690);
  for (const d of ["", " ", "1.5", "-5", "+5", "1e2", "60min", "abc", null, undefined, "999999999999999999999"]) {
    assert.equal(parseDuration(d), null, `duration ${String(d)}`);
  }
  assert.equal(parseDuration(" 60 "), 60);
  assert.equal(parseDuration(45), 45);
});
test("validation: blocked must be exactly true (missing or 'true' string = not blocked)", () => {
  assert.equal(validateRawInput({ start: "11:30", duration: "60" }).blocked, false);
  assert.equal(validateRawInput({ start: "11:30", duration: "60", blocked: "true" }).blocked, false);
  assert.equal(validateRawInput({ start: "11:30", duration: "60", blocked: true }).blocked, true);
});
test("never throws for odd input", () => {
  assert.doesNotThrow(() => evaluate(undefined, FIXTURE));
  assert.equal(evaluate({}, FIXTURE).code, "INVALID_INPUT");
});
test("fail closed: unparseable booking data is never reported as free", () => {
  const broken = { ...FIXTURE, bookings: [{ start: "xx", end: "11:00" }] };
  assert.equal(checkRequest({ start: 900, duration: 30, blocked: false }, broken).available, false);
  const badNow = { ...FIXTURE, now: "9am" };
  assert.equal(checkRequest({ start: 900, duration: 30, blocked: false }, badNow).available, false);
});
test("formatMinutes pads and shows 24:00", () => {
  assert.equal(formatMinutes(0), "00:00");
  assert.equal(formatMinutes(545), "09:05");
  assert.equal(formatMinutes(1440), "24:00");
});

// Presentation layer (pure string functions; DOM events are checked manually in a browser)
test("render: verdict is Available or Unavailable with the exact reason", () => {
  const ok = evaluate({ start: "11:30", duration: "60" }, FIXTURE);
  const bad = evaluate({ start: "08:00", duration: "30" }, FIXTURE);
  assert.equal(verdictLabel(ok), "Available");
  assert.equal(verdictLabel(bad), "Unavailable");
  assert.match(renderResult(ok), />Available<\/p>/);
  assert.ok(renderResult(ok).includes("Available: Aurora Seminar Room is free 11:30–12:30."));
  assert.match(renderResult(bad), />Unavailable<\/p>/);
});
test("render: dynamic values are escaped (E7 payload, hostile booking data)", () => {
  const html = renderResult({ available: false, code: "<b>", message: "<img src=x onerror=alert(1)>" });
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt;"));
  const list = renderBookings([{ start: "<script>", end: "\"'&" }]);
  assert.ok(!list.includes("<script>"));
  assert.ok(list.includes("&lt;script&gt;") && list.includes("&quot;&#39;&amp;"));
});
test("render: booking list shows both fixture bookings", () => {
  const list = renderBookings(FIXTURE.bookings);
  assert.equal((list.match(/<li>/g) || []).length, 2);
  assert.ok(list.includes("10:00") && list.includes("14:30"));
});

test("layer rule: rule modules do not touch the DOM", () => {
  for (const f of ["validate.js", "availability.js", "messages.js", "data.js", "render.js"]) {
    const src = readFileSync(new URL(`../practice12/code/${f}`, import.meta.url), "utf8");
    assert.doesNotMatch(src, /\bdocument\b|\bwindow\b|\bfetch\s*\(/, f);
  }
});
