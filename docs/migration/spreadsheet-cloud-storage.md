# Spreadsheet Cloud Storage & 20-File Limit (Phase 5 & 6)

This document details the spreadsheet cloud storage feature, the 20-file limit enforcement, and the export-before-delete flow implemented in `LedgerSpreadsheet.jsx`.

---

## Table of Contents

1. [Overview](#1-overview)
2. [MongoDB Spreadsheet Model](#2-mongodb-spreadsheet-model)
3. [Backend API Endpoints](#3-backend-api-endpoints)
4. [20-File Limit Enforcement](#4-20-file-limit-enforcement)
5. [Frontend UI Changes](#5-frontend-ui-changes)
6. [Export-Before-Delete Flow](#6-export-before-delete-flow)
7. [Modal Reference](#7-modal-reference)

---

## 1. Overview

Users can now save their FortuneSheet spreadsheets to the cloud (MongoDB), load them later, and manage their saved files. A strict 20-file limit per user is enforced. When the limit is reached, users must export files locally and delete them from the cloud before saving new ones.

### Data Flow

```
LedgerSpreadsheet.jsx (Frontend)
  │
  ├── Save to Cloud ──► POST /api/spreadsheets (MongoDB)
  │     └── Checks count < 20 before saving
  │
  ├── Load from Cloud ──► GET /api/spreadsheets (list)
  │     └── GET /api/spreadsheets/:id (load full data)
  │
  ├── Export & Delete ──► Download .xlsx locally
  │     └── DELETE /api/spreadsheets/:id (MongoDB)
  │
  └── Delete ──► DELETE /api/spreadsheets/:id (MongoDB)
```

---

## 2. MongoDB Spreadsheet Model

**File:** `server/models/Spreadsheet.js`

```js
const SpreadsheetSchema = new mongoose.Schema({
  ownerUid: { type: String, required: true, index: true },
  name: { type: String, required: true },
  sheets: { type: mongoose.Schema.Types.Mixed, default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

SpreadsheetSchema.index({ ownerUid: 1, name: 1 }, { unique: true });
```

### Field Details

| Field | Type | Description |
|-------|------|-------------|
| `ownerUid` | String | Supabase user UUID (from `req.user.uid`) |
| `name` | String | User-provided file name |
| `sheets` | Mixed | FortuneSheet workbook data (array of sheet objects) |
| `createdAt` | Date | Auto-set on creation |
| `updatedAt` | Date | Updated on every save |

### Unique Constraint

The compound index `(ownerUid, name)` ensures a user cannot have two files with the same name. If a user saves with an existing name, the endpoint updates the existing document instead of creating a duplicate.

---

## 3. Backend API Endpoints

All endpoints require `Authorization: Bearer <Supabase_Access_Token>`.

### `GET /api/spreadsheets`
List all spreadsheets for the authenticated user (without sheet data).

**Response:**
```json
{
  "spreadsheets": [
    {
      "_id": "mongodb-doc-id",
      "name": "Q4 Team Roster",
      "updatedAt": "2026-08-10T12:00:00Z",
      "createdAt": "2026-08-09T10:00:00Z"
    }
  ]
}
```

> Note: The `sheets` field is excluded from the list response to minimize payload size.

### `GET /api/spreadsheets/:id`
Load a specific spreadsheet with full sheet data.

**Response:**
```json
{
  "spreadsheet": {
    "_id": "mongodb-doc-id",
    "ownerUid": "supabase-uuid",
    "name": "Q4 Team Roster",
    "sheets": [/* FortuneSheet data array */],
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### `POST /api/spreadsheets`
Save a new spreadsheet or update an existing one by name.

**Request Body:**
```json
{
  "name": "Q4 Team Roster",
  "sheets": [/* FortuneSheet data array */]
}
```

**Response (success):**
```json
{ "message": "Spreadsheet saved", "spreadsheet": { ... } }
```

**Response (limit reached — 409):**
```json
{
  "error": "Spreadsheet limit reached",
  "limit": 20,
  "message": "You have reached the maximum of 20 saved spreadsheets. Please export and delete existing ones before saving new files."
}
```

### `PUT /api/spreadsheets/:id`
Update an existing spreadsheet by ID.

**Request Body:**
```json
{
  "name": "Updated Name",
  "sheets": [/* updated FortuneSheet data */]
}
```

### `DELETE /api/spreadsheets/:id`
Delete a spreadsheet from MongoDB.

**Response:**
```json
{ "message": "Spreadsheet deleted successfully" }
```

### `GET /api/spreadsheets/count`
Get the current count and limit.

**Response:**
```json
{ "count": 15, "limit": 20 }
```

---

## 4. 20-File Limit Enforcement

The limit is enforced in the `POST /api/spreadsheets` endpoint:

```js
const SPREADSHEET_LIMIT = 20;

const count = await Spreadsheet.countDocuments({ ownerUid: req.user.uid });
if (count >= SPREADSHEET_LIMIT) {
  return res.status(409).json({
    error: 'Spreadsheet limit reached',
    limit: SPREADSHEET_LIMIT,
    message: `You have reached the maximum of ${SPREADSHEET_LIMIT} saved spreadsheets. Please export and delete existing ones before saving new files.`,
  });
}
```

**How it works:**
1. Before creating a new spreadsheet, the server counts existing documents for the user.
2. If count >= 20, it returns a `409 Conflict` with the limit info.
3. The frontend catches the 409 and shows the "Storage Limit Reached" modal.
4. The modal directs the user to the file manager to export and delete files.

**Updating existing files:** If the user saves with a name that already exists, the endpoint updates the existing document instead of creating a new one. This does NOT count against the limit.

---

## 5. Frontend UI Changes

**File:** `src/LedgerSpreadsheet.jsx`

### New Toolbar Buttons

Three buttons were added to the footer:

1. **Save to File** (existing) — Downloads `.xlsx` to the user's computer using SheetJS.
2. **Save to Cloud** (new) — Opens a modal to name and save the spreadsheet to MongoDB.
3. **Load from Cloud** (new) — Opens a modal listing all saved spreadsheets with Load/Export/Delete actions.

### New State Variables

```js
const [showSaveModal, setShowSaveModal] = useState(false);
const [saveName, setSaveName] = useState('');
const [showLoadModal, setShowLoadModal] = useState(false);
const [cloudFiles, setCloudFiles] = useState([]);
const [cloudLoading, setCloudLoading] = useState(false);
const [showLimitModal, setShowLimitModal] = useState(false);
const [limitInfo, setLimitInfo] = useState({ count: 0, limit: 20 });
const [deleteTarget, setDeleteTarget] = useState(null);
const [showExportConfirm, setShowExportConfirm] = useState(null);
```

### New Handler Functions

| Function | Purpose |
|----------|---------|
| `handleSaveToCloud()` | POSTs current workbook to `/api/spreadsheets` with user-provided name |
| `handleLoadList()` | GETs `/api/spreadsheets` and opens the Load modal |
| `handleLoadFile(id, name)` | GETs `/api/spreadsheets/:id` and loads sheets into the Workbook |
| `handleExportAndDelete(id, name)` | Opens the Export & Delete confirmation modal |
| `handleConfirmExportDelete()` | Exports `.xlsx` locally, then DELETEs from MongoDB |
| `handleDeleteDirect(id, name)` | DELETEs from MongoDB without export (with confirmation) |

---

## 6. Export-Before-Delete Flow

This is the recommended flow for freeing up cloud storage space:

```
User clicks "Export & Delete" button on a file
  │
  ▼
Export & Delete confirmation modal appears
  "This will export 'filename' as .xlsx and delete it from the cloud. Continue?"
  │
  ├── Cancel ──► Modal closes, nothing happens
  │
  └── Confirm ──►
        │
        ├── 1. Export: workbookRef.current.getAllSheets() → XLSX.writeFile()
        │     └── Downloads 'filename.xlsx' to user's computer
        │
        └── 2. Delete: DELETE /api/spreadsheets/:id
              └── Removes from MongoDB
              └── Refreshes file list
              └── Shows success toast: "Exported and deleted 'filename'."
```

### Direct Delete (without export)

Also available with a red trash icon button. Shows a warning:
> ⚠️ This will permanently remove it from MongoDB. Make sure you have exported a copy if needed.

---

## 7. Modal Reference

### Save to Cloud Modal
- **Trigger:** Clicking "Save to Cloud" button
- **Content:** Text input for file name, Save/Cancel buttons
- **Behavior:** On save, calls `POST /api/spreadsheets`. If 409 response, closes this modal and opens the Limit Reached modal.

### Load from Cloud Modal
- **Trigger:** Clicking "Load from Cloud" button
- **Content:** List of saved files with name, last updated date, and three action buttons per file:
  - **Load** (blue) — Loads the file into the workbook
  - **Export & Delete** (amber, download icon) — Opens export confirmation
  - **Delete** (red, trash icon) — Opens delete confirmation
- **Header:** Shows file count `Cloud Files (N/20)`

### Storage Limit Reached Modal
- **Trigger:** 409 response from save endpoint
- **Content:** Warning that the 20-file limit has been reached
- **Actions:**
  - "Manage Files" — Opens the Load from Cloud modal
  - "Close" — Dismisses the warning

### Delete Confirmation Modal
- **Trigger:** Clicking the red trash icon on a file
- **Content:** Confirms the file name, warns about permanent deletion
- **Actions:** "Delete Permanently" / "Cancel"

### Export & Delete Confirmation Modal
- **Trigger:** Clicking the amber download icon on a file
- **Content:** Explains that the file will be exported as `.xlsx` and then deleted from the cloud
- **Actions:** "Export & Delete" / "Cancel"
