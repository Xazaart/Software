import { isValidContext } from "./context.js";
import { validateExplanation } from "./validate.js";
import { fallbackExplanation } from "./fallback.js";

export const EXPLAIN_TIMEOUT_MS = 2000;
export const FALLBACK_LABEL = "AI explanation unavailable";

class TimeoutError extends Error {}

function withTimeout(run, ms) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new TimeoutError(`Adapter exceeded ${ms} ms`));
    }, ms);
  });
  // Promise.resolve().then(...) also turns a synchronous throw inside the adapter into a rejection.
  const work = Promise.resolve().then(() => run(controller.signal));
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

function respond(ctx, text, source) {
  // decision and reasonCode are copied from the context, never from the adapter.
  return Object.freeze({ text, source, decision: ctx.decision, reasonCode: ctx.reasonCode });
}

/**
 * Never rejects. Returns { text, source: "llm-mock" | "fallback", decision, reasonCode },
 * or null when the context is invalid (nothing to explain).
 * options.onFallback(reason) is an optional hook for logging/tests.
 */
export async function explainAvailability(ctx, adapter, { timeoutMs = EXPLAIN_TIMEOUT_MS, onFallback } = {}) {
  if (!isValidContext(ctx)) return null;
  const fallback = (reason) => {
    try { onFallback?.(reason); } catch { /* a logging hook must never break the fallback */ }
    return respond(ctx, fallbackExplanation(ctx), "fallback");
  };
  if (!adapter || typeof adapter.generate !== "function") return fallback("no-adapter");

  let raw;
  try {
    raw = await withTimeout((signal) => adapter.generate(ctx, { signal }), timeoutMs);
  } catch (err) {
    return fallback(err instanceof TimeoutError ? "timeout" : "adapter-error");
  }
  const checked = validateExplanation(raw, ctx);
  return checked.ok ? respond(ctx, checked.text, "llm-mock") : fallback(checked.reason);
}
