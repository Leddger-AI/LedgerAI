# Connected feature roadmap

Updated: 8 November 2026. This is a living implementation roadmap, not a claim that every listed feature is live. See [application and candidate changes](../changes/application-candidate-workflow.md) for verification evidence.

## Product spine

```text
Template builder → published form → submission → candidate → campaign → interview
                                      ↘ analytics        ↘ meeting cost → project/budget
```

Authentication and owner-scoped records support every link. Supabase owns drafts, submissions, candidates, meetings, and profiles. MongoDB mirrors form data for analytics and stores campaigns and Agenda jobs. Do not infer candidate identity from a dashboard count: a person may submit more than one application.

## Priority and dependency matrix

| Order | Feature | Status on 8 Nov | Depends on | Next acceptance check |
|---|---|---|---|---|
| 0 | Email/mobile release preflight | Staged PR #70; production worker route returns 404 | Render configuration, Supabase, MongoDB | Worker health 200, controlled campaign, restart recovery, avatar replacement |
| 1 | Public forms and candidate identity | Implemented in staged PR #70; production database migration applied 8 Nov; live API journey pending | Draft config, Supabase transaction | Submit each template type; student application creates/links candidate |
| 2 | Candidate workspace | Implemented locally in Sourcing; live check pending | Candidate API and migration | Search, open history, update status, refresh |
| 3 | Candidate communication | Planned | Reliable campaign worker and candidate identity | Choose candidates as an audience and display recipient outcomes in history |
| 4 | Interviews and calendar | Demo screens today | Candidate identity, meeting persistence | Candidate-linked interview with real time and link; no fixed June 2026 grid |
| 5 | Projects, teams, budgets | Projects and Teams use local sample state | Saved project/team entities, meetings | Persistent ownership, attribution, and cost rollups |
| 6 | Analytics and exports | Template analytics real; general Export Center simulated | Reliable source records | Every metric links to source; export downloads an actual file |
| 7 | Knowledge Base and AI | Separate Rust backend; live integration unverified | Auth and deployed service | No fabricated fallback documents; source attribution |
| 8 | Product-wide mobile and accessibility | Landing work staged, dashboard uneven | Each real workflow | 390 × 844 and keyboard journeys; usable touch targets |

## Future features that fit the connected data

1. **Candidate next-action queue:** owner, due date, status transition and overdue reminders. Build after candidate workspace and interviews.
2. **Saved recipient segments:** audiences derived from candidate status and consent, with suppression preview before campaign creation. Build after candidate communication.
3. **Communication preference center:** per-category choices linked to signed unsubscribe and suppression records. Build after live email verification.
4. **Template versions and approval:** immutable published version, diff, approver, and rollback. Build after public rendering is stable.
5. **Interview coordination:** availability search, calendar invitation, and meeting outcome. Build after Calendar and Meet use saved records.
6. **Recruiting funnel and cost per outcome:** applications, stage changes, interviews, and cost with traceable denominators. Build after projects and candidate stages.
7. **Reviewed AI drafting:** suggested copy and form questions with explicit human approval and audit trail. Do not automate hiring decisions.

## Decision log

- 8 Nov: Candidate journey chosen as the first product connection. Student applications create candidates automatically; employee and team forms remain submissions.
- 8 Nov: One normalized email per owner identifies one candidate with multiple applications. Ambiguous historical identities require review.
- 8 Nov: Resume and photo uploads move to the next phase; required upload fields cannot be published.
- 8 Nov: Keep Render Free for this release. [Render documents](https://render.com/docs/free) both idle sleep and blocked outbound SMTP ports 465/587; see release blocker in the change document.

## Evidence

- [Connection maps](../connections/README.md), [template lifecycle](../connections/10-template-draft-lifecycle.md), [email workflow](../connections/09-email-campaign-schedule.md)
- [Candidate research](../research/candidate-workflow.md)
- [Release preflight](../deployment/release-preflight-2026-11-01.md)
