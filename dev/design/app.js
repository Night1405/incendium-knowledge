// Incendium Respond - design preview. Plain JS, no build step.
// app.html?device=phone|tablet&role=officer|firefighter#/route
// In the resource, LB sets data-device on <body> and the server sends the data
// that MOCK stands in for here.

(function () {
    const M = window.MOCK;
    const IRS = window.IRS;
    const qs = new URLSearchParams(location.search);
    const device = qs.get('device') || document.body.dataset.device || 'phone';
    const role = qs.get('role') || 'officer';
    const phone = device === 'phone';
    const officer = role === 'officer';
    // Turnouts, status and the current incident are phone-only; the tablet is for information.
    const ops = officer && phone;
    document.body.dataset.device = device;
    document.body.dataset.role = role;

    const me = officer ? M.me.officer : M.me.firefighter;
    const state = {
        status: me.status,
        incFilter: 'all',
        reportsTab: 'mine',
        mode: 'station',
        stations: { Handsworth: true, 'Brierley Hill': false, Highgate: false },
        volume: 70,
        pushover: true,
        pushPages: { station: true, assigned: true, messages: false },
        appToken: 'a1b2',
        userKey: null,
        kbTags: {},
        kbQuery: '',
        attached: {},
        hydrantStatus: {},
        defects: [{ id: 'D-031', hydrant: 'H-0170', reason: 'Obstructed', note: 'Car parked over the cover most evenings.', by: 'FF L. Okafor', time: '12:40' }],
        defectForm: null,
        queue: [],
        bookedOn: qs.get('booked') !== '0',
        reports: {},
        picker: null,
    };

    // ------------------------------------------------------------ helpers

    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const icon = (name, extra) => `<span class="ms${extra ? ' ' + extra : ''}">${name}</span>`;
    const statusOf = code => M.statuses.find(s => s.code === code) || { code, label: 'Unknown', tone: 'grey' };
    const pill = code => { const s = statusOf(code); return `<span class="pill ${s.tone}"><span class="code">${esc(s.code)}</span>${esc(s.label)}</span>`; };
    const rankImg = r => `img/ranks/${r}.png`;
    const crewCount = () => Object.values(M.crews).reduce((n, c) => n + c.length, 0);
    const card = (head, body, extra) => `<div class="card${extra ? ' ' + extra : ''}">${head ? `<div class="card-head">${head}</div>` : ''}${body}</div>`;
    const segLinks = (items, active) => `<div class="seg">${items.map(([href, label]) => `<a href="${href}" class="${href === active ? 'on' : ''}">${esc(label)}</a>`).join('')}</div>`;
    const segActs = (act, items, active) => `<div class="seg">${items.map(([v, label]) => `<button data-act="${act}" data-arg="${v}" class="${v === active ? 'on' : ''}">${esc(label)}</button>`).join('')}</div>`;
    const empty = (title, text) => `<div class="empty"><b>${esc(title)}</b><span>${esc(text)}</span></div>`;
    const waypointBtn = (arg, label, extra) => `<button class="btn red${label ? '' : ' btn-icon'}${extra ? ' ' + extra : ''}" data-act="waypoint" data-arg="${esc(arg)}" title="Set waypoint">${icon('near_me')}${label ? esc(label) : ''}</button>`;
    const incTone = i => i.category === 'Fire' ? 'red' : i.category === 'False Alarm' ? 'amber' : 'blue';
    // Service logo from the pack: the horizontal logo, or the square logo with the name.
    const B = M.brigade;
    const serviceMark = big => B.logoHorizontal
        ? `<div class="svc${big ? ' big' : ''}"><img class="wide" src="${B.logoHorizontal}" alt="${esc(B.name)}"><img class="sq compact-only" src="${B.logo}" alt=""><span class="sep"></span><div class="appt"><img src="img/brand/incendium.png" alt="Incendium">Respond</div></div>`
        : `<div class="svc${big ? ' big' : ''}"><img class="sq" src="${B.logo}" alt=""><div class="nm">${esc(B.name)}<small>Incendium Respond</small></div></div>`;
    const incendiumMark = () => '<a class="inc-mark" href="#/about" title="About"><img src="img/brand/incendium.png" alt="Incendium"></a>';

    let toastTimer;
    function toast(text) {
        const el = document.getElementById('toast');
        el.textContent = text;
        el.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
    }

    // ------------------------------------------------------------ sections

    const SECTIONS = [
        { id: 'home', title: 'Home', icon: 'home', show: true },
        { id: 'status', title: 'Status', icon: 'cell_tower', show: ops },
        { id: 'overview', title: 'Service Overview', tab: 'Overview', icon: 'dashboard', show: true, count: M.incidents.length },
        { id: 'risk', title: 'Risk Information', tab: 'Risk', icon: 'warning', show: true },
        { id: 'kb', title: 'Knowledge Base', tab: 'Knowledge', icon: 'menu_book', show: true },
        { id: 'irs', title: 'IRS', icon: 'edit_document', show: true },
        { id: 'settings', title: 'Settings', icon: 'settings', show: ops },
    ].filter(s => s.show);
    const TABS = ['home', 'overview', 'risk', 'kb'];

    // ------------------------------------------------------------ pages

    const PAGES = {};

    PAGES.home = function () {
        const hero = card('', `<div class="hero">
            <div class="mini-head"><div class="avatar"><img src="${rankImg(me.rank)}" alt=""></div>
                <div style="flex:1;min-width:0"><div class="nm">${esc(me.name)}</div><div class="cs">${esc(me.callsign)} · ${esc(me.station)} · Roll ${esc(me.roll)}</div></div></div>
            <div class="chips">${(me.quals || []).map(q => `<span class="qual">${esc(q)}</span>`).join('') || '<span class="muted small">No qualifications on the FMS</span>'}</div>
            ${phone ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px">${pill(state.status)}${ops ? '<a class="btn sm" href="#/status">Change status</a>' : ''}</div>` : ''}
        </div>`);
        const stats = `<div class="stats">
            <a class="card stat" href="#/overview/incidents"><b>${M.incidents.length}</b><span>Incidents</span></a>
            <a class="card stat" href="#/overview/crewing"><b>${crewCount()}</b><span>On duty</span></a>
        </div>`;
        const notBooked = ops && !state.bookedOn ? '<div class="banner amber"><span><b>Not booked on</b>, so you won\'t get assigned turnouts.</span></div>' : '';
        const links = `<div class="links">${SECTIONS.filter(s => s.id !== 'home').map(s => `<a href="#/${s.id}">${esc(s.tab || s.title)}${icon('chevron_right')}</a>`).join('')}${phone ? '' : '<a href="#/about">About' + icon('chevron_right') + '</a>'}</div>`;
        if (phone) return { title: 'Home', pre: serviceMark(), body: notBooked + hero + stats + links };
        return { title: 'Home', sub: me.name, body: `<div class="cols-2"><div>${hero}${stats}</div><div>${links}</div></div>` };
    };

    PAGES.status = function () {
        if (!ops) return notPermitted();
        const s = statusOf(state.status);
        const inc = M.incidents.find(i => i.mine);
        const now = card('Current status', `<div class="status-now"><div class="status-code ${s.tone}">${esc(s.code)}</div>
                <div><div class="t">${esc(s.label)}</div><div class="s">${esc(me.callsign)} · booked on 07:58</div></div></div>
            <div class="status-grid">${M.statuses.map(x => `<button class="status-btn ${x.tone}${x.code === state.status ? ' on' : ''}" data-act="setStatus" data-arg="${x.code}"><b>${esc(x.code)}</b><span>${esc(x.label)}</span></button>`).join('')}</div>
`);
        const radio = card('Radio', `<div class="fields"><div><span>Comms group</span><b>${esc(M.fms.comms)}</b></div><div><span>Incident channel</span><b>${inc ? esc(inc.cad.channel) : '-'}</b></div></div>
            <div class="btn-row" style="padding:0 14px 14px"><button class="btn" data-act="fmsChannel" data-arg="car">Car channel</button>${inc ? '<button class="btn blue" data-act="fmsChannel" data-arg="incident">Incident channel</button>' : ''}</div>`);
        const assigned = inc ? card(`Assigned incident<span class="grow"></span><a href="#/overview/incidents/${inc.id}">Details</a>`, incidentBlock(inc, true)) : card('Assigned incident', empty('No assigned incident', 'Turnouts for your callsign appear here.'));
        const attach = card('Attach to incident', `<div class="rows">${M.incidents.filter(i => !i.mine).map(i => `
            <div class="row"><span class="stripe ${incTone(i)}"></span>
                <div class="grow"><div class="t">${esc(i.type)}</div><div class="s">${esc(i.id)} · ${esc(i.address)}</div></div>
                ${state.attached[i.id] ? '<span class="pill green">Attached</span>' : `<button class="btn sm blue" data-act="attach" data-arg="${i.id}">Attach</button>`}
            </div>`).join('')}</div>`);
        const crew = card(`My crew · ${esc(me.callsign)}<span class="grow"></span><span>${M.crews[me.callsign].length} riding</span>`, crewLines(M.crews[me.callsign]));
        const notBooked = !state.bookedOn ? '<div class="banner amber"><span><b>Not booked on</b>, so you won\'t get assigned turnouts. Book on through the FMS.</span></div>' : '';
        if (phone) return { title: 'Status', sub: `${me.callsign} · ${me.station}`, body: notBooked + now + assigned + radio + crew + attach };
        return { title: 'Status', sub: `${me.callsign} · ${me.station} · ${me.name}`, body: `<div class="cols-2"><div>${now}${crew}</div><div>${assigned}${attach}</div></div>` };
    };

    PAGES.overview = function (parts) {
        const sub = parts[0] === 'incidents' ? 'incidents' : 'crewing';
        const seg = segLinks([['#/overview/crewing', 'Crewing'], ['#/overview/incidents', 'Incidents in progress']], '#/overview/' + sub);

        if (sub === 'crewing') {
            const name = parts[1] ? decodeURIComponent(parts[1]) : me.station;
            const station = M.stations.find(s => s.name === name) || M.stations[0];
            const row = `<div class="station-row">${M.stations.map(s => `<a class="station-btn${s === station ? ' on' : ''}" href="#/overview/crewing/${encodeURIComponent(s.name)}">${esc(s.name)}</a>`).join('')}</div>`;
            const crewed = station.callsigns.filter(c => (M.crews[c.cs] || []).length);
            const cards = crewed.length ? crewed.map(c => `<div class="card crew-card">
                    <div class="bar"><span class="cs">${esc(c.cs)}</span><span class="lb">${esc((M.vehicles[c.cs] || {}).name || c.label)}</span><span class="grow"></span>${pill(c.status)}</div>
                    ${crewLines(M.crews[c.cs])}
                </div>`).join('') : card('', empty('No one booked on', `No appliances at ${station.name} are crewed right now.`));
            const summary = `<div class="small muted">${crewed.length} of ${station.callsigns.length} appliances crewed · ${crewed.reduce((n, c) => n + M.crews[c.cs].length, 0)} on duty</div>`;
            return { title: phone ? 'Overview' : 'Service Overview', sub: 'Crewing', body: seg + row + summary + cards };
        }

        const list = M.incidents.filter(i => state.incFilter === 'all' || (!phone && state.incFilter === 'mine') || (state.incFilter === 'station' && i.station === me.station) || (state.incFilter === 'mine' && i.mine));
        const filters = segActs('incFilter', [['all', 'All'], ['station', 'My station']].concat(phone ? [['mine', 'Assigned']] : []), state.incFilter);
        const listHtml = list.length ? card('', `<div class="rows">${list.map(i => incRow(i, !phone && i.id === (parts[1] || list[0].id))).join('')}</div>`) : card('', empty('No incidents', 'Nothing matches this filter.'));
        if (phone && parts[1]) {
            const inc = M.incidents.find(i => i.id === parts[1]);
            if (!inc) return { title: 'Incident', back: '#/overview/incidents', body: card('', empty('Not found', 'This incident has closed.')) };
            return { title: inc.id, small: true, sub: inc.category, back: '#/overview/incidents', body: incidentDetail(inc) };
        }
        if (phone) return { title: 'Overview', sub: 'Incidents in progress', body: seg + filters + listHtml };
        const sel = M.incidents.find(i => i.id === parts[1]) || list[0];
        return { title: 'Service Overview', sub: 'Incidents in progress', body: seg + `<div class="split"><div class="pane">${filters}${listHtml}</div><div class="pane">${sel ? incidentDetail(sel) : ''}</div></div>` };
    };

    PAGES.risk = function (parts) {
        const sub = parts[0] === 'hydrants' ? 'hydrants' : 'ssri';
        const seg = segLinks([['#/risk/ssri', 'SSRI / PORIS'], ['#/risk/hydrants', 'Hydrants']], '#/risk/' + sub);

        if (sub === 'hydrants') {
            const queue = officer && state.defects.length ? card(`Defect reports<span class="grow"></span><span class="pill amber">${state.defects.length}</span>`, `<div class="rows">${state.defects.map(d => `<button class="row" data-act="hydrant" data-arg="${d.hydrant}"><span class="stripe amber"></span>
                    <div class="grow"><div class="t">${esc(d.hydrant)} · ${esc(d.reason)}</div><div class="s">${esc(d.by)} · ${esc(d.time)}${d.note ? ' · ' + esc(d.note) : ''}</div></div><span class="btn sm">Review</span></button>`).join('')}</div>`) : '';
            const rows = M.hydrants.map(hydrantState).map(h => `<button class="row${h.ok ? '' : ' off'}${!phone && h.id === (parts[1] || M.hydrants[0].id) ? ' sel' : ''}" data-act="hydrant" data-arg="${h.id}">
                <div class="arrow"><span class="ms" style="transform:rotate(${h.bearing}deg)">navigation</span></div>
                <div class="grow"><div class="t">${esc(h.id)}</div><div class="s">${esc(h.street)}</div>${h.ok ? '' : '<span class="pill red" style="margin-top:4px">Out of service</span>'}${h.defect ? '<span class="pill outline-amber" style="margin-top:4px">Defect reported</span>' : ''}</div>
                <div class="end"><div class="dist">${h.distance} m</div></div>
                <span class="btn btn-icon red" data-act="waypoint" data-arg="${h.id}" title="Set waypoint">${icon('near_me')}</span>
            </button>`).join('');
            const list = card(`Nearest to you<span class="grow"></span><span style="font-family:var(--font-body);letter-spacing:0;text-transform:none;font-weight:400;color:var(--muted)">Updates as you move</span>`, `<div class="rows">${rows}</div>`);
            if (phone) return { title: 'Risk', sub: 'Hydrants', body: seg + queue + list };
            const h = M.hydrants.find(x => x.id === parts[1]) || M.hydrants[0];
            return { title: 'Risk Information', sub: 'Hydrants', body: seg + `<div class="split" style="grid-template-columns:minmax(0,1fr) 330px"><div class="pane">${queue}${list}</div><div class="pane">${hydrantCard(h)}</div></div>` };
        }

        const id = parts[1];
        if (id && parts[2] === 'edit') return ssriEdit(M.ssri.find(s => s.id === id));
        if (id === 'new') return ssriEdit(null);
        const listCard = card('', `<div class="rows">${M.ssri.map(s => `<a class="row${!phone && s.id === (id || M.ssri[0].id) ? ' sel' : ''}" href="#/risk/ssri/${s.id}" data-ssri="${esc((s.name + ' ' + s.address + ' ' + s.hazards.map(h => h.text).join(' ')).toLowerCase())}">
                <div class="poris l${s.level}">${s.level}<small>PORIS</small></div>
                <div class="grow"><div class="t">${esc(s.name)}</div><div class="s">${esc(s.address)}</div>${s.overdue ? '<span class="pill outline-amber" style="margin-top:4px">Review due</span>' : ''}</div>
            </a>`).join('')}</div>`);
        const search = `<div class="search">${icon('search')}<input id="ssriq" placeholder="Search sites, addresses, hazards"></div>`;
        const wireSearch = () => {
            const q = document.getElementById('ssriq');
            q.addEventListener('input', () => {
                const t = q.value.trim().toLowerCase();
                document.querySelectorAll('[data-ssri]').forEach(row => { row.style.display = !t || row.dataset.ssri.includes(t) ? '' : 'none'; });
            });
        };
        if (phone && id) {
            const s = M.ssri.find(x => x.id === id);
            return { title: 'Risk site', small: true, sub: `${s.id} · SSRI / PORIS`, back: '#/risk/ssri', body: ssriDetail(s) };
        }
        if (phone) return { title: 'Risk', sub: 'Site-specific risk information', body: seg + search + listCard, after: wireSearch };
        const s = M.ssri.find(x => x.id === id) || M.ssri[0];
        return {
            title: 'Risk Information', sub: 'Site-specific risk information',
            actions: officer ? `<a class="btn blue" href="#/risk/ssri/new">${icon('add')}New site</a>` : '',
            body: seg + `<div class="split"><div class="pane">${search}${listCard}</div><div class="pane">${ssriDetail(s)}</div></div>`,
            after: wireSearch,
        };
    };

    PAGES.kb = function (parts) {
        const view = parts[0] || 'home';
        if (view === 'article') return kbArticle(parts[1]);
        if (view === 'search' || view === 'category') {
            const cat = view === 'category' ? decodeURIComponent(parts[1] || '') : null;
            const bar = `<div class="search">${icon('search')}<input id="kbq" placeholder="Search the knowledge base" value="${esc(state.kbQuery)}"></div>`;
            const chips = `<div class="chips${phone ? ' scrollx' : ''}">${M.kb.tags.map(t => `<button class="chip${state.kbTags[t] ? ' on' : ''}" data-act="kbTag" data-arg="${esc(t)}">${esc(t)}</button>`).join('')}</div>`;
            return {
                title: cat || 'Search', small: !!cat, sub: cat ? 'Category' : 'Knowledge Base', back: '#/kb',
                body: bar + chips + `<div id="kbresults">${kbResults(cat)}</div>`,
                after: () => {
                    const input = document.getElementById('kbq');
                    if (!cat) input.focus();
                    input.addEventListener('input', () => { state.kbQuery = input.value; document.getElementById('kbresults').innerHTML = kbResults(cat); });
                },
            };
        }
        const bar = `<a class="search" href="#/kb/search">${icon('search')}<span>Search articles, tags, procedures</span></a>`;
        const loaded = `<div class="loaded">Library loaded ${esc(M.kb.loaded)} · ${M.kb.categories.reduce((n, c) => n + c.count, 0)} articles</div>`;
        const cats = card('Categories', `<div class="cat-list${phone ? '' : ' grid'}">${M.kb.categories.map(c => `<a href="#/kb/category/${encodeURIComponent(c.name)}"><b>${esc(c.name)}</b><span>${c.count}</span></a>`).join('')}</div>`);
        const pinned = card('Pinned', `<div class="rows">${M.kb.articles.filter(a => a.pinned).map(kbRow).join('')}</div>`);
        const recent = card('Recently viewed', `<div class="rows">${M.kb.recent.map(id => kbRow(M.kb.articles.find(a => a.id === id))).join('')}</div>`);
        if (phone) return { title: 'Knowledge', sub: 'Knowledge Base', body: bar + loaded + cats + pinned + recent };
        return { title: 'Knowledge Base', sub: 'Procedures, guidance and reference', body: bar + loaded + cats + `<div class="cols-2"><div>${pinned}</div><div>${recent}</div></div>` };
    };

    PAGES.irs = function (parts) {
        const view = parts[0] || 'list';
        if (view === 'new') return irsNew();
        if (view === 'form' && !phone) return irsForm(parts[1], parts[2] || '1');
        if (view === 'form' || view === 'view') return irsView(parts[1]);
        if (view === 'sent') return irsSent(parts[1]);

        const tabs = officer ? segActs('reportsTab', [['mine', 'My reports'], ['all', 'All reports']], state.reportsTab) : '';
        const list = M.reports.filter(r => !officer || state.reportsTab === 'all' || r.mine);
        const tone = s => s === 'Draft' ? 'grey' : s === 'Recorded' ? 'green' : 'amber';
        const rows = list.map(r => {
            const editable = officer && r.mine && r.status === 'Draft' && !phone;
            return `<a class="row" href="#/irs/${editable ? 'form' : 'view'}/${r.id}${editable ? '/1' : ''}">
                <div class="grow"><div class="t">${esc(r.incident)} · ${esc(r.type)}</div><div class="s">${esc(r.address)} · ${esc(r.author)}</div></div>
                <div class="end"><span class="pill ${tone(r.status)}">${esc(r.status)}</span><div style="margin-top:4px">${esc(r.date)}</div></div>
            </a>`;
        }).join('');
        const phoneNote = officer ? '<div class="banner blue"><span>Reports are written and edited on the <b>tablet</b>. You can read them here.</span></div>' : '';
        return {
            title: 'IRS', sub: 'Incident Recording System',
            actions: officer && !phone ? `<a class="btn red" href="#/irs/new">${icon('add')}New report</a>` : '',
            body: (phone ? phoneNote : '') + tabs + card('', `<div class="rows">${rows}</div>`),
        };
    };

    PAGES.settings = function () {
        if (!ops) return notPermitted();
        const responder = card('Turnouts', `<div class="settings">
            <div class="setting" style="flex-direction:column;align-items:stretch;gap:10px"><div><div class="t">Turnout mode</div><div class="s">Which turnouts reach this device.</div></div>
                ${segActs('mode', [['station', 'Station'], ['assigned', 'Assigned to me'], ['off', 'Off']], state.mode)}</div>
            <div class="setting" style="flex-direction:column;align-items:stretch;gap:10px"><div><div class="t">My stations</div><div class="s">Station mode alerts you for every turnout at these stations.</div></div>
                <div class="chips">${Object.keys(state.stations).map(s => `<button class="chip${state.stations[s] ? ' on' : ''}" data-act="station" data-arg="${s}">${s}</button>`).join('')}</div></div>
            <div class="setting"><div class="grow"><div class="t">My callsign</div><div class="s">Used by "Assigned to me".</div></div><input class="input" style="width:100px;text-align:center;font-weight:700" value="${esc(me.callsign)}"></div>
            <div class="setting"><div class="grow"><div class="t">Alert tone</div></div><select class="select" style="width:170px"><option>Alerter (default)</option><option>Station bells</option><option>Two-tone</option></select></div>
            <div class="setting" style="flex-direction:column;align-items:stretch;gap:10px"><div style="display:flex;justify-content:space-between"><div class="t">Volume</div><span class="muted" id="volv">${state.volume}%</span></div>
                <input type="range" class="slider" id="vol" min="0" max="100" value="${state.volume}"></div>
            <div class="setting"><button class="btn block" data-act="testAlert">Test alert</button></div>
        </div>`);
        const secret = (name, label, value) => `<div class="field" style="padding:12px 14px"><div class="lbl">${label}</div>
            ${value ? `<div class="secret"><span class="ms" style="color:#8fe093;font-size:18px">lock</span><span class="val">••••••••••••${esc(value)}</span><button class="btn sm ghost" data-act="replaceKey" data-arg="${name}">Replace</button><button class="btn sm danger" data-act="removeKey" data-arg="${name}">Remove</button></div>`
                : `<div style="display:flex;gap:8px"><input class="input" id="key-${name}" placeholder="30 letters and numbers" maxlength="30" style="font-family:Consolas,monospace"><button class="btn blue" data-act="saveKey" data-arg="${name}">Save</button></div>`}
        </div>`;
        const push = card('Pushover', `<div class="settings">
            <div class="setting"><div class="grow"><div class="t">Send pages to Pushover</div><div class="s">Turnouts on your real phone through your own Pushover app.</div></div><button class="toggle${state.pushover ? ' on' : ''}" data-act="pushover"></button></div>
            ${state.pushover ? `<div>${secret('app', 'App token', state.appToken)}${secret('user', 'User key', state.userKey)}</div>
            <div class="setting" style="flex-direction:column;align-items:stretch;gap:6px"><div class="t" style="margin-bottom:4px">Which pages to send</div>
                ${[['station', 'Station turnouts'], ['assigned', 'Assigned to me'], ['messages', 'Station messages']].map(([k, l]) => `<button class="check${state.pushPages[k] ? ' on' : ''}" data-act="pushPage" data-arg="${k}"><span class="box">${icon('check')}</span>${l}</button>`).join('')}</div>
            <div class="setting"><button class="btn block" data-act="pushTest" ${state.appToken && state.userKey ? '' : 'disabled'}>Send test</button></div>` : ''}
            <div class="setting"><div class="banner blue" style="width:100%"><span>Your keys stay on the server and are <b>never shown again</b>, not even to you. Only the last 4 characters are displayed.</span></div></div>
        </div>`);
        if (phone) return { title: 'Settings', back: '#/more', body: responder + push };
        return { title: 'Settings', sub: 'Turnouts and notifications for this device', body: `<div class="cols-2"><div>${responder}</div><div>${push}</div></div>` };
    };

    PAGES.more = function () {
        const items = SECTIONS.filter(s => !TABS.includes(s.id));
        return { title: 'More', body: card('', `<div class="rows">${items.concat([{ id: 'about', title: 'About' }]).map(s => `<a class="row" href="#/${s.id}"><div class="grow"><div class="t">${esc(s.title)}</div></div>${icon('chevron_right', 'chev')}</a>`).join('')}</div>`) + incendiumMark() };
    };

    PAGES.about = function () {
        const F = M.fms;
        const head = card('', `<div class="about-head"><div class="title"><img src="img/brand/appicon.png" alt="">
                <div><span class="appname"><img src="img/brand/incendium.png" alt="Incendium">Respond</span><div class="ver">Version ${esc(F.version)} · for ${esc(B.name)}</div></div></div></div>`);
        const server = card('This server', `
            <div class="credit">FMS<span><i class="ok-dot"></i>Connected · ${F.players} players · ${F.units} units booked on</span></div>
            <div class="credit">Brigade pack<span>${esc(F.pack)}</span></div>
            <div class="credit">Knowledge base<span>Loaded ${esc(F.kbLoaded)}</span></div>
            <div class="credit">Hydrants<span>${F.hydrants}</span></div>
            <div class="credit">SSRI sites<span>${F.sites}</span></div>`);
        const news = card('What\'s new', `<ul class="list water">
            <li><b>1.0.0</b> · First release: turnouts, status, crewing, incidents, SSRI/PORIS, hydrants, knowledge base and IRS.</li></ul>`);
        const credits = card('Made by Incendium Solutions', `
            <div class="credit">WM_Night<span>Lead developer</span></div>
            <div class="credit">999EmergencyWM<span>Development</span></div>
            <div class="credit">${esc(B.short)} team<span>Brigade pack, logo and rank insignia</span></div>
            <div class="credit">Knowledge base contributors<span>Listed in the library repository</span></div>`);
        const sources = card('Data and sources', `
            <div class="credit">IRS questions<span>DCLG Incident Recording System, Questions and Lists v1.4 (2009). Crown copyright.</span></div>
            <div class="credit">JESIP<span>Content from jesip.org.uk, shown in the JESIP app</span></div>
            <div class="credit">FMS<span>Crewing, units, incidents and status from Albo's FMS</span></div>`);
        const licences = card('Open-source licences', `
            <div class="credit">Glacial Indifference<span>SIL Open Font License 1.1</span></div>
            <div class="credit">Material Symbols<span>Apache License 2.0</span></div>
            <div class="credit">marked<span>MIT</span></div>
            <div class="credit">DOMPurify<span>Apache 2.0 / MPL 2.0</span></div>`);
        const legal = `<div class="banner amber"><span>For roleplay use on FiveM. Not affiliated with, or endorsed by, any real fire and rescue service or government body.</span></div>`;
        const support = card('Support', `<div class="credit">Incendium Solutions<span>Discord link from config</span></div><div class="credit">Report a problem<span>Include version ${esc(F.version)}</span></div>`);
        if (phone) return { title: 'About', back: '#/more', body: head + server + news + credits + sources + licences + support + legal };
        return { title: 'About', back: '#/home', body: `<div class="cols-2"><div>${head}${server}${news}${support}</div><div>${credits}${sources}${licences}${legal}</div></div>` };
    };

    PAGES.states = function () {
        return {
            title: 'Shared states', sub: 'Design reference', back: phone ? '#/more' : null,
            body: `
                <div class="label">Empty list</div>${card('', empty('No incidents', 'Incidents in progress will appear here.'))}
                <div class="label">Loading</div>${card('', `<div class="rows">${[0, 1, 2].map(() => '<div class="row"><div class="grow"><div class="skel" style="height:13px;width:60%"></div><div class="skel" style="height:10px;width:85%;margin-top:8px"></div></div></div>').join('')}</div>`)}
                <div class="label">Can't reach the server</div><div class="banner red"><span style="flex:1"><b>Can't reach the server.</b> Showing what was last loaded.</span><button class="btn sm">Retry</button></div>
                <div class="label">FMS offline</div><div class="banner amber"><span><b>FMS offline.</b> Crewing and incidents may be out of date.</span></div>
                <div class="label">Not permitted</div>${card('', empty('Not available', 'You do not have access to this section on this server.'))}
                <div class="label">Toast</div><button class="btn" data-act="demoToast">Show toast</button>`,
        };
    };

    // ------------------------------------------------------------ page parts

    function notPermitted() { return { title: 'Not available', body: card('', empty('Not available', 'You do not have access to this section on this server.')) }; }

    function incRow(i, sel) {
        return `<a class="row${sel ? ' sel' : ''}" href="#/overview/incidents/${i.id}"><span class="stripe ${incTone(i)}"></span>
            <div class="grow"><div class="t">${esc(i.type)}</div><div class="s">${esc(i.address)}</div></div>
            <div class="end"><b style="color:var(--text)">${esc(i.ago)}</b><br>${i.units.length} appl.</div>
        </a>`;
    }

    function callsignLabel(cs) {
        for (const s of M.stations) { const c = s.callsigns.find(x => x.cs === cs); if (c) return `${c.label} · ${s.name}`; }
        return '';
    }

    function incidentBlock(i, compact) {
        return `<div class="inc-hero">
                ${compact ? '' : `<div style="display:flex;gap:6px"><span class="pill ${incTone(i)}">${esc(i.category)}</span>${i.mine && phone ? '<span class="pill blue">Assigned to you</span>' : ''}</div>`}
                <div class="type">${esc(i.type)}</div>
                <div class="addr">${esc(i.address)}</div>
                <div class="meta"><span>Ref <b>${esc(i.id)}</b></span><span>Called <b>${esc(i.called)}</b> (${esc(i.ago)} ago)</span><span>Station <b>${esc(i.station)}</b></span></div>
            </div>
            <div class="divider"></div>
            <div class="fields"><div><span>CAD ref</span><b>${esc(i.cad.ref)}</b></div><div><span>Grading</span><b>${esc(i.cad.grading)}</b></div>
                <div><span>Opening code</span><b>${esc(i.cad.opening)}</b></div><div><span>Incident channel</span><b>${esc(i.cad.channel)}</b></div></div>
            ${compact ? '' : `<div class="divider"></div><div class="para">${esc(i.notes)}</div>`}
            <div class="divider"></div>
            ${i.units.map(u => `<div class="unit"><span class="cs">${esc(u.cs)}</span><span class="grow muted small">${esc(callsignLabel(u.cs))}</span>${pill(u.status)}</div>`).join('')}
            <div style="padding:12px 14px 14px;border-top:1px solid var(--line)" class="btn-row">${waypointBtn(i.address, 'Set waypoint')}</div>`;
    }

    function cadLog(i) {
        return card(`CAD log<span class="grow"></span><span style="font-family:var(--font-body);letter-spacing:0;text-transform:none;font-weight:400;color:var(--muted)">From the FMS</span>`,
            `<div class="log">${i.cad.log.slice().reverse().map(e => `<div class="e"><b>${esc(e.time)}</b><span class="by">${esc(e.by)}</span><span class="tx">${esc(e.text)}</span></div>`).join('')}</div>`);
    }

    function incidentDetail(i) {
        const reportBtn = officer && !phone ? '<div class="btn-row"><a class="btn" href="#/irs/new">Start IRS report</a></div>' : '';
        return card('', incidentBlock(i, false)) + cadLog(i) + reportBtn;
    }

    function crewLines(crew) {
        const order = ['GCDR', 'SCDR', 'WCDR', 'CCDR', 'FF', 'FFD'];
        const sorted = crew.slice().sort((a, b) => order.indexOf(a.rank) - order.indexOf(b.rank));
        return '<div class="crew-head"><span>Roll No.</span><span>Rank</span><span>Name</span><span>Qualifications</span></div>'
            + sorted.map(p => `<div class="crew-line">
                <span class="roll">${esc(p.roll)}</span>
                <span class="rank"><img src="${rankImg(p.rank)}" alt=""><span>${esc(M.ranks[p.rank])}</span></span>
                <span class="nm">${esc(p.name)}${phone ? `<small>${esc(p.roll)}</small>` : ''}</span>
                <span class="chips">${p.quals.map(q => `<span class="qual">${esc(q)}</span>`).join('') || '<span class="muted small">-</span>'}</span>
            </div>`).join('');
    }

    // The hydrant list is fixed; only its status changes (officers, from defect reports).
    function hydrantState(h) {
        const defect = state.defects.find(d => d.hydrant === h.id);
        return Object.assign({}, h, state.hydrantStatus[h.id] || {}, { defect });
    }

    function hydrantCard(raw) {
        const h = hydrantState(raw);
        const d = h.defect;
        let defectBlock = '';
        if (d) {
            defectBlock = `<div class="banner amber"><span><b>Defect reported: ${esc(d.reason)}</b><br>${esc(d.note || 'No details given.')}<br>${esc(d.by)} · ${esc(d.time)} · awaiting officer review</span></div>`
                + (officer ? `<div class="btn-row"><button class="btn red" data-act="defectAccept" data-arg="${h.id}">Mark out of service</button><button class="btn" data-act="defectDismiss" data-arg="${h.id}">Dismiss</button></div>` : '');
        } else if (!h.ok) {
            defectBlock = officer ? `<button class="btn block" data-act="returnService" data-arg="${h.id}">Return to service</button>` : '';
        } else {
            defectBlock = `<button class="btn block" data-act="defectForm" data-arg="${h.id}">Report a defect</button>`;
        }
        return card(`Hydrant ${esc(h.id)}`, `<div class="inc-hero">
                <div style="display:flex;align-items:center;gap:12px"><div class="arrow" style="width:50px;height:50px"><span class="ms" style="font-size:30px;transform:rotate(${h.bearing}deg)">navigation</span></div>
                <div><div class="type">${h.distance} m</div><div class="muted">${esc(h.street)}</div></div></div>
                ${h.ok ? '<span class="pill green" style="align-self:flex-start">In service</span>' : '<span class="pill red" style="align-self:flex-start">Out of service</span>'}
                <dl class="kv"><dt>Street</dt><dd>${esc(h.street)}</dd><dt>Direction</dt><dd>${['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(h.bearing / 45) % 8]}</dd></dl>
                ${h.note ? `<div class="banner ${h.ok ? 'blue' : 'red'}"><span>${esc(h.note)}</span></div>` : ''}
                ${waypointBtn(h.id, 'Set waypoint')}
                ${defectBlock}
            </div>`);
    }

    const DEFECTS = ['Valve seized', 'Obstructed', 'Damaged', 'No water / low pressure', 'Cover or frame broken', 'Marker plate missing', 'Cannot locate', 'Other'];

    function defectFormHtml(id) {
        const f = state.defectForm;
        return `<div class="mh"><h3>Report defect · ${esc(id)}</h3></div>
            <div class="mb"><div class="stack" style="padding:12px 14px">
                <div class="field"><div class="lbl">What is wrong?<span class="req">*</span></div>
                    <div class="chips">${DEFECTS.map(r => `<button class="chip${f.reason === r ? ' on' : ''}" data-act="defectReason" data-arg="${esc(r)}">${esc(r)}</button>`).join('')}</div></div>
                <div class="field"><div class="lbl">Details${f.reason === 'Other' ? '<span class="req">*</span>' : ''}</div><textarea class="textarea" id="defectNote" placeholder="e.g. car parked over the cover, valve will not turn">${esc(f.note || '')}</textarea></div>
                <div class="hint">Your position and the time are attached. Officers are notified and decide whether to mark it out of service.</div>
            </div></div>
            <div class="mf"><button class="btn ghost" data-act="closeOverlay">Cancel</button><button class="btn red" data-act="defectSubmit" ${f.reason ? '' : 'disabled'}>Send report</button></div>`;
    }

    function drawDefectForm() {
        const f = state.defectForm;
        const host = document.getElementById('overlay');
        if (!f) { host.innerHTML = ''; return; }
        host.innerHTML = phone
            ? `<div class="sheet-bg" data-act="closeOverlay"><div class="modal" data-stop="1" style="width:100%;max-height:calc(100% - var(--safe-top));border-radius:0;border-left:0;border-right:0;border-bottom:0;padding-bottom:var(--safe-bottom)">${defectFormHtml(f.hydrant)}</div></div>`
            : `<div class="modal-bg" data-act="closeOverlay"><div class="modal" data-stop="1" style="width:460px">${defectFormHtml(f.hydrant)}</div></div>`;
    }

    function ssriDetail(s) {
        const edit = officer && !phone ? `<a class="btn sm" style="background:rgba(0,0,0,.25);border-color:rgba(0,0,0,.3)" href="#/risk/ssri/${s.id}/edit">Edit</a>` : '';
        return `<div class="card">
                <div class="poris-banner l${s.level}"><div class="big">${s.level}</div><div style="flex:1"><div class="t">PORIS ${s.level} · ${esc(M.poris[s.level])}</div><div class="n">${esc(s.name)}</div><div class="a">${esc(s.address)}</div></div>${edit}</div>
                <div style="display:flex;gap:10px;padding:10px 14px;align-items:center">${s.overdue ? `<span class="pill amber">Review due ${esc(s.review)}</span>` : `<span class="pill">Next review ${esc(s.review)}</span>`}<span style="flex:1"></span>${waypointBtn(s.name, 'Waypoint')}</div>
            </div>
            ${officer && phone ? '<div class="banner blue"><span>Editing sites is available on the <b>tablet</b>.</span></div>' : ''}
            ${card('Hazards', `<ul class="list">${s.hazards.map(h => `<li>${esc(h.text)}</li>`).join('')}</ul>`)}
            ${card('Tactical notes', `<div class="para">${esc(s.tactics)}</div>`)}
            ${card('Water supplies', `<ul class="list water">${s.water.map(w => `<li>${esc(w.text)}</li>`).join('')}</ul>`)}
            ${card('Contacts', `<div class="rows">${s.contacts.map(c => `<div class="row" style="min-height:46px"><div class="grow">${esc(c.name)}</div><b>${esc(c.value)}</b></div>`).join('')}</div>`)}
            ${card('Images', `<div class="thumbs">${Array.from({ length: s.images }, (_, i) => `<div class="thumb">Image ${i + 1}</div>`).join('')}</div>`)}
`;
    }

    function ssriEdit(s) {
        const title = s ? 'Edit site' : 'New site';
        if (phone) return { title, back: s ? `#/risk/ssri/${s.id}` : '#/risk/ssri', body: '<div class="banner blue"><span>Adding and editing sites is available on the <b>tablet</b>, where there is room for every field.</span></div>' };
        if (!officer) return notPermitted();
        s = s || { name: '', address: '', level: 3, hazards: [{ text: '' }], tactics: '', water: [{ text: '' }], contacts: [{ name: '', value: '' }], images: 0 };
        const back = s.id ? `#/risk/ssri/${s.id}` : '#/risk/ssri';
        const listEditor = (items, add, render) => `<div class="stack" style="gap:8px">${items.map(it => `<div style="display:flex;gap:8px">${render(it)}<button class="btn btn-icon danger" title="Remove">${icon('close')}</button></div>`).join('')}<button class="add-btn">${icon('add')}${add}</button></div>`;
        return {
            title, sub: s.name || 'Site-specific risk information', back,
            actions: `<a class="btn ghost" href="${back}">Cancel</a><button class="btn blue" data-act="saveSite">Save site</button>`,
            body: `<div class="cols-2"><div>
                ${card('Site', `<div class="stack" style="padding:12px 14px 14px">
                    <div class="field"><div class="lbl">Site name<span class="req">*</span></div><input class="input" value="${esc(s.name)}" placeholder="e.g. Booth Street Chemical Works"></div>
                    <div class="field"><div class="lbl">Address<span class="req">*</span></div><input class="input" value="${esc(s.address)}"></div>
                    <div class="field"><div class="lbl">Location</div><div style="display:flex;gap:8px"><input class="input" value="${s.id ? 'X 1184.2, Y -2210.9' : ''}" placeholder="Not set"><button class="btn">Use my position</button></div></div>
                    <div class="field"><div class="lbl">PORIS level<span class="req">*</span></div><div style="display:flex;gap:6px">${[1, 2, 3, 4, 5].map(l => `<button class="poris l${l}" style="width:50px;height:50px;${l === s.level ? 'outline:3px solid #fff;outline-offset:-3px' : 'opacity:.5'}">${l}<small>${['', 'V.LOW', 'LOW', 'MOD', 'HIGH', 'V.HIGH'][l]}</small></button>`).join('')}</div><div class="hint">${esc(M.poris[s.level])}</div></div>
                    <div class="field"><div class="lbl">Next review date</div><input class="input" type="date" value="2027-02-12"></div>
                </div>`)}
                ${card('Images', `<div class="thumbs">${Array.from({ length: s.images }, (_, i) => `<div class="thumb">Image ${i + 1}</div>`).join('')}<button class="thumb add">Add image</button></div>`)}
            </div><div>
                ${card('Hazards', `<div style="padding:12px 14px">${listEditor(s.hazards, 'Add hazard', h => `<input class="input" value="${esc(h.text)}" placeholder="Describe the hazard">`)}</div>`)}
                ${card('Tactical notes', `<div style="padding:12px 14px"><textarea class="textarea" style="height:110px">${esc(s.tactics)}</textarea></div>`)}
                ${card('Water supplies', `<div style="padding:12px 14px">${listEditor(s.water, 'Add water supply', w => `<input class="input" value="${esc(w.text)}">`)}</div>`)}
                ${card('Contacts', `<div style="padding:12px 14px">${listEditor(s.contacts, 'Add contact', c => `<input class="input" value="${esc(c.name)}" placeholder="Name or role"><input class="input" style="width:160px" value="${esc(c.value)}" placeholder="Number">`)}</div>`)}
                ${s.id ? '<button class="btn danger block">Delete site</button>' : ''}
            </div></div>`,
        };
    }

    function kbRow(a) {
        return `<a class="row" href="#/kb/article/${a.id}"><div class="grow"><div class="t">${esc(a.title)}</div><div class="s">${esc(a.category)} · ${esc(a.updated)}</div></div>${icon('chevron_right', 'chev')}</a>`;
    }

    function kbResults(cat) {
        const q = state.kbQuery.trim().toLowerCase();
        const tags = Object.keys(state.kbTags).filter(t => state.kbTags[t]);
        const hits = M.kb.articles.filter(a => (!cat || a.category === cat)
            && (!q || (a.title + ' ' + a.preview + ' ' + a.tags.join(' ')).toLowerCase().includes(q))
            && tags.every(t => a.tags.some(x => x.toLowerCase().includes(t.toLowerCase()))));
        if (!hits.length) return card('', empty('No articles found', 'Try another word or remove a tag.'));
        return `<div class="small muted" style="margin:0 0 8px">${hits.length} article${hits.length === 1 ? '' : 's'}</div>` + card('', `<div class="rows">${hits.map(a => `<a class="row" href="#/kb/article/${a.id}" style="align-items:flex-start">
                <div class="grow"><div class="t">${esc(a.title)}</div><div class="s">${esc(a.category)}</div>
                <div class="small" style="color:var(--text-2);margin-top:4px;white-space:normal">${esc(a.preview)}</div>
                <div class="chips" style="margin-top:6px">${a.tags.map(t => `<span class="chip sm">${esc(t)}</span>`).join('')}</div></div>
            </a>`).join('')}</div>`);
    }

    const CALLOUTS = { CAUTION: ['Safety', 'caution', 'shield'], WARNING: ['Warning', 'warning', 'warning'], NOTE: ['Note', 'note', 'info'], TIP: ['Tip', 'tip', 'lightbulb'], IMPORTANT: ['Important', 'note', 'error'] };

    // Markdown -> safe HTML. Callouts use GitHub's alert syntax (> [!WARNING]) so
    // articles look the same on GitHub and in the app.
    function renderMarkdown(md) {
        const box = document.createElement('div');
        box.innerHTML = window.DOMPurify.sanitize(window.marked.parse(md));
        box.querySelectorAll('blockquote').forEach(q => {
            const first = q.querySelector('p');
            const m = first && first.innerHTML.match(/^\s*\[!(\w+)\]\s*(<br>)?\s*/);
            if (!m || !CALLOUTS[m[1].toUpperCase()]) return;
            const [title, cls, ic] = CALLOUTS[m[1].toUpperCase()];
            first.innerHTML = first.innerHTML.slice(m[0].length);
            const div = document.createElement('div');
            div.className = 'callout ' + cls;
            div.innerHTML = `${icon(ic)}<div><div class="ct">${title}</div>${q.innerHTML}</div>`;
            q.replaceWith(div);
        });
        // An image followed by an *italic* line is a captioned image.
        box.querySelectorAll('p > img').forEach(img => {
            const p = img.parentElement;
            const em = p.querySelector(':scope > em') || (p.nextElementSibling && p.nextElementSibling.tagName === 'P' && p.nextElementSibling.querySelector(':scope > em:only-child'));
            if (!em) return;
            const cap = document.createElement('span');
            cap.className = 'caption';
            cap.textContent = em.textContent;
            if (em.parentElement !== p) em.parentElement.remove(); else em.remove();
            p.querySelectorAll('br').forEach(br => br.remove());
            p.appendChild(cap);
        });
        return box;
    }

    function kbArticle(id) {
        const a = M.kb.articles.find(x => x.id === id) || M.kb.articles[0];
        const md = M.kb.body[a.id] || `# ${a.title}\n\n${a.preview}\n\n## Overview\n\nThis article is a placeholder in the design preview. The real text comes from the knowledge library on GitHub.\n\n> [!NOTE]\n> Articles are Markdown files listed in library.json.`;
        const box = renderMarkdown(md);
        const h1 = box.querySelector('h1');
        if (h1) h1.remove();
        const head = `<div class="chips">${a.tags.map(t => `<span class="chip sm">${esc(t)}</span>`).join('')}</div>
            <h1 style="font-size:${phone ? 27 : 32}px;line-height:1.1;margin:10px 0 6px">${esc(a.title)}</h1>
            <div class="small muted" style="margin-bottom:14px">${esc(a.category)} · Updated ${esc(a.updated)}</div>`;
        const article = `<div class="article">${head}${box.innerHTML}</div>`;
        if (phone) return { title: '', back: '#/kb', body: article, actions: '<button class="btn sm" data-act="pin">Pin</button>' };
        const toc = [...box.querySelectorAll('h2, h3')].map((h, i) => `<a class="${h.tagName.toLowerCase()}${i === 0 ? ' on' : ''}" href="javascript:void(0)">${esc(h.textContent)}</a>`).join('');
        return { title: 'Knowledge Base', sub: a.category, back: '#/kb', body: `<div class="article-wrap"><nav class="toc"><div class="label" style="margin-bottom:8px">On this page</div>${toc}</nav>${article}</div>` };
    }

    // ------------------------------------------------------------ IRS

    // What the server fills in from the FMS and the incident (INC-1042).
    function prefill(blank) {
        if (blank) return { values: { _groups: {} }, prefilled: new Set(), saved: '-' };
        const v = {
            '1.1': '1042/061026', '1.2': 'FM', '1.3': 'Handsworth', '1.4': 'WCDR A. Smith (4127)', '1.5': 'No',
            '2.1': '2026-10-06T13:41', '2.3': '36', '2.5': '2026-10-06T14:12', '2.6': '2026-10-06T14:58',
            '3.1': 'Fire', '3.7': '3', '4.1': 'Yes',
            '4.2': { a: '27', d: 'Holly Road', e: 'Handsworth', f: 'Birmingham' }, '4.3a/b': { x: '312.4', y: '-1204.7' },
            _groups: {
                vehicle: [
                    { '6.2': 'PPL', '6.3': 'A071', '6.4': '4', '6.5': 'No', '6.6': '2026-10-06T13:42', '6.7': '2026-10-06T13:43', '6.8': '2026-10-06T13:48', '6.9': '2026-10-06T14:40', '6.10': 'HomeStation' },
                    { '6.2': 'PPL', '6.3': 'A075', '6.4': '3', '6.5': 'No', '6.6': '2026-10-06T13:44', '6.7': '2026-10-06T13:45', '6.8': '2026-10-06T13:53', '6.9': '2026-10-06T14:46', '6.10': 'HomeStation' },
                ],
            },
        };
        return { values: v, prefilled: new Set(['1.1', '1.2', '1.3', '1.4', '2.1', '2.3', '2.5', '2.6', '3.7', '4.1', '4.2', '4.3a/b', 'vehicle']), saved: '14:06' };
    }

    function report(id) {
        if (!state.reports[id]) state.reports[id] = prefill(id === 'IRS-BLANK');
        const r = state.reports[id];
        IRS.applyDefaults(r.values);
        return r;
    }

    const hasQDep = c => !!c && (!!c.q || (c.all || c.any || []).some(hasQDep) || (!!c.not && hasQDep(c.not)));

    function fieldHtml(id, r, g, i) {
        const q = IRS.Q[id];
        const v = r.values;
        const row = g ? v._groups[g][i] : null;
        const value = row ? row[id] : v[id];
        const key = `data-q="${id}"${g ? ` data-g="${g}" data-i="${i}"` : ''}`;
        const otherKey = key.replace(`data-q="${id}"`, `data-q="${id}:other"`);
        const pre = !g && r.prefilled.has(id) && !IRS.missing(id, value);
        const err = q.required && IRS.missing(id, value);
        const cls = `${pre ? ' prefilled' : ''}${err ? ' err' : ''}`;
        const lbl = `<div class="lbl"><span class="qn">${esc(id)}</span>${esc(q.label)}${q.required ? '<span class="req">*</span>' : ''}${pre ? '<span class="tag">PREFILLED</span>' : ''}</div>`;
        const choice = opts => `<div class="choice">${opts.map(o => `<button data-act="irsSet" data-arg="${esc(o.code)}" ${key} class="${value === o.code ? 'on' : ''}">${esc(o.label)}</button>`).join('')}</div>`;
        let input = '';
        let wide = false;
        switch (q.type) {
            case 'yesno': case 'yesnodk': case 'radio':
                input = choice(IRS.options(id, v, row));
                wide = q.type === 'radio';
                break;
            case 'category':
                input = `<div class="category">${q.options.map(o => `<button data-act="irsSet" data-arg="${o.code}" ${key} class="${value === o.code ? 'on' : ''}">${esc(o.label)}</button>`).join('')}</div>`;
                break;
            case 'hierarchy': {
                const leaf = IRS.leaves[q.tree][value];
                input = `<button class="picker${cls}" data-act="openPicker" ${key}><span class="grow">${leaf ? `<span class="path">${esc(leaf.path.join(' › '))}</span>${esc(leaf.label)}` : '<span class="ph">Choose from the list</span>'}</span>${icon('chevron_right', 'chev')}</button>`;
                if (leaf && leaf.other) input += `<input class="input" data-change="irsSet" data-q="${id}:other" placeholder="Please describe" value="${esc(v[id + ':other'] || '')}">`;
                break;
            }
            case 'select': {
                const opts = IRS.options(id, v, row);
                const o = opts.find(x => x.code === value);
                if (opts.length > 14) {
                    wide = true;
                    input = `<button class="picker${cls}" data-act="openPicker" ${key}><span class="grow">${o ? `${o.group ? `<span class="path">${esc(o.group)}</span>` : ''}${esc(o.label)}` : `<span class="ph">Choose from ${opts.length} options</span>`}</span>${icon('chevron_right', 'chev')}</button>`;
                } else {
                    const groups = [...new Set(opts.map(x => x.group).filter(Boolean))];
                    const optHtml = x => `<option value="${esc(x.code)}" ${x.code === value ? 'selected' : ''}>${esc(x.label)}</option>`;
                    input = `<select class="select${cls}" data-change="irsSet" ${key}><option value="">Select…</option>${groups.length ? groups.map(gr => `<optgroup label="${esc(gr)}">${opts.filter(x => x.group === gr).map(optHtml).join('')}</optgroup>`).join('') : opts.map(optHtml).join('')}</select>`;
                    if (o && o.hint) input += `<div class="hint">${esc(o.hint)}</div>`;
                }
                if (o && o.other) input += `<input class="input" data-change="irsSet" ${otherKey} placeholder="Please describe" value="${esc((row || v)[id + ':other'] || '')}">`;
                break;
            }
            case 'combo': {
                const dl = 'dl-' + id.replace(/\W/g, '-');
                input = `<input class="input${cls}" list="${dl}" data-change="irsSet" ${key} value="${esc(value || '')}" placeholder="UN number"><datalist id="${dl}">${q.options.map(o => `<option value="${esc(o.code)}">${esc(o.label)}</option>`).join('')}</datalist>`;
                break;
            }
            case 'station':
                input = `<select class="select${cls}" data-change="irsSet" ${key}><option value="">Select…</option>${M.stations.map(s => `<option ${s.name === value ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>`;
                break;
            case 'datetime':
                input = `<input type="datetime-local" class="input${cls}" data-change="irsSet" ${key} value="${esc(value || '')}">`;
                break;
            case 'number':
                input = `<input type="number" class="input${cls}" style="max-width:150px" min="${q.min || 0}" ${q.max != null ? `max="${q.max}"` : ''} data-change="irsSet" ${key} value="${esc(value == null ? '' : value)}">`;
                break;
            case 'address': case 'coords': {
                const x = value || {};
                wide = true;
                input = `<div class="sub-grid">${q.fields.map(f => `<div class="field"><div class="hint">${esc(f.label)}${f.required ? ' *' : ''}</div><input class="input${pre ? ' prefilled' : ''}" data-change="irsSet" ${key} data-sub="${f.id}" value="${esc(x[f.id] || '')}"></div>`).join('')}</div>${q.rule ? `<div class="hint">${esc(q.rule)}</div>` : ''}`;
                break;
            }
            default:
                input = id === '4.2k' || q.maxLength > 60
                    ? `<textarea class="textarea" data-change="irsSet" ${key}>${esc(value || '')}</textarea>`
                    : `<input class="input${cls}" ${q.maxLength ? `maxlength="${q.maxLength}"` : ''} data-change="irsSet" ${key} value="${esc(value || '')}">`;
        }
        return `<div class="field${g && wide ? ' wide' : ''}">${lbl}${input}</div>`;
    }

    function groupHtml(g, r) {
        const G = IRS.S.groups[g];
        const v = r.values;
        const rows = v._groups[g] || [];
        return `<div class="field"><div class="lbl">${esc(G.label)}${G.min ? '<span class="req">*</span>' : ''}${r.prefilled.has(g) ? '<span class="tag">PREFILLED</span>' : ''}</div>
            <div class="stack" style="gap:8px">${rows.map((row, i) => `<div class="group-card">
                <div class="gh"><span class="grow">${esc(G.label)} ${i + 1}${row['6.3'] ? ' · ' + esc(row['6.3']) : ''}</span><button class="btn sm danger" data-act="irsRemove" data-g="${g}" data-arg="${i}">Remove</button></div>
                <div class="gb">${G.questions.filter(id => IRS.visible(id, v, row)).map(id => fieldHtml(id, r, g, i)).join('')}</div>
            </div>`).join('')}
            <button class="add-btn" data-act="irsAdd" data-g="${g}">${icon('add')}${esc(G.add)}</button></div></div>`;
    }

    function sectionFields(sec, r) {
        const v = r.values;
        let html = '', open = false;
        const done = new Set();
        for (const id of sec.questions) {
            const q = IRS.Q[id];
            let part, dep;
            if (q.group) {
                if (done.has(q.group)) continue;
                done.add(q.group);
                if (!IRS.groupVisible(q.group, v)) continue;
                part = groupHtml(q.group, r);
                dep = hasQDep(IRS.S.groups[q.group].when);
            } else {
                if (!IRS.visible(id, v)) continue;
                part = fieldHtml(id, r);
                dep = hasQDep(q.when);
            }
            if (dep && !open) { html += '<div class="reveal">'; open = true; }
            if (!dep && open) { html += '</div>'; open = false; }
            html += part;
        }
        if (open) html += '</div>';
        return html;
    }

    function irsForm(id, step) {
        if (!officer) return notPermitted();
        id = id || 'IRS-NEW';
        const r = report(id);
        const v = r.values;
        const sections = IRS.S.sections;
        const n = Math.max(1, Math.min(sections.length, parseInt(step, 10) || 1));
        const sec = sections[n - 1];
        const issues = sections.map(s => s.questions.length ? IRS.issues(s, v) : []);
        const errors = issues.flat().filter(x => x.kind === 'e').length;
        const real = sections.filter(s => s.questions.length);
        const done = real.filter(s => IRS.askedIn(s, v) && !issues[sections.indexOf(s)].some(x => x.kind === 'e')).length;
        const fc = IRS.fireClass(v);

        const rail = `<nav class="rail"><div class="label" style="padding:0 8px">Progress</div><div class="progress"><div style="width:${Math.round(done / real.length * 100)}%"></div></div>
            ${sections.map((s, i) => {
                const is = issues[i];
                const e = is.filter(x => x.kind === 'e').length, w = is.length - e;
                const asked = !s.questions.length || IRS.askedIn(s, v);
                const ok = s.questions.length && asked && !e;
                return `<a href="#/irs/form/${id}/${i + 1}" class="${i + 1 === n ? 'on' : ''}${ok ? ' done' : ''}${asked ? '' : ' skip'}"><span class="n">${ok ? icon('check') : i + 1}</span><span class="grow">${esc(s.title)}${asked ? '' : '<br><span style="font-weight:400;font-size:11px">Not asked</span>'}</span>${e ? `<span class="cnt e">${e}</span>` : ''}${w ? `<span class="cnt w">${w}</span>` : ''}</a>`;
            }).join('')}</nav>`;

        let fields;
        if (sec.questions.length) {
            fields = IRS.askedIn(sec, v) ? sectionFields(sec, r) : card('', empty('Nothing to record here', 'None of this section applies to the answers so far.'));
        } else {
            const all = issues.flatMap((x, i) => x.map(y => Object.assign({ step: i + 1 }, y)));
            fields = `<div class="cols-2" style="gap:10px">
                    <div class="card stat"><b style="color:${errors ? '#ff7d82' : '#8fe093'}">${errors}</b><span>Errors to fix</span></div>
                    <div class="card stat"><b style="color:var(--amber)">${all.length - errors}</b><span>Warnings</span></div>
                </div>
                ${all.length ? card('To check before submitting', all.map(x => `<div class="issue"><span class="k ${x.kind}">${x.kind === 'e' ? 'ERROR' : 'WARN'}</span><span>${esc(x.text)}</span><a href="#/irs/form/${id}/${x.step}">Section ${x.step}</a></div>`).join('')) : '<div class="banner blue"><span>No errors. The report can be submitted as <b>Recorded</b>.</span></div>'}
                ${card('Notes', `<div class="stack" style="padding:12px 14px">${sec.notes.map(nt => `<div class="field"><div class="lbl">${esc(nt.label)}</div><textarea class="textarea" data-change="irsSet" data-q="notes:${nt.id}">${esc(v['notes:' + nt.id] || '')}</textarea></div>`).join('')}</div>`)}`;
        }

        const last = n === sections.length;
        const nextIdx = sections.findIndex((s, i) => i >= n && (!s.questions.length || IRS.askedIn(s, v)));
        const next = nextIdx >= 0 ? nextIdx + 1 : sections.length;
        const foot = `<div class="irs-foot"><span class="grow">Draft saved ${esc(r.saved)}</span>
            ${n > 1 ? `<a class="btn ghost" href="#/irs/form/${id}/${n - 1}">Back</a>` : ''}
            <button class="btn" data-act="irsSave">Save draft</button>
            ${last ? `<button class="btn green" data-act="irsSubmit" ${errors ? 'disabled' : ''}>Submit as Recorded</button>` : `<a class="btn blue" href="#/irs/form/${id}/${next}">Next</a>`}</div>`;
        const derived = `<div class="derived">${v['3.1'] ? `<span class="pill ${v['3.1'] === 'Fire' ? 'red' : 'blue'}">${esc(IRS.display('3.1', v['3.1']))}</span>` : '<span>Category not set (3.1)</span>'}${fc ? `<span class="pill">${esc(fc)} fire</span>` : ''}${IRS.property(v) ? `<span>${esc(IRS.display('3.2', v['3.2']))}</span>` : ''}</div>`;

        return {
            title: `IRS · ${v['1.1'] || 'New report'}`, sub: IRS.display('2.3', v['2.3']) || 'Incident Recording System', back: '#/irs', fill: true,
            actions: '<span class="pill grey">Draft</span>',
            body: `<div class="irs">${rail}<div class="irs-body"><div style="display:flex;align-items:baseline;gap:10px;margin-bottom:6px"><h2 style="font-size:20px;text-transform:uppercase;letter-spacing:.05em">${esc(sec.title)}</h2><span class="small muted">Section ${n} of ${sections.length}</span></div><div style="margin-bottom:12px">${derived}</div><div class="irs-fields">${fields}</div>${foot}</div></div>`,
        };
    }

    function irsView(id) {
        const meta = M.reports.find(x => x.id === id) || M.reports[0];
        const r = report(meta.id);
        const v = r.values;
        const answer = (qid, row) => { const val = row ? row[qid] : v[qid]; return IRS.missing(qid, val) ? '' : IRS.display(qid, val); };
        const sections = IRS.S.sections.filter(s => s.questions.length).map(s => {
            const done = new Set();
            const lines = [];
            for (const qid of s.questions) {
                const q = IRS.Q[qid];
                if (q.group) {
                    if (done.has(q.group) || !IRS.groupVisible(q.group, v)) continue;
                    done.add(q.group);
                    (v._groups[q.group] || []).forEach((row, i) => {
                        const parts = IRS.S.groups[q.group].questions.filter(g => IRS.visible(g, v, row) && answer(g, row)).map(g => `${esc(IRS.Q[g].label)}: <b>${esc(answer(g, row))}</b>`);
                        lines.push(`<div style="padding:8px 14px"><div class="small muted">${esc(IRS.S.groups[q.group].label)} ${i + 1}</div><div class="small" style="line-height:1.6">${parts.join(' · ')}</div></div>`);
                    });
                } else if (IRS.visible(qid, v) && answer(qid)) {
                    lines.push(`<div style="padding:8px 14px"><div class="small muted">${esc(qid)} ${esc(q.label)}</div><b>${esc(answer(qid))}</b></div>`);
                }
            }
            return lines.length ? card(esc(s.title), lines.join('<div class="divider"></div>')) : '';
        }).join('');
        const canEdit = officer && meta.mine && meta.status === 'Draft';
        const tone = meta.status === 'Draft' ? 'grey' : meta.status === 'Recorded' ? 'green' : 'amber';
        const head = card('', `<div class="inc-hero"><div style="display:flex;gap:6px"><span class="pill ${tone}">${esc(meta.status)}</span><span class="pill">${esc(meta.id)}</span></div>
            <div class="type">${esc(meta.type)}</div><div class="addr">${esc(meta.address)}</div>
            <div class="meta"><span>Incident <b>${esc(meta.incident)}</b></span><span>By <b>${esc(meta.author)}</b></span><span><b>${esc(meta.date)}</b></span></div></div>`);
        if (phone) return { title: meta.incident, small: true, sub: 'Incident report', back: '#/irs', body: (canEdit ? '<div class="banner blue"><span>Continue editing this draft on the <b>tablet</b>.</span></div>' : '') + head + sections };
        return { title: `IRS · ${meta.incident}`, sub: meta.type, back: '#/irs', actions: canEdit ? `<a class="btn blue" href="#/irs/form/${meta.id}/1">Continue editing</a>` : '', body: `<div class="stack" style="max-width:760px">${head}${sections}</div>` };
    }

    function irsNew() {
        if (!officer) return notPermitted();
        if (phone) return { title: 'New report', back: '#/irs', body: '<div class="banner blue"><span>Reports are written on the <b>tablet</b>.</span></div>' };
        return {
            title: 'New report', sub: 'Incident Recording System', back: '#/irs',
            body: `<div class="cols-2"><div>
                ${card('From a live incident', `<div class="small muted" style="padding:10px 14px">Times, address, appliances and crew are filled in from the FMS and the incident.</div><div class="rows">${M.incidents.map(i => `<a class="row" href="#/irs/form/IRS-NEW/1"><span class="stripe ${incTone(i)}"></span><div class="grow"><div class="t">${esc(i.id)} · ${esc(i.type)}</div><div class="s">${esc(i.address)}</div></div><span class="btn sm blue">Start</span></a>`).join('')}</div>`)}
            </div><div>
                ${card('Blank report', `<div class="stack" style="padding:12px 14px"><span class="small muted">For an incident that is no longer live. Nothing is filled in.</span><a class="btn" href="#/irs/form/IRS-BLANK/1">Start blank report</a></div>`)}
            </div></div>`,
        };
    }

    function irsSent(id) {
        return {
            title: 'IRS', back: '#/irs',
            body: `<div class="sent"><div class="tick">${icon('check')}</div><h2>Report sent</h2>
                <div class="pill">${esc(id || 'IRS-2026-0188')} · 1042/061026</div>
                <p>Saved as <b style="color:#fff">Recorded</b> and sent to the reporting channel.</p>
                <div class="btn-row" style="width:100%;max-width:380px"><a class="btn" href="#/irs/view/IRS-2026-0185">View report</a><a class="btn blue" href="#/irs">Back to reports</a></div></div>`,
        };
    }

    // Picker for hierarchies and long lists: drill down, or search every level.
    function openPicker(el) {
        state.picker = { q: el.dataset.q, g: el.dataset.g || null, i: el.dataset.i != null ? +el.dataset.i : null, path: [], search: '' };
        drawPicker();
    }

    function pickerNodes(p) {
        const r = report(currentReportId());
        const q = IRS.Q[p.q];
        if (q.type === 'hierarchy') return { title: IRS.S.hierarchies[q.tree].label, tree: IRS.S.hierarchies[q.tree].tree };
        const row = p.g ? r.values._groups[p.g][p.i] : null;
        const opts = IRS.options(p.q, r.values, row);
        const leaf = o => ({ id: o.code, label: o.label, hint: o.hint });
        const groups = [...new Set(opts.map(o => o.group).filter(Boolean))];
        const tree = groups.length
            ? groups.map(gr => ({ label: gr, children: opts.filter(o => o.group === gr).map(leaf) })).concat(opts.filter(o => !o.group).map(leaf))
            : opts.map(leaf);
        return { title: `${p.q} ${q.label}`, tree };
    }

    function drawPicker() {
        const host = document.getElementById('overlay');
        const p = state.picker;
        if (!p) { host.innerHTML = ''; return; }
        const { title, tree } = pickerNodes(p);
        let nodes = tree;
        p.path.forEach(i => { nodes = nodes[i].children; });
        const count = n => n.children ? n.children.reduce((a, c) => a + count(c), 0) : 1;
        let rows;
        if (p.search) {
            const flat = [];
            const walk = (list, trail) => list.forEach(n => n.children ? walk(n.children, trail.concat(n.label)) : flat.push({ n, trail }));
            walk(tree, []);
            rows = flat.filter(x => (x.trail.join(' ') + ' ' + x.n.label).toLowerCase().includes(p.search.toLowerCase())).slice(0, 80)
                .map(x => `<button class="row" data-act="pickLeaf" data-arg="${esc(x.n.id)}"><div class="grow"><div class="t" style="white-space:normal">${esc(x.n.label)}</div><div class="s">${esc(x.trail.join(' › '))}${x.trail.length ? ' · ' : ''}Code ${esc(x.n.id)}</div></div></button>`).join('');
        } else {
            rows = nodes.map((n, i) => n.children
                ? `<button class="row" data-act="pickInto" data-arg="${i}"><div class="grow"><div class="t">${esc(n.label)}</div><div class="s">${count(n)} options</div></div>${icon('chevron_right', 'chev')}</button>`
                : `<button class="row" data-act="pickLeaf" data-arg="${esc(n.id)}"><div class="grow"><div class="t" style="white-space:normal">${esc(n.label)}</div><div class="s" style="white-space:normal">Code ${esc(n.id)}${n.other ? ' · asks for a description' : ''}${n.hint ? ' · ' + esc(n.hint) : ''}</div></div></button>`).join('');
        }
        let walkNodes = tree;
        const crumbs = ['<a href="javascript:void(0)" data-act="pickCrumb" data-arg="0">All</a>'].concat(p.path.map((i, d) => {
            const label = walkNodes[i].label; walkNodes = walkNodes[i].children;
            return `› <a href="javascript:void(0)" data-act="pickCrumb" data-arg="${d + 1}">${esc(label)}</a>`;
        })).join(' ');
        host.innerHTML = `<div class="modal-bg" data-act="closePicker"><div class="modal" data-stop="1">
            <div class="mh"><h3>${esc(title)}</h3><div class="search">${icon('search')}<input id="pickq" placeholder="Search every level" value="${esc(p.search)}"></div><div class="crumbs">${crumbs}</div></div>
            <div class="mb rows">${rows || empty('Nothing found', 'Try another word.')}</div>
            <div class="mf"><button class="btn ghost" data-act="closePicker">Cancel</button></div></div></div>`;
        const input = document.getElementById('pickq');
        input.addEventListener('input', () => { p.search = input.value; const pos = input.selectionStart; drawPicker(); const again = document.getElementById('pickq'); again.focus(); again.setSelectionRange(pos, pos); });
    }

    function currentReportId() { const parts = route(); return parts[0] === 'irs' && parts[2] ? parts[2] : 'IRS-NEW'; }

    function setAnswer(el, value) {
        const r = report(currentReportId());
        const v = r.values;
        const qid = el.dataset.q;
        const target = el.dataset.g ? v._groups[el.dataset.g][+el.dataset.i] : v;
        if (el.dataset.sub) target[qid] = Object.assign({}, target[qid] || {}, { [el.dataset.sub]: value });
        else target[qid] = value === '' ? undefined : value;
        if (!el.dataset.g) r.prefilled.delete(qid);
    }

    // ------------------------------------------------------------ turnout alert

    // Turnouts queue up: the tone loops until every one is acknowledged, in order.
    // A turnout for the same CAD ref (Mobilising and the FMS) is shown once.
    const SAMPLE_TURNOUTS = [
        { ref: '1045/061026', type: 'FI - Fire', address: 'Unit 12, Booth Street Industrial Estate, Handsworth', time: '14:02', grading: 'Emergency', channel: 'FIREOPS4', station: 'Handsworth', callsigns: ['A071', 'A075', 'D021'], info: 'Smoke seen from roof vents. Caller on site, building evacuated.' },
        { ref: '1046/061026', type: 'RTCPR - RTC Persons Reported', address: 'A41 Holyhead Road, junction with Sandwell Road', time: '14:03', grading: 'Emergency', channel: 'FIREOPS5', station: 'Handsworth', callsigns: ['A071', 'A077'], info: 'Two cars, one person trapped. Ambulance on scene.' },
    ];
    let sampleNo = 0;

    function showAlert(test) {
        if (!phone) return; // tablets never receive turnouts
        const t = test
            ? { ref: 'TEST', type: 'Test of your alert tone', address: 'No action needed', time: '14:02', grading: '-', channel: '-', station: me.station, callsigns: [me.callsign], info: 'This is a test.', test: true }
            : SAMPLE_TURNOUTS[sampleNo++ % SAMPLE_TURNOUTS.length];
        if (state.queue.some(x => x.ref === t.ref)) return;
        state.queue.push(t);
        drawAlert();
    }

    function drawAlert() {
        const t = state.queue[0];
        if (!t) return;
        const n = state.queue.length;
        const details = card('Incident', `<div class="inc-hero">
                <div class="meta"><span>CAD <b>${esc(t.ref)}</b></span><span>Called <b>${esc(t.time)}</b></span><span>Grading <b>${esc(t.grading)}</b></span><span>Channel <b>${esc(t.channel)}</b></span><span>Station <b>${esc(t.station)}</b></span></div>
                <div class="label" style="margin-top:4px">Mobilised</div>
                <div class="callsign-chips">${t.callsigns.map(c => `<span class="${c === me.callsign ? 'me' : ''}">${esc(c)}</span>`).join('')}</div>
                <div class="label" style="margin-top:4px">Information</div>
                <div>${esc(t.info)}</div>
            </div>`);
        const foot = `<div class="alert-foot" id="alertFoot">
                <button class="btn red xl block" data-act="ack">${n > 1 ? `Acknowledge · ${n - 1} more` : 'Acknowledge'}</button>
            </div>`;
        const banner = `<div class="alert-banner"><img class="alert-logo" src="${B.logoHorizontal || B.logo}" alt=""><div class="alert-word">${icon('notifications_active', 'fill')}${t.test ? 'TEST' : 'TURNOUT'}</div>
            <div class="alert-type">${esc(t.type)}</div>
            <div class="alert-addr">${esc(t.address)}</div>
            <div class="alert-sub" id="alertSub">${n > 1 ? `<span class="qn">1 of ${n} turnouts</span>` : ''}${esc(t.station)} · ${esc(t.time)} · Acknowledge to silence</div></div>`;
        document.getElementById('overlay').innerHTML = `<div class="alert" id="alert">${banner}<div class="alert-body">${details}</div>${foot}</div>`;
    }

    // Acknowledge only silences the alert: the FMS sets the unit's status itself when it is attached.
    function acknowledge() {
        const t = state.queue.shift();
        if (!t) return;
        if (state.queue.length) { drawAlert(); toast('Acknowledged. Next turnout'); return; }
        const el = document.getElementById('alert');
        el.classList.add('acked');
        el.querySelector('.alert-word').innerHTML = `${icon('check', 'fill')}ACKNOWLEDGED`;
        document.getElementById('alertSub').textContent = `Acknowledged ${t.time}`;
        document.getElementById('alertFoot').innerHTML = `
            ${waypointBtn(t.address, 'Set waypoint', 'block')}
            <button class="btn blue block" data-act="fmsChannel" data-arg="incident">Incident channel</button>
            <button class="btn ghost block" data-act="closeAlert">Close</button>`;
    }

    // ------------------------------------------------------------ shell

    function route() { return (location.hash.replace(/^#\/?/, '') || 'home').split('/').filter(Boolean); }

    function render() {
        const parts = route();
        const id = PAGES[parts[0]] ? parts[0] : 'home';
        if (!SECTIONS.some(s => s.id === id) && !['more', 'states', 'about'].includes(id)) { location.hash = '#/home'; return; }
        const out = PAGES[id](parts.slice(1));
        const app = document.getElementById('app');
        document.body.classList.toggle('compact', !!out.fill);
        const top = `<div class="topbar">
                ${out.back ? `<a class="back" href="${out.back}">${icon('chevron_left')}</a>` : ''}
                <div style="flex:1;min-width:0">${out.title ? `<h1 style="${out.small ? 'font-size:23px' : ''}">${esc(out.title)}</h1>` : ''}${out.sub ? `<div class="sub">${esc(out.sub)}</div>` : ''}</div>
                <div style="display:flex;gap:8px;align-items:center">${out.actions || ''}</div>
            </div>`;
        if (phone) {
            const tabId = TABS.includes(id) ? id : 'more';
            const tabs = TABS.map(t => SECTIONS.find(s => s.id === t)).concat([{ id: 'more', tab: 'More', icon: 'more_horiz' }])
                .map(s => `<a class="tab${s.id === tabId ? ' on' : ''}" href="#/${s.id}">${icon(s.icon)}${esc(s.tab || s.title)}</a>`).join('');
            app.innerHTML = `<div class="main"><div class="safe-top" id="safeTop"></div><div class="scroll" id="scroll">${out.pre ? `<div style="padding:8px 14px 0">${out.pre}</div>` : ''}${top}<div class="content">${out.body}</div></div><nav class="tabbar">${tabs}</nav></div>`;
            const sc = document.getElementById('scroll');
            sc.addEventListener('scroll', () => document.getElementById('safeTop').classList.toggle('edge', sc.scrollTop > 4));
        } else {
            const nav = SECTIONS.map(s => `<a class="${s.id === id ? 'on' : ''}" href="#/${s.id}" title="${esc(s.title)}">${icon(s.icon)}<span class="lbl">${esc(s.title)}</span>${s.count ? `<span class="count">${s.count}</span>` : ''}</a>`).join('');
            const side = `<aside class="side"><div class="brand-svc">${serviceMark()}</div>
                <nav class="nav">${nav}</nav>
                <div class="me-card"><img src="${rankImg(me.rank)}" alt=""><div><b>${esc(me.name)}</b><span>${esc(me.callsign)} · ${esc(me.station)}</span></div></div>${incendiumMark()}</aside>`;
            const body = out.fill ? `<div class="content" style="flex:1;min-height:0">${out.body}</div>` : `<div class="scroll" id="scroll"><div class="content">${out.body}</div></div>`;
            app.innerHTML = side + `<div class="main">${top}${body}</div>`;
        }
        if (out.after) out.after();
        const vol = document.getElementById('vol');
        if (vol) vol.addEventListener('input', () => { state.volume = +vol.value; document.getElementById('volv').textContent = vol.value + '%'; });
    }

    function rerender() {
        const sc = document.getElementById('scroll');
        const y = sc ? sc.scrollTop : 0;
        const f = document.querySelector('.irs-fields');
        const fy = f ? f.scrollTop : 0;
        render();
        const sc2 = document.getElementById('scroll');
        if (sc2) sc2.scrollTop = y;
        const f2 = document.querySelector('.irs-fields');
        if (f2) f2.scrollTop = fy;
    }

    // ------------------------------------------------------------ actions

    const ACTIONS = {
        setStatus: a => { state.status = a; toast(`Status set to ${a} · ${statusOf(a).label}`); rerender(); },
        attach: a => { state.attached[a] = true; toast(`${me.callsign} attached to ${a}`); rerender(); },
        incFilter: a => { state.incFilter = a; rerender(); },
        reportsTab: a => { state.reportsTab = a; rerender(); },
        mode: a => { state.mode = a; rerender(); },
        station: a => { state.stations[a] = !state.stations[a]; rerender(); },
        pushover: () => { state.pushover = !state.pushover; rerender(); },
        pushPage: a => { state.pushPages[a] = !state.pushPages[a]; rerender(); },
        replaceKey: a => { if (a === 'app') state.appToken = null; else state.userKey = null; rerender(); },
        removeKey: a => { if (a === 'app') state.appToken = null; else state.userKey = null; toast('Key removed from the server'); rerender(); },
        saveKey: a => {
            const el = document.getElementById('key-' + a);
            const val = (el && el.value || '').trim();
            if (!/^[A-Za-z0-9]{30}$/.test(val)) { toast('Pushover keys are 30 letters and numbers'); return; }
            if (a === 'app') state.appToken = val.slice(-4); else state.userKey = val.slice(-4);
            toast('Saved. The key is stored on the server only'); rerender();
        },
        pushTest: () => toast('Test sent to Pushover'),
        fmsChannel: a => toast(a === 'incident' ? 'Moved to the incident channel' : 'Moved to your car channel'),
        testAlert: () => showAlert(true),
        waypoint: a => toast(`Waypoint set: ${a}`),
        hydrant: a => {
            if (!phone) { location.hash = `#/risk/hydrants/${a}`; return; }
            document.getElementById('overlay').innerHTML = `<div class="sheet-bg" data-act="closeSheet"><div class="sheet" data-stop="1">${hydrantCard(M.hydrants.find(x => x.id === a))}</div></div>`;
        },
        closeSheet: () => { document.getElementById('overlay').innerHTML = ''; },
        closeOverlay: () => { state.defectForm = null; document.getElementById('overlay').innerHTML = ''; },
        defectForm: a => { state.defectForm = { hydrant: a, reason: null, note: '' }; drawDefectForm(); },
        defectReason: a => { const n = document.getElementById('defectNote'); state.defectForm.note = n ? n.value : ''; state.defectForm.reason = a; drawDefectForm(); },
        defectSubmit: () => {
            const f = state.defectForm;
            const n = document.getElementById('defectNote');
            f.note = n ? n.value.trim() : '';
            if (f.reason === 'Other' && !f.note) { toast('Add a few words about the defect'); return; }
            state.defects.push({ id: 'D-0' + (32 + state.defects.length), hydrant: f.hydrant, reason: f.reason, note: f.note, by: me.name, time: '14:02' });
            state.defectForm = null;
            document.getElementById('overlay').innerHTML = '';
            toast('Defect reported. Officers have been notified');
            rerender();
        },
        defectAccept: a => {
            const d = state.defects.find(x => x.hydrant === a);
            state.hydrantStatus[a] = { ok: false, note: `${d.reason}. ${d.note || ''} Reported ${d.time} by ${d.by}.` };
            state.defects = state.defects.filter(x => x.hydrant !== a);
            document.getElementById('overlay').innerHTML = '';
            toast(`${a} marked out of service`); rerender();
        },
        defectDismiss: a => { state.defects = state.defects.filter(x => x.hydrant !== a); document.getElementById('overlay').innerHTML = ''; toast('Report dismissed'); rerender(); },
        returnService: a => { state.hydrantStatus[a] = { ok: true, note: '' }; document.getElementById('overlay').innerHTML = ''; toast(`${a} returned to service`); rerender(); },
        kbTag: a => { state.kbTags[a] = !state.kbTags[a]; rerender(); },
        demoToast: () => toast('Waypoint set: 27 Holly Road'),
        pin: () => toast('Pinned to Knowledge home'),
        saveSite: () => { toast('Site saved'); history.back(); },
        ack: () => acknowledge(),
        closeAlert: () => { document.getElementById('overlay').innerHTML = ''; rerender(); },
        irsSet: (a, el) => { setAnswer(el, a); rerender(); },
        irsAdd: (a, el) => { const v = report(currentReportId()).values; (v._groups[el.dataset.g] = v._groups[el.dataset.g] || []).push({}); rerender(); },
        irsRemove: (a, el) => { report(currentReportId()).values._groups[el.dataset.g].splice(+a, 1); rerender(); },
        irsSave: () => { report(currentReportId()).saved = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); toast('Draft saved'); rerender(); },
        irsSubmit: () => { location.hash = '#/irs/sent/IRS-2026-0188'; },
        openPicker: (a, el) => openPicker(el),
        pickInto: a => { state.picker.path.push(+a); drawPicker(); },
        pickCrumb: a => { state.picker.path = state.picker.path.slice(0, +a); state.picker.search = ''; drawPicker(); },
        pickLeaf: a => {
            const p = state.picker;
            setAnswer({ dataset: p.g ? { q: p.q, g: p.g, i: p.i } : { q: p.q } }, a);
            state.picker = null; drawPicker(); rerender();
        },
        closePicker: () => { state.picker = null; drawPicker(); },
    };

    document.addEventListener('click', e => {
        const el = e.target.closest('[data-act]');
        if (!el) return;
        const stop = e.target.closest('[data-stop]');
        if (stop && !stop.contains(el)) return; // clicked inside a modal/sheet, not on its background
        const fn = ACTIONS[el.dataset.act];
        if (!fn) return;
        e.preventDefault();
        e.stopPropagation();
        fn(el.dataset.arg, el);
    });

    document.addEventListener('change', e => {
        const el = e.target.closest('[data-change]');
        if (el && ACTIONS[el.dataset.change]) ACTIONS[el.dataset.change](el.value, el);
    });

    // The preview harness (index.html) drives the app with postMessage.
    window.addEventListener('message', e => {
        const d = e.data || {};
        if (d.type === 'route') location.hash = d.route;
        if (d.type === 'turnout') showAlert(false);
    });

    window.addEventListener('hashchange', () => { document.getElementById('overlay').innerHTML = ''; render(); const sc = document.getElementById('scroll'); if (sc) sc.scrollTop = 0; });

    if (qs.get('frame')) {
        const bar = document.createElement('div');
        bar.className = 'lb-bar';
        bar.innerHTML = `<span>14:02</span><span class="icons">${icon('signal_cellular_alt')}${icon('wifi')}${icon('battery_full')}</span>`;
        document.body.appendChild(bar);
    }
    if (qs.get('fill')) {
        // Preview only: answer a few questions so the later sections show.
        const v = report('IRS-NEW').values;
        Object.assign(v, { '2.2': '2', '3.2': '1', '3.5': 'Yes', '3.6': 'Yes', '3.10': 'No', '5.15': '1', '8.19': 'No' });
        v._groups.victim = [{ '9.6': '2' }];
        IRS.applyDefaults(v);
    }
    render();
    if (qs.get('alert')) { for (let k = 0; k < +qs.get('alert'); k++) showAlert(false); }
    if (qs.get('scroll')) { const sc = document.getElementById('scroll'); if (sc) { sc.scrollTop = +qs.get('scroll'); sc.dispatchEvent(new Event('scroll')); } }
    if (qs.get('defect')) { state.defectForm = { hydrant: 'H-0142', reason: 'Valve seized', note: '' }; drawDefectForm(); }
    if (qs.get('picker')) { state.picker = { q: '3.2', g: null, i: null, path: [0], search: '' }; drawPicker(); }
})();

//<< Incendium Solutions >>
