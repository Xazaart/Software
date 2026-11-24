// Practice 12 - low-code track: runs every case of practice12/test-cases.json through the
// FlowFuse Dashboard 2.0 UI in a real Chromium browser (Playwright) and prints expected vs observed.
// Usage: node /home/claude/p12lowcode/test-dashboard.cjs   (Node-RED must be running on 127.0.0.1:1880)
// Exit code 0 = all checks passed, 1 = at least one failure. No screenshots are saved.
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://127.0.0.1:1880';
const PAGE_URL = BASE + '/dashboard/availability';
const TESTS = JSON.parse(fs.readFileSync('/home/claude/p12/practice12/test-cases.json', 'utf8'));

const results = [];
function record(id, name, expected, observed, pass, note = '') {
  results.push({ id, name, expected, observed, pass, note });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id}  ${name}`);
  console.log(`      expected: ${JSON.stringify(expected)}`);
  console.log(`      observed: ${JSON.stringify(observed)}${note ? '  (' + note + ')' : ''}`);
}

async function openDashboard(browser, viewport) {
  const page = await browser.newPage({ viewport });
  const state = { messageUpdates: 0, dialogs: [] };
  page.on('dialog', async (d) => { state.dialogs.push(d.message()); await d.dismiss(); });
  // Count socket.io frames that update the "Message" widget, so we know when a new result arrived
  // (consecutive cases can produce identical text, e.g. T4 and T5).
  page.on('websocket', (ws) => {
    ws.on('framereceived', (f) => {
      if (typeof f.payload === 'string' && f.payload.includes('msg-input:txt_message')) state.messageUpdates++;
    });
  });
  await page.goto(PAGE_URL);
  await page.locator('[data-form="form-row-start"] input').waitFor({ timeout: 15000 });
  await page.locator('#nrdb-ui-widget-tbl_bookings').waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);
  return { page, state };
}

async function readResult(page) {
  const text = async (id) => (await page.locator(`#nrdb-ui-widget-${id} .nrdb-ui-text-value`).innerText()).trim();
  return { decision: await text('txt_decision'), message: await text('txt_message'), code: await text('txt_code') };
}

async function runCheck(page, state, input) {
  const before = state.messageUpdates;
  await page.locator('[data-form="form-row-start"] input').fill(String(input.start));
  await page.locator('[data-form="form-row-duration"] input').fill(String(input.duration));
  await page.locator('[data-form="form-row-blocked"] input[type="checkbox"]').setChecked(!!input.blocked);
  await page.locator('[data-action="form-submit"]').click();
  const t0 = Date.now();
  while (state.messageUpdates === before) {
    if (Date.now() - t0 > 5000) return { timeout: true };
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(200); // let Vue render the last update
  return readResult(page);
}

async function readBookingsTable(page) {
  const rows = page.locator('#nrdb-ui-widget-tbl_bookings tbody tr');
  const n = await rows.count();
  const out = [];
  for (let i = 0; i < n; i++) {
    const cells = await rows.nth(i).locator('td').allInnerTexts();
    out.push({ start: cells[0].trim(), end: cells[1].trim() });
  }
  return out;
}

(async () => {
  const browser = await chromium.launch();
  try {
    // ---------------------------------------------------------------- desktop run: T1-T7 + E1-E7
    const { page, state } = await openDashboard(browser, { width: 1280, height: 900 });
    const initialBookings = await readBookingsTable(page);
    const cases = [...TESTS.cases.filter((c) => c.id !== 'T8'), ...TESTS.extra];
    for (const c of cases) {
      const obs = await runCheck(page, state, c.input);
      if (obs.timeout) { record(c.id, c.name, c.expected, 'no result within 5 s', false); continue; }
      const observed = { available: obs.decision === 'Available', code: obs.code, message: obs.message };
      let pass = observed.available === c.expected.available && observed.code === c.expected.code &&
        observed.message === c.expected.message &&
        obs.decision === (c.expected.available ? 'Available' : 'Unavailable');
      let note = `decision shown: "${obs.decision}"`;
      if (c.id === 'E7') {
        const injected = await page.locator('img[src="x"]').count();
        const xssOk = injected === 0 && state.dialogs.length === 0;
        pass = pass && xssOk;
        note += `; injected <img src=x> elements: ${injected}; JS dialogs: ${state.dialogs.length}`;
      }
      record(c.id, c.name, c.expected, observed, pass, note);
    }

    // ---------------------------------------------------------------- T8: bookings unchanged
    const t8 = TESTS.cases.find((c) => c.id === 'T8');
    const afterChecks = await readBookingsTable(page);
    await page.reload();
    await page.locator('#nrdb-ui-widget-tbl_bookings tbody tr').first().waitFor({ timeout: 10000 });
    const afterReload = await readBookingsTable(page);
    // Also read the stored constant straight from the runtime (Admin API, flow context of the tab).
    const ctx = await (await fetch(`${BASE}/context/flow/tab_smart_campus/bookings`)).json();
    const stored = JSON.parse(ctx.msg ?? 'null'); // per-key response: {msg, format}
    const exp = JSON.stringify(t8.expected.bookings);
    const t8pass = JSON.stringify(initialBookings) === exp && JSON.stringify(afterChecks) === exp &&
      JSON.stringify(afterReload) === exp && JSON.stringify(stored) === exp;
    record('T8', t8.name, t8.expected, { initialTable: initialBookings, tableAfterChecks: afterChecks,
      tableAfterReload: afterReload, flowContextAfterChecks: stored }, t8pass,
      `after ${cases.length} checks`);
    await page.close();

    // ---------------------------------------------------------------- narrow screen smoke test
    const m = await openDashboard(browser, { width: 360, height: 740 });
    const t1 = TESTS.cases.find((c) => c.id === 'T1');
    const mobs = await runCheck(m.page, m.state, t1.input);
    const overflow = await m.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const boxes = {};
    for (const id of ['form', 'txt_decision', 'txt_message', 'tbl_bookings']) {
      const bb = await m.page.locator(`#nrdb-ui-widget-${id}`).boundingBox();
      boxes[id] = bb ? { x: Math.round(bb.x), w: Math.round(bb.width) } : null;
    }
    const fits = Object.values(boxes).every((b) => b && b.x >= 0 && b.x + b.w <= 360);
    record('MOBILE', 'T1 on a 360 px wide viewport, no horizontal scroll',
      { message: t1.expected.message, horizontalOverflowPx: 0, widgetsInsideViewport: true },
      { message: mobs.message, horizontalOverflowPx: overflow, widgets: boxes },
      mobs.message === t1.expected.message && overflow <= 0 && fits);
    await m.page.close();

    // ---------------------------------------------------------------- editor renders the flow as nodes
    const ed = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    await ed.goto(BASE + '/');
    await ed.locator('#red-ui-workspace-chart g.red-ui-flow-node').first().waitFor({ timeout: 20000 });
    await ed.waitForTimeout(1000);
    const nodeCount = await ed.locator('#red-ui-workspace-chart g.red-ui-flow-node').count();
    // one label per editor group box (a group draws several nested <g> elements, so count labels)
    const groupLabels = (await ed.locator('#red-ui-workspace-chart .red-ui-flow-group-label').allTextContents())
      .map((t) => t.trim()).filter(Boolean);
    const groupCount = groupLabels.length;
    const tabLabel = (await ed.locator('#red-ui-workspace-tabs .red-ui-tab.active').innerText()).trim();
    const fnNodes = await ed.locator('#red-ui-workspace-chart g.red-ui-flow-node-function').count();
    record('EDITOR', 'visual editor renders the flow as nodes',
      { tab: 'Smart Campus availability', nodesRendered: '> 0', groupsRendered: 3 },
      { tab: tabLabel, nodesRendered: nodeCount, groupsRendered: groupCount, groupLabels, functionNodes: fnNodes },
      tabLabel === 'Smart Campus availability' && nodeCount > 0 && groupCount === 3);
    await ed.close();
  } finally {
    await browser.close();
  }
  const failed = results.filter((r) => !r.pass);
  console.log(`\nSummary: ${results.length - failed.length}/${results.length} checks passed` +
    (failed.length ? `; failed: ${failed.map((r) => r.id).join(', ')}` : ''));
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('Test run error:', e); process.exit(2); });
