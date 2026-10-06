import pdfplumber, re, json, sys
from collections import Counter
pdf = pdfplumber.open('incidentreportingquestions.pdf')
# find page ranges by section heading
starts = {}
for i in range(100, 128):
    t = pdf.pages[i].extract_text() or ''
    for key, pat in [('incidentType', '6.1 Mobilise'), ('propertyType', '6.2 Property Types'), ('specialService', '6.3 Special Service'), ('falseAlarm', '6.4 False Alarm'), ('end', '7. BVPI')]:
        if pat in t and key not in starts: starts[key] = i
print(starts)
rows = {}
order = ['incidentType', 'propertyType', 'specialService', 'falseAlarm', 'end']
for k in order[:-1]:
    a, b = starts[k], starts[order[order.index(k) + 1]]
    out = []
    for i in range(a, b + 1):
        for t in pdf.pages[i].find_tables():
            for r in t.rows:
                cells = []
                for bbox in r.cells:
                    if not bbox: continue
                    txt = (pdf.pages[i].crop(bbox).extract_text() or '').replace('\n', ' ').strip()
                    if txt: cells.append((round(bbox[0]), txt))
                if cells: out.append((i + 1, cells))
    rows[k] = out
    xs = Counter(x for _, cs in out for x, _ in cs)
    print(k, len(out), sorted(xs.items())[:30])
json.dump(rows, open(sys.argv[1], 'w', encoding='utf-8'), ensure_ascii=False)
