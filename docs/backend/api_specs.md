# API Endpoints Specification

Below are the HTTP endpoints exposed by the Ledger AI Rust backend server (default: `http://localhost:8000`).

---

## 📅 1. Calendar & OAuth Endpoints

### `GET /api/calendar/events`
* **Description**: Fetches Google Calendar events from the past 7 days, calculates costs, and applies AI classifications.
* **Query Parameters**:
  * `google_token` (String, required): Google OAuth Access Token.
* **Headers**:
  * `Authorization: Bearer <Firebase_JWT>` (required).
* **Response (JSON)**:
  ```json
  {
    "status": "success",
    "firebaseUid": "user_id_123",
    "email": "user@example.com",
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

### `POST /ai/attribute-meeting`
* **Description**: Classifies a single meeting payload.
* **Request Body (JSON)**:
  ```json
  {
    "title": "Phoenix Database Upgrade",
    "description": "Postgres schema sync",
    "duration_minutes": 60,
    "attendees_count": 3
  }
  ```
* **Response (JSON)**:
  ```json
  {
    "project_name": "Project Phoenix",
    "confidence_score": 92,
    "reasoning": "Matching technical keyword detected."
  }
  ```

---

## 📚 2. Knowledge Base Endpoints

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
* **Request Body (JSON)**:
  ```json
  {
    "thread_ts": "1718283600.0001",
    "messages": [
      {
        "user_id": "U12345",
        "text": "Discussing Phoenix migration parameters",
        "timestamp": "1718283600.0001"
      }
    ],
    "scope": "team",
    "owner_id": "U12345",
    "team_id": "T67890"
  }
  ```

### `GET /api/kb/documents`
* **Description**: Returns summaries of all ingested documents in the registry.

### `GET /api/kb/documents/{document_id}`
* **Description**: Retrieves full details and chunks of a specific document.

### `DELETE /api/kb/documents/{document_id}`
* **Description**: Removes the document registry and chunks from the local JSON store.
