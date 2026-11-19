# AGENTS.md — Smart Campus Room Availability Checker

Instructions for AI coding agents (Codex, Claude Code, Copilot, Cursor, etc.) working in this repository.
Humans should read it too. If your tool does not load this file automatically, paste it into the prompt.

## 1. Purpose
A small static web app that answers one question: *can room X be booked for time slot Y today?*
All data is **fictional** and the current time is **fixed at 09:00**. There is no login, database,
network API, deployment or real user data. Keep it that way.

## 2. Architecture (dependency direction: top → bottom only)
```
index.html → src/main.js            DOM wiring only (read inputs, call controller, paint)
              src/ui/render.js       pure functions → HTML strings; every dynamic value goes through esc()
              src/app/controller.js  pure state transitions; never touches the DOM
              src/core/*.js          business rules (time parsing, AC1–AC5, filters F1–F2); no DOM, no data imports
              src/data/rooms.js      fictional, deep-frozen room catalog + CURRENT_TIME
baseline/   FROZEN legacy prototype kept as evidence for Assignment #04. Do not edit.
tests/      node:test suites for the final version (run by `npm test`)
```
Rules: `core/` must not import from `ui/`, `app/` or `main.js`. Business rules belong in `core/`, not in `main.js`.

## 3. Setup
- Node.js **22 or newer** (uses `node --test` with glob patterns). No `npm install` is needed: the project has **zero dependencies**.
- Python 3 only for the local static server.

## 4. Safe commands (you may run these without asking)
| Purpose | Command |
|---|---|
| Unit + integration tests | `npm test` |
| Legacy baseline tests | `npm run test:baseline` |
| Syntax check of every tracked JS file | `for f in $(git ls-files '*.js'); do node --check "$f"; done` |
| Local preview (loopback only) | `python3 -m http.server 8080 --bind 127.0.0.1` |
| Read-only git | `git status`, `git diff`, `git log`, `git show` |

## 5. Forbidden actions (never do these; stop and ask a human instead)
- **No secrets or personal data**: do not add API keys, tokens, passwords, `.env` files, real names, emails or real room data.
- **No deployments or publishing**: no `npm publish`, no GitHub Pages/Netlify/Vercel deploys, no pushing to remote branches.
- **No destructive commands**: no `rm -rf`, `git reset --hard`, `git push --force`, `git clean -fdx`, rewriting history, or deleting tests.
- **No dependency changes without review**: do not add, remove or upgrade packages, and do not create a lockfile, unless a human approved it in the task.
- **No network calls** from app code (no `fetch`, CDNs or analytics).
- Do not edit `baseline/` and do not weaken or skip an existing test to make a change pass.
- Do not serve the repo on `0.0.0.0` (it would expose `.git/` to the local network).

## 6. Coding conventions
- Plain ES modules (`"type": "module"`), 2-space indent, double quotes, semicolons, small pure functions.
- Times are `"HH:MM"` strings at the edges and minutes-since-midnight inside `core/`; parse only with `toMinutes()`.
- Rule functions return result objects `{ available, code, message }`; never throw for user input.
- Never mutate `ROOMS` (it is deep-frozen; a mutation throws in tests).
- Any value written into `innerHTML` must pass through `esc()`.

## 7. Test expectations
- `npm test` must pass (0 failures) before you report a change as done. Paste the real summary lines (`# tests`, `# pass`, `# fail`).
- Every behaviour change or bug fix adds or updates a test in `tests/*.test.js` (new files are picked up automatically).
- Boundary cases are mandatory for time rules: exactly 120 min vs 121 min, touching vs overlapping intervals.
- UI-only behaviour (DOM events) is not covered by `node:test`; say so explicitly and describe the manual check you did.
- The acceptance criteria in [ACCEPTANCE.md](ACCEPTANCE.md) must still hold after every change.

## 8. Review gates
1. Work on a separate branch, one focused change per commit.
2. Report: summary, the diff, test output, and any risk or limitation you noticed.
3. A human reviews and approves the diff before it is merged into `main`. Agents never merge their own work.
