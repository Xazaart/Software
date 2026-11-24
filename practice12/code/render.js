// Layer 3 (pure part): presentation. Turns results and data into HTML strings.
// No rules here: it only displays what availability.js decided. Every dynamic value goes through esc().
export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** The verdict word shown in large type: only "Available" or "Unavailable" (AC5). */
export const verdictLabel = (result) => (result.available ? "Available" : "Unavailable");

export function renderResult(result) {
  const cls = result.available ? "ok" : "fail";
  return `<p class="verdict ${cls}">${esc(verdictLabel(result))}</p>` +
    `<p class="reason" data-code="${esc(result.code)}">${esc(result.message)}</p>`;
}

export function renderBookings(bookings) {
  if (bookings.length === 0) return `<li class="empty">No existing bookings.</li>`;
  return bookings
    .map((b) => `<li><time>${esc(b.start)}</time>–<time>${esc(b.end)}</time> <span>booked</span></li>`)
    .join("");
}
