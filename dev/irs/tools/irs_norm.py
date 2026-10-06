import json, re, sys
S = sys.argv[1]
qs = json.load(open(S + '/irs_raw.json', encoding='utf-8'))
def fix(t):
    t = re.sub(r'(?<=\w)\ufffd(?=\w)', "'", t)
    t = re.sub(r'\ufffd', '–', t)
    t = t.replace("–s ", "'s ").replace('–Other–', "'Other'")
    return re.sub(r'\s+', ' ', t).strip()
LABELS = ['Incidents', 'Optional/Mandatory', 'Pre-populated?', 'Depends on', 'On FDR1?', 'Format', 'Notes:']
def meta(rows):
    out = {}
    for r in rows:
        cells = [fix(c) for c in r if c and c.strip()]
        i = 0
        while i < len(cells):
            c = cells[i]
            if c in LABELS:
                val = []
                j = i + 1
                while j < len(cells) and cells[j] not in LABELS:
                    val.append(cells[j]); j += 1
                out[c.rstrip(':?')] = ' '.join(val); i = j
            else:
                # value before its label (cells jumbled): attach to next label
                if i + 1 < len(cells) and cells[i + 1] in LABELS and cells[i + 1] != 'Notes:':
                    lab = cells[i + 1].rstrip(':?')
                    out[lab] = (out.get(lab, '') + ' ' + c).strip(); i += 2
                else:
                    out.setdefault('_extra', []).append(c); i += 1
    return out
CODE = re.compile(r'^([0-9]{1,4}|[A-Z]{1,4}[0-9]?|N/A)$')
def options(tables):
    opts = []
    for t in tables:
        for r in t:
            cells = [fix(c) for c in r if c and c.strip()]
            if not cells: continue
            if CODE.match(cells[0]) and len(cells) >= 2 and cells[0] not in ('Code',):
                opts.append({'code': cells[0], 'label': cells[1], 'extra': ' | '.join(cells[2:])})
    return opts
res = []
for q in qs:
    m = meta(q['meta'])
    res.append({'id': q['id'].rstrip('*'), 'label': fix(q['label']), 'page': q['page'], 'incidents': m.get('Incidents', ''),
                'req': m.get('Optional/Mandatory', ''), 'prefill': m.get('Pre-populated', ''), 'depends': m.get('Depends on', ''),
                'format': m.get('Format', ''), 'notes': m.get('Notes', '') + (' ' + ' '.join(m['_extra']) if m.get('_extra') else ''),
                'after': fix(' '.join(q['lines'])), 'options': options(q['tables'])})
json.dump(res, open(S + '/irs_norm.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for r in res:
    o = r['options']
    print(f"{r['id']:6}|{r['label'][:60]:60}|{r['incidents'][:22]:22}|{r['req'][:9]:9}|{r['depends'][:28]:28}|{r['format'][:26]:26}|{len(o)}")
