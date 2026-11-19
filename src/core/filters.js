/** F1: capacity >= attendees. F2: room has ALL required equipment. */
export function matchesRequirements(room, { attendees = 1, equipment = [] } = {}) {
  return room.capacity >= attendees && equipment.every((item) => room.equipment.includes(item));
}

export function filterRooms(rooms, criteria) {
  return rooms.filter((room) => matchesRequirements(room, criteria));
}

/**
 * Turns raw form values into filter criteria. Business rule (moved here from main.js):
 * attendees must be a positive whole number; anything else falls back to 1.
 */
export function normalizeCriteria({ attendees, equipment = [] } = {}) {
  const n = Number(attendees);
  return { attendees: Number.isInteger(n) && n > 0 ? n : 1, equipment: [...equipment] };
}
