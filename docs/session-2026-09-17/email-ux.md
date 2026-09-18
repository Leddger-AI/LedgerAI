# Email UX Program

Body page (`EmailBodyEditor`) and Email page (`EmailAutomationView`) are
separate by design: Body **creates** the body, Email **sets template +
sends**. Both import Excel/CSV and Roster sheets.

## Body page

- 3:2 grid (`3fr/2fr`), card hugs content then stretches (`min 420px`,
  body `flex:1`, max `60vh`); demo copy expanded to 7 paragraphs.
- Insight cards: Source Live Map, Deliverability, (History **removed** —
  Email page owns history).
- Sheet strip under toolbar: file, columns, rows/valid counts, quarantined,
  unmapped pills (`extractVars` vs attached headers, live on input).
- `{{`/word autocomplete from attached headers + `auto` toggle, filtered
  Variables dropdown; attached rows stored for counts (Roster = headers
  only, "rows load at send").

## Email page (unified, Body untouched)

- Inline composer (subject + body textarea, `{{}}` extraction, XLSX/CSV
  attach) → Save → opens send modal with file pre-attached.
- Shared `src/utils/templateBind.js`: extract/normalize/autoMap/preview/
  unbound-check/quarantine-split — both pages import it.
- Send modal: XLSX accepted everywhere, attached-file chip, real-row
  preview pager, counts strip (rows · valid · quarantined · UNMAPPED/bound),
  hard bind gate on Send/Schedule.
- Backend net: leftover `{{..}}` per recipient → `failed`, never mailed raw
  (E21 updated, E21b added).

## Research applied

TipTap/Slate/CKEditor mention feeds (trigger → list → node), Mailchimp
merge-tag dropdowns with sample values, Retool/Airtable import summaries,
Salesforce strict-schema rejection. Ours: `{{`-autocomplete + alias map +
gate + quarantine.
