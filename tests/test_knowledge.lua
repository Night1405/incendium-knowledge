-- product: ../../../DevelopmentResources/incendium_phone
-- Incendium Respond knowledge base (server/knowledge.lua): read from GitHub only
-- at start and on a staff reload, checked, kept as a last good copy.

STUB.side = 'server'
STUB.resource = 'incendium_phone'
STUB.states['lb-phone'] = 'started'

function GetPlayers() return { '1', '2' } end
function SetTimeout(ms, fn) fn() end
function GetPlayerIdentifierByType(src) return 'license:kb' .. tostring(src) end
local states = { [1] = { dutyStatus = true }, [2] = { dutyStatus = true } }
function Player(src) return { state = states[src] or {} } end
function AddStateBagChangeHandler() end
function GetPlayerFromStateBagName() return 0 end

-- A stand-in GitHub: answers at once from this table (path -> body; missing = 404).
local BASE = 'https://raw.githubusercontent.com/Night1405/incendium-knowledge/main/'
local files, requests = {}, {}
function PerformHttpRequest(url, cb)
    requests[#requests + 1] = url
    local path = url:sub(#BASE + 1):gsub('%?t=%d+$', '')
    if url:sub(1, #BASE) == BASE and files[path] then cb(200, files[path], {}) else cb(404, '', {}) end
end

files['library.json'] = json.encode({
    version = 1,
    categories = { { id = 'ba', name = 'Breathing Apparatus' } },
    articles = {
        { id = 'ba-entry-control', title = 'BA Entry Control', category = 'ba', tags = { 'BA' }, file = 'articles/ba-entry-control.md', updated = '2026-10-06', pinned = true },
        { id = 'Bad Id', title = 'x', category = 'ba', file = 'articles/x.md' },
        { id = 'missing-file', title = 'Missing', category = 'ba', file = 'articles/missing-file.md' },
        { id = 'wrong-cat', title = 'Wrong', category = 'nope', file = 'articles/wrong-cat.md' },
    },
})
files['articles/ba-entry-control.md'] = '# BA Entry Control\n\nEntry control keeps track of every wearer.\n\n![Board](../images/board.svg)\n*Board.*\n'

STUB.aces[1] = { ['incendium.phone.respond'] = true, ['incendium.phone.admin'] = true }
STUB.aces[2] = { ['incendium.phone.respond'] = true }
STUB.fms = { players = {} }

boot()
loadManifest('shared')
loadManifest('server')

local function call(name, src, data)
    local fn = STUB.callbacks['incendium_phone:incendium:phone:' .. name]
    STUB.time = STUB.time + 10000
    data = data or {}
    data._device = 'phone'
    return fn(src, data)
end

local function reload(src)
    STUB.time = STUB.time + 60000
    source = src
    STUB.events['incendium_phone:server:reloadKnowledge']()
    source = nil
end

------------------------------------------------------------------------------

test('nothing is fetched until start-up runs, and never on a timer', function()
    eq(#requests, 0, 'no request while loading the scripts')
    eq(call('respond:kb', 2).loaded, false, 'not loaded yet')
end)

test('start-up loads the library; bad entries reported, good ones kept', function()
    runThreads(1)
    local kb = call('respond:kb', 2)
    eq(kb.loaded, true, 'loaded')
    eq(#kb.articles, 1, 'only the good article')
    eq(kb.articles[1].pinned, true, 'pinned')
    truthy(kb.articles[1].preview:find('Entry control keeps track', 1, true), 'preview line')
    truthy(kb.articles[1].words:find('every wearer', 1, true), 'search text')
    local notes = STUB.hub['health:incendium_phone']
    local text = ''
    for _, n in ipairs(notes) do text = text .. n.text end
    truthy(text:find('Knowledge base: 1 article', 1, true), 'health note: ' .. text)
end)

test('an article: images point at the repository', function()
    local r = call('respond:kbArticle', 2, { id = 'ba-entry-control' })
    eq(r.ok, true, 'found')
    truthy(r.body:find(BASE .. 'images/board.svg', 1, true), 'image link rewritten')
    eq(call('respond:kbArticle', 2, { id = 'nope' }).ok, false, 'unknown article')
end)

test('the last good copy is kept on the server', function()
    local saved = json.decode(LoadResourceFile('incendium_phone', 'data/knowledge.json'))
    eq(#saved.articles, 1, 'saved')
end)

test('staff reload: only staff, with a cooldown; a broken library keeps the old one', function()
    local before = #requests
    reload(2)
    eq(#requests, before, 'a player cannot reload')
    files['library.json'] = '{ not json'
    reload(1)
    eq(#call('respond:kb', 2).articles, 1, 'old library kept')
    local last = STUB.sentToClient[#STUB.sentToClient]
    truthy(last.args[1].description:find('not valid JSON', 1, true), 'staff told why')
end)

--<< Incendium Solutions >>
