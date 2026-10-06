# Knowledge library for Incendium Respond

The articles shown in the **Knowledge Base** section of the Incendium Respond app. The game server reads this
repository when staff run `/incendium phone` → **Reload knowledge base** (and once at start-up). Nothing changes
in game until a reload, so you can edit freely.

## Adding an article

1. Copy `articles/_template.md` to `articles/<id>.md` (the id: lower-case letters, numbers and dashes, e.g. `rtc-stabilisation`).
2. Write the article in Markdown. Every style the app shows is in the template: headings, bold, links, lists,
   tables, images with captions, and the four boxes:
   `> [!CAUTION]` (Safety, red), `> [!WARNING]` (amber), `> [!NOTE]` (blue), `> [!TIP]` (green).
3. Put images in `images/` and link them as `../images/<file>`.
4. Add the article to `library.json`:
   ```json
   { "id": "rtc-stabilisation", "title": "RTC: Stabilisation", "category": "rtc",
     "tags": ["RTC", "TRU"], "file": "articles/rtc-stabilisation.md", "updated": "2026-10-06", "pinned": false }
   ```
5. Commit. GitHub runs the check (Actions tab); fix anything it reports.
6. Ask staff to reload the knowledge base in game.

Links between articles use the other article's id: `[BA Entry Control](ba-entry-control)`.

## Categories

Listed in `library.json` → `categories` (`id` and `name`). An article's `category` must be one of the ids.

## Limits

- One article up to 200 KB of text. Keep images small (PNG or JPG, under 500 KB).
- `pinned: true` shows the article under **Pinned** on the Knowledge home page.
- Raw HTML in articles is removed by the app; only Markdown is shown.

## Checking locally

```sh
python tools/check_library.py
```
