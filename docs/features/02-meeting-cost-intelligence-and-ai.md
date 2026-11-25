# 02 — Meeting Cost Intelligence, AI Attribution & Calendar

> **Status:** Production-Ready | **Files:** [`src/pages/OverviewDashboard.jsx`](../../src/pages/OverviewDashboard.jsx), [`src/CalendarView.jsx`](../../src/CalendarView.jsx), [`src/pages/LiveTicker.jsx`](../../src/pages/LiveTicker.jsx), [`src/pages/AttributionQueue.jsx`](../../src/pages/AttributionQueue.jsx), [`server/utils/aiClassifier.js`](../../server/utils/aiClassifier.js)

---

## 1. Research & Problem Statement
- Organizations lose visibility into the true dollar cost of recurring and ad-hoc calendar meetings.
- Manual project tagging of meetings does not scale; however, external LLM calls can fail or hit rate limits, requiring a deterministic fallback and human-in-the-loop review queue for ambiguous meetings.

---

## 2. Architecture & Design Plan
1. **Cost Formula:**
   $$\text{Meeting Cost} = \frac{\text{Duration (minutes)}}{60} \times \text{Attendee Count} \times \text{Hourly Rate}$$
2. **AI Classification Pipeline:**
   - Primary: **Gemini 3.8 Flash** (`gemini-3.8-flash` via REST API, temperature `0.1`, strict JSON schema `{ project_name, confidence_score, reasoning }`).
   - Fallback: Deterministic keyword heuristic matching (`Project Phoenix`, `Client ABC Onboarding`, `Q4 Marketing Strategy`, `Internal Operations`).
   - Any meeting with `confidence_score < 70` (or user-configured threshold) is flagged `requires_human_review = true`.

---

## 3. Database Schema
- **Supabase `meetings` table:** `id`, `user_id`, `title`, `start_time`, `end_time`, `duration_minutes`, `attendees` (JSONB), `ai_project`, `ai_confidence`, `requires_human_review`.
- **MongoDB `MeetingSplit` (`server/models/MeetingSplit.js`):** Stores multi-project percentage splits (`splits: [{ aiProject, pct }]`) when a single meeting spans multiple cost centers.
- **MongoDB `MeetingRate` (`server/models/MeetingRate.js`):** Stores default and department/level/region hourly rates.

---

## 4. Implementation Details
- **Overview Dashboard (`OverviewDashboard.jsx`):** Renders KPI cards (*Total Meeting Cost*, *AI Attribution Accuracy*, *Anomalies Detected*, *Unattributed Hours*), Recharts spend breakdowns, and the Calendar Ledger table.
- **Dynamic Calendar (`src/CalendarView.jsx`):** Renders a Monday-first monthly grid defaulting to the current month/year with `<` (Previous), `Today`, and `>` (Next) controls, mapping meetings by `start_time` and allowing quick meeting creation.
- **Live Ticker (`src/pages/LiveTicker.jsx`):** Real-time stopwatch odometer calculating live dollar burn every 500ms, shifting badge tone from normal → amber ($\ge \$50$) → red ($\ge \$200$), with 1-click save to `/api/meetings`.
- **Attribution Queue (`src/pages/AttributionQueue.jsx`):** Lists meetings needing review; supports single-project override (`PUT /api/meetings/:id/attribution`) or percentage split (`POST /api/meetings/:id/split`) with audit logging.

---

## 5. API Endpoints & Testing
- **Endpoints:** `GET/POST/DELETE /api/meetings`, `POST /api/meetings/classify`, `PUT /api/meetings/:id/attribution`, `GET /api/meetings/splits`, `POST /api/meetings/:id/split`, `GET/POST/DELETE /api/rates`.
- **Tests:** [`server/tests/aiClassifier.test.js`](../../server/tests/aiClassifier.test.js) (5/5 passing) and `Meetings API` in [`server/tests/api.test.js`](../../server/tests/api.test.js).
