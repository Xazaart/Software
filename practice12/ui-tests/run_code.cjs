// Identical-test runner, CODE-BASED track (my own check, independent of the AI's script).
// Usage: node run_code.cjs <port> <shotdir>
const { chromium } = require("playwright");
const fs = require("fs");
const [port, dir] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync("/home/claude/p12/practice12/test-cases.json", "utf8"));
const url = `http://127.0.0.1:${port}/practice12/code/`;
const norm = (s) => (s || "").replace(/\s+/g, " ").trim();

(async () => {
  const b = await chromium.launch();
  const out = [];
  for (const [label, vp] of [["desktop", { width: 1280, height: 800 }], ["phone", { width: 375, height: 740 }]]) {
    const p = await b.newPage({ viewport: vp });
    let dialogs = 0; p.on("dialog", (d) => { dialogs++; d.dismiss(); });
    await p.goto(url);
    const before = norm(await p.textContent("#bookings"));
    for (const c of [...spec.cases.filter((c) => c.id !== "T8"), ...spec.extra]) {
      await p.fill("#start", c.input.start); await p.fill("#duration", c.input.duration);
      await p.setChecked("#blocked", c.input.blocked); await p.click("#check");
      const shown = norm(await p.textContent("#result"));
      const verdict = c.expected.available ? "Available" : "Unavailable";
      const pass = shown.includes(c.expected.message) && shown.startsWith(verdict);
      out.push({ track: "code", view: label, id: c.id, name: c.name, expected: `${verdict} | ${c.expected.message}`, observed: shown, pass });
      if (label === "desktop" && ["T1", "T2", "T3", "T5", "T7", "E7"].includes(c.id)) await p.screenshot({ path: `${dir}/code_${c.id}.png` });
      if (label === "phone" && ["T1", "T2"].includes(c.id)) await p.screenshot({ path: `${dir}/code_phone_${c.id}.png`, fullPage: true });
    }
    const after = norm(await p.textContent("#bookings"));
    out.push({ track: "code", view: label, id: "T8", name: "booking data unchanged after checks", expected: before, observed: `${after} | alert dialogs: ${dialogs}`, pass: before === after && before.includes("10:00") && before.includes("13:00") && dialogs === 0 });
    await p.close();
  }
  await b.close();
  fs.writeFileSync(`${dir}/../results_code.json`, JSON.stringify(out, null, 1));
  for (const r of out) console.log(`${r.pass ? "PASS" : "FAIL"} [${r.view}] ${r.id} ${r.name}\n     observed: ${r.observed}`);
  for (const v of ["desktop", "phone"]) { const s = out.filter((r) => r.view === v); console.log(`${v}: core ${s.filter((r) => r.id.startsWith("T") && r.pass).length}/8, extra ${s.filter((r) => r.id.startsWith("E") && r.pass).length}/7`); }
})();
