# incendium_phone - build plan

Apps: **Incendium Respond** and **JESIP**, on LB Phone and LB Tablet, in one resource.
Design prototype: `dev/design/index.html`. IRS schema: `dev/irs/`. Data: `dev/data/`.
Agreed decisions are kept in Claude's memory (`incendium-phone-decisions`); this file is the work list.

**Status (6 October 2026, later):** **Phases 3 to 7 done** in incendium_phone 0.3.0: Service Overview (CAD log cache L3, vehicle types L6), Knowledge Base, Risk Information (hydrants, SSRI/PORIS), IRS (form, Lua rules, drafts, recorded reports), offline icons, health notes. Next: live test of everything, then fixes.

**Earlier (6 October 2026):** **Phase 2 done** (Mobilising 4.0.0 without pagers and with the hub `turnout` event; library FMS comms groups, appliance times, status list and sending; Incendium Respond 0.2.0: Home, Status, turnout alerts, Settings with Pushover, About). Next: live test of Phases 1 and 2 together, then Phase 3.

**Earlier:** Phase 1 done, plus library work from the review: shared validators, ranks and qualifications from the pack, pack checks, the page kit, hub `stations` published by Mobilising. **No Discord for now** (IRS reports and defects are kept on the server only; the library Discord sender is not built until it is needed). Mobilising and Respond both use **xsound** for audio (Respond's turnout tones will be custom sounds you upload).

**Earlier status:** Phase 1 done (library 0.12.0: tablet, several apps, server-decided access, device rules; `incendium_phone` 0.1.0 with JESIP). Next: live test of Phase 1, then Phase 2.

**Devices:** no feature is locked to one device. `Config.Features` lists the devices per feature (defaults: turnouts and status on the phone, everything else on both); with `Fallback = true` a server that runs only one of LB Phone / LB Tablet gets every feature on that one.

**Who gets the apps:** a permission tier per app (`Config.Permissions`, aces / jobs / everyone; the PWM profile adds the WMFS groups) or an FMS branch. Apps are added only on allowed players' own games.

**Map:** LB Phone has a built-in `GameMap` component (LB's own map tiles, markers, live position). Use it instead of a separate Leaflet SDK when mapping comes back.

---

## 1. What changes where

### incendium_lib

| # | Change | Why |
|---|---|---|
| L1 ✓ | **Phone module: LB Tablet adapter.** `AddCustomApp`, `SendCustomAppMessage(id, action, data)` (tablet form differs from the phone's), notifications need the `tabletId` from `GetEquippedTablet`. | Respond and JESIP run on both devices |
| L2 ✓ | **Phone module: several apps per resource.** `Incendium.phone.app({ id = 'incendium-respond', ... })` and `{ id = 'incendium-jesip', ... }`; messages, callbacks and notifications are per app. Device ("phone" or "tablet") passed with every request so the server can refuse tablet-only or phone-only actions. | One resource, two apps |
| L3 ✓ | **FMS: CAD log, shared cache.** Incidents already arrive with grading, channel and the last 50 comments in every `fms:unitattachedSv`. Add `fmsCadLog(ref)`: returns the stored comments; if they are older than `CadLogMaxAgeSeconds` and someone is viewing that incident, one `getCadByReference` refreshes them for **everyone**. No per-player polling. | Incident detail |
| L4 ✗ | ~~Open CADs with no unit~~ **Dropped (2026-10-06):** only incidents with crews attached are shown, straight from the library's event-driven store. No `fetchOpenCads`, no open-CAD permission needed. | - |
| L5 ✓ | **FMS: comms groups.** Listen to `fms:unitCommsGroupSetSv` / `fms:userCommsGroupSetSv`; keep the latest per callsign and per player in memory. `fmsComms(src)`. Unknown until the first change after a restart. | Radio card |
| L6 ✓ | **FMS: vehicle type per callsign.** `getAllPatrolVehicles` when watching starts and at the safety refresh; per callsign through a crew member's `getPatrolVehicleForPlayer`, cached until that callsign's crew changes. Type only, no registration. | Crewing cards |
| L7 ✓ | **FMS: in-memory timeline for IRS.** Per CAD ref and callsign: time attached and each status change (code, time) from events the library already receives. Dropped when the incident ends, after `TimelineKeepMinutes`, or on restart. Never saved. `fmsTimeline(ref)`. | IRS 6.6-6.9 prefill |
| L8 ✓ | **FMS: sending.** `fmsSetStatus(src, code)` (only codes in `Ecosystem.FMS.Statuses`), `fmsAttach(src, cadId)` (`selfAttachOpenCad`), `fmsChannel(src, 'incident' or 'car')`; client `Incendium.fms.route()` (`TriggerServerEvent('fms:cadroute')`). Every call has a timeout and a clear error. | Status, attach, radio, waypoint |
| L9 ✓ | **Config** (`Ecosystem.FMS`): `Statuses` (2 Available, 4 Refreshments, 5 En route, 6 On scene, 7 Committed, 11 Book off), `OpenCadRefreshSeconds = 30`, `CadLogMaxAgeSeconds = 30`, `TimelineKeepMinutes = 120`, `CallTimeoutMs = 8000`, and the two comms-group event names in `Events`. | Shared by products |
| L10 ✓ | **Hub names** in `imports/hub/shared.lua` and the README: registry `stations` (published by Mobilising), event `turnout` (Mobilising). | Respond reads them |
| L11 ✓ | Health check: lines for LB Phone / LB Tablet found, and products with apps. | Server owners |
| L12 ✓ | Brand logos (done): `Incendium.ecosystem.logo(...)`, `incendiumLogo(full)`, `brand/*.png`. | Logos |

### incendium_mobilising (major version, 4.0.0)

| # | Change |
|---|---|
| M1 ✓ | **Remove the pager system:** `server/pager.lua`, `client/pager.lua`, pager admin tools (`/incendium mobilising pager`, `pagers`), pager groups, the pager radial entry, keys `pager_menu` / `acknowledge`, `Config.Pager`, `Config.Pushover`, the `Pager.Volume` / `Pushover.Enabled` / `Pager.Responses` settings, pager cooldowns, pager locale lines, `data/pagerUsers.json`, pager tests. |
| M2 ✓ | **Remove the iConsole "x of y attending" answers** (there are no Attending / Not available buttons any more). |
| M3 ✓ | **Publish `stations`** on the hub: `{ [station] = { callsigns = { { cs = 'E011', label = 'Pump' }, ... } } }`, on start and whenever stations change. |
| M4 ✓ | **Emit `turnout`** from `MobilisingServer.turnout`: `{ ref, station, callsigns, code, label, address, text, coords, origin }`. Respond uses `coords` for waypoints on non-FMS turnouts. |
| M5 ✓ | README, CHANGELOG ("pagers moved to Incendium Respond"), CONFIG.md, AI index. |

### Packs (done)
`brigade.Logo`, `LogoHorizontal`, `LogoHorizontalLight` in `incendium_pack_wmfs` and `incendium_pack_example`; release check and `new_pack.py` know them.

### incendium_phone (new)

```
incendium_phone/
  fxmanifest.lua                 ox_lib, incendium_lib; lb-phone / lb-tablet optional
  config/config.lua              buyer-facing, escrow_ignore
  client/apps.lua                both apps on phone + tablet (library phone module)
  client/respond.lua             NUI <-> server, waypoints, nearest hydrants (local), street names, tone loop
  server/main.lua                permissions per section, device checks, health notes
  server/turnouts.lua            hub 'turnout' + FMS attach -> queue per officer, dedupe by ref, LB notification
  server/incidents.lua           library incident store, CAD log, open CADs, timeline
  server/status.lua              status buttons, attach, radio channels
  server/ssri.lua                data/ssri.json, wmfscommand edits (tablet), photos (phone)
  server/hydrants.lua            defect reports, officer review; statuses in memory only
  server/knowledge.lua           GitHub fetch on reload command only, last good copy
  server/irs.lua                 schema, server-side validation (Lua port of the rules), drafts in memory, Discord
  server/pushover.lua            per-player keys in server KVP, never sent back
  shared/irs_rules.lua           the condition evaluator (same rules as irs.js)
  data/hydrants.json             867 hydrants (from References/hydrants.ts)
  data/ssri.json                 starter sites (two examples)
  data/irs_schema.json           from dev/irs
  data/reports/                  recorded IRS reports (file store, or oxmysql if running)
  apps/respond/                  the app (from dev/design, mock data removed)
  apps/jesip/                    full-screen iframe + "can't reach JESIP" fallback, icon
  fonts/ vendor/ img/            Glacial (woff2), Material Symbols subset, marked, DOMPurify, icons
```

**Config sections**
- `Config.Apps`: Respond / JESIP on or off, per device; names; JESIP URL.
- `Config.Sections`: ace per section (Status, Settings, SSRI edit, defect review, IRS write, All reports); `true` = everyone.
- `Config.Turnouts`: tone, volume default, notification text, "Not booked on" message.
- `Config.Knowledge`: GitHub base URL (`https://raw.githubusercontent.com/<you>/<repo>/main/`), max article size.
- `Config.IRS`: FRS code (`FM`), report retention, Discord format options.
- `Config.Hydrants`: nearest count (10), max distance shown.
- `Config.Pushover`: on/off, message templates.

**Convars** (never in files): `incendium_phone_irs_webhook`, `incendium_phone_defect_webhook` (optional).
**Commands**: `/incendium phone` page: knowledge reload, position helper for SSRI (prints x/y/z), health.

### tools
`build_release.py` and `release.py` know `incendium_phone`; tests in `Originals/Phone/tests/` (IRS rules, turnout queue and dedupe, permissions, Pushover never leaks); `config_docs.py` for CONFIG.md; `ai_index.py`.

---

## 2. Gaps and how they are handled

| Gap | Handling |
|---|---|
| CADs carry no coordinates | `fms:cadroute` for your own CAD; Mobilising `coords` for its turnouts; otherwise no waypoint button |
| Comms group has no getter | Shown as "unknown" until the first change after a restart |
| Open-CAD view depends on FMS permission | The library uses any online player who has it; if nobody has it, only incidents with a unit attached are shown |
| Camera is phone only (LB Tablet has the gallery only) | **Proposed:** officers can add a photo to an SSRI site from the phone; every other edit stays on the tablet |
| Hydrants have position only | ID, street (from the game), distance, direction; no type or main size |
| 11 hydrant pairs are within 2 m of each other | Kept; check them in game |
| Several turnouts / same job twice | Queue, dedupe by CAD ref |
| FMS calls can hang | Timeout + "FMS offline" banner |

---

## 3. Step by step

**You (before or alongside Phase 1)**
1. Create the public knowledge-base repo from `knowledge-template/` and send me the repo URL.
2. ✗ Discord: not used for now (no webhook convar needed).
3. ✓ Not needed: only incidents with crews attached are shown.
4. Confirm the phone-only "Add photo" exception for SSRI sites.

**Me, in order (each phase tested before the next)**

| Phase | Work | Needs |
|---|---|---|
| 1 | Library L1, L2, L11 (tablet + multi-app); `incendium_phone` skeleton; **JESIP** on phone and tablet | - |
| 2 | Mobilising M1-M5 (pager out, hub `stations` + `turnout`); library L5, L7-L10; Respond shell (Home, Status, Settings, turnout alert, queue, tone loop, notifications, Pushover) | Phase 1 |
| 3 | Library L3, L4, L6; Service Overview (crewing, incidents in progress, CAD log) | Phase 2 |
| 4 | Knowledge base (GitHub reload, cache) | Repo URL |
| 5 | Risk: hydrants (nearest, waypoint, defects) and SSRI/PORIS (view, tablet edit, phone photo) | - |
| 6 | IRS (form from schema, Lua rules, drafts in memory, recorded reports, Discord summary + text file) | Webhook |
| 7 | Bundle assets offline (fonts, icon subset, vendor libs), health check, release tooling, docs, PWM test build | All |

**Each phase ends with:** tests passing, `build_release --check-only`, `ai_index`, a PWM build (`--strip-comments --profile pwm --bundle`) for you to test live, then a commit.

**server.cfg order:** `ox_lib`, `incendium_pack_wmfs`, `incendium_lib`, `fms`, `lb-phone`, `lb-tablet`, `incendium_mobilising`, `incendium_phone` (or `ensure [INCENDIUM]` after LB and the FMS).
