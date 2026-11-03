const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function renderEquipmentOptions(items, selected = []) {
  return items
    .map((i) => `<label><input type="checkbox" name="equipment" value="${esc(i)}"${selected.includes(i) ? " checked" : ""}> ${esc(i)}</label>`)
    .join(" ");
}

export function renderRoomList(rooms, selectedId) {
  if (rooms.length === 0) {
    return `<p class="empty" role="status">No rooms match these requirements. Try fewer attendees or less equipment.</p>`;
  }
  return `<ul class="rooms">${rooms
    .map((r) => {
      const sel = r.id === selectedId;
      return `<li><label class="room${sel ? " selected" : ""}">
        <input type="radio" name="room" value="${esc(r.id)}"${sel ? " checked" : ""}>
        <strong>${esc(r.name)}</strong> <span>${esc(r.id)} · ${r.capacity} seats</span>
        <small>${r.equipment.map(esc).join(", ") || "no equipment"}</small>
        ${r.blocked ? '<em class="badge">Blocked</em>' : ""}
      </label></li>`;
    })
    .join("")}</ul>`;
}

/** One renderer for every outcome (replaces the duplicated if/else in the baseline). */
export function renderResult(result, hasRoom) {
  if (!hasRoom) return `<p class="hint">Select a room to check availability.</p>`;
  if (!result) return `<p class="hint">Choose a time slot and press “Check availability”.</p>`;
  return `<p class="result ${result.available ? "ok" : "fail"}" role="status">${esc(result.message)}</p>`;
}
