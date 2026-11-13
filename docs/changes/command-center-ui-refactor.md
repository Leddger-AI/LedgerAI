# Command Center UI refactor

Date: 13 November 2026. Branch: `codex/command-center-workflow`. This refactor is local and has not been deployed to production. Browser visual checks used isolated sample data, as requested by the owner.

## Goal

Make the Command Center a useful first page for the application → candidate → email workflow. The former version placed ten similar metrics, four large workflow cards, three queues, and service health at nearly equal visual weight. Review work and the next action were difficult to spot, especially on a phone.

## Design and behavior changes

| Area | New behavior | Why |
|---|---|---|
| First screen | A white priority panel picks a next action from saved campaign, candidate, and form counts | The most urgent actionable item is visible immediately |
| Workflow | Four compact stages connect form publishing, candidate review, email preparation, and delivery review | Users can continue at the right step without scanning ten metrics |
| Overview | Four high-value cards show active forms, contact review, scheduled email, and delivery review | Keep the page scannable; secondary totals remain in the priority panel |
| Review queue | Candidate and delivery issues share one inbox; applications and active campaigns are in recent movement | Separate work needing a decision from recent activity |
| Tools | Form creation, recipient files, form analytics, and email senders are compact shortcuts | Retain access without another large dashboard section |
| Service health | A small footer shows each source; a notice appears near the top when a source is starting or unavailable | Make missing data visible before anyone acts on it |
| Unknown values | `null` counts display as `—`; review panels show unavailable copy rather than an empty-state claim | A database error must not read as zero work |
| Refresh | A new request aborts the previous request; an error keeps the last successful snapshot until retry succeeds | Prevent stale responses and preserve context during an outage |
| Touch controls | Primary, refresh, and shortcut buttons have at least a 44 px target height | Make the phone layout easier to use |
| Routing | Queued and sending campaign rows open Email Automation; scheduled rows open Schedule; reviewable failures open Sent | Each campaign opens the screen that contains its status |

The layout remains read-only. Form publishing, candidate status updates, and campaign writes continue through their existing domain APIs. The page does not expose direct database management.

## White window revision, 13 November 2026

The owner clarified the visual boundary with a Home screenshot. The cream `#F2E8D5` is the frame and gutters around the three dashboard windows. The icon rail, section navigation, and main window are white. Inner cards may use color where it communicates an action or status. `src/App.css` now makes the main viewport white without changing the cream outer frame. `src/pages/CommandCenterView.css` makes its priority panel, cards, notices, shortcuts, and health badges white with neutral borders and text. No Command Center data rule changed in this visual revision.

Browser inspection at 1195 px confirmed the three windows as `rgb(255, 255, 255)` and the frame as `rgb(242, 232, 213)`. At 390 × 844 the document scroll width was 390 px. The preview used an isolated local test account and sample API; those counts are **not production data**. See [Home and meeting live-data pass](./home-meeting-live-pass.md) for the next connected-page changes.

## Responsive work

The desktop shell has a mini rail plus a 280 px secondary sidebar. At a 768 px viewport this left only 253 px for the Command Center and caused its two-column priority panel to overlap. `src/App.css` now switches **this page only** to a horizontal section navigation between 641 and 1050 px. The existing phone shell is used at 640 px and below. The page's own layout becomes a single priority panel and vertical workflow on narrow phones.

| Viewport | Result observed in browser |
|---|---|
| 320 px | Document and Command Center content widths matched; no sideways overflow; priority panel and retry action remained readable |
| 390 × 844 | Document width 390 px; compact workflow, summary, queues, and tool links fit; screenshots inspected at top and bottom |
| 768 px | Initial overlap reproduced; after shell fix, Command Center width and scroll width were both 692 px |
| 1051 px | Desktop sidebar layout fit with no internal overflow after transition settled |
| 1440 px | Four workflow stages and priority panel fit in the desktop workspace; no internal overflow |

## Interaction checks

- The priority button, all four workflow stages, and all four tool shortcuts opened their intended routes in the isolated browser fixture.
- A queued campaign row opened Email Automation. Scheduled campaigns route to Schedule; delivery issues route to Sent.
- With both data sources unavailable, the page displayed a connection action, `—` for unknown counts, unavailable explanations in the queues, and no false “nothing needs review” message.
- The final refactored page was tested with the fixture API stopped: Refresh displayed a connection error and kept the last snapshot. Service badges changed from `ready` to `Previously ready`, so the old state was not presented as current. After the API restarted, Try again cleared the error, refreshed the timestamp, and restored `ready`.
- Recommended-action states were checked with isolated responses: delivery review, candidate contact review, no active forms, a clear workspace, and both sources unavailable. A queued campaign row opened Email Automation; scheduled and reviewable campaigns route to Schedule and Sent.
- `npm run build` and targeted ESLint passed after the layout refactor. The final build also passed after the touch-target adjustment. The existing spreadsheet bundle-size warning remains; no backend code changed in this refactor, and the preceding full backend suite passed 274 tests.
- The isolated preview frontend and API both returned HTTP 200 after the final build. The sample-data preview remains available at `http://127.0.0.1:5174/dashboard/command-center` while its local processes run.

## Remaining acceptance checks

1. Verify real owner counts and source health in a signed-in local or production browser. The owner requested isolated testing for this round.
2. Verify keyboard focus order and screen-reader labels on the full dashboard shell. The Command Center's own controls are buttons with visible focus treatment, but the shell's secondary navigation still uses clickable `div` elements.
3. Deploy this branch only after the normal release review, then check the worker after Render cold start. Render Free may delay scheduled email.

See [Command Center flow](../connections/15-command-center-workflow.md) and [initial implementation record](./command-center-workflow.md).
