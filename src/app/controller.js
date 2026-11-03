import { ROOMS, CURRENT_TIME } from "../data/rooms.js";
import { filterRooms } from "../core/filters.js";
import { checkAvailability } from "../core/availability.js";

// Pure state transitions: every function returns a NEW state object.
export function createInitialState(rooms = ROOMS) {
  return {
    rooms,
    now: CURRENT_TIME,
    criteria: { attendees: 1, equipment: [] },
    selectedRoomId: null,
    request: { start: "", end: "" },
    result: null,
  };
}

export function visibleRooms(state) {
  return filterRooms(state.rooms, state.criteria);
}

function recompute(state) {
  const room = state.rooms.find((r) => r.id === state.selectedRoomId);
  if (!room || !state.request.start || !state.request.end) return { ...state, result: null };
  return { ...state, result: checkAvailability(room, state.request.start, state.request.end, state.now) };
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
