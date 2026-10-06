-- product: ../../../DevelopmentResources/incendium_phone
-- Incendium Respond IRS (server/irs_rules.lua, server/irs.lua). The valid
-- answer sets below were made by the app's own form engine (apps/respond/irs.js):
-- the server's Lua rules must agree with it.

STUB.side = 'server'
STUB.resource = 'incendium_phone'
STUB.states['lb-phone'] = 'started'
STUB.states['lb-tablet'] = 'started'

function GetPlayers() return { '1', '2', '3' } end
function SetTimeout(ms, fn) fn() end
function GetPlayerIdentifierByType(src) return 'license:irs' .. tostring(src) end
local states = { [1] = { dutyStatus = true }, [2] = { dutyStatus = true }, [3] = { dutyStatus = true } }
function Player(src) return { state = states[src] or {} } end
function AddStateBagChangeHandler() end
function GetPlayerFromStateBagName() return 0 end
function PerformHttpRequest() end

STUB.aces[1] = { ['incendium.phone.respond'] = true, ['incendium.phone.officer'] = true }
STUB.aces[2] = { ['incendium.phone.respond'] = true, ['incendium.phone.officer'] = true }
STUB.aces[3] = { ['incendium.phone.respond'] = true }
STUB.fms = {
    players = { { source = 1, name = 'A. Smith', roll = '4127', callsign = 'A071' }, { source = 4, name = 'J. Patel', callsign = 'A071' } },
    incidents = { { ref = '1042/061026', code = 'HFPR', opening = 'HFPR - House Fire', address = '27 Holly Road, Handsworth, Birmingham',
                    created = '2026-10-06 13:41:00', units = { 'A071' } } },
}
STUB.hub.stations = { Handsworth = { callsigns = { { cs = 'A071', label = 'Pump Rescue Ladder' } } } }

boot()
loadManifest('shared')
loadManifest('server')

-- The library's appliance times for this incident.
STUB.exports.incendium_lib.fmsTimeline = function(ref)
    if ref ~= '1042/061026' then return nil end
    local t = os.time({ year = 2026, month = 10, day = 6, hour = 13, min = 42 })
    return { A071 = { attached = t, statuses = { { code = '5', at = t + 60 }, { code = '6', at = t + 360 }, { code = '2', at = t + 3600 } } } }
end

local function call(name, src, data)
    local fn = STUB.callbacks['incendium_phone:incendium:phone:' .. name]
    assert(fn, 'no handler ' .. name)
    STUB.time = STUB.time + 60000
    data = data or {}
    data._device = data._device or 'tablet'
    return fn(src, data)
end

local VALID = {
    Fire = json.decode([==[{"_groups": {"alarm": [], "vehicle": [{"6.2": "ATL", "6.3": "Test", "6.4": "1", "6.5": "Yes", "6.8": "2026-10-06T13:41", "6.9": "2026-10-06T13:41", "6.10": "HomeStation"}], "equipment": [], "manual": [], "facility": [], "safety": [], "victim": []}, "1.1": "1042/061026", "1.3": "Handsworth", "1.4": "WCDR A. Smith (4127)", "3.1": "Fire", "1.2": "FM", "1.5": "No", "2.4": "No", "5.18": "No", "6.1": "0", "6.15": "Yes", "2.1": "2026-10-06T13:41", "2.2": "1", "2.3": "1", "2.5": "2026-10-06T13:41", "2.6": "2026-10-06T13:41", "3.2": "1", "3.5": "Yes", "3.6": "Yes", "3.7": "1", "3.8": "Yes", "3.10": "Yes", "3.11": "1", "3.12": "1", "3.13": "1", "4.1": "Yes", "4.2": {"a": "27", "d": "Holly Road", "e": "Handsworth"}, "4.3a/b": {"x": "1", "y": "2"}, "5.1": "Yes", "5.2": "1", "5.3": "1", "5.4": "1", "5.5": "Yes", "5.6": "1", "5.7": "1", "5.8": "Yes", "5.13": "Yes", "5.14": "1", "5.15": "1", "7.1": "1", "7.2": "1", "7.3": "1", "7.4": "Yes", "7.7": "Yes", "7.11": "Yes", "8.1": "1", "8.3": "1", "8.4": "1", "8.5": "1", "8.6": "1", "8.7": "1", "8.8": "1", "8.9": "1", "8.10": "Yes", "8.11": "2", "8.12": "2", "8.13": "1", "8.14": "1", "8.15": "1", "8.16": "1", "8.17": "Yes", "8.18": "10", "8.19": "Yes", "8.25": "0", "8.28": "1", "8.29": "1", "8.30": "-999", "9.1": "1", "9.2": "1", "9.4": "2", "9.5": "Test"}]==]),
    SpecialService = json.decode([==[{"_groups": {"extrication": [], "vehicle": [{"6.2": "ATL", "6.3": "Test", "6.4": "1", "6.5": "Yes", "6.8": "2026-10-06T13:41", "6.9": "2026-10-06T13:41", "6.10": "HomeStation"}], "equipment": [], "victim": []}, "1.1": "1042/061026", "1.3": "Handsworth", "1.4": "WCDR A. Smith (4127)", "3.1": "SpecialService", "1.2": "FM", "1.5": "No", "5.18": "No", "6.1": "0", "6.15": "Yes", "2.1": "2026-10-06T13:41", "2.2": "1", "2.3": "1", "2.5": "2026-10-06T13:41", "2.6": "2026-10-06T13:41", "3.2": "1", "3.3": "1", "3.5": "Yes", "3.6": "Yes", "3.10": "Yes", "3.11": "1", "3.12": "1", "3.13": "1", "4.1": "Yes", "4.2": {"a": "27", "d": "Holly Road", "e": "Handsworth"}, "4.3a/b": {"x": "1", "y": "2"}, "5.22": "Yes", "5.26": "Yes", "9.1": "1", "9.2": "1", "9.3": "1"}]==]),
    FalseAlarm = json.decode([==[{"_groups": {"vehicle": [{"6.2": "ATL", "6.3": "Test", "6.4": "1", "6.5": "Yes", "6.8": "2026-10-06T13:41", "6.9": "2026-10-06T13:41", "6.10": "HomeStation"}]}, "1.1": "1042/061026", "1.3": "Handsworth", "1.4": "WCDR A. Smith (4127)", "3.1": "FalseAlarm", "1.2": "FM", "1.5": "No", "6.1": "0", "6.15": "No", "2.1": "2026-10-06T13:41", "2.2": "1", "2.3": "1", "2.5": "2026-10-06T13:41", "2.6": "2026-10-06T13:41", "3.2": "1", "3.4": "10", "3.5": "Yes", "3.6": "Yes", "3.10": "Yes", "3.11": "1", "3.12": "1", "3.13": "1", "4.1": "Yes", "4.2": {"a": "27", "d": "Holly Road", "e": "Handsworth"}, "4.3a/b": {"x": "1", "y": "2"}}]==]),
}

------------------------------------------------------------------------------

test('rules: the app engine\'s valid reports are valid on the server too', function()
    for category, values in pairs(VALID) do
        local errors = IrsRules.errors(IrsRules.clean(values))
        local text = {}
        for _, e in ipairs(errors) do text[#text + 1] = e.text end
        eq(#errors, 0, category .. ': ' .. table.concat(text, ' | '))
    end
end)

test('rules: a missing required answer, or an answer not in the list, is caught', function()
    local v = IrsRules.clean(VALID.Fire)
    v['2.2'] = nil
    local errors = IrsRules.errors(v)
    truthy(#errors > 0 and errors[1].text:find('2.2', 1, true), 'missing 2.2 reported')
    local cleaned = IrsRules.clean({ ['2.2'] = 'NOT-A-CODE', ['1.1'] = string.rep('x', 300), ['9.99'] = 'unknown', ['2.1'] = 'yesterday',
        _groups = { vehicle = { { ['6.3'] = 'A071', ['6.4'] = '999' } }, nope = { { a = 1 } } } })
    eq(cleaned['2.2'], nil, 'unknown code dropped')
    eq(#cleaned['1.1'], 50, 'text cut to its length')
    eq(cleaned['9.99'], nil, 'unknown question dropped')
    eq(cleaned['2.1'], nil, 'bad date dropped')
    eq(cleaned._groups.vehicle[1]['6.4'], nil, 'number out of range dropped')
    eq(cleaned._groups.nope, nil, 'unknown group dropped')
end)

test('a new report from a live incident is filled in from the FMS', function()
    local r = call('respond:irsNew', 1, { ref = '1042/061026' })
    eq(r.ok, true, 'created')
    local d = call('respond:irsGet', 1, { id = r.id })
    eq(d.status, 'Draft', 'draft')
    eq(d.values['1.1'], '1042/061026', 'incident number')
    eq(d.values['1.2'], 'FM', 'FRS code from config')
    eq(d.values['1.3'], 'Handsworth', 'station')
    eq(d.values['1.4'], 'A. Smith (4127)', 'officer and roll number')
    eq(d.values['2.1'], '2026-10-06T13:41', 'time of call from the CAD')
    eq(d.values['4.2'].a, '27', 'building number')
    eq(d.values['4.2'].d, 'Holly Road', 'street')
    local row = d.values._groups.vehicle[1]
    eq(row['6.3'], 'A071', 'appliance')
    eq(row['6.4'], '2', 'crew count')
    eq(row['6.6'], '2026-10-06T13:42', 'mobilised (attached)')
    eq(row['6.7'], '2026-10-06T13:43', 'mobile (status 5)')
    eq(row['6.8'], '2026-10-06T13:48', 'arrived (status 6)')
    eq(row['6.9'], '2026-10-06T14:42', 'available after arriving (status 2)')
    _G.DRAFT = r.id
end)

test('drafts are private, cleaned on save, and an incomplete report is not recorded', function()
    eq(call('respond:irsGet', 2, { id = DRAFT }).ok, false, 'another officer cannot open my draft')
    eq(call('respond:irsSave', 2, { id = DRAFT, values = {} }).ok, false, 'or save it')
    eq(call('respond:irsNew', 3, {}), nil, 'firefighters cannot write reports')
    local saved = call('respond:irsSave', 1, { id = DRAFT, values = { ['1.1'] = '1042/061026', ['2.2'] = 'junk' } })
    eq(saved.ok, true, 'saved')
    eq(call('respond:irsGet', 1, { id = DRAFT }).values['2.2'], nil, 'junk not kept')
    local r = call('respond:irsSubmit', 1, { id = DRAFT, values = { ['1.1'] = '1042/061026' } })
    eq(r.error, 'incomplete', 'incomplete refused')
    truthy(#r.errors > 0, 'with the list of what is missing')
    eq(LoadResourceFile('incendium_phone', 'data/irs_index.json'), nil, 'nothing recorded')
end)

test('a complete report is recorded with a number; the draft is gone', function()
    local r = call('respond:irsSubmit', 1, { id = DRAFT, values = VALID.Fire })
    eq(r.ok, true, 'recorded: ' .. json.encode(r.errors or {}))
    eq(r.id, 'IRS-' .. os.date('%Y') .. '-0001', 'numbered')
    eq(call('respond:irsGet', 1, { id = DRAFT }).ok, false, 'draft gone')
    local rec = call('respond:irsGet', 1, { id = r.id })
    eq(rec.status, 'Recorded', 'recorded')
    local list = call('respond:irsList', 1)
    eq(list.reports[1].id, r.id, 'in my list')
    eq(list.reports[1].owner, nil, 'no licences sent to the app')
    eq(#call('respond:irsList', 2).reports, 1, 'officers see all recorded reports (IrsAll)')
    truthy(LoadResourceFile('incendium_phone', 'data/irs.' .. r.id .. '.json'), 'kept in data/')
end)

--<< Incendium Solutions >>
