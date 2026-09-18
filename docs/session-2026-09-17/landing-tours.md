# Landing Tours (`EmailFlowTour`, `TemplateFlowTour`)

Page bg is beige `#F2E8D5` (despite `--cz-bg-dark` name); neighbors:
hub (transparent) above, dark `#141414` security below. Inserted between
them (`LandingPage.jsx`). Light stages on purpose — NOT a copy of the dark
InteractiveTour cards.

## Email tour — sidebar pages Body → Automation → Excel

Cursor clicks sidebar items like pages: types body + `{{D1_names}}` pill →
Automation picks draft, previews row 1, Send fills `240 sent` → Excel rows
fill + `240 valid · 3 quarantined`.

## Template tour — builder + Schedule with drum picker

Sidebar Student/Employee/Team/Drafts/Active/Schedule. Cursor flips fields,
toggles Desktop ↔ **Mobile** (228px notched phone vs full card), Save as
Draft, sidebar Schedule: September-2020 calendar (tap **9 blue start**,
**10 red end**, footer narrates), hour/minute **drums slide**
(`translateY`, 10 and 30 land selected), Activate → live link.

## Shared mechanics

- Same `simulated-cursor` SVG + `clicked` scale + teal `click-ripple` as
  Campaign Creation; per-beat click pulse (deferred timers for lint).
- Fully automatic (`pointer-events:none`, no buttons); own observers,
  timers cleaned, loops; `prefers-reduced-motion` static.
- Anti-sync: different loop totals, template 3s staggered start, ±2%
  deterministic jitter per beat/loop.
- Split mirrored editorial: email stage-left/copy-right (1180→1400px),
  template copy-left/stage-right (1240→1400px); titles match site pattern
  (`5. Personalized Email Outreach`, `6. Template Forms, Scheduled`;
  Inter 36 + Syne-800 highlight).
