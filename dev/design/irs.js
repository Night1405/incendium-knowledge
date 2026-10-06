// IRS form engine: reads window.IRS_SCHEMA (built from the DCLG "Questions and
// Lists" v1.4, see Originals/Phone/dev/irs/README.md) and answers "is this asked",
// "which options", "what is the default" and "what is missing". The server runs
// the same checks before a report is saved; the app only draws the form.
//
// Answers: v = { '1.1': 'INC-0412', ..., _groups: { vehicle: [ { '6.2': 'PPL', ... } ] } }

window.IRS = (function () {
    const S = window.IRS_SCHEMA;
    const Q = S.questions;
    const CONFIG = { frs: 'FM' }; // the brigade's FRS code (incendium_lib brigade settings)

    const leaves = {};
    for (const [name, h] of Object.entries(S.hierarchies)) {
        leaves[name] = {};
        const walk = (nodes, path) => nodes.forEach(n => n.children ? walk(n.children, path.concat(n.label)) : (leaves[name][n.id] = Object.assign({ path }, n)));
        walk(h.tree, []);
    }

    const empty = x => x == null || x === '' || (typeof x === 'object' && !Array.isArray(x) && !Object.values(x).some(y => y !== '' && y != null));
    const val = (ctx, id) => (ctx.row && Object.prototype.hasOwnProperty.call(ctx.row, id)) ? ctx.row[id] : ctx.v[id];
    const property = v => leaves.propertyType[v['3.2']];
    const special = v => leaves.specialService[v['3.3']];

    function fireClass(v) {
        if (v['3.1'] !== 'Fire') return null;
        if (v['3.5'] === 'Yes' || Number(v['3.7']) >= 5) return 'Primary';
        const p = property(v);
        if (p && p.primary) {
            if (v['3.8'] === 'Yes') return 'Secondary';
            if (v['3.9'] === 'Yes') return 'Chimney';
            return 'Primary';
        }
        return p ? 'Secondary' : null;
    }

    function allOptions(id) {
        const q = Q[id];
        return q.options || (q.optionsFrom ? allOptions(q.optionsFrom) : []);
    }
    const optionOf = (id, code) => allOptions(id).find(o => o.code === code);

    function test(c, ctx) {
        if (!c) return true;
        if (c.all) return c.all.every(x => test(x, ctx));
        if (c.any) return c.any.some(x => test(x, ctx));
        if (c.not) return !test(c.not, ctx);
        if (c.q) {
            const x = val(ctx, c.q);
            if ('eq' in c) return x === c.eq;
            if (c.in) return c.in.includes(x);
            return !empty(x);
        }
        if (c.category) return c.category.includes(ctx.v['3.1']);
        if (c.fire) return c.fire.includes(fireClass(ctx.v));
        if (c.property) { const p = property(ctx.v); return !!p && c.property.includes(p.category); }
        if (c.propertyId) return c.propertyId.includes(ctx.v['3.2']);
        if (c.flag) {
            const p = property(ctx.v), s = special(ctx.v);
            if (c.flag === 'primaryProperty') return !!p && p.primary;
            if (c.flag === 'regulated') return !!p && p.regulated;
            if (c.flag === 'rtc') return !!s && s.rtc;
            if (c.flag === 'hazmat') return !!s && s.hazmat;
            return false;
        }
        if (c.optionFlag) { const o = optionOf(c.optionFlag[0], val(ctx, c.optionFlag[0])); return !!o && (o.flags || []).includes(c.optionFlag[1]); }
        return true;
    }

    const visible = (id, v, row) => test(Q[id].when, { v, row });
    const options = (id, v, row) => allOptions(id).filter(o => !o.when || test(o.when, { v, row }));
    const groupVisible = (g, v) => test(S.groups[g].when, { v }) && S.groups[g].questions.some(id => visible(id, v, {}));

    function defaultFor(id, v, row) {
        const d = Q[id].default;
        if (!d) return undefined;
        const ctx = { v, row };
        if (d.when && !test(d.when, ctx)) return undefined;
        if (d.yesIf) {
            const y = d.yesIf;
            if (y.label || y.labelIn) {
                const leaf = leaves.incidentType[v[y.q]];
                const names = (y.labelIn || [y.label]).map(x => x.toLowerCase());
                if (leaf && names.includes(leaf.label.toLowerCase())) return 'Yes';
            } else if (test(y, ctx)) return 'Yes';
        }
        if (d.yesIfFlag && test({ flag: d.yesIfFlag }, ctx)) return 'Yes';
        if (d.noIf && test(d.noIf, ctx)) return 'No';
        if (d.flag) return test({ flag: d.flag }, ctx) ? 'Yes' : 'No';
        if (d.from) return val(ctx, d.from);
        if (d.fromOption) { const o = optionOf(d.fromOption, val(ctx, d.fromOption)); return o && o.sets ? o.sets[id] : undefined; }
        if (d.value === 'config:frs') return CONFIG.frs;
        return d.value;
    }

    // Fills in defaults for questions that are now asked and have no answer yet.
    function applyDefaults(v) {
        v._groups = v._groups || {};
        for (const sec of S.sections) {
            for (const id of sec.questions) {
                const q = Q[id];
                if (q.group) {
                    (v._groups[q.group] || []).forEach(row => {
                        if (row[id] === undefined && visible(id, v, row)) { const d = defaultFor(id, v, row); if (d !== undefined) row[id] = d; }
                    });
                } else if (v[id] === undefined && visible(id, v)) {
                    const d = defaultFor(id, v);
                    if (d !== undefined) v[id] = d;
                }
            }
        }
    }

    function missing(id, value) {
        const q = Q[id];
        if (q.type === 'address') {
            const x = value || {};
            return !x.a || !x.d || !(x.e || x.f || x.g);
        }
        if (q.type === 'coords') { const x = value || {}; return empty(x.x) || empty(x.y); }
        return empty(value);
    }

    // Errors and warnings for one section: [{ id, text, kind, row? }]
    function issues(sec, v) {
        const out = [];
        const doneGroups = new Set();
        const check = (id, row, rowNo) => {
            const q = Q[id];
            const value = row ? row[id] : v[id];
            const where = rowNo ? `${S.groups[q.group].label} ${rowNo}: ` : '';
            if (q.required && missing(id, value)) out.push({ id, kind: 'e', text: `${where}${id} ${q.label}` });
            const o = optionOf(id, value);
            if (o && o.code === '0' && /not known/i.test(o.label)) out.push({ id, kind: 'w', text: `${where}${id} answered "Not known"` });
            if (o && o.other && empty(row ? row[id + ':other'] : v[id + ':other'])) out.push({ id, kind: 'e', text: `${where}${id} describe "${o.label}"` });
            if (q.type === 'hierarchy') {
                const leaf = leaves[q.tree][value];
                if (leaf && leaf.other && empty(v[id + ':other'])) out.push({ id, kind: 'e', text: `${id} describe "${leaf.label}"` });
                if (id === '2.3' && leaf && /not known/i.test(leaf.label)) out.push({ id, kind: 'w', text: '2.3 "Not known" stops the report being published' });
            }
        };
        for (const id of sec.questions) {
            const q = Q[id];
            if (q.group) {
                if (doneGroups.has(q.group)) continue;
                doneGroups.add(q.group);
                const g = S.groups[q.group];
                if (!groupVisible(q.group, v)) continue;
                const rows = v._groups[q.group] || [];
                if (g.min && rows.length < g.min) out.push({ id, kind: 'e', text: `Add at least ${g.min} ${g.label.toLowerCase()}` });
                rows.forEach((row, i) => g.questions.forEach(gid => { if (visible(gid, v, row)) check(gid, row, i + 1); }));
            } else if (visible(id, v)) {
                check(id);
            }
        }
        if (sec.id === '2' && v['2.5'] && v['2.6'] && v['2.6'] < v['2.5']) out.push({ id: '2.6', kind: 'w', text: '2.6 Incident closed is before the stop message (2.5)' });
        return out;
    }

    const askedIn = (sec, v) => sec.questions.some(id => Q[id].group ? groupVisible(Q[id].group, v) : visible(id, v));

    function display(id, value) {
        const q = Q[id];
        if (empty(value)) return '';
        if (q.type === 'hierarchy') { const l = leaves[q.tree][value]; return l ? l.path.concat(l.label).join(' › ') : value; }
        if (q.type === 'address') return ['a', 'c', 'd', 'e', 'f', 'g', 'b'].map(k => value[k]).filter(Boolean).join(', ');
        if (q.type === 'coords') return `X ${value.x}, Y ${value.y}`;
        if (q.type === 'datetime') {
            const d = new Date(value);
            return isNaN(d) ? value : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        }
        const o = optionOf(id, value);
        return o ? o.label : String(value);
    }

    return { S, Q, CONFIG, leaves, fireClass, property, test, visible, options, allOptions, optionOf, groupVisible, applyDefaults, issues, askedIn, display, missing };
})();

//<< Incendium Solutions >>
