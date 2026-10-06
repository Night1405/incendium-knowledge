// Sample data for the Incendium Respond design preview. In the resource this
// comes from the server (FMS through incendium_lib, saved SSRI/IRS data, the
// hydrant list and the GitHub knowledge library).

window.MOCK = (function () {
    // The brigade's FMS status codes (config in the resource).
    const statuses = [
        { code: '2', label: 'Available', tone: 'green' },
        { code: '4', label: 'Refreshments', tone: 'teal' },
        { code: '5', label: 'En route', tone: 'amber' },
        { code: '6', label: 'On scene', tone: 'red' },
        { code: '7', label: 'Committed', tone: 'orange' },
        { code: '11', label: 'Book off', tone: 'grey' },
    ];

    const ranks = {
        GCDR: 'Group Commander', SCDR: 'Station Commander', WCDR: 'Watch Commander',
        CCDR: 'Crew Commander', FF: 'Firefighter', FFD: 'Development Firefighter',
    };

    // Crews by callsign (callsigns as in the WMFS pack's tannoy voices).
    const crews = {
        A071: [
            { roll: '4127', rank: 'WCDR', name: 'WCDR A. Smith', quals: ['FF', 'DIM'] },
            { roll: '5390', rank: 'CCDR', name: 'CCDR J. Patel', quals: ['FF', 'HP'] },
            { roll: '6012', rank: 'FF', name: 'FF R. Hughes', quals: ['FF', 'FIPS'] },
            { roll: '6544', rank: 'FFD', name: 'FF(D) M. Clarke', quals: [] },
        ],
        A075: [
            { roll: '5021', rank: 'CCDR', name: 'CCDR S. Begum', quals: ['FF', 'TRU'] },
            { roll: '6230', rank: 'FF', name: 'FF L. Okafor', quals: ['FF', 'HP'] },
            { roll: '6301', rank: 'FF', name: 'FF D. Walsh', quals: ['FF'] },
        ],
        A077: [
            { roll: '4880', rank: 'CCDR', name: 'CCDR K. Evans', quals: ['FF', 'TRU', 'HP'] },
            { roll: '6118', rank: 'FF', name: 'FF T. Nowak', quals: ['FF', 'TRU'] },
        ],
        D021: [
            { roll: '3904', rank: 'SCDR', name: 'SCDR P. Grant', quals: ['FF', 'DIM'] },
            { roll: '6077', rank: 'FF', name: 'FF H. Ali', quals: ['FF'] },
            { roll: '6402', rank: 'FF', name: 'FF C. Reid', quals: ['FF', 'FIPS'] },
        ],
        E011: [
            { roll: '5512', rank: 'CCDR', name: 'CCDR N. Hart', quals: ['FF'] },
            { roll: '6620', rank: 'FFD', name: 'FF(D) B. Moore', quals: [] },
        ],
    };

    // Stations and callsigns as set up in Mobilising (labels from "A071 = Pump").
    const stations = [
        { name: 'Handsworth', callsigns: [
            { cs: 'A071', label: 'Pump Rescue Ladder', status: '2' },
            { cs: 'A075', label: 'Pump', status: '5' },
            { cs: 'A077', label: 'Brigade Response Vehicle', status: '2' },
        ] },
        { name: 'Brierley Hill', callsigns: [
            { cs: 'D021', label: 'Pump Rescue Ladder', status: '6' },
            { cs: 'D025', label: 'Pump', status: '11' },
        ] },
        { name: 'Highgate', callsigns: [
            { cs: 'E011', label: 'Pump Rescue Ladder', status: '2' },
            { cs: 'E015', label: 'Pump', status: '11' },
        ] },
    ];

    // Incidents as the FMS sends them: opening codes are the WMFS pack's incident types.
    const incidents = [
        {
            id: 'INC-1042', type: 'HFPR - House Fire Persons Reported', icon: 'fire', category: 'Fire',
            address: '27 Holly Road, Handsworth', station: 'Handsworth', called: '13:41', ago: '21 min',
            notes: 'Smoke issuing from first floor window. Caller reports one occupant unaccounted for.',
            units: [{ cs: 'A071', status: '6' }, { cs: 'A075', status: '5' }, { cs: 'D021', status: '6' }],
            mine: true,
            cad: { ref: '1042/061026', grading: 'Emergency', opening: 'HFPR - House Fire Persons Reported', channel: 'FIREOPS2', commsgroup: 'HANDSWORTH',
                log: [
                    { time: '13:41', by: 'Control', text: 'Call from neighbour, smoke from first floor window. One occupant possibly inside.' },
                    { time: '13:42', by: 'Control', text: 'A071, A075, D021 mobilised.' },
                    { time: '13:48', by: 'A071', text: 'In attendance. Two-storey terrace, 50% of first floor alight.' },
                    { time: '13:52', by: 'A071', text: 'Make pumps 3. Two BA committed, persons reported. One hose reel in use.' },
                ] },
        },
        {
            id: 'INC-1043', type: 'RTCPR - RTC Persons Reported', icon: 'car-burst', category: 'Special Service',
            address: 'A41 Soho Road, junction with Grove Lane', station: 'Handsworth', called: '13:55', ago: '7 min',
            notes: 'Two cars, one person trapped. Ambulance on scene.',
            units: [{ cs: 'A077', status: '5' }, { cs: 'E011', status: '5' }],
            mine: false,
            cad: { ref: '1043/061026', grading: 'Emergency', opening: 'RTCPR - RTC Persons Reported', channel: 'FIREOPS3', commsgroup: 'HANDSWORTH',
                log: [{ time: '13:55', by: 'Control', text: 'Ambulance on scene request FRS for extrication.' }, { time: '13:56', by: 'Control', text: 'A077, E011 mobilised.' }] },
        },
        {
            id: 'INC-1044', type: 'AFA - Alarms', icon: 'bell', category: 'False Alarm',
            address: 'Merry Hill Centre, Brierley Hill', station: 'Brierley Hill', called: '13:59', ago: '3 min',
            notes: 'Automatic fire alarm actuating, zone 4. Call challenged, keyholder en route.',
            units: [{ cs: 'D021', status: '5' }],
            mine: false,
            cad: { ref: '1044/061026', grading: 'Priority', opening: 'AFA - Alarms', channel: 'FIREOPS1', commsgroup: 'BRIERLEY HILL',
                log: [{ time: '13:59', by: 'Control', text: 'AFA actuating, call challenged, keyholder en route.' }] },
        },
    ];

    const turnouts = [
        { id: 'INC-1042', type: 'HFPR - House Fire Persons Reported', address: '27 Holly Road, Handsworth', time: '13:42', ack: true },
        { id: 'INC-1031', type: 'SSC - Special Service Call', address: '3 Wellington Road, Handsworth', time: '11:08', ack: true },
        { id: 'INC-1019', type: 'AFA - Alarms', address: 'City Hospital, Dudley Road', time: '08:51', ack: true },
    ];

    const poris = {
        1: 'Very low risk', 2: 'Low risk', 3: 'Moderate risk', 4: 'High risk', 5: 'Very high risk',
    };

    const ssri = [
        {
            id: 'S-001', name: 'Booth Street Chemical Works', address: 'Booth Street, Handsworth', level: 5,
            review: '12 Aug 2026', overdue: true,
            hazards: [
                { icon: 'flask', text: 'Chlorine store (2 x 1 tonne drums), north yard' },
                { icon: 'fire-flame-curved', text: 'Flammable solvents, building C' },
                { icon: 'bolt', text: '11 kV substation on site' },
            ],
            tactics: 'Approach from the south (upwind in prevailing wind). Do not use water on building C store. Site has a trained emergency response team; meet them at the gatehouse. Consider Hazmat officer and DIM on all turnouts.',
            water: [{ text: 'Private hydrant ring main, 150 mm, around buildings A-D' }, { text: 'Open water: canal, 200 m east (pump access via Lock Lane)' }],
            contacts: [{ name: 'Site emergency line (24h)', value: '0121 555 0190' }, { name: 'Duty manager', value: '0121 555 0191' }],
            images: 3,
        },
        {
            id: 'S-002', name: 'Holyhead Tower', address: 'Holyhead Road, Handsworth', level: 4,
            review: '01 Sep 2026', overdue: true,
            hazards: [{ icon: 'building', text: '18-storey residential, single staircase' }, { icon: 'wind', text: 'Stay put policy (compartmentation)' }],
            tactics: 'Dry riser inlet on west face. Fire-fighting lift serves all floors. Premises information box at main entrance.',
            water: [{ text: 'Hydrant H-0142, 30 m from dry riser inlet' }],
            contacts: [{ name: 'Building manager', value: '0121 555 0144' }],
            images: 2,
        },
        {
            id: 'S-003', name: 'City Hospital', address: 'Dudley Road, Birmingham', level: 4,
            review: '30 Nov 2026', overdue: false,
            hazards: [{ icon: 'bed', text: 'Dependent occupants, progressive horizontal evacuation' }, { icon: 'radiation', text: 'Radiology department, basement level -1' }, { icon: 'wind', text: 'Medical oxygen manifold, service yard' }],
            tactics: 'Rendezvous at main entrance with the site fire officer. Do not isolate oxygen without hospital agreement.',
            water: [{ text: 'Hydrants at entrances A and C' }],
            contacts: [{ name: 'Site fire officer', value: '0121 555 0100' }],
            images: 4,
        },
        {
            id: 'S-004', name: 'Pedmore Road Tyre Depot', address: 'Unit 9, Pedmore Road, Brierley Hill', level: 3,
            review: '15 Jan 2027', overdue: false,
            hazards: [{ icon: 'circle', text: 'Approx. 4,000 tyres stored externally' }],
            tactics: 'Large volumes of dense smoke. Consider early evacuation of the trading estate downwind.',
            water: [{ text: 'Hydrant H-0217 on estate road' }],
            contacts: [{ name: 'Keyholder', value: '07700 900 412' }],
            images: 1,
        },
        {
            id: 'S-005', name: 'Brierley Hill Library', address: 'High Street, Brierley Hill', level: 2,
            review: '20 Mar 2027', overdue: false,
            hazards: [{ icon: 'book', text: 'Archive store, first floor' }],
            tactics: 'Salvage priority for the archive store.',
            water: [{ text: 'Hydrant H-0150 opposite main entrance' }],
            contacts: [{ name: 'Keyholder', value: '0121 555 0177' }],
            images: 1,
        },
    ];

    // The fixed hydrant list (867, from References/hydrants.ts) has positions only.
    // The street name is read from the game for the nearest few; all start in service.
    const hydrants = [
        { id: 'H-0412', distance: 140, bearing: 35, street: 'Holly Road', ok: true },
        { id: 'H-0413', distance: 310, bearing: 120, street: 'Rookery Road', ok: true },
        { id: 'H-0398', distance: 455, bearing: 200, street: 'Rookery Road', ok: true },
        { id: 'H-0377', distance: 610, bearing: 285, street: 'Grove Lane', ok: true },
        { id: 'H-0170', distance: 790, bearing: 330, street: 'Soho Road', ok: true },
    ];

    // From the FMS patrol vehicles (getAllPatrolVehicles): vehicle type per callsign.
    const vehicles = {
        A071: { name: 'Pump Rescue Ladder' }, A075: { name: 'Pump' }, A077: { name: 'Brigade Response Vehicle' },
        D021: { name: 'Pump Rescue Ladder' }, E011: { name: 'Pump Rescue Ladder' },
    };

    const brigade = { name: 'West Midlands Fire Service', short: 'WMFS', logo: 'img/brand/WMFSLogo.svg', logoHorizontal: 'img/brand/WMFSLogo-horizontal-white.png' };

    const kb = {
        loaded: '06 Oct 2026 14:20',
        categories: [
            { name: 'Breathing Apparatus', icon: 'lungs', count: 9 },
            { name: 'Hazardous Materials', icon: 'biohazard', count: 7 },
            { name: 'Road Traffic Collisions', icon: 'car-burst', count: 6 },
            { name: 'Water Rescue', icon: 'water', count: 4 },
            { name: 'Incident Command', icon: 'sitemap', count: 8 },
            { name: 'Firefighting', icon: 'fire-extinguisher', count: 8 },
        ],
        articles: [
            { id: 'ba-entry-control', title: 'BA Entry Control', category: 'Breathing Apparatus', tags: ['BA', 'ECB', 'Safety'], updated: '02 Oct 2026', preview: 'Setting up entry control, Stage 1 and Stage 2 procedures and the ECO\'s responsibilities.', pinned: true },
            { id: 'hazmat-first', title: 'Hazmat: First Actions', category: 'Hazardous Materials', tags: ['Hazmat', 'DIM', 'UN number'], updated: '28 Sep 2026', preview: 'Step back, identify, cordon. Using the UN number, HIN and EAC on arrival.', pinned: true },
            { id: 'rtc-extrication', title: 'RTC Extrication Phases', category: 'Road Traffic Collisions', tags: ['RTC', 'Extrication', 'TRU'], updated: '19 Sep 2026', preview: 'Scene assessment, stabilisation, glass management, space creation and release.', pinned: false },
            { id: 'jesip-methane', title: 'METHANE Messages', category: 'Incident Command', tags: ['JESIP', 'Command', 'Radio'], updated: '11 Sep 2026', preview: 'Major incident declared, Exact location, Type, Hazards, Access, Number of casualties, Emergency services.', pinned: false },
            { id: 'high-rise', title: 'High-Rise Firefighting', category: 'Firefighting', tags: ['High rise', 'Dry riser', 'Command'], updated: '04 Sep 2026', preview: 'Bridgehead, riser use, fire survival guidance calls and evacuation strategy changes.', pinned: false },
        ],
        recent: ['rtc-extrication', 'jesip-methane', 'high-rise'],
        tags: ['BA', 'Hazmat', 'RTC', 'Command', 'Safety', 'JESIP', 'TRU', 'Water'],
        body: {
            'ba-entry-control': [
                '# BA Entry Control',
                '',
                'Entry control keeps track of every wearer committed to a risk area. It **must** be set up before anyone enters, and the Entry Control Operative (ECO) must not wear BA themselves. See also [Hazmat: First Actions](#/kb/article/hazmat-first).',
                '',
                '> [!CAUTION]',
                '> Never commit wearers without a working entry control board and an emergency team on standby at Stage 2.',
                '',
                '## Stages of entry control',
                '',
                '1. **Stage 1:** a single entry point, up to two BA teams, the ECO at the entry point.',
                '2. **Stage 2:** more than two teams or more than one entry point. An Entry Control Point with a dedicated ECO and an emergency team.',
                '3. **Stage 2 (multiple ECPs):** an overall BA sector commander coordinates every ECP.',
                '',
                '## ECO responsibilities',
                '',
                '- Record time of entry and calculate time of whistle.',
                '- Monitor telemetry and communications with each team.',
                '- Initiate emergency procedures when a wearer is overdue.',
                '',
                '### Typical durations',
                '',
                '| Cylinder | Working duration | Time to whistle |',
                '|---|---|---|',
                '| 6.8 L, 300 bar | 39 min | 29 min |',
                '| 9.0 L, 300 bar | 52 min | 42 min |',
                '',
                '![Entry control board set up at Stage 2](img/ecb-sample.svg)',
                '*Entry control board at a Stage 2 entry control point.*',
                '',
                '> [!WARNING]',
                '> Low-pressure warning whistles must be acted on immediately: the team withdraws together.',
                '',
                '> [!NOTE]',
                '> Telemetry is a support to entry control, never a replacement for it.',
                '',
                '> [!TIP]',
                '> Brief teams on their exit route before they go in, using the premises plan if one is available.',
            ].join('\n'),
        },
    };

    const reports = [
        { id: 'IRS-2026-0187', incident: 'INC-1031', type: 'SSC - Special Service Call', address: '3 Wellington Road, Handsworth', date: '06 Oct 2026', author: 'WCDR A. Smith', status: 'Draft', mine: true },
        { id: 'IRS-2026-0185', incident: 'INC-1019', type: 'AFA - Alarms', address: 'City Hospital, Dudley Road', date: '06 Oct 2026', author: 'WCDR A. Smith', status: 'Recorded', mine: true },
        { id: 'IRS-2026-0179', incident: 'INC-1007', type: 'CAR - Car Fire', address: 'Grove Lane car park, Handsworth', date: '05 Oct 2026', author: 'CCDR J. Patel', status: 'Recorded with queries', mine: false },
        { id: 'IRS-2026-0171', incident: 'INC-0994', type: 'HF - House Fire', address: '22 Delph Road, Brierley Hill', date: '04 Oct 2026', author: 'SCDR P. Grant', status: 'Recorded', mine: false },
    ];

    return {
        statuses, ranks, crews, stations, incidents, turnouts, poris, ssri, hydrants, kb, reports, vehicles, brigade,
        fms: { connected: true, players: 14, units: 7, comms: 'CENTRAL', version: '1.0.0', pack: 'incendium_pack_wmfs 1.1.0', kbLoaded: '06 Oct 2026 14:20', hydrants: 867, sites: 2 },
        me: {
            officer: { name: 'WCDR A. Smith', rank: 'WCDR', roll: '4127', callsign: 'A071', station: 'Handsworth', status: '2', quals: ['FF', 'DIM'] },
            firefighter: { name: 'FF R. Hughes', rank: 'FF', roll: '6012', callsign: 'A071', station: 'Handsworth', status: '2', quals: ['FF', 'FIPS'] },
        },
    };
})();

//<< Incendium Solutions >>
