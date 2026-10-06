# Changelog - Incendium Phone

## 0.3.0 (2026-10-06)

Incendium Respond, phases 3 to 7:
- **Service Overview** (`Config.Sections.Overview`, everyone with the app): crewing per station (vehicle type from the FMS patrol vehicle, status, crew with rank insignia and qualification chips; callsigns no station lists under "Other callsigns"), incidents in progress (All / My station / Assigned) and each incident with its CAD log. The CAD log is fetched from the FMS only when someone views an old one, once for everyone.
- **Knowledge Base** (`Config.Sections.Knowledge`): the public GitHub library (`Config.Knowledge`), read at start and from `/incendium phone` > Reload knowledge base only; last good copy kept in `data/knowledge.json`. Categories, pinned, recently viewed (this device), search, articles with the GitHub callout boxes, images and links between articles. Raw HTML is removed.
- **Risk Information**: SSRI / PORIS sites (`data/ssri.json`, starts from `content/ssri-starter.json`; officers add, edit and delete sites, photos from the LB camera or gallery, "use my position") and the nearest hydrants (867, `content/hydrants.json`, worked out on the player's game; defect reports from beside the hydrant; officers mark out of service, dismiss or return to service; statuses kept until restart).
- **IRS**: the full national IRS form generated from `content/irs_schema.json`, on phone and tablet; new reports from a live incident fill in the incident number, station, time of call, address and each appliance's crew and times (6.6-6.9 from FMS statuses); drafts kept until the server restarts; checked on the server with the same rules as the form before being recorded (`IRS-<year>-<number>`, `data/irs.<id>.json`); My / All reports.
- **Fit to the screen:** Status (Status / Incident / Crew views) and the turnout alert never scroll as a page and scale to the phone; qualification chips transparent (very dark colours lightened to stay readable).
- **Offline:** icons are a bundled Material Symbols subset (no Google Fonts); Markdown libraries bundled.
- Health check notes: xsound missing, FMS connected or not, knowledge base loaded, IRS form missing.
- New config: `Config.Sections` Overview, Knowledge, Hydrants, HydrantReview, Ssri, SsriEdit, Irs, IrsAll; `Config.Hydrants`; `Config.Irs`.
- Needs incendium_lib 0.12.0 with the CAD log and vehicle type functions.

## 0.2.0 (2026-10-06)

- **Incendium Respond** app (LB Phone and LB Tablet), shown only to allowed players (tier + on duty or booked on):
  - Home: you, your callsign, station, rank insignia, qualification chips (iConsole colours), unit status.
  - Status (officers, phone by default): FMS status buttons, assigned incident with waypoint, radio (comms group, car and incident channel), your crew, attach to another incident.
  - Turnout alerts (officers): from Mobilising and straight from the FMS, one per incident, queued ("1 of 2"), tone loops (xsound) until acknowledged, LB notification when the app is closed.
  - Settings: Respond mode (assigned / station / off), stations, alert volume, test alert, Pushover with your own app token and user key (kept on the server only, never shown again).
  - About.
- New config: `Config.Apps.Respond`, `Config.Permissions.respond` / `officer`, `Config.Sections`, `Config.Turnouts`, `Config.Pushover`.
- `sounds/turnout.ogg` is a placeholder tone: replace it with your own.

## 0.1.0

- First version: the JESIP app on LB Phone and LB Tablet, shown only to players allowed by its Access rules.
- Config for who gets each app, which devices each app goes on, and which device each feature works on.
