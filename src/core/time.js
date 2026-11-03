const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "HH:MM" → minutes since midnight, or null if invalid. */
export function toMinutes(hhmm) {
  const m = TIME_RE.exec(String(hhmm));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
