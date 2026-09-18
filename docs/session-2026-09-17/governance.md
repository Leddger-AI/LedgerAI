# Governance (P1b + P2)

## Audit + RBAC (P1b)

- `models/AuditLog.js` (append-only, no edit/delete API) + `utils/audit.js`
  fire-and-forget `logAudit()` on draft create/delete, email
  queued/sent/scheduled, meeting delete.
- `GET /api/audit-log` (own logs, ≤500).
- `profiles.role` default `owner`; merged into existing `GET /profile`
  (first attempt created a duplicate route shadowing `timezone` — caught by
  `api.test` P1/P2, fixed by merging).

## Finance + DSR (P2)

- `models/MeetingRate.js` (unique owner+dept+level+region) + CRUD
  `GET/POST/DELETE /api/rates`; `POST /api/meetings/cost` (rate or $75
  default; never writes).
- `PUT /api/meetings/:id/attribution` — human override using existing
  columns only; old→new + reason in audit (LL144-style ledger).
- `GET /api/user/export` (all Supabase tables ≤1000 + Mongo sets + audit;
  logs `dsr.export`); `GET /api/user/retention` (versioned EU/US/IN policies
  + endpoint map).
- Both delete cascades now include EmailSuppression, MeetingRate, AuditLog.
