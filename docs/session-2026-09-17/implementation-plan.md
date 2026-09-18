# Implementation Plan (P0 → P2)

Chosen: **incremental strangler**, 1 PR = 1 row, shippable weekly.
Rejected: big rewrite (6–8 wks, breaks 13 maps at once).

| Phase | Scope | Gate |
|---|---|---|
| P0-1 | Automation UI → `/accounts` + sender picker | grep 0 `/config`, build ×2, email 40/40 ×2 |
| P0-2 | Validation, regex-safe substitute, ObjectId 400s, ENCRYPTION_KEY boot check | suites green |
| P1a | Queue (`async`/large→Agenda 202), 2000/24h cap, suppression + List-Unsubscribe | email 40/40, scheduler 12/12 ×2 |
| P1b | AuditLog + role default + profile merge | api 54/54 ×2 |
| P2 | MeetingRate + cost preview, attribution override ledger, DSR export, retention doc | all suites ×2 |

Order rationale: auth/data truth → deliverability → governance → finance.
Flag-gated rollout (`USE_QUEUE`), old sync paths kept until proven.
