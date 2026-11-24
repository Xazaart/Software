# Practice #12 shared contract: one room, start time + duration

This contract is identical for the **code-based** and the **low-code** solution. Both must pass the same test inputs in
[`test-cases.json`](test-cases.json), which were written **before** either implementation.

## User story
As a student, I want to choose a future start time and a duration for the campus room, so that I immediately see
whether the room is **Available** or **Unavailable** and why.

## Fictional data (the same in both solutions)
- Room: **Aurora Seminar Room (R101)**, one fictional room
- Current time: **09:00** (fixed, so results are reproducible)
- Existing bookings: **10:00–11:00** and **13:00–14:30**
- Blocked flag: an input (checkbox or toggle), default **off**
- There is no login, payment, real personal data or database. Bookings are read-only constants.

## Inputs
| Input | Type | Rule |
|---|---|---|
| `start` | `"HH:MM"` (00:00–23:59) | required |
| `duration` | whole minutes | required, 1–120 |
| `blocked` | boolean | room status |
| `bookings` | list of `{start, end}` | fixed constants above |

## Outputs
| Output | Type |
|---|---|
| `available` | boolean |
| `code` | `AVAILABLE`, `CONFLICT`, `BLOCKED`, `IN_PAST`, `INVALID_DURATION` or `INVALID_INPUT` |
| `message` | visible text, exactly as in the table below |

## Acceptance criteria (the six shared ACs, unchanged)
| ID | Criterion | Contract decision |
|---|---|---|
| AC1 | Start time must be in the future. | `start` must be **strictly after** 09:00, otherwise `IN_PAST`. |
| AC2 | Duration must be greater than zero and at most 120 minutes. | `duration` must be an integer from 1 to 120, otherwise `INVALID_DURATION`. |
| AC3 | Overlapping bookings are unavailable. | Intervals are half-open: `[start, start+duration)` overlaps `[b.start, b.end)` if `s < b.end && e > b.start`. **Touching (end = start) is allowed.** |
| AC4 | Blocked room is unavailable. | A valid request on a blocked room returns `BLOCKED`. |
| AC5 | Display a clear decision without changing existing bookings. | The page shows "Available" or "Unavailable" with a reason; bookings stay identical after any number of checks. |
| AC6 | Invalid input receives understandable feedback. | A missing or malformed start, a non-numeric duration, or a booking ending after 24:00 returns `INVALID_INPUT` with a message saying what to fix. |

**Rule order** (applies to both solutions): `INVALID_INPUT` → `INVALID_DURATION` → `IN_PAST` → `INVALID_INPUT` (ends after 24:00) → `BLOCKED` → `CONFLICT` → `AVAILABLE`.

## Visible messages (exact)
| Code | available | Message template |
|---|---|---|
| AVAILABLE | true | `Available: Aurora Seminar Room is free {start}–{end}.` |
| CONFLICT | false | `Unavailable: overlaps the existing booking {b.start}–{b.end}.` |
| BLOCKED | false | `Unavailable: the room is blocked.` |
| IN_PAST | false | `Invalid input: start time must be after the current time 09:00.` |
| INVALID_DURATION | false | `Invalid input: duration must be a whole number from 1 to 120 minutes.` |
| INVALID_INPUT | false | `Invalid input: enter the start time as HH:MM.` / `Invalid input: the booking must end by 24:00.` |

`{end}` is `start + duration` formatted as HH:MM.
