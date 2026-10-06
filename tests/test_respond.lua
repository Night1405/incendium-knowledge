-- product: ../../../DevelopmentResources/incendium_phone
-- Incendium Respond, server side (server/respond.lua, server/turnouts.lua):
-- what the app is sent, settings, Pushover keys, status requests and turnouts.

STUB.side = 'server'
STUB.resource = 'incendium_phone'
STUB.states['lb-phone'] = 'started'
STUB.states['lb-tablet'] = 'started'
STUB.http = {}

function GetPlayers() return { '1', '2', '3', '4' } end
function SetTimeout(ms, fn) fn() end
function GetPlayerIdentifierByType(src) return 'license:abc' .. tostring(src) end
function PerformHttpRequest(url, cb, method, body, headers) table.insert(STUB.http, { url = url, cb = cb, body = body }) end

local states = { [1] = { dutyStatus = true }, [2] = { dutyStatus = true }, [3] = { dutyStatus = true }, [4] = {} }
function Player(src) return { state = states[src] or {} } end
function AddStateBagChangeHandler() end
function GetPlayerFromStateBagName() return 0 end

-- 1: officer on A071; 2: firefighter on A071; 3: officer at another station, not booked on; 4: officer off duty
STUB.aces[1] = { ['incendium.phone.respond'] = true, ['incendium.phone.officer'] = true }
STUB.aces[2] = { ['incendium.phone.respond'] = true }
STUB.aces[3] = { ['incendium.phone.respond'] = true, ['incendium.phone.officer'] = true }
STUB.aces[4] = { ['incendium.phone.respond'] = true, ['incendium.phone.officer'] = true }
STUB.fms = {
    players = {
        { source = 1, name = 'WCDR A. Smith', rank = 'WCDR', roll = '4127', callsign = 'A071', skills = { FF = true, TRU = true } },
        { source = 2, name = 'FF R. Hughes', rank = '', roll = '6012', callsign = 'A071', skills = { FF = true } },
    },
    units = { A071 = { callsign = 'A071', status = '2', statusText = 'Available', crew = {} } },
    incidents = {},
    comms = { [1] = { unit = 'HANDSWORTH' } },
}
STUB.hub.stations = {
    Handsworth = { code = 'A07', callsigns = { { cs = 'A071', label = 'Pump Rescue Ladder' }, { cs = 'A075', label = 'Pump' } } },
    ['Brierley Hill'] = { code = 'D02', callsigns = { { cs = 'D021', label = 'Pump Rescue Ladder' } } },
}

boot()
loadManifest('shared')
loadManifest('server')

local function call(name, src, data)
    local fn = STUB.callbacks['incendium_phone:incendium:phone:' .. name]
    assert(fn, 'no handler ' .. name)
    STUB.time = STUB.time + 10000   -- past every cooldown
    data = data or {}
    data._device = data._device or 'phone'
    return fn(src, data)
end

local function sentTo(name, target)
    local list = {}
    for _, e in ipairs(STUB.sentToClient) do
        if e.name == name and (target == nil or e.target == target) then list[#list + 1] = e end
    end
    return list
end

------------------------------------------------------------------------------

test('state: the player, their unit, crew and what they may use', function()
    local s = call('respond:state', 1)
    eq(s.me.name, 'A. Smith', 'name without the rank')
    eq(s.me.rank, 'Watch Commander', 'rank from the pack ranks')
    eq(s.me.insignia, 'nui://pack/images/ranks/WCDR.png', 'insignia')
    eq(s.me.callsign, 'A071', 'callsign')
    eq(s.me.station, 'Handsworth', 'station from Mobilising')
    eq(#s.me.quals, 2, 'qualification chips')
    eq(s.unit.status, '2', 'unit status')
    eq(#s.crew, 2, 'crew on the callsign')
    eq(s.crew[1].rank, 'Watch Commander', 'highest rank first')
    eq(s.comms.unit, 'HANDSWORTH', 'comms group')
    eq(s.sections.status, true, 'officer: status')
    eq(s.sections.turnouts, true, 'officer: turnouts')
    eq(s.stations[1], 'Brierley Hill', 'stations sorted')
    eq(s.statuses[1].code, '2', 'status buttons')
    eq(s.settings.mode, 'assigned', 'default mode')
end)

test('state: a firefighter has the app but no status or turnout sections', function()
    local s = call('respond:state', 2)
    eq(s.sections.status, false, 'no status')
    eq(s.sections.turnouts, false, 'no turnouts')
    eq(s.settings, nil, 'no settings sent')
end)

test('state: Status is a phone feature; on the tablet it is not offered', function()
    local s = call('respond:state', 1, { _device = 'tablet' })
    eq(s.sections.status, false, 'tablet: no status')
    eq(call('respond:setStatus', 1, { code = '5', _device = 'tablet' }), nil, 'tablet request refused')
end)

test('requests: refused for players without the app (off duty) or the tier', function()
    eq(call('respond:state', 4), nil, 'off duty: no app, no answer')
    eq(call('respond:setStatus', 2, { code = '5' }), nil, 'firefighter cannot set status')
end)

test('status, channel and attach go through the library with its checks', function()
    STUB.fmsSent = {}
    local r = call('respond:setStatus', 1, { code = '5' })
    eq(r.ok, true, 'status sent')
    eq(STUB.fmsSent[1].code, '5', 'code passed on')
    r = call('respond:setStatus', 1, { code = '99' })
    eq(r.error, 'bad_status', 'library refusal passed back')
    r = call('respond:channel', 1, { kind = 'incident' })
    eq(STUB.fmsSent[#STUB.fmsSent].kind, 'incident', 'incident channel')
    call('respond:channel', 1, { kind = 'anything' })
    eq(STUB.fmsSent[#STUB.fmsSent].kind, 'car', 'anything else = car')
    r = call('respond:attach', 1, { ref = 'CAD5' })
    eq(r.ok, true, 'attached')
    STUB.fms.attachError = 'fms_timeout'
    r = call('respond:attach', 1, { ref = 'CAD5' })
    eq(r.error, 'fms_timeout', 'timeout passed back')
    STUB.fms.attachError = nil
end)

test('settings: checked and saved per player; unknown stations dropped', function()
    local r = call('respond:settings', 1, { mode = 'station', stations = { 'Handsworth', 'Atlantis' }, volume = 3 })
    eq(r.settings.mode, 'station', 'mode')
    eq(#r.settings.stations, 1, 'unknown station dropped')
    eq(r.settings.volume, 1, 'volume clamped')
    eq(call('respond:settings', 1, { mode = 'everything' }).settings.mode, 'station', 'bad mode ignored')
    local saved = json.decode(LoadResourceFile('incendium_phone', 'data/respond_players.json'))
    eq(saved['license:abc1'].mode, 'station', 'saved by licence')
end)

test('pushover: keys checked, kept in server KVP only, never sent back', function()
    local key = 'abcdefghijklmnopqrstuvwxyz1234'
    eq(call('respond:pushover', 1, { action = 'key', which = 'app', value = 'short' }).error, 'bad_key', 'bad key refused')
    eq(call('respond:pushover', 1, { action = 'on', value = true }).error, 'no_keys', 'cannot switch on without keys')
    local r = call('respond:pushover', 1, { action = 'key', which = 'app', value = key })
    eq(r.settings.push.appHint, '1234', 'only the last 4 characters')
    call('respond:pushover', 1, { action = 'key', which = 'user', value = 'zyxwvutsrqponmlkjihgfedcba9876' })
    r = call('respond:pushover', 1, { action = 'on', value = true })
    eq(r.settings.push.on, true, 'switched on with both keys')
    local everything = json.encode(r) .. json.encode(call('respond:state', 1))
        .. (LoadResourceFile('incendium_phone', 'data/respond_players.json') or '')
    eq(everything:find(key, 1, true), nil, 'the key is in no answer and no file')
    eq(STUB.kvp['respond:pushover:app:license:abc1'], key, 'kept in server KVP')
    call('respond:pushover', 1, { action = 'test' })
    local req = STUB.http[#STUB.http]
    truthy(req.url:find('api.pushover.net', 1, true), 'sent to Pushover')
    truthy(req.body:find(key, 1, true), 'with the player\'s own token')
end)

test('turnouts: assigned officers alerted once per incident, from Mobilising and the FMS', function()
    call('respond:settings', 1, { mode = 'assigned' })
    STUB.sentToClient = {}
    STUB.http = {}
    TriggerEvent('incendium:turnout', { ref = 'CAD1', station = 'Handsworth', callsigns = { 'A071' }, code = 'HFPR',
        label = 'House Fire Persons Reported', address = '27 Holly Road', text = 'Persons reported', origin = 'fms' }, 'incendium_mobilising')
    for _, fn in ipairs(STUB.handlers['incendium_lib:fms:incident'] or {}) do
        fn({ ref = 'CAD1', code = 'HFPR', opening = 'HFPR - House Fire Persons Reported', address = '27 Holly Road',
             units = { 'A071' }, grading = 'Emergency', channel = 'FIREOPS2', description = '' })
    end
    local alerts = sentTo('incendium_phone:client:turnout')
    eq(#alerts, 1, 'one alert in total')
    eq(alerts[1].target, 1, 'to the officer on A071 (not the firefighter, not the officer elsewhere)')
    eq(alerts[1].args[1].title, 'HFPR - House Fire Persons Reported', 'title')
    eq(alerts[1].args[1].reason, 'assigned', 'reason')
    local q = call('respond:state', 1).queue
    eq(#q, 1, 'queued')
    eq(q[1].grading, 'Emergency', 'second report filled in the grading')
    truthy(STUB.http[1] and STUB.http[1].body:find('TURNOUT', 1, true), 'Pushover copy sent (switched on)')
end)

test('turnouts: station mode, off mode, and a repeat within the time is not alerted again', function()
    call('respond:settings', 3, { mode = 'station', stations = { 'Brierley Hill' } })
    STUB.sentToClient = {}
    TriggerEvent('incendium:turnout', { ref = 'M100', station = 'Brierley Hill', callsigns = { 'D021' }, code = 'AFA', label = 'Alarms', address = 'Merry Hill' }, 'incendium_mobilising')
    eq(#sentTo('incendium_phone:client:turnout', 3), 1, 'station mode: alerted')
    call('respond:ack', 3, { ref = 'M100' })
    TriggerEvent('incendium:turnout', { ref = 'M100', station = 'Brierley Hill', callsigns = { 'D021' }, code = 'AFA', label = 'Alarms', address = 'Merry Hill' }, 'incendium_mobilising')
    eq(#sentTo('incendium_phone:client:turnout', 3), 1, 'same incident again soon: not alerted')
    -- FMS turnout with no station: found from the callsign
    for _, fn in ipairs(STUB.handlers['incendium_lib:fms:incident'] or {}) do
        fn({ ref = 'CAD2', code = 'RTC', opening = 'RTC', address = 'A41', units = { 'D021' }, description = '' })
    end
    eq(#sentTo('incendium_phone:client:turnout', 3), 2, 'station found from the callsign')
    call('respond:settings', 3, { mode = 'off' })
    TriggerEvent('incendium:turnout', { ref = 'M101', station = 'Brierley Hill', callsigns = { 'D021' }, code = 'FI', label = 'Fire', address = 'x' }, 'incendium_mobilising')
    eq(#sentTo('incendium_phone:client:turnout', 3), 2, 'off: nothing')
end)

test('acknowledge: removes it from the queue; the game is told when nothing waits', function()
    STUB.sentToClient = {}
    local r = call('respond:ack', 1, { ref = 'CAD1' })
    eq(r.ok, true, 'acknowledged')
    eq(#r.queue, 0, 'queue empty')
    local told = sentTo('incendium_phone:client:queue', 1)
    eq(told[#told].args[1], 0, 'tone stops')
    eq(call('respond:ack', 1, { ref = 'CAD1' }).ok, false, 'twice: nothing to acknowledge')
end)

test('test alert: only for the player, never to Pushover', function()
    STUB.sentToClient = {}
    STUB.http = {}
    call('respond:testAlert', 1)
    local alerts = sentTo('incendium_phone:client:turnout')
    eq(#alerts, 1, 'one alert')
    eq(alerts[1].target, 1, 'to that player')
    eq(alerts[1].args[1].test, true, 'marked as a test')
    eq(#STUB.http, 0, 'no Pushover')
end)

test('overview: crewing by station with vehicle types; callsigns no station lists go under Other', function()
    STUB.fms.players[3] = { source = 3, name = 'CCDR S. Begum', rank = 'CCDR', roll = '5021', callsign = 'Z999', skills = { FF = true } }
    STUB.fms.vehicles = { A071 = 'Pump Rescue Ladder' }
    local r = call('respond:overview', 2)
    truthy(r, 'firefighters may see the overview (tier respond)')
    eq(r.stations[1].name, 'Handsworth', 'your own station first')
    local a071 = r.stations[1].callsigns[1]
    eq(a071.cs, 'A071', 'crewed callsign')
    eq(a071.vehicle, 'Pump Rescue Ladder', 'vehicle type')
    eq(#a071.crew, 2, 'crew')
    eq(a071.crew[1].rank, 'Watch Commander', 'highest rank first')
    eq(#r.stations[2].callsigns, 0, 'Brierley Hill: nobody crewed')
    eq(r.stations[#r.stations].name, 'Other callsigns', 'unlisted callsign last')
    eq(r.stations[#r.stations].callsigns[1].cs, 'Z999', 'under Other')
    STUB.fms.players[3] = nil
end)

test('overview: incidents in progress, and one incident with its CAD log newest first', function()
    STUB.fms.incidents = { { ref = 'CAD8', code = 'HFPR', opening = 'HFPR - House Fire', category = 'Fire', description = 'Smoke',
        address = '1 High St', grading = 'Emergency', channel = 'FIREOPS2', units = { 'A071' }, created = '2026-10-06 13:41:00',
        comments = { { text = 'First', by = 'Control', created = '2026-10-06 13:41:00' }, { text = 'Second', by = 'A071', created = '2026-10-06 13:48:00' } } } }
    local r = call('respond:overview', 1)
    eq(#r.incidents, 1, 'listed')
    eq(r.incidents[1].mine, true, 'your callsign is on it')
    eq(r.incidents[1].units[1].station, 'Handsworth', 'unit station')
    local d = call('respond:incident', 1, { ref = 'CAD8' })
    eq(d.ok, true, 'detail')
    eq(d.log[1].text, 'Second', 'newest first')
    eq(call('respond:incident', 1, { ref = 'GONE' }).error, 'unknown_incident', 'closed incident')
    eq(call('respond:overview', 1, { _device = 'tablet' }) ~= nil, true, 'overview on the tablet too')
    STUB.fms.incidents = {}
end)

test('open apps are told to refresh when the FMS changes', function()
    STUB.sentToClient = {}
    TriggerEvent('incendium_lib:fms:changed')
    local told = sentTo('incendium_phone:client:respond')
    truthy(#told >= 1, 'refresh sent')
    for _, e in ipairs(told) do truthy(e.target ~= 4, 'not to players without the app') end
end)

--<< Incendium Solutions >>
