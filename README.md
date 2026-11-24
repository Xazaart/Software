# Smart Campus – Practice #12: code-based vs low-code

Arsen Abilmazhin · 24B032178 · Software Engineering, Tuesday 16:00–19:00

| What | Where |
|---|---|
| Report (PDF) | [practice12/report/Practice12_Abilmazhin_Arsen.pdf](practice12/report/Practice12_Abilmazhin_Arsen.pdf) |
| Shared contract / acceptance criteria | [practice12/CONTRACT.md](practice12/CONTRACT.md), test inputs [practice12/test-cases.json](practice12/test-cases.json) |
| Code-based solution (HTML/JS) | [practice12/code/](practice12/code/) – unit tests in [tests/p12-code.test.js](tests/p12-code.test.js) |
| Low-code solution (Node-RED + FlowFuse Dashboard 2.0) | [practice12/lowcode/](practice12/lowcode/) – exported `flows.json` (AI-authored as JSON, see report) |
| Identical UI test runners | [practice12/ui-tests/](practice12/ui-tests/) |
| Screenshots and raw evidence | [practice12/report/screenshots/](practice12/report/screenshots/), [practice12/report/evidence/](practice12/report/evidence/) |

Run the code-based app: `python3 -m http.server 8080 --bind 127.0.0.1` in the repo root, then open http://127.0.0.1:8080/practice12/code/ · tests: `npm test` (Node 22+).

---

# Smart Campus – Room Availability Checker (Assignments #04–#05)

Fictional data, fixed current time (09:00). No login, database or live APIs.

- AI agents: read [AGENTS.md](AGENTS.md) (Claude Code loads it via [CLAUDE.md](CLAUDE.md)).
- Acceptance criteria that must stay true: [ACCEPTANCE.md](ACCEPTANCE.md).
- Practice #12 code-based solution (one room, start + duration): [practice12/code/](practice12/code/) against [practice12/CONTRACT.md](practice12/CONTRACT.md); tests in `tests/p12-code.test.js`.

## Requirements
Node.js 22+ (tests; `npm test` uses a glob, so every `tests/*.test.js` file runs). Any static file server (app), because ES modules don't load over file://.

## Run
```
python -m http.server 8080
```
Final app: http://localhost:8080/ · Baseline: http://localhost:8080/baseline/

## Test
```
npm test                # final version: all tests/**/*.test.js
npm run test:baseline   # original version (9 tests)
```

## Versions (Git)
- Initial version: commit `c7b8308` (folder `baseline/`, single room, 9 tests)
- Final version: the latest commit on `main` (room catalog, filters F1–F5, 18 tests)

Show the history: `git log --oneline`

## Project structure
```
baseline/            original single-file prototype + its tests
src/data/rooms.js    fictional catalog of 5 rooms (data only, deep-frozen)
src/core/time.js     HH:MM -> minutes (the only time parser)
src/core/availability.js   AC1–AC5 rules, returns { available, code, message }
src/core/filters.js  F1 capacity, F2 equipment
src/app/controller.js      pure state transitions (select room, filters, time slot, explanation)
src/explain/         optional "Explain availability" (see EXPLAIN_FEATURE.md): context.js, mockAdapter.js,
                     validate.js, fallback.js, service.js — mock only, no network, decision never changed
src/ui/render.js     HTML rendering (room list, empty state, one result renderer)
src/main.js          DOM wiring only
tests/               regression (AC1–AC5), filters (F1–F4), integration (F5), explain (EX-1..EX-7)
```
