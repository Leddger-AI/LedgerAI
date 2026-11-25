# 07 — Roster Studio & Cloud Spreadsheet Storage

> **Status:** Production-Ready | **Files:** [`src/LedgerSpreadsheet.jsx`](../../src/LedgerSpreadsheet.jsx), [`src/RosterStudioView.jsx`](../../src/RosterStudioView.jsx), [`src/FilesView.jsx`](../../src/FilesView.jsx), [`server/models/Spreadsheet.js`](../../server/models/Spreadsheet.js)

---

## 1. Research & Problem Statement
- HR/recruiting teams manage candidate rosters in Excel/CSV files and need an in-browser workbook editor that binds directly to email campaigns while bounding cloud database growth on free-tier MongoDB storage.

---

## 2. Architecture & Implementation
- **In-Browser Engine:** Powered by **`@fortune-sheet/react`**, **`luckyexcel`** (`.xlsx` import), and **`xlsx`** (SheetJS `.xlsx` export).
- **Document Storage (`server/models/Spreadsheet.js`):** Stores `{ ownerUid, name, sheets, timestamps }` in MongoDB, handling both dense `data` matrices and sparse `celldata` arrays.
- **20-File Quota & Export-Before-Delete:**
  - `POST /api/spreadsheets` enforces a hard **20-workbook limit** per `ownerUid` via `countDocuments()`, returning HTTP `409 Conflict` when exceeded.
  - `LedgerSpreadsheet.jsx` provides an Export-before-Delete modal that exports `.xlsx` locally via SheetJS before deleting from MongoDB.
- **Campaign Header Extraction:** `GET /api/spreadsheets/:id/headers` extracts normalized column headers from either dense `data` or sparse `celldata` for `EmailAutomationView`.

---

## 3. API Endpoints & Testing
- **Endpoints:** `GET /api/spreadsheets`, `GET /api/spreadsheets/count`, `GET /api/spreadsheets/metadata`, `GET/PUT/DELETE /api/spreadsheets/:id`, `POST /api/spreadsheets`, `GET /api/spreadsheets/:id/headers`.
- **Tests:** 15 tests (`S1`–`S15`) in [`server/tests/api.test.js`](../../server/tests/api.test.js) covering CRUD, 409 limit enforcement, malformed ObjectId 400s, and header extraction.
