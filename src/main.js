import { EQUIPMENT, CURRENT_TIME } from "./data/rooms.js";
import * as app from "./app/controller.js";
import { renderEquipmentOptions, renderRoomList, renderResult, renderExplanation } from "./ui/render.js";
import { normalizeCriteria } from "./core/filters.js";
import { createMockAdapter, MOCK_MODES } from "./explain/mockAdapter.js";
import { explainAvailability } from "./explain/service.js";

let state = app.createInitialState();
let pendingExplanation = false;

// Mock only (no network, no keys). For manual failure checks open index.html?mock=slow|throw|empty|long|contradict|...
const requestedMode = new URLSearchParams(location.search).get("mock");
const adapter = createMockAdapter({ mode: MOCK_MODES.includes(requestedMode) ? requestedMode : "normal" });

// Any state change made by the user drops a pending or shown explanation (EX-6).
function update(next) {
  state = next;
  pendingExplanation = false;
  paint();
}
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
  $("explanation").innerHTML = renderExplanation(state.explanation, { pending: pendingExplanation });
  $("explain").disabled = pendingExplanation || !app.canExplain(state); // EX-2
}

$("now").textContent = CURRENT_TIME;
$("equipment").innerHTML = renderEquipmentOptions(EQUIPMENT);

// Pressing Enter in the attendees field would otherwise submit the form and reload the page,
// silently resetting all filters (found in manual UI check, not covered by node tests).
$("filters").addEventListener("submit", (e) => e.preventDefault());
$("filters").addEventListener("input", () => {
  update(app.setCriteria(state, readCriteria()));
});
$("rooms").addEventListener("change", (e) => {
  if (e.target.name === "room") {
    update(app.selectRoom(state, e.target.value));
  }
});
$("booking").addEventListener("submit", (e) => {
  e.preventDefault();
  update(app.setRequest(state, $("start").value, $("end").value));
});
// Editing a time without re-checking also invalidates the explanation shown for the old slot.
["start", "end"].forEach((id) => $(id).addEventListener("input", () => update({ ...state, explanation: null })));

$("explain").addEventListener("click", async () => {
  const context = app.explanationContext(state);
  if (!context) return;
  pendingExplanation = true;
  paint();
  const explanation = await explainAvailability(context, adapter); // never rejects; falls back on failure
  if (!pendingExplanation) return; // inputs changed meanwhile: discard (EX-6)
  pendingExplanation = false;
  state = app.setExplanation(state, context, explanation); // result is never touched (EX-1)
  paint();
});

paint();
