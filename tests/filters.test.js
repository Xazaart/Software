import { test } from "node:test";
import assert from "node:assert/strict";
import { ROOMS, CURRENT_TIME } from "../src/data/rooms.js";
import { filterRooms } from "../src/core/filters.js";
import { checkAvailability } from "../src/core/availability.js";
import { renderRoomList } from "../src/ui/render.js";

const ids = (rooms) => rooms.map((r) => r.id);
const byId = (id) => ROOMS.find((r) => r.id === id);

test("F1 boundary: capacity equal to attendees is included", () => {
  assert.ok(ids(filterRooms(ROOMS, { attendees: 12, equipment: [] })).includes("R101"));
});
test("F1 boundary: insufficient capacity is excluded", () => {
  assert.ok(!ids(filterRooms(ROOMS, { attendees: 13, equipment: [] })).includes("R101"));
});
test("F2: a room must contain ALL selected equipment", () => {
  assert.deepEqual(ids(filterRooms(ROOMS, { attendees: 1, equipment: ["projector", "computers"] })), ["R202"]);
  assert.deepEqual(ids(filterRooms(ROOMS, { attendees: 1, equipment: ["projector"] })), ["R101", "R202", "R303"]);
});
test("F3: a blocked room can match filters but is never reported available", () => {
  const blocked = filterRooms(ROOMS, { attendees: 2, equipment: ["whiteboard"] }).find((r) => r.id === "R404");
  assert.ok(blocked);
  const result = checkAvailability(blocked, "15:00", "16:00", CURRENT_TIME);
  assert.equal(result.available, false);
  assert.equal(result.code, "BLOCKED");
});
test("F4: no matching rooms renders a clear empty state", () => {
  const none = filterRooms(ROOMS, { attendees: 500, equipment: [] });
  assert.equal(none.length, 0);
  assert.match(renderRoomList(none, null), /No rooms match/);
});
test("Availability uses the chosen room's own bookings", () => {
  assert.equal(checkAvailability(byId("R101"), "09:30", "10:00", CURRENT_TIME).available, true);
  assert.equal(checkAvailability(byId("R202"), "09:30", "10:00", CURRENT_TIME).code, "CONFLICT");
});
