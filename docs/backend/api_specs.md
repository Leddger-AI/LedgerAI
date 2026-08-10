# API Endpoints Specification

Below are the HTTP endpoints exposed by the Leddger AI backend server (default: `http://localhost:5000`).

> **Migration Note:** The backend has been migrated from Python/FastAPI to Node.js/Express. Authentication has been migrated from Firebase Admin SDK to Supabase JWT verification. All `Authorization: Bearer` headers now expect a Supabase access token (not a Firebase ID token). See [Supabase Auth — Backend](../migration/supabase-auth-backend.md) for details.

---

## 📅 1. Calendar & OAuth Endpoints

### `GET /api/calendar/events`
* **Description**: Fetches Google Calendar events from the past 7 days, calculates costs, and applies AI classifications.
* **Query Parameters**:
  * `google_token` (String, required): Google OAuth Access Token (provider token from Supabase session).
* **Headers**:
  * `Authorization: Bearer <Supabase_Access_Token>` (required).
* **Response (JSON)**:
  ```json
  {
    "status": "success",
    "events": [
      {
        "eventId": "event_id_xyz",
        "title": "Phoenix Database Upgrade Migration",
        "description": "Postgres schema changes",
        "startTime": "2026-06-20T10:00:00Z",
        "endTime": "2026-06-20T11:00:00Z",
        "durationMinutes": 60,
        "attendees": [{"email": "dev@example.com", "name": "Developer", "response": "accepted"}],
        "aiProject": "Project Phoenix",
        "aiConfidence": 92,
        "aiReasoning": "Matching database keyword detected.",
        "cost": 75.0,
        "requiresHumanReview": false
      }
    ]
  }
  ```

### `GET /api/github/callback`
* **Description**: Callback landing URL for GitHub App installation. Exchanges code for token and redirects.
* **Query Parameters**:
  * `code` (String, required)
  * `state` (String, optional)
  * `installation_id` (String, optional)

---

## 👤 2. User Profile Endpoints (Supabase)

### `GET /api/user/departments`
* **Description**: Fetches the authenticated user's department list from the Supabase `profiles` table.
* **Headers**: `Authorization: Bearer <Supabase_Access_Token>`
* **Response**: `{ "departments": ["Engineering", "Marketing"] }`

### `POST /api/user/departments`
* **Description**: Updates the user's department list in the Supabase `profiles` table.
* **Headers**: `Authorization: Bearer <Supabase_Access_Token>`
* **Request Body**: `{ "departments": ["Engineering", "Marketing"] }`

---

## 📝 3. Form Drafts Endpoints (Supabase)

### `POST /api/drafts` (Protected)
* **Description**: Creates a new form draft in the Supabase `form_drafts` table.
* **Headers**: `Authorization: Bearer <Supabase_Access_Token>`
* **Request Body**: `{ "title": "Team Builder", "config": { ... }, "templateType": "team" }`
* **Response**: `{ "draftId": "uuid", "message": "Draft saved" }`

### `GET /api/drafts` (Protected)
* **Description**: Lists all drafts for the authenticated user from Supabase.
* **Headers**: `Authorization: Bearer <Supabase_Access_Token>`
* **Response**: `{ "drafts": [{ "draft_id": "...", "title": "...", "status": "draft", ... }] }`

### `DELETE /api/drafts/:draftId` (Protected)
* **Description**: Deletes a draft from Supabase.
* **Headers**: `Authorization: Bearer <Supabase_Access_Token>`

### `PUT /api/drafts/:draftId/activate` (Protected)
* **Description**: Activates a draft by setting an expiration timestamp.
* **Headers**: `Authorization: Bearer <Supabase_Access_Token>`
* **Request Body**: `{ "expiresAt": "2026-12-31T23:59:59Z" }`

### `GET /api/forms/:draftId` (Public)
* **Description**: Fetches a draft by ID for public form rendering. Returns 410 if expired, 403 if not yet activated.
* **Response**: `{ "draft": { "title": "...", "config": { ... } } }`

### `POST /api/forms/:draftId/submit` (Public)
* **Description**: Submits form data to the Supabase `form_submissions` table and triggers email notification.
* **Request Body**: `{ "field1": "value1", "field2": "value2" }`

---

## 📊 4. Spreadsheet Endpoints (MongoDB)

> All endpoints require `Authorization: Bearer <Supabase_Access_Token>`. Spreadsheet data is stored in MongoDB.

### `GET /api/spreadsheets`
* **Description**: Lists all saved spreadsheets for the user (without sheet data).
* **Response**: `{ "spreadsheets": [{ "_id": "...", "name": "...", "updatedAt": "...", "createdAt": "..." }] }`

### `GET /api/spreadsheets/:id`
* **Description**: Loads a specific spreadsheet with full FortuneSheet data.
* **Response**: `{ "spreadsheet": { "_id": "...", "name": "...", "sheets": [...], ... } }`

### `POST /api/spreadsheets`
* **Description**: Saves a new spreadsheet. Enforces 20-file limit.
* **Request Body**: `{ "name": "Q4 Team Roster", "sheets": [...] }`
* **Response (success)**: `{ "message": "Spreadsheet saved", "spreadsheet": { ... } }`
* **Response (limit reached — 409)**: `{ "error": "Spreadsheet limit reached", "limit": 20, "message": "..." }`

### `PUT /api/spreadsheets/:id`
* **Description**: Updates an existing spreadsheet by ID.
* **Request Body**: `{ "name": "Updated Name", "sheets": [...] }`

### `DELETE /api/spreadsheets/:id`
* **Description**: Deletes a spreadsheet from MongoDB.
* **Response**: `{ "message": "Spreadsheet deleted successfully" }`

### `GET /api/spreadsheets/count`
* **Description**: Gets the current count and limit info.
* **Response**: `{ "count": 15, "limit": 20 }`

---

## 📅 5. Meetings Endpoints (Supabase)

> All endpoints require `Authorization: Bearer <Supabase_Access_Token>`.

### `GET /api/meetings`
* **Description**: Fetches all meetings for the user, ordered by creation date (newest first).
* **Response**: `{ "meetings": [{ "id": "...", "title": "...", "start_time": "...", ... }] }`

### `POST /api/meetings`
* **Description**: Saves a new meeting to Supabase.
* **Request Body**: `{ "title": "...", "startTime": "...", "endTime": "...", "durationMinutes": 60, "attendees": [...], "aiProject": "...", "aiConfidence": 92, "requiresHumanReview": false }`

### `DELETE /api/meetings/:id`
* **Description**: Deletes a meeting by UUID.
* **Response**: `{ "message": "Meeting deleted" }`

---

## 🔔 6. Alerts Endpoints (Supabase)

> All endpoints require `Authorization: Bearer <Supabase_Access_Token>`.

### `GET /api/alerts`
* **Description**: Fetches all alerts for the user, ordered by creation date (newest first).
* **Response**: `{ "alerts": [{ "id": "...", "type": "danger", "title": "...", "description": "...", "resolved": false }] }`

### `POST /api/alerts`
* **Description**: Creates a new alert.
* **Request Body**: `{ "type": "danger", "title": "...", "description": "..." }`

### `PUT /api/alerts/:id/resolve`
* **Description**: Marks an alert as resolved.
* **Response**: `{ "alert": { ... "resolved": true } }`

### `DELETE /api/alerts/:id`
* **Description**: Deletes an alert.
* **Response**: `{ "message": "Alert deleted" }`

---

## 📚 7. Knowledge Base Endpoints (Legacy — Rust Backend)

> **Note:** These endpoints are served by the legacy Rust backend (`backend_rs/`), not the Node.js server. They are documented for reference but are not part of the current active backend.

### `POST /api/kb/ingest/file`
* **Description**: Uploads and ingests a `.txt`, `.docx`, or `.pdf` document.
* **Request Body (Multipart Form)**:
  * `file` (File, required)
  * `scope` (String, optional, default: `"team"`)
  * `owner_id` (String, required)
  * `team_id` (String, required)
  * `chunk_size_tokens` (Integer, optional, default: `3000`)
  * `chunk_overlap_tokens` (Integer, optional, default: `300`)

### `POST /api/kb/ingest/slack`
* **Description**: Ingests multi-turn Slack conversation threads.

### `GET /api/kb/documents`
* **Description**: Returns summaries of all ingested documents.

### `GET /api/kb/documents/{document_id}`
* **Description**: Retrieves full details and chunks of a specific document.

### `DELETE /api/kb/documents/{document_id}`
* **Description**: Removes the document from the local JSON store.
