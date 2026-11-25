# 08 — Analytics Engine, Export Center & Google Drive Sync

> **Status:** Production-Ready | **Files:** [`src/pages/AnalyticsPage.jsx`](../../src/pages/AnalyticsPage.jsx), [`src/pages/TemplateDetailAnalytics.jsx`](../../src/pages/TemplateDetailAnalytics.jsx), [`src/ExportView.jsx`](../../src/ExportView.jsx), [`src/components/ScheduledReportsPanel.jsx`](../../src/components/ScheduledReportsPanel.jsx), [`server/utils/analyticsUtils.js`](../../server/utils/analyticsUtils.js), [`server/utils/analyticsExport.js`](../../server/utils/analyticsExport.js), [`server/utils/googleDriveOAuth.js`](../../server/utils/googleDriveOAuth.js), [`server/utils/googleDriveUpload.js`](../../server/utils/googleDriveUpload.js)

---

## 1. Research & Problem Statement
- Form submissions and template configurations live in Supabase PostgreSQL, while deep aggregations, trend series, and field-level completion analytics run efficiently over MongoDB mirrors (`TemplateData`, `TemplateSubmission`).
- Users also need 1-click exports to local files (CSV, XLSX, JSON, PDF), native **Google Sheets** in their Google Drive, and recurring scheduled email reports.

---

## 2. Architecture & Implementation
1. **Analytics Aggregations (`server/utils/analyticsUtils.js`):**
   - Computes overview KPIs, per-template submission counts, daily trend series, type distributions, and field completion/rating breakdowns.
   - `POST /api/analytics/sync` backfills MongoDB mirrors from Supabase if an asynchronous mirror write ever failed.
2. **Unified Export Center (`src/ExportView.jsx` & `GET /api/export`):**
   - Exports `meetings`, `projects`, `candidates`, and `team` scopes to **CSV**, **XLSX** (via SheetJS), **JSON**, and **PDF** (via `pdfkit`).
3. **Google Drive Integration (`server/utils/googleDriveOAuth.js` & `googleDriveUpload.js`):**
   - Uses narrow **`drive.file`** OAuth scope with HMAC-signed `state` parameters (`signDriveState` / `verifyDriveState`), **AES-256-GCM** encrypted token storage (`GoogleDriveToken`), auto-refresh, and direct CSV-to-Google-Sheets upload.
4. **Scheduled Email Reports (`AnalyticsReport` + `server/scheduler.js`):**
   - Runs daily/weekly/monthly Agenda jobs (`send analytics report`) generating PDF/CSV attachments and emailing recipients.

---

## 3. API Endpoints & Testing
- **Analytics:** `GET /api/analytics/overview`, `/templates`, `/templates/:draftId`, `/submissions`, `/field-analysis`, `/trends`, `POST /api/analytics/sync`
- **Exports & Reports:** `GET /api/export`, `GET /api/analytics/export/overview`, `GET /api/analytics/export/templates/:draftId`, `POST/GET/PUT/DELETE /api/analytics/reports`
- **Google Drive:** `GET /api/google-drive/auth`, `GET /api/google-drive/callback`, `GET /api/google-drive/status`, `DELETE /api/google-drive/disconnect`, `POST /api/analytics/export/overview/drive`, `POST /api/analytics/templates/:draftId/export/drive`
- **Tests:** [`server/tests/analytics.test.js`](../../server/tests/analytics.test.js), [`server/tests/analyticsExport.test.js`](../../server/tests/analyticsExport.test.js), [`server/tests/googleDriveToken.test.js`](../../server/tests/googleDriveToken.test.js).
