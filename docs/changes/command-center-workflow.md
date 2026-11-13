# Command Center workflow change record

Date: 13 November 2026. Branch: `codex/command-center-workflow`. This is local implementation and test evidence; it is not a claim of production deployment.

## Changes

| Layer | Change | Reason |
|---|---|---|
| API | Added authenticated `GET /api/command-center` in `server/index.js` | Give the dashboard one owner-scoped read request |
| Aggregation | Added `server/utils/commandCenter.js` for exact counts and bounded queues across Supabase and MongoDB | Keep all data ownership and failure rules together |
| UI | Replaced the Command Center route's previous mixed local/live widgets with `src/pages/CommandCenterView.jsx` | Show the actual application → candidate → email path and actionable review work |
| Mobile | Updated the narrow dashboard shell in `src/App.css`: compact mini rail, horizontally scrollable section navigation, usable main viewport | The original two fixed sidebars pushed the page offscreen at 390 × 844 |
| Tests | Added owner-scoping and partial-source-failure tests in `server/tests/commandCenter.test.js` | Prevent cross-account counts and false zeroes |

No database migration was required. The endpoint only reads existing tables and collections. It does not expose campaign recipients, sender credentials, or a generic database write API. Existing domain endpoints and callers remain intact.

## Verification observed on 13 November 2026

- Backend: 16 suites and 272 tests passed, including owner scoping and separate Supabase and MongoDB outage cases.
- Frontend: Vite production build passed after the mobile shell adjustment.
- Browser fixture: local Command Center rendered source health, counts, queues, and workflow cards. At 390 × 844, the initial shell pushed the page offscreen; after the shell fix, the page, cards, and horizontal section navigation were visible. The Review candidates card navigated to `/dashboard/sourcing`. At 1440 px, the Command Center's measured content width equaled its scroll width, with no internal horizontal overflow.
- Local API smoke: unauthenticated `GET /api/command-center` returned 401; `GET /api/email/worker-health` returned 200 with `ready: true` after MongoDB and Agenda startup.
- Targeted frontend lint for `CommandCenterView.jsx` passed. The production build passed after the mobile change; its existing large chunk warning remains.
- The browser fixture used local test authentication and a static API response. It verifies rendering and navigation, not live owner data or production scheduling.

## Current limits and release checks

1. Verify this endpoint with a signed-in owner against production Supabase and MongoDB after deployment, including both source health labels and a known recent application and campaign.
2. Verify the page at 390 × 844 after social login with real Sourcing records. The fixture's Sourcing destination had no records because the fixture API only supplied the Command Center response.
3. Verify a scheduled campaign across a Render restart. On the Free service, idle sleep may delay a scheduled send; readiness does not guarantee an exact send time.
4. Candidate-selected campaign audiences, candidate-linked interviews, persistent projects/teams, and a cross-domain command writer are future work. See [roadmap](../roadmap/connected-features.md).

## Related references

- [Command Center flow](../connections/15-command-center-workflow.md)
- [Application and candidate flow](../connections/14-application-candidate-lifecycle.md)
- [Email campaign flow](../connections/09-email-campaign-schedule.md)
