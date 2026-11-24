// Identical-test runner, LOW-CODE track (my own check, same cases/pass rule as run_code.cjs) + screenshots
// + a two-browser DAST check of the Dashboard's default broadcast behaviour. Node-RED on 127.0.0.1:1880.
const { chromium } = require("playwright");
const fs = require("fs");
const dir = process.argv[2];
const spec = JSON.parse(fs.readFileSync("/home/claude/p12/practice12/test-cases.json", "utf8"));
const URL = "http://127.0.0.1:1880/dashboard/availability";
const norm = (s) => (s || "").replace(/\s+/g, " ").trim();

async function open(b, vp) {
  const p = await b.newPage({ viewport: vp });
  p._dialogs = 0; p.on("dialog", (d) => { p._dialogs++; d.dismiss(); });
  p._upd = 0;
  p.on("websocket", (ws) => ws.on("framereceived", (f) => { if (typeof f.payload === "string" && f.payload.includes("msg-input:txt_message")) p._upd++; }));
  await p.goto(URL);
  await p.locator('[data-form="form-row-start"] input').waitFor({ timeout: 15000 });
  await p.locator("#nrdb-ui-widget-tbl_bookings").waitFor({ timeout: 15000 });
  await p.waitForTimeout(600);
  return p;
}
const txt = async (p, id) => norm(await p.locator(`#nrdb-ui-widget-${id} .nrdb-ui-text-value`).innerText());
const table = async (p) => norm(await p.locator("#nrdb-ui-widget-tbl_bookings tbody").innerText());
async function check(p, input) {
  const before = p._upd;
  await p.locator('[data-form="form-row-start"] input').fill(input.start);
  await p.locator('[data-form="form-row-duration"] input').fill(input.duration);
  await p.locator('[data-form="form-row-blocked"] input[type="checkbox"]').setChecked(input.blocked);
  await p.locator('[data-action="form-submit"]').click();
  const t0 = Date.now(); while (p._upd === before && Date.now() - t0 < 5000) await p.waitForTimeout(50);
  await p.waitForTimeout(250);
  return { decision: await txt(p, "txt_decision"), message: await txt(p, "txt_message"), code: await txt(p, "txt_code") };
}

(async () => {
  const b = await chromium.launch(); const out = [];
  for (const [label, vp] of [["desktop", { width: 1280, height: 800 }], ["phone", { width: 375, height: 740 }]]) {
    const p = await open(b, vp);
    const before = await table(p);
    for (const c of [...spec.cases.filter((c) => c.id !== "T8"), ...spec.extra]) {
      const r = await check(p, c.input);
      const verdict = c.expected.available ? "Available" : "Unavailable";
      const shown = `${r.decision} | ${r.message} | ${r.code}`;
      const pass = r.decision === verdict && r.message === c.expected.message && r.code === c.expected.code;
      out.push({ track: "lowcode", view: label, id: c.id, name: c.name, expected: `${verdict} | ${c.expected.message}`, observed: shown, pass });
      if (label === "desktop" && ["T1", "T2", "T3", "T5", "T7", "E7"].includes(c.id)) await p.screenshot({ path: `${dir}/lowcode_${c.id}.png` });
      if (label === "phone" && ["T1", "T2"].includes(c.id)) await p.screenshot({ path: `${dir}/lowcode_phone_${c.id}.png`, fullPage: true });
    }
    await p.reload(); await p.locator("#nrdb-ui-widget-tbl_bookings tbody tr").first().waitFor(); await p.waitForTimeout(500);
    const after = await table(p);
    out.push({ track: "lowcode", view: label, id: "T8", name: "booking data unchanged after checks", expected: before, observed: `${after} | alert dialogs: ${p._dialogs}`, pass: before === after && before.includes("10:00") && before.includes("13:00") && p._dialogs === 0 });
    await p.close();
  }
  // DAST: two independent browser contexts ("student A" and "student B")
  const ctxA = await b.newContext(), ctxB = await b.newContext();
  const A = await open(ctxA, { width: 1100, height: 700 }), B = await open(ctxB, { width: 1100, height: 700 });
  const bBefore = await txt(B, "txt_message");
  await check(A, { start: "11:00", duration: "120", blocked: false }); // distinctive result (E1) so a leak is visible
  await B.waitForTimeout(800);
  const bAfter = await txt(B, "txt_message");
  await B.screenshot({ path: `${dir}/lowcode_dast_broadcast_B.png` });
  const dast = `Student B's screen before A checked: "${bBefore}" | after only A pressed Check: "${bAfter}" | leaked=${bBefore !== bAfter}`;
  await b.close();
  fs.writeFileSync(`${dir}/../results_lowcode.json`, JSON.stringify(out, null, 1));
  for (const r of out) console.log(`${r.pass ? "PASS" : "FAIL"} [${r.view}] ${r.id} ${r.name}\n     observed: ${r.observed}`);
  for (const v of ["desktop", "phone"]) { const s = out.filter((r) => r.view === v); console.log(`${v}: core ${s.filter((r) => r.id.startsWith("T") && r.pass).length}/8, extra ${s.filter((r) => r.id.startsWith("E") && r.pass).length}/7`); }
  console.log("DAST-1 (two browsers): " + dast);
})();
