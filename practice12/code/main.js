// Layer 3 (DOM wiring only): read raw inputs, call evaluate(), paint. No booking rules live here.
import { FIXTURE } from "./data.js";
import { evaluate } from "./availability.js";
import { renderResult, renderBookings } from "./render.js";

const $ = (id) => document.getElementById(id);

function readRawInput() {
  return { start: $("start").value, duration: $("duration").value, blocked: $("blocked").checked };
}

function paintBookings() {
  $("bookings").innerHTML = renderBookings(FIXTURE.bookings);
}

$("room-name").textContent = `${FIXTURE.roomName} (${FIXTURE.roomId})`;
$("now").textContent = FIXTURE.now;
paintBookings();

$("check-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const result = evaluate(readRawInput(), FIXTURE);
  const box = $("result");
  box.hidden = false;
  box.innerHTML = renderResult(result);
  paintBookings(); // re-read the (frozen) data so the list visibly stays the same after every check
});
