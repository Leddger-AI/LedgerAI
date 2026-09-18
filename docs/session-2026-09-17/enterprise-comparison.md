# Enterprise Comparison + Research

Researched (web, 2026): Gmail bulk-sender enforcement (Nov-2025 full),
Workspace 2000/day + 500 external, personal 500/day, bulk 5000/day →
SPF+DKIM+DMARC, one-click `List-Unsubscribe` (RFC 8058), spam <0.1% (never
>0.3%), Postmaster Tools; SES vs SendGrid EU/GDPR; ATS governance
(RBAC, immutable audit, consent, retention EU 6–12mo / US 3yr, EU AI Act
high-risk, NYC LL144 bias audits, human-in-loop ledgers).

## Enterprise vs Leddger (start of day)

| Pillar | Enterprise | Leddger |
|---|---|---|
| Auth | SSO SAML/OIDC + SCIM, MFA/FIDO2, RBAC, 1yr audit | Supabase OAuth only, no roles/log |
| Meeting cost | Loaded cost by level/dept + approval ledger | Fixed rate, heuristic tag |
| ATS | Approval chains, consent+basis, auto-retention, advisory-AI+bias audit | draft/active/expired, no consent/RBAC/retention |
| Email | ESP + auth + suppression + bounce + rate caps | Per-user Gmail Nodemailer, sequential, no unsub |
| Data | Single truth + ROPA/DPIA + DSR 30/45d + certified deletion | Dual-write + manual Sync, no ledger |

## What We Adopted (mapped to fixes)

SPF/DKIM/DMARC noted (DNS-level, operator task); in-app: List-Unsubscribe
headers + footer, suppression list, bounce/complaint reasons, daily caps,
queue, audit trail, role default, consent-ready DSR export, retention
policy doc endpoint, human override ledger for AI attribution.
