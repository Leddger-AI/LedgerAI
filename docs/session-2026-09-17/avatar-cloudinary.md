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

## Settings profile redesign (matches reference screenshot)

`ProfileSection.jsx` rewrite: 112px preview, First/Last split (joins to
`display_name`), Email readonly, Role readonly, GMT Timezone list,
password update via `supabase.auth.updateUser` (min 12), email-preference
toggles (localStorage). Root `maxWidth:860px` → `width:100%` so the card
fills right-side space.
