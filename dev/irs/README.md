# IRS schema

`irs_schema.json` is the full Incident Recording System question set, converted from
`References/incidentreportingquestions.pdf` (DCLG "Questions and Lists" v1.4, Sept 2009).
The Responder app draws its IRS form from this file; nothing in the form is hand-built.

## What is in it

- `sections`: the 9 IRS sections plus Summary, each listing its question IDs in order.
- `questions`: every question (157; 9.23 is CLG-only and left out), keyed by IRS number:
  `label`, `type`, `required`, `when` (when it is asked), `options` or `optionsFrom`,
  `default`, `group` (repeating group), `prefill` (filled from the FMS/incident), `notes`, `page` (PDF page).
- `groups`: the 9 repeating groups (vehicles, persons, alarms, hazmat, ...), with `when`.
- `hierarchies`: the four long lists (incident type, property type, special service type,
  false alarm reason) as trees. Property leaves carry `category`, `primary` and `regulated`;
  special service leaves carry `rtc` and `hazmat`. These flags drive the rules.

Types: `text`, `number`, `yesno`, `yesnodk`, `select`, `radio`, `combo` (list or typed), `category`
(3.1), `hierarchy`, `datetime`, `address` (4.2 / 6.13 sub-fields), `coords`, `station`.

Conditions (`when`, and `when` on single options):

    {"q": "5.5", "eq": "Yes"}   {"q": "7.14", "in": ["2", "3"]}   {"q": "9.2", "filled": true}
    {"all": [..]}  {"any": [..]}  {"not": {..}}
    {"category": ["Fire"]}                 3.1 Fire | SpecialService | FalseAlarm
    {"fire": ["Primary"]}                  derived fire class, see "derived.fireClass"
    {"property": ["Dwelling", ...]}        category of the 3.2 property type
    {"propertyId": ["350"]}  {"flag": "rtc" | "hazmat" | "regulated" | "primaryProperty"}
    {"optionFlag": ["8.1", "makeModel"]}   the chosen 8.1 option has that flag

## Rebuilding

The scripts in `tools/` read the PDF with pdfplumber (`pip install pdfplumber pypdf`).
Run them in order from `References/` with a scratch folder `S`:

    python tools/irs_extract.py S/irs_raw.json          # questions, metadata, option tables
    (pypdf text dump of the PDF to S/irs2.txt, blank lines removed)
    python tools/irs_norm.py S                          # normalised metadata
    python tools/irs_hier_probe.py S/irs_hier_rows.json # hierarchy table cells with positions
    python tools/irs_hier_build.py S                    # hierarchy rows
    python tools/irs_build.py S irs_schema.json         # final schema (rules are in this file)

The visibility rules (`WHEN`), repeating groups (`GROUPS`) and defaults (`DEFAULTS`) are written
by hand in `irs_build.py` from each question's "Depends on" column and notes.
