import json, re, sys
S = sys.argv[1]
R = json.load(open(S + '/irs_hier_rows.json', encoding='utf-8'))
def fix(t): return re.sub(r'\s+', ' ', t.replace('\ufffd', "'")).strip()
COLS = {
    'incidentType':   [('l1', 26), ('l2', 100), ('desc', 215), ('id', 420), ('priority', 455), ('stats', 498)],
    'propertyType':   [('l2', 30), ('l3', 108), ('l4', 236), ('id', 330), ('primary', 360), ('category', 409), ('regulated', 486)],
    'specialService': [('l1', 30), ('l2', 165), ('l3', 307), ('id', 427), ('rtc', 463), ('hazmat', 511)],
    'falseAlarm':     [('l1', 30), ('l2', 144), ('l3', 279), ('l4', 399), ('id', 522)],
}
HEAD = {'incidentType': 'Incident Type', 'propertyType': 'SUB TYPE', 'specialService': 'LEVEL 1 - Type', 'falseAlarm': 'LEVEL 2 - Type'}
def colof(k, x):
    best = None
    for name, x0 in COLS[k]:
        if x >= x0 - 3: best = name
    return best
out = {}
for k, rows in R.items():
    items = []; prev = {}; active = False; lastpage = None
    for pg, cells in rows:
        txt = ' '.join(t for _, t in cells)
        if pg != lastpage:
            lastpage = pg
            active = any(HEAD[k] in t for _, t in cells) or (active and not any(h in txt for kk, h in HEAD.items() if kk != k))
        if any(h in txt for kk, h in HEAD.items() if kk != k) or 'BVPI' in txt: active = False
        if any(HEAD[k] in t for _, t in cells): active = True; continue
        if not active: continue
        rec = {}
        for x, t in cells:
            c = colof(k, x)
            if c and c not in rec: rec[c] = fix(t)
        if not re.fullmatch(r'\d{1,4}', rec.get('id', '')): continue
        levels = [c for c, _ in COLS[k] if c.startswith('l')]
        deepest = max([i for i, c in enumerate(levels) if rec.get(c)], default=-1)
        for i, c in enumerate(levels[:deepest]):
            if not rec.get(c) and prev.get(c): rec[c] = prev[c]
        prev = rec
        items.append(rec)
    out[k] = items
    print(k, len(items))
json.dump(out, open(S + '/irs_hier.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
