import pdfplumber, re, json, sys
pdf = pdfplumber.open('incidentreportingquestions.pdf')
items = []  # (page, top, kind, data)
HDR = re.compile(r'^Question\s+([0-9]+\.[0-9]+[a-z]?(?:\*|/[a-z]| ?& ?b)?)\s*[–-]\s*(.*)$')
for pn in range(23, 103):
    p = pdf.pages[pn - 1]
    tables = p.find_tables()
    boxes = [t.bbox for t in tables]
    def outside(obj):
        x = (obj['x0'] + obj['x1']) / 2; y = (obj['top'] + obj['bottom']) / 2
        return not any(b[0] <= x <= b[2] and b[1] <= y <= b[3] for b in boxes)
    text = p.filter(lambda o: o.get('object_type') != 'char' or outside(o)).extract_text_lines()
    for ln in text:
        items.append((pn, ln['top'], 'line', ln['text'].strip()))
    for t in tables:
        rows = [[(c or '').replace('\n', ' ').strip() for c in r] for r in t.extract()]
        items.append((pn, t.bbox[1], 'table', rows))
items.sort(key=lambda x: (x[0], x[1]))
qs = []; cur = None
for pn, top, kind, data in items:
    if kind == 'line':
        m = HDR.match(data)
        if m:
            cur = {'id': m.group(1).replace(' ', ''), 'label': m.group(2).strip(), 'page': pn, 'meta': None, 'tables': [], 'lines': []}
            qs.append(cur); continue
        if cur and not data.startswith('Appendix C'): cur['lines'].append(data)
    elif cur:
        flat = ' '.join(' '.join(r) for r in data)
        if cur['meta'] is None and 'Optional/Mandatory' in flat: cur['meta'] = data
        else: cur['tables'].append(data)
json.dump(qs, open(sys.argv[1], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(qs), 'questions')
