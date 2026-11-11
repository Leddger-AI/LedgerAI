# 12: Avatar upload and replacement

## Current flow

```text
Settings → Profile → Change photo
  → validate JPEG/PNG/WebP/GIF and 5 MB limit
  → immediately preview the local file in Settings and the header
  → POST /api/cloudinary/avatar with Bearer token and multipart file
  → Sharp rotates, crops, and compresses to WebP at up to 256px
  → Cloudinary overwrites avatars/<userId> with invalidate: true
  → Supabase profiles upsert saves the versioned secure_url
  → browser preloads that URL, then replaces the local preview
```

The client restores the previous photo if the request fails. After a successful upload it preloads the versioned CDN URL before replacing the local preview. If that preload fails or times out, it keeps the working preview visible for the current view; the saved CDN URL is used on the next profile load. The upload and removal controls are disabled while an upload is running. An older profile fetch or upload completion cannot replace a newer local photo change. On a page refresh, profile controls render from session data immediately while the saved profile loads. The app fetches the saved avatar alongside meetings and alerts and preserves the current photo through same-user auth refresh events.

## API and storage

- `POST /api/cloudinary/avatar` requires authentication and a `file` field. Multer keeps the file in memory and rejects files over 5 MB or outside the accepted image types.
- `server/utils/avatarImage.js` uses Sharp with WebP effort 2, starting at 256px and reducing dimensions or quality only if necessary to target 50 KB. It returns the actual output dimensions and quality.
- The Cloudinary asset uses `avatars/<userId>`, `overwrite: true`, and `invalidate: true`. Cloudinary's `secure_url` includes the upload version. This URL is saved to `profiles.avatar_url` and returned with the version and compression details.
- The API returns an error if Supabase cannot save the URL. A Cloudinary upload can therefore succeed while profile persistence fails; the user sees an error and can retry.
- `DELETE /api/cloudinary/avatar` destroys the asset and clears `profiles.avatar_url`. The legacy scoped delete route also exists for the owner's avatar.
- `GET /api/cloudinary/status` checks Cloudinary configuration and connectivity.

Cloudinary says CDN invalidation can take seconds to minutes. Using the new versioned delivery URL avoids waiting for the old cached URL to expire. See [Cloudinary's overwrite guidance](https://cloudinary.com/documentation/developer_onboarding_faq_overwriting_assets).

## Configuration and checks

The backend needs `CLOUDINARY_CLOUDNAME` (or `CLOUDINARY_CLOUD_NAME`), `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECREAT` (or `CLOUDINARY_API_SECRET`), `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`. The frontend needs its Supabase settings and backend API URL.

The isolated tests cover compression, the versioned upload response, and Supabase save failure. Browser testing covers immediate preview and restoration after a failed upload. On 30 October 2026, the configured `Leddger-AI` Supabase project was restored from `INACTIVE` to `ACTIVE_HEALTHY`. A read-only check confirmed that the `profiles` table is accessible and all three saved avatar URLs load. Those existing URLs predate the versioned upload change; a real replacement through an authenticated user session remains the final end-to-end check before rollout.
