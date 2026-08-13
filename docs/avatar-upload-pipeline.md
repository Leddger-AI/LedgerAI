# Avatar Upload Pipeline — Sharp + WebP + Cloudinary

## Overview

This document details the complete image processing pipeline for user avatar uploads in Leddger-AI, covering the full journey from browser file selection to Cloudinary CDN delivery.

---

## Table of Contents

1. [Pipeline Summary](#pipeline-summary)
2. [Packages & Dependencies](#packages--dependencies)
3. [Software Engines](#software-engines)
4. [Implementation Details](#implementation-details)
5. [API Reference](#api-reference)
6. [Data Flow Diagram](#data-flow-diagram)
7. [Configuration](#configuration)
8. [Error Handling](#error-handling)
9. [Performance Characteristics](#performance-characteristics)

---

## Pipeline Summary

```
User selects image (JPEG/PNG/WebP/GIF, up to 5MB)
        │
        ▼
┌─────────────────────────────────┐
│  Frontend (ProfileSection.jsx)  │
│  - File type validation         │
│  - File size validation (5MB)   │
│  - FormData + Bearer token      │
└──────────┬──────────────────────┘
           │ POST /api/cloudinary/avatar
           ▼
┌─────────────────────────────────┐
│  Multer (memoryStorage)         │
│  - Parses multipart/form-data   │
│  - Stores file in RAM buffer    │
│  - fileFilter: image types only │
│  - limits: 5MB max              │
└──────────┬──────────────────────┘
           │ req.file.buffer
           ▼
┌─────────────────────────────────┐
│  Sharp (libvips C++ bindings)   │
│  - Resize: 256×256 cover crop   │
│  - Convert: WebP format         │
│  - Compress: iterative quality  │
│    (80→70→60→...→20, ≤50KB)     │
└──────────┬──────────────────────┘
           │ compressed Buffer
           ▼
┌─────────────────────────────────┐
│  Cloudinary (upload_stream)     │
│  - public_id: avatars/{userId}  │
│  - overwrite: true              │
│  - format: webp                 │
│  - resource_type: image         │
└──────────┬──────────────────────┘
           │ secure_url
           ▼
┌─────────────────────────────────┐
│  Supabase (profiles table)      │
│  - UPDATE avatar_url            │
│  - WHERE id = userId            │
└──────────┬──────────────────────┘
           │
           ▼
Response → { secure_url, public_id, format, size_kb, width, height }
```

---

## Packages & Dependencies

### Backend (server/package.json)

| Package | Version | Purpose |
|---------|---------|---------|
| `cloudinary` | Latest | Cloud-based image storage, optimization, and CDN delivery |
| `multer` | Latest | Express middleware for parsing `multipart/form-data` file uploads |
| `sharp` | Latest | High-performance Node.js image processing (C++ bindings to libvips) |

### Frontend (package.json)

No additional packages required — uses native `fetch` API and `FormData`.

### Installation

```bash
cd server
npm install cloudinary multer sharp
```

---

## Software Engines

### Sharp (Image Processing)

- **Underlying engine**: libvips (C/C++ library for image processing)
- **Performance**: 4-5x faster than ImageMagick/GraphicsMagick
- **Memory model**: Streams-based, processes in memory (no disk I/O with Multer memoryStorage)
- **WebP encoding**: Uses libwebp with configurable effort (0-6)
- **Why Sharp over alternatives**:
  - Native C++ bindings → near-native performance
  - Stream-based API → minimal memory footprint
  - Built-in WebP support → no additional codecs needed
  - Active maintenance and broad format support

### Multer (File Upload Middleware)

- **Storage engine**: `memoryStorage()` — keeps file in RAM as Buffer
- **Why memoryStorage over diskStorage**:
  - No disk I/O — file goes directly from RAM to Sharp to Cloudinary
  - Faster for small files (avatars are always <5MB)
  - No temp file cleanup needed
- **fileFilter**: Rejects non-image MIME types before processing
- **limits**: 5MB max file size (prevents RAM exhaustion)

### Cloudinary (Cloud Storage & CDN)

- **Upload method**: `upload_stream()` — accepts Buffer directly
- **public_id strategy**: `avatars/{userId}` — deterministic per user
  - Re-upload automatically overwrites (no orphaned images)
  - No need to manually delete old avatar on re-upload
  - `overwrite: true` flag ensures replacement
- **Format**: Forced to `webp` at the Cloudinary level
- **CDN delivery**: `secure_url` served via Cloudinary's global CDN

### Supabase (Profile Persistence)

- **Table**: `profiles`
- **Column**: `avatar_url TEXT`
- **Update pattern**: `UPDATE profiles SET avatar_url = $1 WHERE id = $2`
- **Fallback**: If Supabase update fails, Cloudinary URL is still returned to client (avatar is live)

---

## Implementation Details

### compressToTargetSize() — Iterative Quality Reduction

Sharp does not have a built-in "target file size" option. The only way to achieve a specific output size is brute-force quality reduction (confirmed by Sharp maintainer @lovell).

```javascript
async function compressToTargetSize(buffer, maxBytes = 50 * 1024, dimension = 256) {
  let quality = 80;
  let output = buffer;

  while (quality >= 20) {
    output = await sharp(buffer)
      .resize(dimension, dimension, { fit: 'cover', position: 'center' })
      .webp({ quality, effort: 4 })
      .toBuffer();

    if (output.length <= maxBytes) break;
    quality -= 10;
  }

  return output;
}
```

**Algorithm:**
1. Start at quality 80 (good visual quality)
2. Encode to WebP at current quality
3. Check if output ≤ 50KB
4. If yes → done. If no → reduce quality by 10, repeat
5. Minimum quality floor: 20 (prevents unusable images)
6. Maximum iterations: 7 (80→70→60→50→40→30→20)

**Why step-down by 10 instead of binary search?**
- For 50KB target, the step-down approach is fast enough (max 7 iterations)
- Binary search adds complexity for marginal gain at this file size
- Each Sharp encode operation takes ~5-15ms for 256x256, so worst case is ~105ms

### WebP Conversion

All input formats (JPEG, PNG, WebP, GIF) are converted to WebP:

```javascript
.webp({ quality, effort: 4 })
```

- **effort: 4**: Balance between encoding speed and compression ratio (0=fastest, 6=best compression)
- **quality**: Dynamic (80→20 via iterative reduction)
- **Why WebP**:
  - ~30% smaller than JPEG at equivalent quality
  - Supports transparency (unlike JPEG)
  - Supported by 97%+ of modern browsers
  - Native support in Sharp via libwebp

### Cloudinary Upload with User-Scoped public_id

```javascript
const publicId = `avatars/${userId}`;

cloudinary.uploader.upload_stream({
  public_id: publicId,
  overwrite: true,
  resource_type: 'image',
  format: 'webp',
}, callback);
```

**Key design decisions:**
- `public_id: avatars/{userId}` — deterministic, one avatar per user
- `overwrite: true` — re-upload replaces old image (no manual delete needed)
- `format: webp` — Cloudinary stores as WebP natively
- No `folder` parameter — `public_id` with slash creates folder structure automatically

---

## API Reference

### POST /api/cloudinary/avatar

Uploads, compresses, and stores a user avatar.

**Authentication**: Bearer token (Supabase JWT)

**Request**: `multipart/form-data`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Image file (JPEG/PNG/WebP/GIF, max 5MB) |

**Response (200)**:
```json
{
  "secure_url": "https://res.cloudinary.com/eyfrnudq/image/upload/v123/avatars/user-uid.webp",
  "public_id": "avatars/user-uid",
  "format": "webp",
  "size_kb": 38,
  "width": 256,
  "height": 256
}
```

**Errors**:
| Status | Cause |
|--------|-------|
| 400 | No file provided |
| 401 | Invalid/missing token |
| 500 | Cloudinary not configured / Sharp processing failed / Cloudinary upload failed |

---

### DELETE /api/cloudinary/avatar

Removes the user's avatar from Cloudinary and clears the Supabase profile.

**Authentication**: Bearer token (Supabase JWT)

**Response (200)**:
```json
{
  "result": "ok",
  "publicId": "avatars/user-uid"
}
```

---

### GET /api/user/profile

Fetches the authenticated user's profile from Supabase.

**Authentication**: Bearer token (Supabase JWT)

**Response (200)**:
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "display_name": "John Doe",
  "avatar_url": "https://res.cloudinary.com/...",
  "departments": ["Engineering", "Sales"]
}
```

---

### PUT /api/user/profile

Updates the user's profile in Supabase.

**Authentication**: Bearer token (Supabase JWT)

**Request**: `application/json`
| Field | Type | Optional | Description |
|-------|------|----------|-------------|
| `display_name` | String | Yes | User's display name |
| `avatar_url` | String | Yes | Cloudinary avatar URL |

**Response (200)**: Same as GET /api/user/profile

---

## Data Flow Diagram

```
┌──────────────────┐     FormData      ┌──────────────────┐
│  Browser         │ ───────────────► │  Express Server   │
│  ProfileSection  │   POST /avatar   │                   │
│                  │                  │  1. verifyToken   │
│  - validate file │                  │  2. multer parse  │
│  - show spinner  │                  │  3. sharp compress│
│  - update UI     │                  │  4. cloudinary    │
│                  │  ◄───────────── │  5. supabase sync │
│                  │   JSON response  │                   │
└──────────────────┘                  └──────────────────┘
                                              │
                                    ┌─────────┴─────────┐
                                    │                   │
                              ┌─────▼─────┐     ┌──────▼──────┐
                              │ Cloudinary│     │  Supabase   │
                              │  (CDN)    │     │  profiles   │
                              │           │     │  avatar_url │
                              └───────────┘     └─────────────┘
```

---

## Configuration

### Environment Variables (server/.env)

```env
CLOUDINARY_CLOUDNAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECREAT=your-api-secret
```

> **Note**: The env var is `CLOUDINARY_API_SECREAT` (with the typo) as per the existing project convention. The code accepts both `CLOUDINARY_API_SECREAT` and `CLOUDINARY_API_SECRET` as fallbacks.

### Supabase Schema

The `profiles` table must have the `avatar_url` column:

```sql
-- Already defined in supabase_schema.sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,           -- ← this column
  departments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Cloudinary not configured | 500 with message listing required env vars |
| Cloudinary module not installed | `getCloudinary()` returns null → 500 |
| No file in request | 400 "No file provided" |
| Invalid file type | Multer `fileFilter` rejects → error passed to Express |
| File > 5MB | Multer `limits.fileSize` rejects → error passed to Express |
| Sharp processing fails | Caught in try/catch → 500 with error message |
| Cloudinary upload fails | Promise rejection → 500 with error message |
| Supabase update fails | Logged as warning, avatar URL still returned to client |
| User has no profile row | `getOrCreateUser()` creates it first |
| Network error (frontend) | Caught in try/catch → error toast shown |

---

## Performance Characteristics

| Operation | Typical Time | Notes |
|-----------|-------------|-------|
| Multer parse | 1-5ms | In-memory, no disk I/O |
| Sharp resize + WebP encode (1 iteration) | 5-15ms | 256x256, effort 4 |
| Sharp compress (worst case, 7 iterations) | 35-105ms | Quality 80→20 |
| Cloudinary upload | 100-300ms | Network dependent |
| Supabase update | 20-50ms | Network dependent |
| **Total backend time** | **~200-500ms** | |
| Frontend file validation | <1ms | |
| **Total end-to-end** | **~300-700ms** | Including network |
