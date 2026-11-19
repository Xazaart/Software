# Acceptance criteria (must remain true after every change)

| ID | Criterion | How it is verified |
|---|---|---|
| AC-A | Time rules: malformed times are rejected; end must be after start; start cannot be before the fixed current time (09:00); max duration is 120 minutes (120 allowed, 121 rejected). | `tests/regression.test.js` (AC1, AC2) |
| AC-B | Conflicts use half-open intervals: touching bookings (end = start) are allowed, any real overlap is rejected; a blocked room is never available. | `tests/regression.test.js` (AC3, AC4), `tests/filters.test.js` (F3) |
| AC-C | Filtering: a room is listed only if capacity ≥ attendees and it has ALL selected equipment; no match shows a clear empty state. | `tests/filters.test.js` (F1, F2, F4) |
| AC-D | Switching rooms or changing filters refreshes the result; a room that no longer matches is deselected. | `tests/integration.test.js` (F5) |
| AC-E | Checks never mutate room/booking data, and the project has no runtime dependencies, secrets or personal data. | `tests/regression.test.js` (AC5), `package.json` has no `dependencies` |

Full suite: `npm test` → expected `# fail 0`.
