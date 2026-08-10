# Meetings & Alerts Persistence to Supabase (Phase 7)

This document details the backend endpoints and frontend wiring for persisting meetings and alerts to Supabase.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Supabase Tables](#2-supabase-tables)
3. [Backend Endpoints — Meetings](#3-backend-endpoints--meetings)
4. [Backend Endpoints — Alerts](#4-backend-endpoints--alerts)
5. [Frontend Integration in App.jsx](#5-frontend-integration-in-appjsx)
6. [Data Mapping](#6-data-mapping)
7. [Fallback Behavior](#7-fallback-behavior)

---

## 1. Overview

Previously, meetings and alerts were hardcoded mock data in `App.jsx` state. They are now persisted to Supabase tables (`meetings` and `alerts`) and loaded on authentication.

### Data Flow

```
User logs in (Supabase auth)
  │
  ├── onAuthChange fires with session
  │     ├── fetchMeetings(session.access_token)
  │     │     └── GET /api/meetings ──► Supabase `meetings` table
  │     │
  │     └── fetchAlerts(session.access_token)
  │           └── GET /api/alerts ──► Supabase `alerts` table
  │
  └── App renders with real data (or mock fallback if empty)
```

---

## 2. Supabase Tables

### `meetings` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto) |
| `user_id` | UUID | FK to `auth.users` |
| `title` | TEXT | Meeting title |
| `start_time` | TIMESTAMPTZ | Meeting start |
| `end_time` | TIMESTAMPTZ | Meeting end |
| `duration_minutes` | INT | Duration in minutes |
| `attendees` | JSONB | Array of attendee objects |
| `ai_project` | TEXT | AI-classified project name |
| `ai_confidence` | FLOAT | Confidence score (0-100) |
| `requires_human_review` | BOOLEAN | Needs manual review? |
| `created_at` | TIMESTAMPTZ | Auto |

**RLS Policy:** `auth.uid() = user_id` (users can only access their own meetings)

### `alerts` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto) |
| `user_id` | UUID | FK to `auth.users` |
| `type` | TEXT | Alert type ('danger', 'warning', 'info') |
| `title` | TEXT | Alert title |
| `description` | TEXT | Alert details |
| `resolved` | BOOLEAN | Default `FALSE` |
| `created_at` | TIMESTAMPTZ | Auto |

**RLS Policy:** `auth.uid() = user_id` (users can only access their own alerts)

---

## 3. Backend Endpoints — Meetings

All endpoints require `Authorization: Bearer <Supabase_Access_Token>`.

### `GET /api/meetings`
Fetch all meetings for the authenticated user, ordered by creation date (newest first).

**Response:**
```json
{
  "meetings": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "Phoenix Database Upgrade",
      "start_time": "2026-08-10T10:00:00Z",
      "end_time": "2026-08-10T11:00:00Z",
      "duration_minutes": 60,
      "attendees": [{"email": "dev@example.com"}],
      "ai_project": "Project Phoenix",
      "ai_confidence": 92,
      "requires_human_review": false,
      "created_at": "2026-08-10T12:00:00Z"
    }
  ]
}
```

### `POST /api/meetings`
Save a new meeting.

**Request Body:**
```json
{
  "title": "Phoenix Database Upgrade",
  "startTime": "2026-08-10T10:00:00Z",
  "endTime": "2026-08-10T11:00:00Z",
  "durationMinutes": 60,
  "attendees": [{"email": "dev@example.com"}],
  "aiProject": "Project Phoenix",
  "aiConfidence": 92,
  "requiresHumanReview": false
}
```

**Response:**
```json
{ "meeting": { ... } }
```

### `DELETE /api/meetings/:id`
Delete a meeting by its UUID.

**Response:**
```json
{ "message": "Meeting deleted" }
```

---

## 4. Backend Endpoints — Alerts

### `GET /api/alerts`
Fetch all alerts for the authenticated user, ordered by creation date (newest first).

**Response:**
```json
{
  "alerts": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "type": "danger",
      "title": "Phoenix Cost Overrun Risk",
      "description": "Project Phoenix meeting costs have exceeded Q2 threshold by 14%.",
      "resolved": false,
      "created_at": "2026-08-10T12:00:00Z"
    }
  ]
}
```

### `POST /api/alerts`
Create a new alert.

**Request Body:**
```json
{
  "type": "danger",
  "title": "Phoenix Cost Overrun Risk",
  "description": "Project Phoenix meeting costs have exceeded Q2 threshold by 14%."
}
```

### `PUT /api/alerts/:id/resolve`
Mark an alert as resolved.

**Response:**
```json
{ "alert": { ... "resolved": true } }
```

### `DELETE /api/alerts/:id`
Delete an alert.

**Response:**
```json
{ "message": "Alert deleted" }
```

---

## 5. Frontend Integration in App.jsx

### `fetchMeetings(accessToken)`

Called on auth state change (both initial session check and `onAuthChange` subscription):

```js
const fetchMeetings = async (accessToken) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/meetings`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (response.ok) {
      const data = await response.json();
      if (data.meetings && data.meetings.length > 0) {
        const mapped = data.meetings.map((m, idx) => ({
          id: m.id || idx,
          title: m.title,
          duration: m.duration_minutes ? `${Math.floor(m.duration_minutes / 60)}h ${m.duration_minutes % 60}m` : '1h 0m',
          attendeeCount: Array.isArray(m.attendees) ? m.attendees.length : 0,
          cost: m.cost || 0,
          project: m.ai_project || 'Internal Operations',
          confidence: m.ai_confidence || 0,
          status: m.requires_human_review ? 'needs_review' : 'approved',
          time: m.start_time ? new Date(m.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'All-day'
        }));
        setMeetings(mapped);
      }
    }
  } catch (err) {
    console.warn('Failed to fetch meetings from Supabase, using mock data.');
  }
};
```

### `fetchAlerts(accessToken)`

```js
const fetchAlerts = async (accessToken) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/alerts`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (response.ok) {
      const data = await response.json();
      if (data.alerts && data.alerts.length > 0) {
        const mapped = data.alerts.map((a) => ({
          id: a.id,
          type: a.type,
          title: a.title,
          desc: a.description,
          resolved: a.resolved
        }));
        setAlerts(mapped);
      }
    }
  } catch (err) {
    console.warn('Failed to fetch alerts from Supabase, using mock data.');
  }
};
```

### Auth State Hook Integration

Both functions are called in the `useEffect` auth listener:

```js
// Initial session check
getCurrentSession().then((session) => {
  if (session) {
    // ... set user, tokens ...
    fetchMeetings(session.accessToken);
    fetchAlerts(session.accessToken);
  }
});

// Auth state change subscription
onAuthChange(async (event, session) => {
  if (session?.user) {
    // ... set user, tokens ...
    await fetchMeetings(session.access_token);
    await fetchAlerts(session.access_token);
  }
});
```

---

## 6. Data Mapping

### Meetings: Supabase → Frontend

| Supabase Column | Frontend State Field | Transformation |
|----------------|---------------------|-----------------|
| `id` | `id` | Direct |
| `title` | `title` | Direct |
| `duration_minutes` | `duration` | `${hours}h ${mins}m` format |
| `attendees` (JSONB) | `attendeeCount` | `Array.isArray() ? length : 0` |
| `ai_project` | `project` | Default: 'Internal Operations' |
| `ai_confidence` | `confidence` | Default: 0 |
| `requires_human_review` | `status` | `true → 'needs_review'`, `false → 'approved'` |
| `start_time` | `time` | Formatted to `HH:MM AM/PM` |

### Alerts: Supabase → Frontend

| Supabase Column | Frontend State Field | Transformation |
|----------------|---------------------|-----------------|
| `id` | `id` | Direct |
| `type` | `type` | Direct |
| `title` | `title` | Direct |
| `description` | `desc` | Direct |
| `resolved` | `resolved` | Direct |

---

## 7. Fallback Behavior

Both `fetchMeetings` and `fetchAlerts` are designed to **fail silently**:

- If the API call fails (network error, server down, etc.), a `console.warn` is logged.
- The existing mock data in `useState` initializers remains untouched.
- This means the UI always has data to display, even if the backend is unavailable.
- The mock data is only replaced if the API returns **non-empty** results (`data.meetings.length > 0`).

This ensures backward compatibility with the demo mode and local development without a running backend.
