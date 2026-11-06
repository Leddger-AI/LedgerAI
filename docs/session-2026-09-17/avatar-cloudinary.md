# Avatar + Cloudinary + Settings Profile

## "Image not being fetched" diagnosis

Backend healthy: env keys present, `cloudinary.api.ping()` → `ok`,
sharp+cloudinary installed, zero jest coverage of avatar path.
Real bug = wiring: upload wrote `profiles.avatar_url`, but the header
read `user.photoURL` from Supabase **auth metadata** (never updated) →
dicebear fallback after every refresh. Plus silent 0-row update for users
with no `profiles` row.

## Fixes

- Upload `update` → `upsert(id, email, avatar_url)` (`server/index.js`).
- `mergeProfileAvatar()` on mount + every SIGNED_IN (`App.jsx`);
  `onAvatarChange` lift: ProfileSection → SettingsView → App header.
- Compression rewrite: quality locked 90, **dimensions** step 512→128
  first, quality last resort (min 60); `invalidate:true` + `overwrite:true`
  so re-upload replaces everywhere; response reports real w/h/q.
  Proven: 6.6MB noise → 45KB `320px q90`.

## October 2026 follow-up: delayed replacement

The profile view previously waited for compression, Cloudinary upload, and
Supabase upsert before changing either avatar. Auth `SIGNED_IN` and
`TOKEN_REFRESHED` also reset the header photo to older auth metadata; a slow
profile fetch could then overwrite a newer upload. The upload now shows a local
preview immediately, waits for the new Cloudinary image to load before swapping,
and restores the prior photo if the request fails. Same-user auth events keep
the current photo, and older profile responses cannot override a newer change.
Profile controls render from session data while saved details load. The app
fetches the avatar alongside meetings and alerts instead of after them.
The upload completion is guarded against navigation or a newer avatar action,
so an old asynchronous response cannot replace the latest visible choice.

Compression now targets 256px at WebP effort 2, with a few dimension and quality
fallbacks to stay under 50KB. This fits the 112px avatar at high pixel density
while avoiding the old repeated 512px encodes. The API returns Cloudinary's
versioned `secure_url` and reports a profile persistence error instead of
claiming success when Supabase did not save the new URL. Cloudinary says
`invalidate: true` can take seconds to minutes to propagate; its versioned
delivery URL bypasses the prior cached version immediately.

## Settings profile redesign (matches reference screenshot)

`ProfileSection.jsx` rewrite: 112px preview, First/Last split (joins to
`display_name`), Email readonly, Role readonly, GMT Timezone list,
password update via `supabase.auth.updateUser` (min 12), email-preference
toggles (localStorage). Root `maxWidth:860px` → `width:100%` so the card
fills right-side space.
