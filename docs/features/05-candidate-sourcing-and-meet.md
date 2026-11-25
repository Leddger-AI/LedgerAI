# 05 — Candidate Sourcing, GitHub Profiling, Meet (Jitsi + ICS) & Recruiting Analysis

> **Status:** Production-Ready | **Files:** [`src/SourcingView.jsx`](../../src/SourcingView.jsx), [`src/MeetView.jsx`](../../src/MeetView.jsx), [`src/AnalysisView.jsx`](../../src/AnalysisView.jsx), [`src/components/GithubAnalysis.jsx`](../../src/components/GithubAnalysis.jsx), [`server/utils/githubAnalyzer.js`](../../server/utils/githubAnalyzer.js), [`server/utils/icsInvite.js`](../../server/utils/icsInvite.js)

---

## 1. Research & Problem Statement
- Concurrent form submissions from the same applicant email can create duplicate candidate records if not serialized in the database.
- Recruiters need automated GitHub tech-stack profiling, instant video interview scheduling without paid external APIs, and live funnel conversion metrics.

---

## 2. Architecture & Implementation
1. **Atomic Candidate Linking (`server/application_candidate_migration.sql`):**
   - `POST /api/forms/:draftId/submit` invokes PostgreSQL RPC `public.record_form_submission(...)`.
   - Uses a transaction-level advisory lock on `(owner_id, normalized_email)` to reuse or create a candidate in `candidates` and link `form_submissions.candidate_id`.
   - `SourcingView.jsx` manages statuses (`new`, `needs_contact_review`, `screening`, `interview`, `offer`, `hired`, `rejected`, `withdrawn`).
2. **GitHub Tech Stack & Role Profiler (`server/utils/githubAnalyzer.js`):**
   - Fetches candidate public repos (cached 1h in memory) and classifies roles (`Frontend`, `Backend`, `Fullstack`, `DevOps`, `Data`, `Mobile`) with language breakdowns.
3. **Candidate Meet (`src/MeetView.jsx` + `server/models/Interview.js` + `server/utils/icsInvite.js`):**
   - Schedules interviews and generates open-source **Jitsi Meet** rooms (`https://meet.jit.si/leddger-...`).
   - Uses the open-source **`ics`** npm package to generate RFC 5545 `.ics` calendar invites, attaching them to invitation emails and exposing `GET /api/interviews/:id/ics`.
4. **Recruiting Analysis (`src/AnalysisView.jsx` + `GET /api/analysis/recruiting`):**
   - Computes live stage funnel counts, conversion rate (`hired / total`), and average time-to-hire days from Supabase `candidates` + MongoDB `Interview`.

---

## 3. API Endpoints & Testing
- **Endpoints:** `GET /api/candidates`, `GET/PATCH /api/candidates/:id`, `GET/POST /api/interviews`, `PATCH /api/interviews/:id`, `GET /api/interviews/:id/ics`, `GET /api/analysis/recruiting`, `GET /api/analytics/templates/:draftId/github`.
- **Tests:** [`server/tests/icsInvite.test.js`](../../server/tests/icsInvite.test.js) (2/2 passing), `Candidate API` in `api.test.js`, and live E2E browser verification of Jitsi room creation.
