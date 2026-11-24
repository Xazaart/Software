# Low-code track: Node-RED 4.1.18 + FlowFuse Dashboard 2.0 (1.37.0)

- `flows.json`: the exported flow (one tab, 0 function nodes, 0 template nodes). Import it in the Node-RED editor (Menu → Import) or use it as the flow file.
- `flows.before-repair.json`: the flow as the AI first built it. In this version results are broadcast to every open dashboard (defect DAST-1, see the report).
- `settings.js`: Node-RED settings. The only changes from the defaults are `uiHost: "127.0.0.1"`, `uiPort: 1880` and an absolute `flowFile`. **adminAuth is NOT set**, so do not expose this to a network.
- `package.json` / `userdir-package.json`: the installed runtime and dashboard versions.
- `build-flow.py`: the script the AI used to generate the flow JSON. This is disclosed in the report.
- `test-dashboard.cjs`: the AI's own browser test. My independent runner is `../ui-tests/run_lowcode.cjs`.

Run (Node 22):
```
npm install node-red@4.1.18
mkdir userdir && cp settings.js flows.json userdir/ && (cd userdir && npm install @flowfuse/node-red-dashboard@1.37.0)
./node_modules/.bin/node-red --userDir ./userdir --settings ./userdir/settings.js   # editor http://127.0.0.1:1880, app /dashboard/availability
```
