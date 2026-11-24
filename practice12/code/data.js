// Practice #12 fixture. Fictional data only, identical to practice12/CONTRACT.md.
// Deep-frozen so no check can change the bookings (AC5 / T8).
function deepFreeze(obj) {
  Object.values(obj).forEach((v) => {
    if (v && typeof v === "object") deepFreeze(v);
  });
  return Object.freeze(obj);
}

export const FIXTURE = deepFreeze({
  roomId: "R101",
  roomName: "Aurora Seminar Room",
  now: "09:00",
  bookings: [
    { start: "10:00", end: "11:00" },
    { start: "13:00", end: "14:30" },
  ],
});
