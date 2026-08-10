# Email Body Editor — Data Source & Layout Refactor

## Overview

This document covers the changes made to the Email Body Editor (`EmailBodyEditor.jsx`) and its associated backend endpoint. The work introduces a dual-option Data Source system (local file upload + Roster Studio cloud picker), increases the editor and sidebar dimensions, and ensures the layout fits perfectly within the dashboard viewport with no overflow.

---

## Files Modified

| File | Type | Summary |
|------|------|---------|
| `src/pages/EmailBodyEditor.jsx` | Frontend | New imports, state, functions, and JSX for Data Source tabs, modal, and Excel support |
| `src/pages/EmailBodyEditor.css` | Frontend | Layout sizing, modal styles, option buttons, cloud list, responsive fit |
| `server/index.js` | Backend | New `GET /api/spreadsheets/:id/headers` endpoint |

---

## Changes by Phase

### Phase 1: Increase Editor & Sidebar Size

**Goal:** Make the editor card and Check Template sidebar larger and more usable.

| CSS Property | Before | After |
|--------------|--------|-------|
| `.editor-card` width | `max-width: 800px` | `flex: 1` (fills available space) |
| `.editor-card` height | auto | `height: 100%` |
| `.sidebar-column` width | `320px` | `320px` (kept, was `380px` briefly) |
| `.email-editor-layout` gap | `24px` | `20px` |
| `.email-editor-layout` align-items | `flex-start` | `stretch` |
| `.body-container` min-height | `400px` | `0` (flex-based, `overflow-y: auto`) |

### Phase 2: Local Excel Import

**Goal:** Allow users to import variables from `.xlsx` and `.xls` files in addition to `.csv`.

**Changes in `EmailBodyEditor.jsx`:**
- Added `import * as XLSX from 'xlsx'`
- Added `import { getAuthToken } from '../supabaseAuth'`
- Added `API_BASE_URL` constant from environment
- Refactored `handleFileUpload` to branch on file extension:
  - `.csv` → uses `Papa.parse` (existing logic)
  - `.xlsx` / `.xls` → uses `XLSX.read` + `XLSX.utils.sheet_to_json` with `header: 1` to extract first row as column headers
- Updated file input `accept` attribute: `.csv` → `.csv,.xlsx,.xls`
- Extracted shared `addVariablesFromHeaders(headers)` helper to deduplicate variable-adding logic

### Phase 3: Roster Studio Cloud Picker

**Goal:** Let users select a saved spreadsheet from Roster Studio and import its column headers as email variables.

**New State:**
```javascript
const [dataSourceTab, setDataSourceTab] = useState('upload');
const [cloudFiles, setCloudFiles] = useState([]);
const [cloudLoading, setCloudLoading] = useState(false);
const [cloudError, setCloudError] = useState(null);
const [cloudSelectedId, setCloudSelectedId] = useState(null);
const [cloudImporting, setCloudImporting] = useState(false);
const [importSource, setImportSource] = useState(null);
const [showRosterModal, setShowRosterModal] = useState(false);
```

**New Functions:**
- `fetchCloudFiles()` — calls `GET /api/spreadsheets/metadata` with auth token, populates `cloudFiles` state
- `handleCloudFileSelect(fileId, fileName)` — calls `GET /api/spreadsheets/:id/headers`, extracts headers, adds as variables, closes modal

**UI Flow:**
1. Data Source card shows two centered option buttons: **Upload File** and **Roster Studio**
2. Clicking **Roster Studio** opens a centered modal overlay
3. Modal displays a scrollable list of saved cloud spreadsheets (name + sheet count)
4. Clicking a file fetches its headers and adds them as variables
5. Modal auto-closes on success
6. Data Source card shows a blue chip with the selected file name + "Change" button
7. "Clear" button resets all imported variables

**Modal States:**
- **Loading:** Spinner with "Loading your files..."
- **Error:** Warning icon + error message + "Retry" button
- **Empty:** "No saved spreadsheets yet. Create one in Roster Studio first."
- **List:** Scrollable list of cloud files, each showing name + sheet count

### Phase 4: Backend Headers Endpoint

**Goal:** Efficiently extract column headers from a saved spreadsheet without returning the full data blob.

**New Endpoint:** `GET /api/spreadsheets/:id/headers`

**Location:** `server/index.js` (after the `/api/spreadsheets/metadata` route)

**Logic:**
1. Fetch spreadsheet by `_id` + `ownerUid` (auth-protected via `verifyToken`)
2. Get the first sheet from `doc.sheets`
3. Try dense `data` matrix first: `sheet.data[0]` → extract `cell.m ?? cell.v` from each cell
4. Fallback to sparse `celldata` array: filter cells where `r === 0`, sort by `c`, extract values
5. Return `{ headers: ['column1', 'column2', ...] }`

**Response Example:**
```json
{
  "headers": ["First Name", "Last Name", "Email", "Company"]
}
```

### Phase 5: Polish & Edge Cases

- **Clear button:** Resets variables to defaults, clears import source and cloud selection
- **Import source indicator:** Shows file name in the success message (e.g., "Added 4 custom variables from contacts.xlsx!")
- **Variable deduplication:** Variables are deduplicated by `id` (lowercased, underscored header name)
- **Modal close on overlay click:** Clicking outside the modal closes it (disabled while importing)

### Phase 6: Layout Fit (No Scroll)

**Goal:** Ensure the Email Body Editor fits perfectly within the dashboard viewport with no page-level scroll.

**Key CSS Changes:**
| Property | Before | After | Purpose |
|----------|--------|-------|---------|
| `.email-editor-container` padding | `40px` | `16px` | Reclaim 48px horizontal space |
| `.email-editor-container` overflow | none | `hidden` | Prevent spill |
| `.email-editor-layout` overflow | `hidden` / `auto` | `hidden` | No layout scroll |
| `.email-editor-layout` align-items | `flex-start` | `stretch` | Fill full height |
| `.sidebar-column` height | auto | `100%` + `overflow-y: auto` | Independent scroll |
| `.body-container` min-height | `500px` | `0` + `overflow-y: auto` | Flex-based sizing |
| `.check-template-sidebar` padding | `24px` | `20px` | Save vertical space |
| `.data-source-card` padding | `24px` | `20px` | Save vertical space |
| `.metric-row` margin-bottom | `20px` | `14px` | Save 42px across 7 rows |
| `.check-template-btn` margin-bottom | `24px` | `16px` | Save 8px |
| "Write Email Body" heading | Present | Removed | Save ~40px |

**Removed:** The "Write Email Body" `<h2>` heading and its wrapper div — the page is now identified by the sidebar navigation, making the heading redundant.

---

## Dashboard Layout Context

The Email Body Editor renders inside the dashboard viewport:

```
.layout-wrapper (100vw, padding: 16px, gap: 16px)
├── .mini-sidebar (64px fixed)
├── .app-container (flex: 1, gap: 16px)
│   ├── .secondary-sidebar (280px fixed)
│   └── .main-content (flex: 1, overflow: hidden)
│       ├── .top-header (76px)
│       └── .dashboard-viewport (flex: 1, padding: 32px, overflow-y: auto)
│           └── EmailBodyEditor
```

**Available content width on 1280px screen:** ~808px
**EmailBodyEditor consumes:** 16px(pad) + editor-card(flex:1) + 20px(gap) + 320px(sidebar) + 16px(pad) = 372px + editor-card
**Editor card gets:** ~436px — sufficient for comfortable editing

---

## Sidebar Navigation Changes

As part of this work, the **Files** page was also moved in the sidebar:

- **Before:** Files was under **Workspace** primary nav
- **After:** Files is under **Inbox** primary nav, appearing after Schedule

Removed non-functional nav items from the Inbox section:
- Others header, Spam, Trash
- Team inboxes header, Manage Subscription, Manage Labels
- Associated dividers

**Files modified:** `src/App.jsx` — `SECONDARY_NAVS.Inbox` array and `calculatePrimaryNav()` function

---

## Testing Checklist

- [ ] Upload a `.csv` file → variables appear in Variables dropdown
- [ ] Upload a `.xlsx` file → variables appear in Variables dropdown
- [ ] Click "Roster Studio" → modal opens centered on screen
- [ ] Select a cloud spreadsheet → headers imported as variables, modal closes
- [ ] Click "Change" on the chip → modal reopens
- [ ] Click "Clear" → all imported variables removed
- [ ] No page-level scroll on the Email Body Editor page
- [ ] Editor card fills full available height even with no text
- [ ] Sidebar column scrolls independently if content exceeds viewport height
- [ ] Files page accessible via Inbox → Files in sidebar
- [ ] Backend `/api/spreadsheets/:id/headers` returns correct headers for both dense and sparse sheet formats
