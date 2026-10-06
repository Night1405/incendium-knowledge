-- product: ../../../DevelopmentResources/incendium_phone
-- Incendium Respond risk information (server/risk.lua): hydrant defects and
-- officer review (memory only), SSRI / PORIS sites (data/ssri.json).

STUB.side = 'server'
STUB.resource = 'incendium_phone'
STUB.states['lb-phone'] = 'started'
STUB.states['lb-tablet'] = 'started'

function GetPlayers() return { '1', '2' } end
function SetTimeout(ms, fn) fn() end
function GetPlayerIdentifierByType(src) return 'license:risk' .. tostring(src) end
local states = { [1] = { dutyStatus = true }, [2] = { dutyStatus = true } }
function Player(src) return { state = states[src] or {} } end
function AddStateBagChangeHandler() end
function GetPlayerFromStateBagName() return 0 end
function PerformHttpRequest() end

-- H-0001 is at (-70.28, -1093.46). Player 2 stands next to it; player 1 far away.
local positions = { [1] = vector3(2000.0, 2000.0, 30.0), [2] = vector3(-75.0, -1090.0, 29.0) }
function GetPlayerPed(src) return src end
function GetEntityCoords(ped) return positions[ped] end

STUB.aces[1] = { ['incendium.phone.respond'] = true, ['incendium.phone.officer'] = true }   -- officer
STUB.aces[2] = { ['incendium.phone.respond'] = true }                                    -- firefighter
STUB.fms = { players = { { source = 2, name = 'FF L. Okafor', callsign = 'A071' } } }

boot()
loadManifest('shared')
loadManifest('server')

local function call(name, src, data)
    local fn = STUB.callbacks['incendium_phone:incendium:phone:' .. name]
    assert(fn, 'no handler ' .. name)
    STUB.time = STUB.time + 60000
    data = data or {}
    data._device = data._device or 'phone'
    return fn(src, data)
end

------------------------------------------------------------------------------

test('hydrant defect: only from beside the hydrant, with a listed reason', function()
    eq(call('respond:hydrantDefect', 1, { id = 'H-0001', reason = 'Obstructed' }).error, 'too_far', 'far away: refused')
    eq(call('respond:hydrantDefect', 2, { id = 'H-9999', reason = 'Obstructed' }).error, 'unknown_hydrant', 'unknown hydrant')
    eq(call('respond:hydrantDefect', 2, { id = 'H-0001', reason = 'Exploded' }).error, 'bad_reason', 'unlisted reason')
    eq(call('respond:hydrantDefect', 2, { id = 'H-0001', reason = 'Other' }).error, 'need_note', 'Other needs a note')
    eq(call('respond:hydrantDefect', 2, { id = 'H-0001', reason = 'Obstructed', note = 'Car on the cover' }).ok, true, 'reported')
    eq(call('respond:hydrantDefect', 2, { id = 'H-0001', reason = 'Damaged' }).error, 'already_reported', 'one report at a time')
end)

test('reports: officers see who and what; firefighters only that one exists', function()
    local officer = call('respond:hydrants', 1)
    eq(officer.review, true, 'officer reviews')
    eq(officer.reports[1].by, 'FF L. Okafor', 'reporter shown to officers')
    eq(officer.reports[1].note, 'Car on the cover', 'note')
    local ff = call('respond:hydrants', 2)
    eq(ff.review, false, 'firefighter does not review')
    eq(ff.reports[1].hydrant, 'H-0001', 'hydrant marked')
    eq(ff.reports[1].by, nil, 'no reporter details')
end)

test('review: only officers; out of service, then back in service', function()
    eq(call('respond:hydrantReview', 2, { id = 'H-0001', action = 'out' }), nil, 'firefighter refused')
    eq(call('respond:hydrantReview', 1, { id = 'H-0001', action = 'out' }).ok, true, 'marked out of service')
    local h = call('respond:hydrants', 2)
    eq(h.out['H-0001'].reason, 'Obstructed', 'out of service with the reported reason')
    eq(#h.reports, 0, 'report cleared')
    call('respond:hydrantReview', 1, { id = 'H-0001', action = 'return' })
    eq(call('respond:hydrants', 2).out['H-0001'], nil, 'back in service')
    eq(LoadResourceFile('incendium_phone', 'data/hydrants.json'), nil, 'statuses are never saved')
end)

test('SSRI: starter sites on first start; only officers may edit', function()
    local r = call('respond:ssri', 2)
    eq(#r.sites, 2, 'starter sites')
    eq(r.edit, false, 'firefighter cannot edit')
    eq(call('respond:ssri', 1).edit, true, 'officer can edit')
    eq(call('respond:ssriSave', 2, { name = 'X', address = 'Y', poris = 3 }), nil, 'firefighter refused')
end)

test('SSRI: a new site is checked; "use my position" takes the server\'s own position', function()
    eq(call('respond:ssriSave', 1, { name = '', address = 'Y', poris = 3 }).error, 'need_name', 'name needed')
    eq(call('respond:ssriSave', 1, { name = 'X', address = 'Y', poris = 9 }).error, 'bad_poris', 'PORIS 1 to 5')
    local r = call('respond:ssriSave', 1, { name = 'Booth Street Works', address = 'Booth Street', poris = 4, here = true,
        hazards = { 'Acetylene cylinders', '' }, contacts = { { name = 'Keyholder', value = '0121' }, { name = 'x' } },
        images = { 'https://cdn.example.com/a.jpg', 'javascript:alert(1)', 'http://plain.example.com/b.jpg' }, review = 'soon' })
    eq(r.ok, true, 'saved')
    eq(r.id, 'S-003', 'next id')
    local site
    for _, s in ipairs(call('respond:ssri', 1).sites) do if s.id == 'S-003' then site = s end end
    eq(site.position.x, 2000, 'position from the server')
    eq(#site.hazards, 1, 'empty hazard dropped')
    eq(#site.contacts, 1, 'half-filled contact dropped')
    eq(#site.images, 1, 'only https links kept')
    eq(site.review, '', 'bad date dropped')
    eq(site.updatedBy, 'Player 1', 'who updated it')
    local saved = json.decode(LoadResourceFile('incendium_phone', 'data/ssri.json'))
    eq(#saved.sites, 3, 'saved to data/ssri.json')
end)

test('SSRI: edit keeps the position; delete removes the site', function()
    local r = call('respond:ssriSave', 1, { id = 'S-003', name = 'Booth Street Works', address = 'Booth Street', poris = 5 })
    eq(r.ok, true, 'edited')
    local site
    for _, s in ipairs(call('respond:ssri', 1).sites) do if s.id == 'S-003' then site = s end end
    eq(site.poris, 5, 'new level')
    eq(site.position.x, 2000, 'position kept')
    eq(call('respond:ssriDelete', 1, { id = 'S-003' }).ok, true, 'deleted')
    eq(#call('respond:ssri', 1).sites, 2, 'gone')
    eq(call('respond:ssriSave', 1, { id = 'S-404', name = 'a', address = 'b', poris = 1 }).error, 'unknown_site', 'unknown site')
end)

--<< Incendium Solutions >>
