// Fictional data only. Deep-frozen so no code can mutate bookings (AC5).
export const CURRENT_TIME = "09:00";
export const EQUIPMENT = ["projector", "whiteboard", "video-conf", "computers"];

function deepFreeze(obj) {
  Object.values(obj).forEach((v) => {
    if (v && typeof v === "object") deepFreeze(v);
  });
  return Object.freeze(obj);
}

export const ROOMS = deepFreeze([
  { id: "R101", name: "Aurora Seminar Room", capacity: 12, equipment: ["projector", "whiteboard"], blocked: false,
    bookings: [{ start: "10:00", end: "11:00" }, { start: "13:00", end: "14:30" }] },
  { id: "R202", name: "Birch Computer Lab", capacity: 30, equipment: ["projector", "computers", "whiteboard"], blocked: false,
    bookings: [{ start: "09:30", end: "11:30" }] },
  { id: "R303", name: "Cedar Lecture Hall", capacity: 80, equipment: ["projector", "video-conf"], blocked: false,
    bookings: [{ start: "14:00", end: "16:00" }] },
  { id: "R404", name: "Delta Study Pod", capacity: 4, equipment: ["whiteboard"], blocked: true,
    bookings: [] },
  { id: "R505", name: "Echo Studio", capacity: 8, equipment: ["video-conf", "whiteboard"], blocked: false,
    bookings: [{ start: "12:00", end: "12:30" }] },
]);
