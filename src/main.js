import { EQUIPMENT, CURRENT_TIME } from "./data/rooms.js";
import * as app from "./app/controller.js";
import { renderEquipmentOptions, renderRoomList, renderResult } from "./ui/render.js";
import { normalizeCriteria } from "./core/filters.js";

let state = app.createInitialState();
const $ = (id) => document.getElementById(id);

// DOM only: read raw values; the rule for valid criteria lives in core/filters.js.
function readCriteria() {
  return normalizeCriteria({
    attendees: $("attendees").value,
    equipment: [...document.querySelectorAll('input[name="equipment"]:checked')].map((i) => i.value),
  });
}

function paint() {
  $("rooms").innerHTML = renderRoomList(app.visibleRooms(state), state.selectedRoomId);
  $("result").innerHTML = renderResult(state.result, Boolean(state.selectedRoomId));
  $("check").disabled = !state.selectedRoomId;
}

$("now").textContent = CURRENT_TIME;
$("equipment").innerHTML = renderEquipmentOptions(EQUIPMENT);

// Pressing Enter in the attendees field would otherwise submit the form and reload the page,
// silently resetting all filters (found in manual UI check, not covered by node tests).
$("filters").addEventListener("submit", (e) => e.preventDefault());
$("filters").addEventListener("input", () => {
  state = app.setCriteria(state, readCriteria());
  paint();
});
$("rooms").addEventListener("change", (e) => {
  if (e.target.name === "room") {
    state = app.selectRoom(state, e.target.value);
    paint();
  }
});
$("booking").addEventListener("submit", (e) => {
  e.preventDefault();
  state = app.setRequest(state, $("start").value, $("end").value);
  paint();
});

paint();
