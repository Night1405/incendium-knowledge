-- product: ../../../DevelopmentResources/incendium_phone
-- Who gets each app (server/main.lua): permission tier AND (on duty OR booked on).

STUB.side = 'server'
STUB.resource = 'incendium_phone'

function GetPlayers() return { '1', '2', '3', '4' } end
function SetTimeout(ms, fn) fn() end

-- The server's duty state bag, and its change handler.
local states = { [1] = { dutyStatus = true }, [2] = {}, [3] = {}, [4] = { dutyStatus = true } }
function Player(src) return { state = states[src] or {} } end
local bagHandler
function AddStateBagChangeHandler(key, bagFilter, fn) if key == 'dutyStatus' then bagHandler = fn end end
function GetPlayerFromStateBagName(name) return tonumber(name:match('player:(%d+)')) or 0 end

STUB.aces[1] = { ['incendium.phone.jesip'] = true }   -- allowed, on duty
STUB.aces[2] = { ['incendium.phone.jesip'] = true }   -- allowed, booked on, not on duty
STUB.aces[3] = { ['incendium.phone.jesip'] = true }   -- allowed, neither
STUB.aces[4] = {}                                     -- on duty but not allowed
STUB.fms = { players = { { source = 2, name = 'FF R. Hughes', callsign = 'E011' } } }

boot()
loadManifest('shared')
loadScript('server/main.lua')

local function answerFor(src)
    source = src
    STUB.events['incendium_phone:incendium:phone:access']()
    for i = #STUB.sentToClient, 1, -1 do
        local e = STUB.sentToClient[i]
        if e.name == 'incendium_phone:incendium:phone:access' and e.target == src then return e.args[1] end
    end
end

local function toldSince(before)
    local told = {}
    for i = before + 1, #STUB.sentToClient do
        local e = STUB.sentToClient[i]
        if e.name == 'incendium_phone:incendium:phone:access' then told[e.target] = e.args[1]['incendium-jesip'] end
    end
    return told
end

test('the permission tier AND (on duty OR booked on) decide; nobody else gets the app', function()
    eq(answerFor(1)['incendium-jesip'], true, 'allowed and on duty')
    eq(answerFor(2)['incendium-jesip'], true, 'allowed and booked on')
    eq(answerFor(3)['incendium-jesip'], false, 'allowed but neither on duty nor booked on')
    eq(answerFor(4)['incendium-jesip'], false, 'on duty but not allowed')
end)

test('going on duty shows the app at once, going off duty removes it', function()
    local before = #STUB.sentToClient
    states[3].dutyStatus = true
    bagHandler('player:3', 'dutyStatus', true)
    eq(toldSince(before)[3], true, 'on duty: app shown')
    before = #STUB.sentToClient
    states[3].dutyStatus = false
    bagHandler('player:3', 'dutyStatus', false)
    eq(toldSince(before)[3], false, 'off duty: app removed')
end)

test('the FMS is watched because an app uses "booked on"', function()
    eq(STUB.fmsWatching, true, 'watching')
end)

test('booking off on the FMS removes it; only players whose answer changed are told', function()
    STUB.fms.players[1].callsign = nil
    local before = #STUB.sentToClient
    TriggerEvent('incendium_lib:fms:changed')
    local told = toldSince(before)
    eq(told[2], false, 'player 2 booked off: app removed')
    eq(told[1], nil, 'player 1 unchanged (still on duty), not told')
end)

--<< Incendium Solutions >>
