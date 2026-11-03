/** F1: capacity >= attendees. F2: room has ALL required equipment. */
export function matchesRequirements(room, { attendees = 1, equipment = [] } = {}) {
  return room.capacity >= attendees && equipment.every((item) => room.equipment.includes(item));
}

export function filterRooms(rooms, criteria) {
  return rooms.filter((room) => matchesRequirements(room, criteria));
}
