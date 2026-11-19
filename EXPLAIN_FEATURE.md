# Feature contract: "Explain availability" (Practice #11)

**User story.** As a student, I want a short explanation of room availability so I understand the decision.

**Golden rule.** The deterministic checker `checkAvailability()` in `src/core/availability.js` decides availability.
The LLM adapter only turns that decision into words. It can never change, override or re-compute the decision.

## Flow
```
request (room, start, end)
  -> rule engine: checkAvailability(room, start, end, CURRENT_TIME)   => result {available, code, message}  (AUTHORITATIVE)
  -> context builder: buildExplanationContext(room, request, result)  => frozen facts object
  -> LLM adapter (mock now; real model later, server-side only)       => candidate text
  -> output validator: length, non-empty, agrees with the decision     => accepted text OR deterministic fallback
  -> response: UI shows the unchanged decision + a separate explanation box
```

## Inputs (structured context; the only facts the model may use)
| Field | Type | Source |
|---|---|---|
| `roomName`, `roomId` | string | room catalog |
| `requestedStart`, `requestedEnd` | "HH:MM" strings as entered | booking form |
| `currentTime` | "HH:MM" | `CURRENT_TIME` |
| `decision` | `"AVAILABLE"` or `"UNAVAILABLE"` | `result.available` |
| `reasonCode` | `AVAILABLE`, `CONFLICT`, `BLOCKED`, `INVALID_TIME`, `END_BEFORE_START`, `IN_PAST`, `TOO_LONG`, `DATA_ERROR` | `result.code` |
| `conflict` | `{start, end}` or `null` | first overlapping booking (CONFLICT only) |
| `maxDurationMinutes` | 120 | `MAX_DURATION_MINUTES` |

## Output
`{ text: string, source: "llm-mock" | "fallback", decision, reasonCode }`: `decision` and `reasonCode` are copied from the context, never from the model.

## Acceptance criteria
- **EX-1** The decision shown to the user is always the one from `checkAvailability()`; requesting an explanation never changes the result box, its colour or its code.
- **EX-2** The "Explain availability" button is enabled only when a result exists for the selected room; otherwise it is disabled (empty input cannot be explained).
- **EX-3** The explanation uses only supplied facts (room name, requested times, current time, reason, conflicting booking, 120-minute limit) and states the same decision.
- **EX-4** The explanation is concise (at most 300 characters, 1–2 sentences) and respectful.
- **EX-5** Failure behaviour: if the adapter throws, times out (more than 2000 ms), returns empty text, returns text longer than 300 characters, or contradicts the decision, the UI shows a deterministic fallback explanation for the reason code labelled "AI explanation unavailable". It is never blank, never crashes and never changes the decision.
- **EX-6** Changing the room, times or filters removes any shown explanation (no stale explanation).
- **EX-7** No new dependencies, no network calls, no secrets in client code, no login and no database; all data stays fictional.

## Failure behaviour
| Situation | Behaviour |
|---|---|
| No room selected or no check yet | Button disabled |
| Adapter throws / API failure | Fallback text, `source: "fallback"` |
| Adapter slower than 2000 ms | Fallback text (timeout) |
| Empty or whitespace text | Fallback text |
| Text longer than 300 characters | Fallback text |
| Text contradicts decision (e.g. "free" for UNAVAILABLE) | Fallback text |
| Very long or garbage time input | Rule engine returns `INVALID_TIME`; explanation stays bounded |
