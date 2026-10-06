# Builds the IRS schema JSON from the extracted PDF data.
# Source: DCLG "Incident Recording System - Questions and Lists" v1.4 (Sept 2009).
import json, re, sys

S = sys.argv[1]
OUT = sys.argv[2]
norm = {x['id']: x for x in json.load(open(S + '/irs_norm.json', encoding='utf-8'))}
raw = {q['id'].rstrip('*'): q for q in json.load(open(S + '/irs_raw.json', encoding='utf-8'))}
hier = json.load(open(S + '/irs_hier.json', encoding='utf-8'))
text = open(S + '/irs2.txt', encoding='utf-8').read().split('\n')


def fix(t):
    t = t or ''
    t = re.sub(r'(?<=\w)�(?=\w)', "'", t)
    t = t.replace('�', '-').replace('‘', "'").replace('’', "'").replace('–', '-').replace('“', '"').replace('”', '"')
    return re.sub(r'\s+', ' ', t).strip()


CODE = re.compile(r'^([0-9]{1,4}|[A-Z]{2,4}[0-9]?)$')


def table_options(t):
    out = []
    for r in t:
        cells = [fix(c) for c in r if c and c.strip()]
        if len(cells) < 2 or not CODE.match(cells[0]):
            continue
        if cells[1].lower() in ('ode', 'description', 'type', 'code'):
            continue
        out.append({'code': cells[0], 'label': cells[1], 'extra': cells[2:]})
    return out


def opts(qid, tables=None):
    tables = raw[qid]['tables'] if tables is None else tables
    res = []
    for t in tables:
        res += table_options(t)
    return res


def clean(o, keep_hint=True):
    d = {'code': o['code'], 'label': o['label']}
    if keep_hint and o['extra']:
        hint = ' '.join(x for x in o['extra'] if x)
        if hint:
            d['hint'] = hint
    return d


# ---------------------------------------------------------------- conditions
# {"q": id, "eq": v} | {"q": id, "in": [..]} | {"all": [..]} | {"any": [..]} | {"not": c}
# {"category": [..]}  incident category (3.1): Fire | SpecialService | FalseAlarm
# {"fire": [..]}      fire classification: Primary | Secondary | Chimney
# {"property": [..]}  property category from 3.2: Dwelling, OtherResidential, NonResidential,
#                     RoadVehicle, RailVehicle, Boat, Aircraft, OutdoorStructure, Outdoor
# {"propertyId": [..]}, {"flag": "rtc"|"hazmat"|"regulated"} from the hierarchies
def q(i, v): return {'q': i, 'eq': v}
def qin(i, v): return {'q': i, 'in': v}
def ALL(*c):
    out = []
    for x in c:
        if x and x not in out: out.append(x)
    return {'all': out}
def ANY(*c): return {'any': list(c)}
def NOT(c): return {'not': c}

BUILDING = ['Dwelling', 'OtherResidential', 'NonResidential']
OUTDOOR = ['Outdoor', 'OutdoorStructure']
FIRE = {'category': ['Fire']}
PRIMARY = ALL(FIRE, {'fire': ['Primary']})
SECONDARY = ALL(FIRE, {'fire': ['Secondary']})
BUILDING_PRIMARY = ALL(PRIMARY, {'property': BUILDING})
SS = {'category': ['SpecialService']}
FA = {'category': ['FalseAlarm']}
PRIMARY_OR_SS = ANY(PRIMARY, SS)
NOT_LATE = NOT(q('2.4', 'Yes'))
FLAME = q('8.19', 'No')

SCOPE = {
    'All': None, 'Fire': FIRE, 'All Fires': FIRE, 'Primary Fire': PRIMARY, 'Primary Fires': PRIMARY,
    'Secondary Outdoor Fires': ALL(SECONDARY, {'property': OUTDOOR}), 'Primary Outdoor Fires': ALL(PRIMARY, {'property': OUTDOOR}),
    'Special Service': SS, 'False Alarm': FA, 'Fire, Special Service': ANY(FIRE, SS),
    'Primary Fires, Special Services': PRIMARY_OR_SS, 'Primary Fires, Special Service': PRIMARY_OR_SS,
}

# When each question is asked, on top of its incident scope (from the "Depends on" column and notes).
WHEN = {
    '1.6': q('1.5', 'Yes'), '1.7': q('1.5', 'Yes'),
    '3.3': SS, '3.4': FA,
    '3.8': {'flag': 'primaryProperty'},
    '3.9': ALL({'property': BUILDING}, NOT(q('3.8', 'Yes'))),
    '3.11': q('3.10', 'Yes'), '3.12': q('3.10', 'Yes'), '3.13': q('3.10', 'Yes'),
    '4.2': q('4.1', 'Yes'), '4.2k': q('4.1', 'No'),
    '5.5': {'property': BUILDING},
    '5.6': q('5.5', 'Yes'), '5.7': q('5.5', 'Yes'),
    '5.8': {'property': BUILDING},
    '5.9': q('5.8', 'Yes'), '5.10': q('5.8', 'Yes'), '5.11': q('5.8', 'Yes'),
    '5.12': ALL(q('5.8', 'Yes'), qin('5.11', ['1', '2'])),
    '5.13': {'property': BUILDING}, '5.14': {'property': BUILDING},
    '5.16a': q('5.16', '12'),
    '5.19': q('5.18', 'Yes'), '5.20': q('5.18', 'Yes'), '5.21': q('5.18', 'Yes'),
    '5.22': ANY(ALL(FIRE, {'property': ['RoadVehicle']}), ALL(SS, {'flag': 'rtc'})),
    '5.23': ALL(q('5.22', 'Yes'), {'propertyId': ['350']}), '5.24': ALL(q('5.22', 'Yes'), {'propertyId': ['350']}),
    '5.25': ALL(q('5.22', 'Yes'), {'propertyId': ['350']}),
    '5.26': q('5.22', 'Yes'),
    '5.27': q('5.26', 'Yes'), '5.28': q('5.26', 'Yes'), '5.29': q('5.26', 'Yes'), '5.30': q('5.26', 'Yes'),
    '6.11': q('6.10', 'OtherStation'), '6.12': q('6.10', 'OtherLocation'),
    '6.13': ALL(q('6.10', 'OtherLocation'), q('6.12', 'Yes')), '6.14a&b': q('6.10', 'OtherLocation'),
    '6.16': q('6.15', 'Yes'), '6.17': q('6.15', 'Yes'),
    '7.5': q('7.4', 'Yes'), '7.6': q('7.4', 'Yes'),
    '7.7': {'property': BUILDING},
    '7.8': q('7.7', 'Yes'), '7.9': q('7.7', 'Yes'), '7.10': ALL(q('7.7', 'Yes'), q('7.9', 'No')),
    '7.11': q('5.5', 'Yes'),
    '7.12': q('7.11', 'Yes'), '7.13': q('7.11', 'Yes'), '7.14': q('7.11', 'Yes'),
    '7.15': ALL(q('7.11', 'Yes'), qin('7.14', ['2', '3'])), '7.16': ALL(q('7.11', 'Yes'), qin('7.14', ['2', '3'])),
    '7.17': ALL(q('7.11', 'Yes'), qin('7.14', ['1', '2'])),
    '8.2': {'optionFlag': ['8.1', 'makeModel']},
    '8.11': q('8.10', 'Yes'), '8.12': q('8.10', 'Yes'), '8.13': q('8.10', 'Yes'),
    '8.15': {'property': ['Dwelling']}, '8.16': {'property': ['Dwelling']},
    '8.18': {'property': BUILDING},
    '8.20': ALL(FLAME, NOT({'property': OUTDOOR}), NOT_LATE), '8.21': ALL(FLAME, NOT({'property': OUTDOOR})),
    '8.22': ALL(FLAME, NOT({'property': OUTDOOR})), '8.23': ALL(FLAME, NOT({'property': OUTDOOR})),
    '8.24': ALL(FLAME, {'property': BUILDING}), '8.25': {'property': BUILDING},
    '8.26': ALL(FLAME, {'property': BUILDING}), '8.27': ALL(FLAME, {'property': BUILDING}),
    '8.28': {'property': BUILDING + ['Boat']}, '8.29': {'property': BUILDING + ['Boat']}, '8.30': {'property': BUILDING + ['Boat']},
    '8.31': {'property': ['RoadVehicle']}, '8.32': {'property': ['RoadVehicle']},
    '8.33': {'property': ['RoadVehicle']}, '8.34': {'property': ['RoadVehicle']},
    '8.35': {'property': OUTDOOR}, '8.35a': q('8.35', '12'), '8.36': {'property': OUTDOOR},
    '9.1': ALL(q('3.6', 'Yes'), {'property': ['Dwelling']}), '9.2': ALL(q('3.6', 'Yes'), {'property': ['Dwelling']}),
    '9.3': ALL(q('3.6', 'Yes'), NOT(ALL(FIRE, {'property': ['Dwelling']}))),
    '9.4': ALL(q('3.6', 'Yes'), {'property': BUILDING}), '9.5': ALL(q('3.6', 'Yes'), {'property': BUILDING}),
    '9.10': {'property': BUILDING}, '9.11': {'property': BUILDING},
    '9.13': None,
    '9.14': ALL(q('9.13', 'Yes'), {'property': BUILDING + ['Aircraft', 'RailVehicle', 'Boat']}),
    '9.15': q('9.13', 'Yes'), '9.16': q('9.13', 'Yes'),
    '9.17': ANY(qin('9.6', ['1', '2']), q('9.12', '1')), '9.18': ANY(qin('9.6', ['1', '2']), q('9.12', '1')),
    '9.19': ANY(qin('9.6', ['1', '2']), q('9.12', '1')),
    '9.20': q('9.6', '1'), '9.21': ALL(PRIMARY, qin('9.6', ['1', '2'])), '9.22': qin('9.6', ['1', '2']),
    '9.24': q('9.6', '2'), '9.25': {'property': BUILDING}, '9.26': qin('9.6', ['1', '2']),
}

# Repeating groups (section 4.6 of the PDF). The group itself is shown when "when" is true.
GROUPS = {
    'alarm':       {'label': 'Alarm system', 'add': 'Add alarm system', 'questions': ['5.9', '5.10', '5.11', '5.12'], 'when': q('5.8', 'Yes')},
    'hazmat':      {'label': 'Hazardous material', 'add': 'Add material', 'questions': ['5.19', '5.20', '5.21'], 'when': q('5.18', 'Yes')},
    'extrication': {'label': 'RTC extrication', 'add': 'Add extrication', 'questions': ['5.27', '5.28', '5.29', '5.30'], 'when': q('5.26', 'Yes')},
    'vehicle':     {'label': 'FRS vehicle', 'add': 'Add vehicle', 'questions': ['6.2', '6.3', '6.4', '6.5', '6.6', '6.7', '6.8', '6.9', '6.10', '6.11', '6.12', '6.13', '6.14a&b'], 'min': 1},
    'equipment':   {'label': 'Equipment used', 'add': 'Add equipment', 'questions': ['6.16', '6.17'], 'when': q('6.15', 'Yes')},
    'manual':      {'label': 'Fire fighting equipment used', 'add': 'Add equipment', 'questions': ['7.5', '7.6'], 'when': q('7.4', 'Yes')},
    'facility':    {'label': 'Building fire fighting facility', 'add': 'Add facility', 'questions': ['7.8', '7.9', '7.10'], 'when': q('7.7', 'Yes')},
    'safety':      {'label': 'Active safety system', 'add': 'Add safety system', 'questions': ['7.12', '7.13', '7.14', '7.15', '7.16', '7.17'], 'when': q('7.11', 'Yes')},
    'victim':      {'label': 'Person', 'add': 'Add person', 'questions': [f'9.{n}' for n in range(6, 27) if n != 23], 'when': q('3.5', 'Yes')},
}
IN_GROUP = {qid: g for g, d in GROUPS.items() for qid in d['questions']}

YESNO = [{'code': 'Yes', 'label': 'Yes'}, {'code': 'No', 'label': 'No'}]
YESNODK = YESNO + [{'code': 'DontKnow', 'label': "Don't know"}]

DEFAULTS = {
    '1.2': {'value': 'config:frs'}, '1.5': {'value': 'No'}, '1.6': {'from': '1.2'},
    '2.4': {'value': 'No', 'yesIf': {'q': '2.3', 'label': 'Late fire call'}},
    '3.9': {'value': 'No', 'yesIf': {'q': '2.3', 'labelIn': ['Chimney', 'Chimney thatch']}},
    '5.5': {'flag': 'regulated'}, '5.8': {'yesIfFlag': 'regulated'},
    '5.18': {'value': 'No', 'yesIfFlag': 'hazmat'}, '5.22': {'value': 'No', 'yesIfFlag': 'rtc'},
    '6.1': {'value': '0'}, '6.5': {'value': 'No'}, '6.10': {'value': 'HomeStation'},
    '6.15': {'value': 'Yes', 'noIf': ANY(FA, q('2.4', 'Yes'))},
    '7.7': {'from': '5.5'}, '7.11': {'from': '5.5'},
    '8.5': {'fromOption': '8.4'}, '8.24': {'value': '0'},
    '9.3': {'value': '1', 'when': {'q': '9.2', 'filled': True}}, '9.13': {'yesIf': q('9.6', '3')},
    '9.21': {'value': 'No', 'when': SS},
}

HIDDEN = {'9.23': 'For CLG (national statistics) use only.'}
GROUP_LABELS = {'6.2': 'Type of FRS vehicle'}

SECTIONS = [
    ('1', 'Incident Identity'), ('2', 'At Call Details'), ('3', 'On Attendance'), ('4', 'Location'),
    ('5', 'Additional Information'), ('6', 'Resources Used'), ('7', 'Action'), ('8', 'Damage'),
    ('9', 'Involvement of Persons'),
]


def numrange(fmt):
    m = re.search(r'(-?\d+)\s*-\s*(\d+)', fix(fmt).replace('(', ' ').replace(')', ' '))
    return (int(m.group(1)), int(m.group(2))) if m else (0, None)


def maxlen(fmt):
    m = re.search(r'(\d+)\s*-\s*(\d+)\s*char', fix(fmt))
    if m: return int(m.group(2))
    m = re.search(r'(\d+)\s*char', fix(fmt))
    return int(m.group(1)) if m else None


def qtype(qid, n):
    f = fix(n['format']).lower()
    if qid in ('3.2', '2.3', '3.3', '3.4'): return 'hierarchy'
    if qid == '3.1': return 'category'
    if qid in ('4.2', '6.13'): return 'address'
    if qid in ('4.3a/b', '6.14a&b'): return 'coords'
    if qid in ('1.3', '6.11'): return 'station'
    if qid == '6.10': return 'radio'
    if qid == '5.19': return 'combo'
    if 'date' in f or qid == '6.8': return 'datetime'
    if "don't know" in f or 'don-t know' in f or 'dont know' in f.replace("'", ''): return 'yesnodk'
    if qid in ('5.17', '8.19'): return 'yesnodk' if qid == '5.17' else 'yesno'
    if 'yes/no' in f or f == 'yes/no' or 'yes/ no' in f: return 'yesno'
    if 'number' in f and not norm[qid]['options']: return 'number'
    if 'drop' in f or 'radio' in f or norm[qid]['options']: return 'select'
    return 'text'


# ---------------------------------------------------------------- special lists
def frs_list():
    out = []
    start = next(i for i, l in enumerate(text) if i > 700 and l.startswith('Question 1.2'))
    end = next(i for i, l in enumerate(text) if i > start and l.startswith('Question 1.3'))
    region, pending = None, None
    for l in text[start + 1:end]:
        l = fix(l)
        if re.fullmatch(r'[A-Z]{2}', l) and pending:
            out.append({'code': l, 'label': pending, 'group': region}); pending = None; continue
        m = re.match(r'^(.+?)\s+([A-Z]{2})$', l)
        if m and 'Region' not in l and 'Mandatory' not in l:
            label = (pending + ' ' + m.group(1)) if pending else m.group(1)
            out.append({'code': m.group(2), 'label': label, 'group': region}); pending = None
        elif l and not any(w in l for w in ('Incidents', 'Pre-populated', 'FDR1', 'Notes', 'Region', 'This list', 'code as', 'Mandatory', '=====', 'Format')):
            if region in ('Strathclyde',) or (out and out[-1]['group'] == 'Strathclyde'):
                pending = (pending + ' ' + l) if pending else l
            elif l in ('Strathclyde',) or not pending:
                region = l
    return out


def ethnicity():
    out = []
    for t in raw['9.9']['tables']:
        for r in t:
            cells = [fix(c) for c in r if c and c.strip()]
            if len(cells) >= 2 and 'Ethnicity' not in cells[0] and 'GovTalk' not in cells[0]:
                out.append({'code': cells[0], 'label': cells[1]})
    return out


def grouped(qid, groups):
    """One option list per table, each tagged with the property categories it applies to."""
    res = []
    for t, cats in zip(raw[qid]['tables'], groups):
        for o in table_options(t):
            d = clean(o)
            d['when'] = {'property': cats}
            res.append(d)
    return res


def options_for(qid, n):
    if qid == '1.2':
        res = frs_list()
        for o in res:
            if o['group'] == 'Humberside': o['group'] = 'Yorkshire & Humberside'
        return res
    if qid == '1.6': return {'from': '1.2'}
    if qid == '6.10':
        return [{'code': 'HomeStation', 'label': 'Home station'}, {'code': 'OtherStation', 'label': 'Another station'}, {'code': 'OtherLocation', 'label': 'Another location (e.g. on the run)'}]
    if qid == '3.1':
        return [{'code': 'Fire', 'label': 'Fire'}, {'code': 'SpecialService', 'label': 'Special Service'}, {'code': 'FalseAlarm', 'label': 'False Alarm'}]
    if qid == '9.9': return ethnicity()
    if qid == '8.7': return {'from': '8.6'}
    if qid == '8.22': return {'from': '8.20'}
    if qid == '8.23': return {'from': '8.21'}
    if qid in ('8.25', '8.26', '8.27'): return {'from': '8.24'}
    if qid == '8.35': return {'from': '5.16'}
    if qid == '8.14':
        return grouped(qid, [['Dwelling'], ['OtherResidential'], ['NonResidential'], ['RoadVehicle'], ['Boat'], ['RailVehicle'], ['Aircraft'], OUTDOOR, OUTDOOR])
    if qid == '8.20':
        return grouped(qid, [BUILDING, ['RoadVehicle'], ['Boat'], ['Boat'], ['RailVehicle'], ['Aircraft']])
    if qid == '9.22':
        res = []
        for t, harm in zip(raw[qid]['tables'], ['1', '2', '2']):
            for o in table_options(t):
                d = clean(o); d['when'] = q('9.6', harm); res.append(d)
        return res
    if qid == '8.1':
        motive = {fix(o['label']).lower(): o['code'] for o in opts('5.15')}
        res = []
        for o in opts(qid):
            d = {'code': o['code'], 'label': o['extra'][0] if o['extra'] else o['label'], 'group': o['label']}
            code = motive.get(fix(o['label']).lower())
            if code: d['when'] = q('5.15', code)
            if any('8.2' in x for x in o['extra']): d['flags'] = ['makeModel']
            res.append(d)
        return res
    if qid == '8.4':
        res = []
        for o in opts(qid):
            d = {'code': o['code'], 'label': o['label']}
            power = [x for x in o['extra'] if re.match(r'^\d+ = ', x)]
            other = [x for x in o['extra'] if x not in power]
            if other: d['hint'] = ' '.join(other)
            if power: d['sets'] = {'8.5': power[0].split(' = ')[0]}
            res.append(d)
        return res
    if qid in ('5.12', '7.17'):
        parent = '5.11' if qid == '5.12' else '7.14'
        labels = {fix(o['label']).lower(): o['code'] for o in opts(parent)}
        res = []
        for o in opts(qid):
            d = {'code': o['code'], 'label': o['label']}
            tag = fix(o['extra'][-1]).lower() if o['extra'] else ''
            if tag in labels: d['when'] = q(parent, labels[tag])
            res.append(d)
        return res
    if qid == '6.2':
        return [{'code': o['code'], 'label': (o['extra'][0] if o['extra'] else o['label']), 'group': o['label'], 'other': o['code'] in ('AA', 'RSV')} for o in opts(qid)]
    if qid == '6.16':
        return [{'code': o['code'], 'label': (o['extra'][0] if o['extra'] else o['label']), 'group': o['label']} for o in opts(qid)]
    o = opts(qid)
    return [clean(x) for x in o] if o else None


# ---------------------------------------------------------------- hierarchies
def property_labels():
    lines = text[next(i for i, l in enumerate(text) if l.startswith('6.2 Property Types') and i > 4000):]
    labels, buf = {}, []
    pat = re.compile(r'^(.*?)\s+(\d{1,3})\s+(yes|no)\s+(Dwelling|OtherResidential|NonResidential|RoadVehicle|RailVehicle|Boat|Aircraft|OutdoorStructure|Outdoor)\s+(yes|no)\s*$')
    for l in lines:
        if l.startswith('6.3 Special'): break
        m = pat.match(l.strip())
        if m:
            labels[m.group(2)] = fix(' '.join(buf + [m.group(1)])); buf = []
        elif not l.startswith('=====') and 'SUB TYPE' not in l and l.strip() and len(l.strip()) < 60 and not re.search(r'level|Primary|Fire|Category|Regulated|ID', l):
            buf.append(l.strip())
        else:
            buf = []
    return labels


CAT_LABEL = {'Dwelling': 'Dwelling', 'OtherResidential': 'Other Residential', 'NonResidential': 'Non Residential',
             'RoadVehicle': 'Road Vehicle', 'RailVehicle': 'Rail Vehicle', 'Boat': 'Boat', 'Aircraft': 'Aircraft',
             'OutdoorStructure': 'Outdoor Structure', 'Outdoor': 'Outdoor'}
INC_GROUPS = ['Alarms', 'Explosion', 'Fire', 'Hazardous Material', 'Humanitarian or Assistance', 'Rescues', 'Civil Disturbance / Unlawful Act', 'Not Known']


def tree_add(tree, path, leaf):
    path = [fix(p) for p in path]
    for k in ('label', 'hint'):
        if leaf.get(k): leaf[k] = fix(leaf[k])
    nodes = tree
    for label in path:
        node = next((n for n in nodes if n.get('label') == label and 'children' in n), None)
        if not node:
            node = {'label': label, 'children': []}; nodes.append(node)
        nodes = node['children']
    nodes.append(leaf)


def build_hierarchies():
    out = {}
    t = []
    for r in hier['incidentType']:
        g = next((x for x in INC_GROUPS if x.startswith(r['l1'][:8]) or r['l1'].startswith(x[:8])), r['l1'])
        leaf = {'id': r['id'], 'label': r.get('l2') or r['l1'], 'priority': int(r['priority']) if r.get('priority', '').isdigit() else None}
        if r.get('desc'): leaf['hint'] = r['desc']
        tree_add(t, [g], leaf)
    out['incidentType'] = {'label': 'Mobilise incident type', 'tree': t}

    labels = property_labels()
    t = []
    for r in hier['propertyType']:
        cat = r['category']
        top = CAT_LABEL.get(cat, cat)
        leaf = {'id': r['id'], 'category': cat, 'primary': r.get('primary') == 'yes', 'regulated': r.get('regulated') == 'yes'}
        if cat == 'RoadVehicle':
            leaf['label'] = labels.get(r['id'], r.get('l2', '')); path = [top]
        elif cat in ('Outdoor',):
            l2 = r.get('l2') or ''
            if l2.startswith('Other outdoors'): l2 = 'Other outdoors (including land)'
            leaf['label'] = r.get('l3') or labels.get(r['id']); path = [top, l2] if l2 else [top]
        else:
            l3, l4 = r.get('l3'), r.get('l4')
            if not l3: l3 = labels.get(r['id'])
            if l4:
                leaf['label'] = l4; path = [top, l3]
            else:
                leaf['label'] = l3; path = [top]
        if leaf['label'] and leaf['label'].strip().lower().startswith('other'): leaf['other'] = True
        tree_add(t, path, leaf)
    out['propertyType'] = {'label': 'Property type', 'tree': t}

    t = []
    for r in hier['specialService']:
        path = [r['l1']] + ([r['l2']] if r.get('l3') else [])
        leaf = {'id': r['id'], 'label': r.get('l3') or r['l2'], 'rtc': r.get('rtc') == 'yes', 'hazmat': r.get('hazmat') == 'yes'}
        tree_add(t, path, leaf)
    out['specialService'] = {'label': 'Special Service type', 'tree': t}

    t = []
    for r in hier['falseAlarm']:
        levels = [r[k] for k in ('l1', 'l2', 'l3', 'l4') if r.get(k)]
        tree_add(t, levels[:-1], {'id': r['id'], 'label': levels[-1]})
    out['falseAlarm'] = {'label': 'False Alarm reason', 'tree': t}
    return out


# ---------------------------------------------------------------- assemble
questions = {}
for qid, n in norm.items():
    if qid in HIDDEN: continue
    t = qtype(qid, n)
    d = {'label': fix(n['label']), 'type': t, 'required': n['req'].strip().lower().startswith('mand') or n['req'].strip() == 'All' and qid == '1.6',
         'page': n['page']}
    if qid in ('1.4',): d['required'] = False
    if 'yes' in n['prefill'].lower(): d['prefill'] = True
    scope = SCOPE.get(fix(n['incidents']).rstrip(' ,'))
    if scope is None and fix(n['incidents']) not in ('All', ''): print('unknown scope', qid, n['incidents'])
    cond = ALL(scope, WHEN.get(qid)) if scope or WHEN.get(qid) else None
    if cond and 'all' in cond and len(cond['all']) == 1: cond = cond['all'][0]
    if cond: d['when'] = cond
    if t == 'yesno': d['options'] = YESNO
    elif t == 'yesnodk': d['options'] = YESNODK
    elif t in ('select', 'radio', 'combo', 'category'):
        o = options_for(qid, n)
        if isinstance(o, dict): d['optionsFrom'] = o['from']
        elif o: d['options'] = o
        else: d['listMissing'] = True
    if t == 'hierarchy':
        d['tree'] = {'2.3': 'incidentType', '3.2': 'propertyType', '3.3': 'specialService', '3.4': 'falseAlarm'}[qid]
    if t == 'number':
        lo, hi = numrange(n['format'])
        d['min'] = lo
        if hi is not None: d['max'] = hi
    if t in ('text', 'combo'):
        ml = maxlen(n['format'])
        if ml: d['maxLength'] = ml
        if qid == '1.1' or qid == '1.7': d['maxLength'] = 50
    if qid == '4.2' or qid == '6.13':
        d['fields'] = [{'id': 'a', 'label': 'Building name/number', 'required': True}, {'id': 'b', 'label': 'Postcode'},
                       {'id': 'c', 'label': 'Flat/unit name/number'}, {'id': 'd', 'label': 'Street', 'required': True},
                       {'id': 'e', 'label': 'Locality'}, {'id': 'f', 'label': 'Town'}, {'id': 'g', 'label': 'County'}]
        d['rule'] = 'At least one of Locality, Town or County is required.'
    if qid in ('4.3a/b', '6.14a&b'):
        d['fields'] = [{'id': 'x', 'label': 'X (easting)'}, {'id': 'y', 'label': 'Y (northing)'}]
    if qid in DEFAULTS: d['default'] = DEFAULTS[qid]
    if qid in IN_GROUP: d['group'] = IN_GROUP[qid]
    if qid in GROUP_LABELS: d['label'] = GROUP_LABELS[qid]
    notes = fix(n['notes'])
    if notes: d['notes'] = notes
    questions[qid] = d

if '9.5' in questions:
    questions['9.5']['notes'] = (questions['9.5'].get('notes', '') + ' The v1.4 document gives no list for this question; free text is used until one is supplied.').strip()
    questions['9.5']['type'] = 'text'; questions['9.5'].pop('listMissing', None)

schema = {
    'source': 'DCLG Incident Recording System - Questions and Lists, version 1.4 (XML Schemas v1-0n), September 2009. Crown copyright.',
    'version': '1.4',
    'derived': {
        'fireClass': 'Fire only. Primary if 3.5 = Yes or 3.7 >= 5. Otherwise, if the 3.2 property type is normally a primary fire: Secondary if 3.8 (derelict) = Yes, Chimney if 3.9 = Yes, else Primary. Otherwise Secondary.',
        'buildings': BUILDING,
    },
    'sections': [{'id': sid, 'title': title, 'questions': [k for k in questions if k.split('.')[0] == sid]} for sid, title in SECTIONS]
                + [{'id': '10', 'title': 'Summary', 'questions': [], 'notes': [{'id': 'general', 'label': 'General notes'}, {'id': 'frsQuery', 'label': 'FRS queries (for QA review)'}]}],
    'groups': GROUPS,
    'questions': questions,
    'hierarchies': build_hierarchies(),
    'statuses': [{'code': '60', 'label': 'Recorded'}, {'code': '65', 'label': 'Recorded with queries'}, {'code': '70', 'label': 'Published'}, {'code': '0', 'label': 'Cancelled'}],
}
json.dump(schema, open(OUT, 'w', encoding='utf-8', newline='\n'), ensure_ascii=False, indent=1)
nq = len(questions); no = sum(len(v.get('options', [])) for v in questions.values() if isinstance(v.get('options'), list))
print(f'{nq} questions, {no} options, groups {len(GROUPS)}')
for k, h in schema['hierarchies'].items():
    def count(ns): return sum(count(n['children']) if 'children' in n else 1 for n in ns)
    print(k, count(h['tree']), 'leaves,', len(h['tree']), 'top')
print('no options:', [k for k, v in questions.items() if v['type'] in ('select', 'radio', 'combo') and not v.get('options') and not v.get('optionsFrom')])
print('listMissing:', [k for k, v in questions.items() if v.get('listMissing')])
