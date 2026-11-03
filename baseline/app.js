// Baseline reconstruction of the Assignment #03 prototype:
// one room, logic and UI in a single file.
export const NOW = "09:00";

export const room = Object.freeze({
  name: "Aurora Seminar Room",
  blocked: false,
  bookings: Object.freeze([
    Object.freeze({ start: "10:00", end: "11:00" }),
    Object.freeze({ start: "13:00", end: "14:30" }),
  ]),
});

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function checkAvailability(start, end, targetRoom = room) {
  if (!TIME.test(start) || !TIME.test(end)) {
    return { available: false, message: "Enter times in HH:MM format." };
  }
  const s = parseInt(start.split(":")[0]) * 60 + parseInt(start.split(":")[1]);
  const e = parseInt(end.split(":")[0]) * 60 + parseInt(end.split(":")[1]);
  const now = parseInt(NOW.split(":")[0]) * 60 + parseInt(NOW.split(":")[1]);
  if (e <= s) return { available: false, message: "End time must be after start time." };
  if (s < now) return { available: false, message: "Start time cannot be in the past." };
  if (e - s > 120) return { available: false, message: "Maximum booking length is 120 minutes." };
  if (targetRoom.blocked) return { available: false, message: "This room is blocked." };
  for (const b of targetRoom.bookings) {
    const bs = parseInt(b.start.split(":")[0]) * 60 + parseInt(b.start.split(":")[1]);
    const be = parseInt(b.end.split(":")[0]) * 60 + parseInt(b.end.split(":")[1]);
    if (s < be && bs < e) {
      return { available: false, message: "Room is booked " + b.start + "-" + b.end + "." };
    }
  }
  return { available: true, message: "Room is free!" };
}

if (typeof document !== "undefined") {
  document.getElementById("check").addEventListener("click", () => {
    const r = checkAvailability(
      document.getElementById("start").value,
      document.getElementById("end").value
    );
    const out = document.getElementById("result");
    if (r.available) {
      out.className = "ok";
      out.textContent = r.message;
    } else {
      out.className = "fail";
      out.textContent = r.message;
    }
  });
}
