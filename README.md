# Incendium Phone

**Version** 0.3.0

The **Incendium Respond** and **JESIP** apps for LB Phone and LB Tablet, in one resource (`incendium_phone`).
Requires `ox_lib` and `incendium_lib`; LB Phone and LB Tablet are optional (the apps go on whichever the server runs).

- Build plan and status: [PLAN.md](PLAN.md). Settings: [CONFIG.md](CONFIG.md).
- Design prototype: `dev/design/index.html`. IRS schema: `dev/irs/`. Data (hydrants, SSRI starter): `dev/data/`.

## Who gets the apps

Apps are added on each player's own game, so nobody else ever sees them. A player gets an app only when they pass
its permission tier (`Config.Permissions`, set by `Config.Apps.<App>.Permission`: everyone, aces, or Qbox / QBCore
jobs) **and**, per `ShowWhen`, are on duty (the server's duty state bag, `Config.Duty.StateBag`, default
`dutyStatus`) or booked on to a callsign on Albo's FMS (incendium_lib's shared copy, no FMS calls). The server
decides and tells the player's game only when the answer changes: the moment the duty state bag changes, when FMS
bookings change (one re-check per burst), on join, on job or duty changes, and from `/incendium phone`. Losing
access removes the app at once. The PWM server profile adds the WMFS groups to the `jesip` tier.

## Incendium Respond (0.3.0)

Sections, each with a permission tier in `Config.Sections` and devices in `Config.Features`:

- **Home:** you (rank insignia, roll number, qualification chips in the same colours as the iConsole Crewing page), callsign, station, unit status.
- **Status** (`Config.Sections.Status`, phone by default): FMS status buttons (`Ecosystem.FMS.Statuses`), assigned incident with waypoint, comms group and car / incident channel, your crew, attach to another incident. Every request is checked by the server and then by incendium_lib (FMS running, booked on).
- **Turnout alerts** (`Config.Sections.Turnouts`): from Mobilising's hub `turnout` event and straight from the FMS, one alert per incident per player (`RepeatAfterMinutes`). Full-screen red alert, queue ("1 of 2 turnouts"), tone loops through xsound until acknowledged (Acknowledge only silences: the FMS sets the unit status itself), LB notification when the app is closed. `sounds/turnout.ogg` is a placeholder.
- **Settings:** Respond mode (assigned / station / off), stations, volume, test alert, Pushover with the player's own app token and user key (server KVP only; only the last 4 characters are ever shown).
- **Service Overview:** crewing per station (vehicle type, status, crew), incidents in progress and each incident's CAD log.
- **Knowledge Base:** the public GitHub library, reloaded only at start and from `/incendium phone`; last good copy in `data/knowledge.json`.
- **Risk Information:** SSRI / PORIS sites (`data/ssri.json`; officers edit, with photos from the LB camera or gallery) and the nearest hydrants with defect reports and officer review (memory only).
- **IRS:** the full national form from `content/irs_schema.json`, prefilled from a live incident and the appliances' FMS times; drafts until restart; checked on the server (`server/irs_rules.lua`, the same rules as `apps/respond/irs.js`) before being recorded in `data/`.
- Saved per player: `data/respond_players.json` (no keys in it).
- **Icons:** a bundled subset of Material Symbols. After adding an icon to `app.js`, run `python Originals/Phone/dev/icons.py`.
- **Preview without a server:** `dev/respond-preview.html?device=phone|tablet&role=officer|firefighter&booked=0&alert=2#/status` runs the real app page with stand-in data (press T for a turnout).

## Phone and tablet

`Config.Apps.<App>.Devices` sets which devices an app is added to. `Config.Features` sets which device each feature
works on; with `Fallback = true`, a feature set to a device the server doesn't run works on the one it does run.
