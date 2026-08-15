# 12: Avatar Upload Pipeline

## Feature Summary

User uploads a profile avatar from Settings → Profile. The image is received by the backend via multer, compressed with Sharp (WebP format, 256x256, under 50KB), uploaded to Cloudinary with a user-scoped public ID (overwriting previous avatar), and the resulting URL is saved to the Supabase `profiles` table.

## ASCII Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (SettingsView.jsx → ProfileSection)                    │
│                                                                   │
│  User clicks "Upload Avatar" → file picker opens                 │
│  User selects image file                                          │
│  └─ FormData with file → POST /api/cloudinary/avatar            │
│     Headers: { Authorization: Bearer <jwt> }                    │
│     Body: multipart/form-data (file field)                      │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND (server/index.js:1711)                                   │
│  POST /api/cloudinary/avatar                                      │
│  ├─ verifyToken → req.user.uid                                   │
│  ├─ multer middleware: upload.single('file') → req.file.buffer  │
│  ├─ configureCloudinary() → check env vars                      │
│  │  └─ If not configured → 500: "Cloudinary not configured"     │
│  │                                                                │
│  ├─ COMPRESS IMAGE (server/index.js:1667)                        │
│  │  ├─ compressToTargetSize(buffer, 50KB, 256)                 │
│  │  ├─ Uses Sharp: resize to 256x256, convert to WebP           │
│  │  ├─ Quality adjusted to stay under 50KB target               │
│  │  └─ Returns compressed buffer                                 │
│  │                                                                │
│  ├─ UPLOAD TO CLOUDINARY                                          │
│  │  ├─ publicId = `avatars/${userId}`                           │
│  │  ├─ cloudinary.uploader.upload_stream({                      │
│  │  │    public_id: publicId,                                    │
│  │  │    overwrite: true,  ← replaces old avatar                │
│  │  │    resource_type: 'image',                                 │
│  │  │    format: 'webp'                                          │
│  │  │  })                                                         │
│  │  └─ Returns: { secure_url, public_id, ... }                 │
│  │                                                                │
│  ├─ UPDATE SUPABASE PROFILE                                       │
│  │  └─ supabase.from('profiles').update({                       │
│  │       avatar_url: uploadResult.secure_url,                   │
│  │       updated_at: now                                          │
│  │     }).eq('id', userId)                                       │
│  │     └─ Non-fatal if fails (warned in console)                │
│  │                                                                │
│  └─ res.json({                                                   │
│       secure_url, public_id, format: 'webp',                    │
│       size_kb, width: 256, height: 256                           │
│     })                                                            │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  CLOUDINARY (external)                                            │
│                                                                   │
│  Image stored at:                                                 │
│  ├─ Path: avatars/{userId}                                       │
│  ├─ Format: WebP (compressed)                                    │
│  ├─ Size: < 50KB                                                 │
│  ├─ Dimensions: 256x256                                          │
│  └─ URL: https://res.cloudinary.com/{cloud}/image/upload/...     │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  DELETE AVATAR                                                    │
│  DELETE /api/cloudinary/avatar (server/index.js:1771)            │
│  ├─ cloudinary.uploader.destroy('avatars/' + userId)            │
│  ├─ supabase.from('profiles').update({ avatar_url: null })      │
│  └─ res.json({ success: true })                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  GENERIC FILE UPLOAD (non-avatar)                                 │
│  POST /api/cloudinary/upload (server/index.js:1801)              │
│  ├─ multer: upload.single('file')                                │
│  ├─ folder = req.body.folder || 'leddger-ai'                    │
│  ├─ cloudinary.uploader.upload_stream({                         │
│  │    folder, resource_type: 'auto'                              │
│  │  })                                                            │
│  └─ res.json({ secure_url, public_id, format, bytes })         │
│                                                                   │
│  DELETE /api/cloudinary/:publicId (server/index.js:1843)         │
│  └─ cloudinary.uploader.destroy(publicId)                       │
└─────────────────────────────────────────────────────────────────┘
```

## File-by-File Trace

| Step | File | Lines | What Happens |
|------|------|-------|--------------|
| 1. Upload avatar | `server/index.js` | 1711-1768 | `POST /api/cloudinary/avatar` |
| 2. Multer setup | `server/index.js` | 1628-1643 | `multer({ storage: memoryStorage })` |
| 3. Cloudinary config | `server/index.js` | 1653-1665 | `configureCloudinary()` |
| 4. Compress | `server/index.js` | 1667-1692 | `compressToTargetSize()` with Sharp |
| 5. Upload stream | `server/index.js` | 1730-1744 | `cloudinary.uploader.upload_stream()` |
| 6. Update profile | `server/index.js` | 1747-1754 | Supabase `profiles.avatar_url` |
| 7. Delete avatar | `server/index.js` | 1771-1798 | `DELETE /api/cloudinary/avatar` |
| 8. Generic upload | `server/index.js` | 1801-1840 | `POST /api/cloudinary/upload` |
| 9. Generic delete | `server/index.js` | 1843-1857 | `DELETE /api/cloudinary/:publicId` |
| 10. Status check | `server/index.js` | 1695-1708 | `GET /api/cloudinary/status` |

## Shared Dependencies

- **Cloudinary** — image storage (lazy-loaded via `require('cloudinary')`)
- **Sharp** — image compression (WebP, resize, quality adjustment)
- **multer** — file upload middleware (memory storage, 5MB limit)
- **Supabase** — `profiles` table for `avatar_url` storage
- **Supabase Auth** — JWT for API authentication

## Error Paths

| Scenario | What Happens |
|----------|-------------|
| Cloudinary not configured | 500: "Cloudinary not configured. Set env vars." |
| No file provided | 400: "No file provided" |
| File too large | Multer rejects (5MB limit) |
| Sharp compression fails | 500: "Failed to upload avatar" |
| Supabase profile update fails | Non-fatal warning, avatar URL still returned |
| Cloudinary upload fails | 500: "Failed to upload avatar" |

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `CLOUDINARY_CLOUDNAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECREAT` | Yes | Cloudinary API secret (note: typo in env var name) |
| `SUPABASE_URL` | Yes | Supabase for profile update |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role |

## Compression Details

The `compressToTargetSize()` function uses Sharp to:
1. Resize image to 256x256 (fit: cover)
2. Convert to WebP format
3. Adjust quality (starting at 80) iteratively until under 50KB
4. Return compressed buffer

This ensures all avatars are uniformly small and optimized for web display.
