import { test } from "node:test";
import assert from "node:assert/strict";
import * as app from "../src/app/controller.js";
import { renderRoomList, renderResult } from "../src/ui/render.js";

test("F5: switching the selected room refreshes the result", () => {
  let s = app.setRequest(app.createInitialState(), "09:30", "10:00");
  assert.equal(s.result, null); // no room selected yet
  s = app.selectRoom(s, "R101");
  assert.equal(s.result.available, true);
  s = app.selectRoom(s, "R202");
  assert.equal(s.result.code, "CONFLICT");
});
test("F5: a selected room that no longer matches filters is cleared", () => {
  let s = app.selectRoom(app.setRequest(app.createInitialState(), "15:00", "16:00"), "R101");
  s = app.setCriteria(s, { attendees: 20, equipment: [] });
  assert.equal(s.selectedRoomId, null);
  assert.equal(s.result, null);
});
test("Integration: filter → select → check → rendered feedback", () => {
  let s = app.setCriteria(app.createInitialState(), { attendees: 6, equipment: ["video-conf"] });
  assert.deepEqual(app.visibleRooms(s).map((r) => r.id), ["R303", "R505"]);
  s = app.setRequest(app.selectRoom(s, "R505"), "12:30", "13:30");
  const list = renderRoomList(app.visibleRooms(s), s.selectedRoomId);
  assert.match(list, /Echo Studio/);
  assert.doesNotMatch(list, /Aurora/);
  assert.match(renderResult(s.result, true), /class="result ok"[\s\S]*Echo Studio is free/);
});
