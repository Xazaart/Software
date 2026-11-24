#!/usr/bin/env python3
"""Generates the Node-RED flow (flows.json) for the Smart Campus availability check.

The flow is authored as JSON (no editor clicks) and is then deployed to Node-RED,
where it renders as ordinary nodes in the visual editor.  Everything below is
standard Node-RED core nodes + FlowFuse Dashboard 2.0 widgets; there is NO
function node and NO ui-template in this flow.
"""
import json, sys

TAB = "tab_smart_campus"
nodes = []

def add(n):
    nodes.append(n)
    return n["id"]

# --------------------------------------------------------------------------
# Editor tab + visual groups (separate deterministic rules from presentation)
# --------------------------------------------------------------------------
nodes.append({"id": TAB, "type": "tab", "label": "Smart Campus availability",
              "disabled": False,
              "info": "Practice 12 low-code track. Contract: practice12/CONTRACT.md. "
                      "Fictional data only. Rules group = deterministic booking rules "
                      "(no UI nodes); Presentation group = dashboard widgets only."})

G_DATA, G_RULES, G_UI = "grp_data", "grp_rules", "grp_ui"

# --------------------------------------------------------------------------
# Dashboard 2.0 config nodes
# --------------------------------------------------------------------------
BASE, THEME, PAGE, GFORM, GRES, GBOOK = "ui_base", "ui_theme", "ui_page", "ui_g_form", "ui_g_result", "ui_g_book"
nodes += [
    {"id": BASE, "type": "ui-base", "name": "Smart Campus", "path": "/dashboard",
     "appIcon": "", "includeClientData": False,
     "acceptsClientConfig": ["ui-notification", "ui-control"],
     "showPathInSidebar": False, "headerContent": "page", "navigationStyle": "default",
     "titleBarStyle": "default", "showReconnectNotification": True,
     "notificationDisplayTime": 1, "showDisconnectNotification": True, "allowInstall": False},
    {"id": THEME, "type": "ui-theme", "name": "Campus theme",
     "colors": {"surface": "#1f4e79", "primary": "#1f4e79", "bgPage": "#f4f6f9",
                "groupBg": "#ffffff", "groupOutline": "#d0d7e2"},
     "sizes": {"density": "default", "pagePadding": "12px", "groupGap": "12px",
               "groupBorderRadius": "6px", "widgetGap": "12px"}},
    {"id": PAGE, "type": "ui-page", "name": "Room availability", "ui": BASE,
     "path": "/availability", "icon": "calendar-clock", "layout": "grid", "theme": THEME,
     # Built-in responsive grid: 3 columns on phones, 6 on tablets, 12 on desktop.
     "breakpoints": [{"name": "Default", "px": "0", "cols": "3"},
                     {"name": "Tablet", "px": "576", "cols": "6"},
                     {"name": "Small Desktop", "px": "768", "cols": "9"},
                     {"name": "Desktop", "px": "1024", "cols": "12"}],
     "order": 1, "className": "", "visible": "true", "disabled": "false"},
    {"id": GFORM, "type": "ui-group", "name": "Check Aurora Seminar Room (R101)", "page": PAGE,
     "width": "6", "height": "1", "order": 1, "showTitle": True, "className": "",
     "visible": "true", "disabled": "false", "groupType": "default"},
    {"id": GRES, "type": "ui-group", "name": "Result", "page": PAGE,
     "width": "6", "height": "1", "order": 2, "showTitle": True, "className": "",
     "visible": "true", "disabled": "false", "groupType": "default"},
    {"id": GBOOK, "type": "ui-group", "name": "Existing bookings (read-only, now = 09:00)", "page": PAGE,
     "width": "6", "height": "1", "order": 3, "showTitle": True, "className": "",
     "visible": "true", "disabled": "false", "groupType": "default"},
]

def chg(id, name, rules, x, y, wires, g):
    return {"id": id, "type": "change", "z": TAB, "g": g, "name": name, "rules": rules,
            "action": "", "property": "", "from": "", "to": "", "reg": False,
            "x": x, "y": y, "wires": wires}

def setr(p, to, tot, pt="msg", dc=False):
    r = {"t": "set", "p": p, "pt": pt, "to": to, "tot": tot}
    if dc:
        r["dc"] = True
    return r

def result(code, available, message_or_expr, jsonata=False):
    """Rules for a 'result' change node: msg.result = {available, code, message}."""
    if jsonata:
        return [setr("result", "{\"available\": %s, \"code\": \"%s\", \"message\": %s}"
                     % ("true" if available else "false", code, message_or_expr), "jsonata")]
    return [setr("result", json.dumps({"available": available, "code": code,
                                       "message": message_or_expr}, ensure_ascii=False), "json")]

def switch(id, name, prop, ptype, rules, x, y, wires, g, checkall="false"):
    return {"id": id, "type": "switch", "z": TAB, "g": g, "name": name, "property": prop,
            "propertyType": ptype, "rules": rules, "checkall": checkall, "repair": False,
            "outputs": len(rules), "x": x, "y": y, "wires": wires}

# --------------------------------------------------------------------------
# 1) Fictional data (constants) - set once at start-up
# --------------------------------------------------------------------------
BOOKINGS = [{"start": "10:00", "end": "11:00"}, {"start": "13:00", "end": "14:30"}]
nodes.append({"id": G_DATA, "type": "group", "z": TAB, "name": "1. Fictional data (constants, set once at start-up)",
              "style": {"label": True, "fill": "#e3f3d3"},
              "nodes": ["inj_start", "chg_consts", "lo_show_bookings"], "x": 14, "y": 19, "w": 712, "h": 82})
nodes += [
    {"id": "inj_start", "type": "inject", "z": TAB, "g": G_DATA, "name": "on deploy / start-up",
     "props": [], "repeat": "", "crontab": "", "once": True, "onceDelay": "0.1",
     "topic": "", "x": 150, "y": 60, "wires": [["chg_consts"]]},
    chg("chg_consts", "set room, now, bookings", [
        setr("room", "Aurora Seminar Room (R101)", "str", "flow"),
        setr("roomName", "Aurora Seminar Room", "str", "flow"),
        setr("now", "09:00", "str", "flow"),
        setr("nowMin", "540", "num", "flow"),
        setr("bookings", json.dumps(BOOKINGS), "json", "flow"),
    ], 390, 60, [["lo_show_bookings"]], G_DATA),
    {"id": "lo_show_bookings", "type": "link out", "z": TAB, "g": G_DATA, "name": "to: show bookings",
     "mode": "link", "links": ["li_show_bookings"], "x": 625, "y": 60, "wires": []},
]

# --------------------------------------------------------------------------
# 2) Deterministic booking rules (no UI nodes).  Entry: link in.  Exit: link out (return).
#    Rule order: INVALID_INPUT(start) -> INVALID_DURATION -> IN_PAST -> INVALID_INPUT(24:00)
#                -> BLOCKED -> CONFLICT -> AVAILABLE
# --------------------------------------------------------------------------
RE_START = r"^([01][0-9]|2[0-3]):[0-5][0-9]$"                 # HH:MM 00:00-23:59
RE_DUR = r"^0*([1-9]|[1-9][0-9]|1[01][0-9]|120)$"             # whole number 1-120
TO_MIN = '$number($substringBefore({s}, ":")) * 60 + $number($substringAfter({s}, ":"))'
CONFLICT_EXPR = ('$flowContext("bookings")[(' + TO_MIN.format(s="start") + ') < $$.req.endMin and ('
                 + TO_MIN.format(s="end") + ') > $$.req.startMin][0]')
END_HHMM = ('$formatInteger($floor(req.endMin / 60), "00") & ":" & $formatInteger(req.endMin % 60, "00")')

rule_ids = ["li_rules", "sw_r1", "sw_r2", "chg_minutes", "sw_r3", "sw_r4", "sw_r5", "chg_find",
            "sw_r6", "res_invalid_start", "res_invalid_dur", "res_past", "res_invalid_end",
            "res_blocked", "res_conflict", "res_available", "lo_rules_return"]
nodes.append({"id": G_RULES, "type": "group", "z": TAB,
              "name": "2. Deterministic booking rules (no UI) - rule order top to bottom",
              "style": {"label": True, "fill": "#dbe9f7"}, "nodes": rule_ids,
              "x": 14, "y": 139, "w": 1312, "h": 322})
Y = 180
nodes += [
    {"id": "li_rules", "type": "link in", "z": TAB, "g": G_RULES, "name": "check availability rules",
     "links": [], "x": 110, "y": Y, "wires": [["sw_r1"]]},
    switch("sw_r1", "AC6: start is HH:MM?", "payload.start", "msg",
           [{"t": "regex", "v": RE_START, "vt": "str", "case": False}, {"t": "else"}],
           290, Y, [["sw_r2"], ["res_invalid_start"]], G_RULES),
    switch("sw_r2", "AC2: duration whole 1-120?", "payload.duration", "msg",
           [{"t": "regex", "v": RE_DUR, "vt": "str", "case": False}, {"t": "else"}],
           540, Y, [["chg_minutes"], ["res_invalid_dur"]], G_RULES),
    chg("chg_minutes", "to minutes (req.*)", [
        setr("req.start", "payload.start", "msg"),
        setr("req.startMin", TO_MIN.format(s="payload.start"), "jsonata"),
        setr("req.duration", "$number(payload.duration)", "jsonata"),
        setr("req.endMin", "req.startMin + req.duration", "jsonata"),
        setr("req.blocked", "payload.blocked = true", "jsonata"),
    ], 760, Y, [["sw_r3"]], G_RULES),
    switch("sw_r3", "AC1: start after 09:00?", "req.startMin", "msg",
           [{"t": "gt", "v": "nowMin", "vt": "flow"}, {"t": "else"}],
           300, Y + 80, [["sw_r4"]], G_RULES),  # second output wired below
    switch("sw_r4", "AC6: ends by 24:00?", "req.endMin", "msg",
           [{"t": "lte", "v": "1440", "vt": "num"}, {"t": "else"}],
           540, Y + 80, [["sw_r5"]], G_RULES),
    switch("sw_r5", "AC4: room blocked?", "req.blocked", "msg",
           [{"t": "true"}, {"t": "else"}],
           760, Y + 80, [["res_blocked"], ["chg_find"]], G_RULES),
    chg("chg_find", "find first overlapping booking", [
        setr("req.conflict", CONFLICT_EXPR, "jsonata"),
    ], 320, Y + 160, [["sw_r6"]], G_RULES),
    switch("sw_r6", "AC3: overlaps a booking?", "req.conflict", "msg",
           [{"t": "nnull"}, {"t": "else"}],
           580, Y + 160, [["res_conflict"], ["res_available"]], G_RULES),
]
# wire the 'else' outputs of R3/R4
for n in nodes:
    if n.get("id") == "sw_r3":
        n["wires"] = [["sw_r4"], ["res_past"]]
    if n.get("id") == "sw_r4":
        n["wires"] = [["sw_r5"], ["res_invalid_end"]]

RY = Y
nodes += [
    chg("res_invalid_start", "INVALID_INPUT (start)",
        result("INVALID_INPUT", False, "Invalid input: enter the start time as HH:MM."),
        1060, RY, [["lo_rules_return"]], G_RULES),
    chg("res_invalid_dur", "INVALID_DURATION",
        result("INVALID_DURATION", False, "Invalid input: duration must be a whole number from 1 to 120 minutes."),
        1060, RY + 40, [["lo_rules_return"]], G_RULES),
    chg("res_past", "IN_PAST",
        result("IN_PAST", False, "Invalid input: start time must be after the current time 09:00."),
        1060, RY + 80, [["lo_rules_return"]], G_RULES),
    chg("res_invalid_end", "INVALID_INPUT (24:00)",
        result("INVALID_INPUT", False, "Invalid input: the booking must end by 24:00."),
        1060, RY + 120, [["lo_rules_return"]], G_RULES),
    chg("res_blocked", "BLOCKED",
        result("BLOCKED", False, "Unavailable: the room is blocked."),
        1060, RY + 160, [["lo_rules_return"]], G_RULES),
    chg("res_conflict", "CONFLICT (message)",
        result("CONFLICT", False,
               '"Unavailable: overlaps the existing booking " & req.conflict.start & "–" & req.conflict.end & "."',
               jsonata=True),
        1060, RY + 200, [["lo_rules_return"]], G_RULES),
    chg("res_available", "AVAILABLE (message)",
        result("AVAILABLE", True,
               '"Available: " & $flowContext("roomName") & " is free " & req.start & "–" & ' + END_HHMM + ' & "."',
               jsonata=True),
        1060, RY + 240, [["lo_rules_return"]], G_RULES),
    {"id": "lo_rules_return", "type": "link out", "z": TAB, "g": G_RULES, "name": "return result",
     "mode": "return", "links": [], "x": 1265, "y": RY + 120, "wires": []},
]

# --------------------------------------------------------------------------
# 3) Presentation (Dashboard 2.0 widgets only)
# --------------------------------------------------------------------------
ui_ids = ["form", "lc_rules", "sw_avail", "chg_ok", "chg_nok", "chg_msg", "chg_code",
          "txt_decision", "txt_message", "txt_code", "evt", "sw_pageview", "li_show_bookings",
          "chg_read_bookings", "tbl_bookings", "lo_show_bookings2", "txt_now"]
nodes.append({"id": G_UI, "type": "group", "z": TAB,
              "name": "3. Presentation (FlowFuse Dashboard 2.0) - calls the rules via link call",
              "style": {"label": True, "fill": "#fff5d6"}, "nodes": ui_ids,
              "x": 14, "y": 499, "w": 1312, "h": 322})
PY = 570
nodes += [
    {"id": "form", "type": "ui-form", "z": TAB, "g": G_UI, "name": "booking request form",
     "group": GFORM, "label": "", "order": 1, "width": 0, "height": 0,
     # text fields (not 'time'/'number') so malformed input reaches the rules (AC6, E3/E4/E7)
     "options": [
         {"label": "Start time (HH:MM)", "key": "start", "type": "text", "required": False, "rows": None},
         {"label": "Duration (minutes, 1-120)", "key": "duration", "type": "text", "required": False, "rows": None},
         {"label": "Room is blocked", "key": "blocked", "type": "checkbox", "required": False, "rows": None},
     ],
     "formValue": {"start": "", "duration": "", "blocked": False},
     "payload": "", "submit": "Check", "cancel": "clear", "resetOnSubmit": False,
     "topic": "topic", "topicType": "msg", "splitLayout": "", "className": "",
     "passthru": False, "dropdownOptions": [], "x": 140, "y": PY, "wires": [["lc_rules"]]},
    {"id": "lc_rules", "type": "link call", "z": TAB, "g": G_UI, "name": "call booking rules",
     "links": ["li_rules"], "linkType": "static", "timeout": "5", "x": 350, "y": PY,
     "wires": [["sw_avail", "chg_msg", "chg_code", "chg_read_bookings"]]},
    switch("sw_avail", "available?", "result.available", "msg",
           [{"t": "true"}, {"t": "else"}], 560, PY - 20, [["chg_ok"], ["chg_nok"]], G_UI),
    chg("chg_ok", "Available (green)", [setr("payload", "Available", "str"),
                                        setr("class", "text-success font-weight-bold", "str")],
        760, PY - 40, [["txt_decision"]], G_UI),
    chg("chg_nok", "Unavailable (red)", [setr("payload", "Unavailable", "str"),
                                         setr("class", "text-error font-weight-bold", "str")],
        760, PY, [["txt_decision"]], G_UI),
    chg("chg_msg", "payload = result.message", [setr("payload", "result.message", "msg")],
        780, PY + 40, [["txt_message"]], G_UI),
    chg("chg_code", "payload = result.code", [setr("payload", "result.code", "msg")],
        770, PY + 80, [["txt_code"]], G_UI),
]
def uitext(id, name, group, order, label, x, y, layout="row-left", wrap=True):
    return {"id": id, "type": "ui-text", "z": TAB, "g": G_UI, "group": group, "order": order,
            "width": 0, "height": 0, "name": name, "label": label, "format": "{{msg.payload}}",
            "layout": layout, "style": False, "font": "", "fontSize": 16, "color": "#717171",
            "wrapText": wrap, "className": "", "value": "payload", "valueType": "msg",
            "x": x, "y": y, "wires": []}
nodes += [
    uitext("txt_decision", "Decision", GRES, 1, "Decision:", 1000, PY - 20),
    uitext("txt_message", "Message", GRES, 2, "Message:", 1000, PY + 40),
    uitext("txt_code", "Code", GRES, 3, "Code:", 1000, PY + 80),
    {"id": "evt", "type": "ui-event", "z": TAB, "g": G_UI, "ui": BASE, "name": "dashboard events",
     "x": 130, "y": PY + 160, "wires": [["sw_pageview"]]},
    switch("sw_pageview", "page view?", "topic", "msg",
           [{"t": "eq", "v": "$pageview", "vt": "str"}], 320, PY + 160, [["chg_read_bookings"]], G_UI),
    {"id": "li_show_bookings", "type": "link in", "z": TAB, "g": G_UI, "name": "show bookings",
     "links": ["lo_show_bookings"], "x": 345, "y": PY + 200, "wires": [["chg_read_bookings"]]},
    chg("chg_read_bookings", "payload = copy of flow.bookings",
        [setr("payload", "bookings", "flow", dc=True)], 590, PY + 180, [["tbl_bookings", "txt_now"]], G_UI),
    {"id": "tbl_bookings", "type": "ui-table", "z": TAB, "g": G_UI, "group": GBOOK, "name": "bookings table",
     "label": "", "order": 1, "width": 0, "height": 0, "maxrows": 0, "passthru": False,
     "autocols": False, "showSearch": False, "deselect": True, "selectionType": "none",
     "columns": [
         {"title": "Start", "key": "start", "keyType": "key", "type": "text", "width": "", "align": "start"},
         {"title": "End", "key": "end", "keyType": "key", "type": "text", "width": "", "align": "start"},
     ],
     "mobileBreakpoint": "sm", "mobileBreakpointType": "defaults", "action": "replace",
     "className": "", "x": 870, "y": PY + 160, "wires": [[]]},
    {"id": "txt_now", "type": "ui-text", "z": TAB, "g": G_UI, "group": GBOOK, "order": 2,
     "width": 0, "height": 0, "name": "room / now", "label": "",
     "format": "Aurora Seminar Room (R101) - current time fixed at 09:00 (fictional data)",
     "layout": "row-left", "style": False, "font": "", "fontSize": 14, "color": "#717171",
     "wrapText": True, "className": "", "value": "", "valueType": "str",
     "x": 850, "y": PY + 200, "wires": []},
]
# 'lo_show_bookings2' listed in group ids above is not needed; drop it from the group list
for n in nodes:
    if n.get("id") == G_UI:
        n["nodes"] = [i for i in n["nodes"] if i != "lo_show_bookings2"]

# every node lives on the tab
for n in nodes:
    if n["type"] not in ("tab",) and not n["type"].startswith("ui-base") and n["type"] not in (
            "ui-theme", "ui-page", "ui-group"):
        n.setdefault("z", TAB)

out = sys.argv[1] if len(sys.argv) > 1 else "flows.json"
with open(out, "w", encoding="utf-8") as f:
    json.dump(nodes, f, indent=2, ensure_ascii=False)
print("wrote", out, len(nodes), "nodes")
