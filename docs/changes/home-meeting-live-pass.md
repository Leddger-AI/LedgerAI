# Home, meeting log, and alerts live-data pass

Date: 13 November 2026. Branch: `codex/command-center-workflow`. Code is local and not deployed. Browser checks used the isolated test session; production account data was not read or changed.

## Reason for this pass

The owner wants the three dashboard windows white over the existing cream frame, and wants page controls and numbers to represent saved records. The Home screen led to a Meet page containing fixed candidate names, times, and join links. Alerts showed two invented resolved events and a Snooze button with no handler. The Inbox navigation showed a fixed count of 46. The Home cost card displayed `$0` because the meetings API did not calculate a meeting's cost.

## Implemented path

```text
Home → Meeting log → Live Ticker → POST /api/meetings
                      ↑               ↓
          GET /api/meetings ← saved Supabase meeting
                      ↓
     owner default hourly rate in MongoDB → estimated cost

Home bell → Alerts → GET /api/alerts → PUT /api/alerts/:id/resolve
```

| Area | Implemented change | Source of truth |
|---|---|---|
| Dashboard shell | Cream outside the three white windows; main viewport no longer has a radial tint | `src/App.css` |
| Home figures | Cost is labeled *Meeting cost*; confidence is labeled *AI confidence*. Buttons lead to Budgets and Attribution respectively | Saved meeting rows, calculated cost, confidence and review flag |
| Home project section | Label changed from *Targets* to *Cost by project*, because the bars show cost share, not budget caps | Meeting cost grouped by project |
| Home meeting section | Labeled *Recent meetings*; rows open the new live Meeting log. Empty actions lead to Live Ticker rather than the sample Calendar | Saved meeting rows |
| Navigation | Removed hardcoded Inbox badge `46` | No unverified count is displayed |
| Meeting log | Removed invented interview records, join links, and historical outcomes. Reads the authenticated owner's meetings on entry and refresh; displays counts, review status, time cost, and real rows. Errors retain prior rows with an alert and retry. An incomplete response cannot appear as an empty account | `GET /api/meetings` |
| Cost calculation | API enriches each owner-scoped meeting with cost using its duration, attendee count, and the owner's default hourly rate. A configured default overrides the service default of $75/h | Supabase meetings + MongoDB `MeetingRate` |
| Live Ticker | Persists actual start and end timestamps with the saved meeting. The success message remains visible after reset. Displays the owner's saved default hourly rate; Start and Save stay disabled when it cannot load that rate. The former department-rate selector was removed because that selection was never persisted on a meeting and made the displayed cost disagree with the log | `GET /api/rates`, `POST /api/meetings` |
| Alerts | Reads its own owner-scoped list on entry and refresh. Resolved history comes from saved alerts; removed the nonfunctional Snooze control. Resolve updates the page only after the API call succeeds. Missing or invalid response data shows an error instead of a false empty state | `GET /api/alerts`, `PUT /api/alerts/:id/resolve` |
| Empty API responses | A successful empty meetings or alerts response clears old rows in App state | Authenticated API response |

## Verification observed

- Frontend production build passed. Targeted ESLint passed for `MeetView.jsx`, `DashboardHome.jsx`, `LiveTicker.jsx`, and `CommandCenterView.jsx`. `App.jsx` retains existing lint findings outside the edited lines; the build succeeded.
- API and Command Center suites passed after rate alignment: 84 tests. The meeting tests check fallback cost, the signed-in owner's configured rate, and that `GET /api/rates` gives Live Ticker that same rate. The full backend suite passed 275 tests before the final rate-response change; the final rate change was covered by the 84-test targeted rerun.
- In the isolated browser, Home's *View meetings* opened `/dashboard/meet`, and the record action opened `/dashboard/live-ticker`. At 390 × 844 the Meeting log had no horizontal overflow; the cream frame and white window remained visible. The test fixture returned the wrong payload for meetings, which initially appeared as an empty account; this was corrected with response-shape validation and is no longer counted as a valid empty-state test.
- The isolated fixture does not hold a real Supabase user session, so this pass does **not** prove a production meeting save, populated meeting log, or alert resolution. The fixture also did not implement `GET /api/alerts`; the Alerts page correctly showed an incomplete-response error instead of the previous fabricated resolved history or a false clear queue. Those require an authenticated end-to-end check before release.

## Next connected pages and limitations

1. **Calendar:** still uses a fixed June 2026 grid and local meeting additions. Replace it with dates from saved meetings, server-backed create/update, and honest empty states before making it a Home shortcut again.
2. **Projects and Teams:** still contain local sample entities. Persist owner-scoped records before treating budgets or assignments as project history.
3. **Recruiting Analysis and candidate Meet:** former Meet sample content was removed from the visible Meeting log. Recruiting Analysis still labels itself a sample preview; build its funnel from candidate stage events before presenting it as live analytics.
4. **Rate snapshots:** the Meeting log currently estimates historical cost with the owner's *current* default hourly rate. A later schema migration should save the chosen hourly rate per meeting so past estimates do not change when the default rate changes. Department-specific rates can return to Live Ticker once the selection is saved on each meeting.
5. **Live smoke:** sign in with an owner account, record a short meeting, confirm the Home cost and Meeting log refresh, resolve a saved alert, and refresh both pages. Check desktop and 390 × 844 after deployment.

The implementation does not claim that demo-only pages are now live. The roadmap remains the inventory of those pages: [connected feature roadmap](../roadmap/connected-features.md).
