# Loading Animation Saga

## Bug: loader on every tab switch

Root cause: Supabase (`persistSession` + `autoRefreshToken`) re-emits
`SIGNED_IN` on tab/window focus; handler treated each as fresh login →
`startLoading(true)` → forced 7s (later 5s) Lottie. `force=true` bypassed
the once-flag; stacked `setTimeout`s extended it.

## Fixes (`src/App.jsx`, `ProtectedRoute.jsx`)

1. Fresh-login detection: gesture flag (`expectFreshLoginRef` set by the 3
   login handlers) OR OAuth hash OR new uid; same-uid re-emit = silent
   refresh (tokens + data, `setLoading(false)`).
2. `hasShownLoginLoaderRef` persisted in `sessionStorage` (survives Vite HMR
   remounts); cleared on logout/SIGNED_OUT.
3. Pending-stop timeout clearing + 15s failsafe — loader can never hang.
4. Mount session check silent; sync button silent; `loading` init `true`→
   `false` (loader only via explicit login).
5. Dashboard route adds `!showIntro` guard.

## Lottie + intro video

- `lottie.host` flaked (`AbortError`, 1:05am log) → vendored
  `public/animations/welcome.lottie` (30,655 B, byte-verified) → later pure
  CSS, then vendored restored per user request.
- `SiteIntro.jsx` (new): `starting.mp4` (238KB) plays on every full load;
  converted via ffmpeg 9: `starting.webm` VP9 196KB (primary),
  `starting-fast.mp4` H264+faststart 142KB (fallback), `starting-poster.jpg`
  15KB; preloaded in `index.html`.
- Iterations: `cover`→`contain` 640px (giant cropped text) → bg sampled
  `#f3ebd8` (pixel-measured, borderless) → Skip removed → loader init false
  + intro guard (double-animation complaint).
