# Settings Page — Backend API Reference

## Overview

Complete reference for all backend API endpoints related to the Settings page, including authentication, request/response formats, and error codes.

---

## Authentication

All settings endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <supabase-access-token>
```

The token is verified by `middleware/auth.js` which calls `supabase.auth.getUser(token)`. On success, `req.user.uid` and `req.user.email` are available in route handlers.

**Development bypass**: If Supabase env vars are not set, the auth middleware creates a mock user (`DEV_MOCK_UID_*`) for local development.

---

## Endpoints

### Cloudinary

#### GET /api/cloudinary/status

Check if Cloudinary is configured and reachable.

**Response (200)**:
```json
{
  "configured": true,
  "cloudName": "your-cloud-name",
  "status": "ok"
}
```

**Response (200, not configured)**:
```json
{
  "configured": false,
  "message": "Cloudinary not installed or env vars not set"
}
```

---

#### POST /api/cloudinary/avatar

Upload a user avatar with automatic Sharp compression and WebP conversion.

**Request**: `multipart/form-data`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Image (JPEG/PNG/WebP/GIF, max 5MB) |

**Response (200)**:
```json
{
  "secure_url": "https://res.cloudinary.com/.../avatars/user-uid.webp",
  "public_id": "avatars/user-uid",
  "format": "webp",
  "size_kb": 38,
  "width": 256,
  "height": 256
}
```

**Side Effects**:
- Uploads to Cloudinary with `public_id: avatars/{userId}`, `overwrite: true`
- Updates `profiles.avatar_url` in Supabase

**Errors**:
| Status | Condition |
|--------|-----------|
| 400 | No file in request |
| 500 | Cloudinary not configured / Sharp error / Cloudinary upload error |

---

#### DELETE /api/cloudinary/avatar

Remove the user's avatar from Cloudinary and Supabase.

**Response (200)**:
```json
{
  "result": "ok",
  "publicId": "avatars/user-uid"
}
```

**Side Effects**:
- Calls `cloudinary.uploader.destroy("avatars/{userId}")`
- Sets `profiles.avatar_url = null` in Supabase

---

#### POST /api/cloudinary/upload

Generic file upload (non-avatar). Does not apply Sharp compression.

**Request**: `multipart/form-data`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Image file (max 5MB) |
| `folder` | String | No | Cloudinary folder (default: `leddger-ai`) |

**Response (200)**:
```json
{
  "secure_url": "https://res.cloudinary.com/.../leddger-ai/abc123.jpg",
  "public_id": "leddger-ai/abc123",
  "format": "jpg",
  "width": 1920,
  "height": 1080,
  "bytes": 245678
}
```

---

#### DELETE /api/cloudinary/:publicId

Delete any Cloudinary asset by its public ID.

**URL Params**: `publicId` — Cloudinary public ID (URL-encoded)

**Response (200)**:
```json
{
  "result": "ok",
  "publicId": "leddger-ai/abc123"
}
```

---

### User Profile

#### GET /api/user/profile

Fetch the authenticated user's profile. Auto-creates if missing.

**Response (200)**:
```json
{
  "id": "uuid-string",
  "email": "user@example.com",
  "display_name": "John Doe",
  "avatar_url": "https://res.cloudinary.com/...",
  "departments": ["Engineering", "Sales"]
}
```

---

#### PUT /api/user/profile

Update the user's profile fields.

**Request**: `application/json`
| Field | Type | Optional | Description |
|-------|------|----------|-------------|
| `display_name` | String | Yes | Display name |
| `avatar_url` | String | Yes | Avatar URL (or null to clear) |

**Response (200)**: Same shape as GET /api/user/profile

**Errors**:
| Status | Condition |
|--------|-----------|
| 400 | Supabase update failed |
| 500 | Server error |

---

### Departments

#### GET /api/user/departments

Fetch the user's department list.

**Response (200)**:
```json
{
  "departments": ["Engineering", "Sales", "Marketing"]
}
```

---

#### POST /api/user/departments

Save the user's department list (replaces entire list).

**Request**: `application/json`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `departments` | String[] | Yes | Array of department names |

**Response (200)**:
```json
{
  "departments": ["Engineering", "Sales", "Marketing"]
}
```

---

### Email Configuration

#### GET /api/email/config

Fetch the user's email configuration.

**Response (200)**:
```json
{
  "email": "user@gmail.com",
  "authMethod": "app_password",
  "smtpHost": "smtp.gmail.com",
  "smtpPort": 587,
  "clientId": "...",
  "active": true
}
```

---

#### PUT /api/email/config

Create or update email configuration.

**Request**: `application/json`

For App Password auth:
```json
{
  "email": "user@gmail.com",
  "authMethod": "app_password",
  "smtpHost": "smtp.gmail.com",
  "smtpPort": 587,
  "appPassword": "16-char-app-password"
}
```

For OAuth2 auth:
```json
{
  "email": "user@gmail.com",
  "authMethod": "oauth2",
  "smtpHost": "smtp.gmail.com",
  "smtpPort": 587,
  "clientId": "...",
  "clientSecret": "...",
  "refreshToken": "..."
}
```

---

#### POST /api/email/test

Send a test email to verify configuration.

**Request**: `application/json`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `toEmail` | String | Yes | Recipient email |

---

#### DELETE /api/email/config

Delete the user's email configuration.

---

## Error Response Format

All errors return JSON:

```json
{
  "error": "Human-readable error message"
}
```

## Rate Limiting

No rate limiting is currently implemented on these endpoints. This should be added for production.

## CORS

CORS is configured in `server/index.js`. If `CORS_ORIGINS` env var is not set, all origins are allowed (development mode). For production, set:

```env
CORS_ORIGINS=https://your-frontend-domain.com,https://www.your-domain.com
```
