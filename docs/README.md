# LedgerAI Documentation Hub

Welcome to the organized documentation directory for **LedgerAI (`ai.leddger`)**.

---

## 1. Complete Feature Documentation (`docs/features/`)
Each document below covers **Research & Problem Statement**, **Architecture & Plan**, **Database Schema**, **API Reference**, **Implementation Details**, and **Tests**:

| # | Document | Scope |
|:---:|:---|:---|
| 01 | [Authentication, Sessions & Keep-Alive](./features/01-authentication-and-sessions.md) | Supabase OAuth, Email/Password, Demo Mode, 90s proactive JWT refresh, 12h keep-alive hook |
| 02 | [Meeting Cost Intelligence, AI & Calendar](./features/02-meeting-cost-intelligence-and-ai.md) | Overview KPIs, Dynamic Calendar, Live Ticker, Gemini 3.8 Flash classifier, Attribution Queue & Splits |
| 03 | [Projects, Teams & Budget Alerts](./features/03-projects-teams-and-budgets.md) | Projects CRUD, Team Members & Rates, Monthly Budgets, 80%/100% Automated Email Alerts |
| 04 | [Form Builder & Preview Studio](./features/04-form-builder-and-preview-studio.md) | Student/Employee/Team builders, 16-block `@dnd-kit` Studio, Zod schemas, Drafts & Agenda activation |
| 05 | [Candidate Sourcing & Meet (Jitsi + ICS)](./features/05-candidate-sourcing-and-meet.md) | Atomic PostgreSQL submission RPC, Sourcing pipeline, GitHub profiler, Jitsi Meet + `.ics` invites, Recruiting Analysis |
| 06 | [Email Automation & Campaigns](./features/06-email-automation-and-campaigns.md) | Email Body Editor, Merge Variables, Multi-Account SMTP/Gmail OAuth2, Agenda scheduler, RFC 8058 Unsubscribe |
| 07 | [Roster Studio & Spreadsheets](./features/07-roster-studio-spreadsheets.md) | FortuneSheet workbook editor, LuckyExcel/XLSX import-export, 20-file MongoDB quota |
| 08 | [Analytics, Export & Google Drive](./features/08-analytics-export-and-google-drive.md) | Template Analytics, Export Center (CSV/XLSX/JSON/PDF), Google Drive Sheets sync, Scheduled Email Reports |
| 09 | [Knowledge Base & RAG Q&A](./features/09-knowledge-base-and-rag-qa.md) | File & Slack thread ingestion, recursive text splitter, Gemini 3.8 Flash Q&A with citations |
| 10 | [Settings, Avatar, OTP & OSS Network](./features/10-settings-avatar-and-security-otp.md) | 7-section Settings Hub, Sharp WebP + Cloudinary avatars, 6-digit OTP gates, `@octokit/rest` Collaborator Network |

---

## 2. End-to-End Connection Maps (`docs/connections/`)
Line-by-line flow traces from UI action to database and external services:
- [Connection Maps Index](./connections/README.md) (14 end-to-end traces covering Auth, OAuth, Analytics, Email, Drafts, Deletion, RAM Optimization, and Candidate Lifecycle).

---

## 3. Architecture, Migrations & Operations
- **Migrations (`docs/migration/`):** [Dual-Database Architecture](./migration/dual-database-architecture.md) | [Supabase Overview](./migration/supabase-migration-overview.md) | [Setup Guide](./migration/supabase-setup-guide.md)
- **Analytics Specs (`docs/analytics/`):** [Analytics Overview](./analytics/overview.md) | [Google Drive Integration](./analytics/phase7-google-drive-integration.md)
- **Deployment (`docs/deployment/`):** [Production Deployment](./deployment/production_deployment.md) | [Release Preflight](./deployment/release-preflight-2026-11-01.md)
- **Backend & Legacy:** [API Specs](./backend/api_specs.md) | [Legacy Rust Backend (Deprecated)](./backend/rust_backend.md)
- **Changelog & Audits:** [CHANGELOG](./CHANGELOG.md) | [Data Integrity Fixes](./data-integrity-fixes.md) | [Full Audit Fixes](./session-2026-09-26/full-audit-fixes.md)
