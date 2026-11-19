// Review fix R1: tracks which "Explain availability" request is the newest one.
// A reply may update the page only if its request is still current; any input change invalidates all.
export function createRequestGate() {
  let latest = 0;      // id of the newest request
  let open = false;    // newest request still waiting for its reply
  return Object.freeze({
    begin() { latest += 1; open = true; return latest; },
    isCurrent(id) { return id === latest; },
    finish(id) { if (id === latest) open = false; },
    invalidate() { latest += 1; open = false; },
    pending() { return open; },
  });
}
