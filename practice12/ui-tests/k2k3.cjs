// Follow-up DAST checks on MY OWN local Node-RED (127.0.0.1:1880) for review items K3 and K2.
const { chromium } = require("playwright");
const URL = "http://127.0.0.1:1880/dashboard/availability";
const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
async function open(b) {
  const ctx = await b.newContext(); const p = await ctx.newPage({ viewport: { width: 1100, height: 700 } });
  p._upd = 0; p.on("websocket", (ws) => ws.on("framereceived", (f) => { if (typeof f.payload === "string" && f.payload.includes("msg-input:txt_message")) p._upd++; }));
  await p.goto(URL); await p.locator('[data-form="form-row-start"] input').waitFor(); await p.waitForTimeout(700); return p;
}
const w = async (p, id) => norm(await p.locator(`#nrdb-ui-widget-${id} .nrdb-ui-text-value`).innerText());
const all = async (p) => `${await w(p, "txt_decision")} | ${await w(p, "txt_message")} | ${await w(p, "txt_code")}`;
async function check(p, s, d) {
  const n = p._upd;
  await p.locator('[data-form="form-row-start"] input').fill(s); await p.locator('[data-form="form-row-duration"] input').fill(d);
  await p.locator('[data-form="form-row-blocked"] input[type="checkbox"]').setChecked(false);
  await p.locator('[data-action="form-submit"]').click();
  const t = Date.now(); while (p._upd === n && Date.now() - t < 5000) await p.waitForTimeout(50); await p.waitForTimeout(300);
  return all(p);
}
(async () => {
  const mode = process.argv[2]; const b = await chromium.launch();
  if (mode === "k3") {
    const A = await open(b), B = await open(b);
    const a = await check(A, "11:30", "60");
    await B.waitForTimeout(800);
    const C = await open(b);
    console.log(`K3 A (own result):               "${a}"`);
    console.log(`K3 B (open while A checked):     "${await all(B)}"`);
    console.log(`K3 C (opened after A checked):   "${await all(C)}"`);
  } else {
    const A = await open(b);
    console.log(`K2 T2 input 10:30/60 (overlaps 10:00–11:00) with bookings deleted: "${await check(A, "10:30", "60")}"`);
    console.log(`K2 bookings table now: "${norm(await A.locator("#nrdb-ui-widget-tbl_bookings").innerText())}"`);
  }
  await b.close();
})();
