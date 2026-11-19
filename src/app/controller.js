import { ROOMS, CURRENT_TIME } from "../data/rooms.js";
import { filterRooms } from "../core/filters.js";
import { checkAvailability } from "../core/availability.js";
import { buildExplanationContext } from "../explain/context.js";

// Pure state transitions: every function returns a NEW state object.
export function createInitialState(rooms = ROOMS) {
  return {
    rooms,
    now: CURRENT_TIME,
    criteria: { attendees: 1, equipment: [] },
    selectedRoomId: null,
    request: { start: "", end: "" },
    result: null,
    explanation: null,
  };
}

export function visibleRooms(state) {
  return filterRooms(state.rooms, state.criteria);
}

// Every input change recomputes the result and drops any explanation (EX-6: no stale explanation).
function recompute(state) {
  const room = state.rooms.find((r) => r.id === state.selectedRoomId);
  if (!room || !state.request.start || !state.request.end) return { ...state, result: null, explanation: null };
  return { ...state, result: checkAvailability(room, state.request.start, state.request.end, state.now), explanation: null };
}

export function setCriteria(state, criteria) {
  const next = { ...state, criteria };
  const stillVisible = visibleRooms(next).some((r) => r.id === state.selectedRoomId);
  return recompute({ ...next, selectedRoomId: stillVisible ? state.selectedRoomId : null });
}

export function selectRoom(state, roomId) {
  return recompute({ ...state, selectedRoomId: roomId }); // F5
}

export function setRequest(state, start, end) {
  return recompute({ ...state, request: { start, end } });
}

/** Facts for the explanation adapter, or null when there is no result for the selected room (EX-2). */
export function explanationContext(state) {
  const room = state.rooms.find((r) => r.id === state.selectedRoomId);
  return buildExplanationContext(room, state.request, state.result, state.now);
}

export function canExplain(state) {
  return explanationContext(state) !== null;
}

function sameFacts(a, b) {
  return Boolean(a && b) && a.roomId === b.roomId && a.requestedStart === b.requestedStart
    && a.requestedEnd === b.requestedEnd && a.reasonCode === b.reasonCode && a.decision === b.decision;
}

/**
 * Stores an explanation produced for `context`. It is ignored (state returned unchanged) when the
 * inputs changed while the adapter was running, or when it does not match the current decision.
 * The result is never modified (EX-1).
 */
export function setExplanation(state, context, explanation) {
  const current = explanationContext(state);
  if (!explanation || !sameFacts(current, context)) return state;
  if (explanation.decision !== current.decision || explanation.reasonCode !== current.reasonCode) return state;
  return { ...state, explanation };
}
