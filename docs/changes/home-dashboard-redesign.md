# Home dashboard redesign

Date: 14 November 2026. Branch: `codex/command-center-workflow`. This change is local and has not been deployed. The browser preview uses the development test identity, not a signed-in production account.

## Design intent and references

The Home screen is the front door to the connected application → candidate → campaign → meeting workflow. It now gives one clear next action, four source-backed counts, four direct workflow steps, recent activity, and a meeting cost summary. The cream page frame and all three dashboard windows remain as requested: the navigation rail, section navigation, and main window are white. Coral, sage, amber, and blue appear only **inside** the main window for actions, state cues, and quiet card accents.

The visual research used [Modern HR & Workforce Management Dashboard](https://dribbble.com/shots/27799357-Modern-HR-Workforce-Management-Dashboard) for modular, lightly colored cards; [Talent Acquisition Dashboard Design](https://dribbble.com/shots/26907105-Talent-Acquisition-Dashboard-Design) for recruiting status and applicant hierarchy; and [HR Dashboard UI — Clear Metrics, Human-Centered Design](https://dribbble.com/shots/25860030-HR-Dashboard-UI-Clear-Metrics-Human-Centered-Design) for restrained color and scan order. These are references for layout principles, not copied components. Pinterest results were not accessible for a reliable visual review in this pass.

## Data and interaction map

| Home element | Read source | Destination/action |
|---|---|---|
| Next action | Owner-scoped `GET /api/command-center`; campaign delivery review, candidate contact review, form activity, and queued email in that order | Sent, Sourcing, Drafts, or Email Automation |
| Form responses and candidates | Supabase counts through the Command Center API | Sourcing |
| Contact and delivery review | Supabase candidate status and MongoDB campaign status through the Command Center API | Sourcing and Sent |
| Four workflow steps | Active form, candidate review, queued/scheduled campaign, and delivery review counts | Drafts, Sourcing, Email Automation, and Sent |
| Recent form responses | Owner-scoped submission queue | Sourcing |
| Campaign activity | Owner-scoped MongoDB campaign queue; scheduled rows open Schedule, reviewable rows open Sent | Schedule, Sent, or Email Automation |
| Meeting cost | `GET /api/meetings`, including saved meeting costs calculated by the API | Meet or Live Ticker |
| Refresh and alerts | Both read requests are refreshed together; alert icon opens the existing page | Refresh or Alerts |

No dashboard number is entered in the frontend. It requests the data on entry and on Refresh. Incomplete response shapes are rejected. A failed source displays `—` instead of zero, and the page warns when forms or campaigns are partially unavailable. If a later refresh fails, the prior snapshot is retained only as context and flagged as stale. A local preview badge appears only in development test mode. The page does not make candidate or campaign writes.

## What changed

- Rebuilt `src/pages/DashboardHome.jsx` around the existing Command Center and meeting APIs. Removed the old prop-based Home data flow and its unused date and cost aggregation from `src/App.jsx`; saved meeting state remains available to the other screens.
- Rebuilt `src/pages/DashboardHome.css` with a clear top action, compact metrics, linked workflow, activity lists, and responsive meeting strip.
- Extended the tablet shell rule in `src/App.css` to Home, so its section navigation becomes horizontal at 641–1050 px. At 768 px the Home work area measured 692 px wide rather than being squeezed by the full secondary sidebar.
- Disabled the loading hero action until the first request resolves. A partial source failure now triggers the top warning.

## Observed verification

| Check | Result |
|---|---|
| Desktop browser at 1440 × 900 | Three white windows over the cream frame; colored content stays within the main window. [Preview image](./home-redesign-desktop.png). |
| Tablet browser at 768 × 844 | Main and section navigation measured 694 px; Home page measured 692 px; document scroll width stayed 768 px. |
| Phone browser at 390 × 844 | Document scroll width stayed 390 px; main Home width about 318 px. Header, hero, workflow, lists, and meeting strip were inspected. [Preview image](./home-redesign-mobile.png). |
| Navigation | The form-response action opened `/dashboard/sourcing`; Prepare outreach opened `/dashboard/email-automation`. |
| Unavailable data | Local API lacked Supabase credentials. Home displayed `—`, a connection action, and unavailable copy instead of fabricated metrics. The local campaign count of zero was still shown because that separate MongoDB source was available. |
| Build and static checks | `npm run build`, targeted ESLint on Home, and `git diff --check` passed after the final edit. |

The isolated development backend does not contain production Supabase records, so the screenshots are **not evidence of live account counts**. The earlier isolated sample response exercised the populated cards (14 responses, 11 candidates, 2 contact checks, 1 delivery review), but those are sample values and are not shown as production results. The real signed-in flow still needs a source and navigation check after deployment. No backend route or database schema changed in this redesign.

## Next acceptance checks

1. Sign in with a real owner account and compare Home counts and recent rows with Sourcing, Sent, Schedule, and the meeting log.
2. Test partial source outages with a real API response and confirm that stale context and unavailable values remain distinct.
3. Review the shell's keyboard navigation: the secondary navigation uses clickable `div` elements outside this Home change.
4. After release, check the email worker on Render startup. Render Free can sleep and delay scheduled delivery.

See the [Command Center workflow](../connections/15-command-center-workflow.md), [prior Home and meeting pass](./home-meeting-live-pass.md), and [connected feature roadmap](../roadmap/connected-features.md).
