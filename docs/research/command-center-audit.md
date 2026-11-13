# Command Center feature audit

Date: 13 November 2026. Findings are based on the repository before this branch's change.

## Findings

| Area | Existing behavior | Connection decision |
|---|---|---|
| Command Center | `OverviewDashboard.jsx` mixes email account, budget, and draft API calls with parent-provided meeting and spend data; widgets can remain in local-data mode after errors | Replace this route with an owner-scoped operational snapshot and explicit source state |
| Forms | `form_drafts` and public submission APIs persist draft settings and submissions in Supabase | Link to Drafts and Active Links; count published forms and submissions |
| Candidates | Student submissions link through an atomic Supabase RPC; Sourcing has list, detail, history, and status update | Show distinct candidate count and contact review queue; open Sourcing for changes |
| Campaigns | MongoDB campaigns track queue, schedule, sending, sent, partial, failed, review, and cancellation; Agenda is the worker | Show due work and delivery review; route to Sent and Schedule |
| Files | Recipient spreadsheets are MongoDB records | Show saved count and route to Files |
| Meetings | API persists meetings, but Calendar and Meet include demo presentation | Count future saved meetings; do not claim the full interview workflow is live |
| Projects and teams | UI uses local sample state | Keep out of live Command Center counts |
| Knowledge Base | Separate Rust service; production connection not verified | Keep out of live Command Center counts |

## Chosen architecture

One authenticated snapshot endpoint combines bounded reads from Supabase and MongoDB. Each action card navigates to the existing feature, whose established API owns writes. This avoids duplicating campaign validation, candidate status rules, or form publishing rules in a generic command endpoint. A future command layer can orchestrate cross-domain writes once there is a concrete transaction and compensation design.

Counts use exact database counts rather than client-side arrays capped by list endpoint limits. Review queues are bounded to five or six rows. All queries are owner scoped. Partial source failure is visible, and null means unknown rather than zero.

## Research and future checks

The database boundary follows the current [application candidate lifecycle](../connections/14-application-candidate-lifecycle.md) and [email campaign lifecycle](../connections/09-email-campaign-schedule.md). For the next milestone, test recipient selection from candidate status, consent/suppression preview, and a saved link from candidate history to campaign outcome. Keep campaign SMTP results best effort and review unknown attempts manually. Review the dashboard at desktop and 390 × 844 before rollout, then inspect real source health after deployment.
