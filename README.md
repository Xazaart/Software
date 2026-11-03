# Smart Campus – Room Availability Checker (Assignment #04)

Fictional data, fixed current time (09:00). No login, database or live APIs.

## Requirements
Node.js 18+ (tests). Any static file server (app), because ES modules don't load over file://.

## Run
```
python -m http.server 8080
```
Final app: http://localhost:8080/ · Baseline: http://localhost:8080/baseline/

## Test
```
npm test                # final version (18 tests)
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
src/app/controller.js      pure state transitions (select room, filters, time slot)
src/ui/render.js     HTML rendering (room list, empty state, one result renderer)
src/main.js          DOM wiring only
tests/               regression (AC1–AC5), filters (F1–F4), integration (F5)
```
