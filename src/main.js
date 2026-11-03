import { EQUIPMENT, CURRENT_TIME } from "./data/rooms.js";
import * as app from "./app/controller.js";
import { renderEquipmentOptions, renderRoomList, renderResult } from "./ui/render.js";

let state = app.createInitialState();
const $ = (id) => document.getElementById(id);

function readCriteria() {
  const n = Number($("attendees").value);
  return {
    attendees: Number.isInteger(n) && n > 0 ? n : 1,
    equipment: [...document.querySelectorAll('input[name="equipment"]:checked')].map((i) => i.value),
  };
}

function paint() {
  $("rooms").innerHTML = renderRoomList(app.visibleRooms(state), state.selectedRoomId);
  $("result").innerHTML = renderResult(state.result, Boolean(state.selectedRoomId));
  $("check").disabled = !state.selectedRoomId;
}

$("now").textContent = CURRENT_TIME;
$("equipment").innerHTML = renderEquipmentOptions(EQUIPMENT);

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
