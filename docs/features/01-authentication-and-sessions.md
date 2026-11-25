# 01 — Authentication, Sessions & Supabase Keep-Alive

> **Status:** Production-Ready | **Files:** [`src/supabaseClient.js`](../../src/supabaseClient.js), [`src/supabaseAuth.js`](../../src/supabaseAuth.js), [`src/pages/LoginDashboard.jsx`](../../src/pages/LoginDashboard.jsx), [`server/middleware/auth.js`](../../server/middleware/auth.js), [`server/utils/supabaseKeepAlive.js`](../../server/utils/supabaseKeepAlive.js)

---

## 1. Research & Problem Statement
- **Logout-on-Refresh & Redirect Races:** Early versions relied on ephemeral React state for auth tokens, causing users to be logged out on refresh and triggering premature `navigate('/dashboard')` calls before OAuth redirects completed.
- **Free-Tier Supabase Pausing:** Supabase free-tier PostgreSQL projects automatically pause after 7 days of zero API/DB activity, breaking production logins until manually unpaused.
- **Missing Email/Password UI:** Auth helpers (`loginWithEmail`, `signUpWithEmail`) existed in `supabaseAuth.js` but were not wired to `LoginDashboard.jsx`.

---

## 2. Architecture & Design Plan

```mermaid
flowchart LR
    User["User (/login)"] -->|Google / GitHub OAuth| SupAuth["Supabase Auth"]
    User -->|Email / Password| SupAuth
    User -->|Try Demo Mode| Demo["Local Demo Session"]
    SupAuth -->|JWT + Session| LocalStorage["localStorage (persistSession: true)"]
    LocalStorage -->|getAuthToken() + 90s proactive refresh| API["Express API (server/index.js)"]
    API -->|verifyToken()| SupAdmin["Supabase Admin SDK"]
    Agenda["Agenda 12h Cron + /api/keep-alive"] -->|Minimal head query| SupDB["Supabase profiles"]
```

---

## 3. Implementation Details
1. **Frontend Client (`src/supabaseClient.js` & `src/supabaseAuth.js`):**
   - Configured with `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`.
   - `getAuthToken()` checks `session.expires_at`; if within **90 seconds** of expiry, it proactively calls `supabase.auth.refreshSession()`.
   - `refreshAuthToken()` is called by `fetchWithTokenRefresh()` in `src/App.jsx` if any API returns `401`, retrying once before signing out.
   - `isOAuthRedirect` checks both `window.location.hash` (`access_token`, `code=`) and `window.location.search` (`?code=` for PKCE).
2. **Login UI (`src/pages/LoginDashboard.jsx`):**
   - Supports Email/Password Sign In & Sign Up toggle, Google OAuth, GitHub OAuth (`/auth/github`), and **Try Demo Mode**, with inline error/confirmation banners.
3. **Backend Middleware (`server/middleware/auth.js`):**
   - Extracts `Bearer <JWT>` and verifies via `supabaseAdmin.auth.getUser(token)`, setting `req.user = { uid: user.id, email: user.email, ...user }`.
   - Includes a `DEV_BYPASS` mode strictly gated to `NODE_ENV !== 'production'` when Supabase env vars are absent.
4. **Supabase Keep-Alive Hook (`server/utils/supabaseKeepAlive.js` & `server/scheduler.js`):**
   - `pingSupabase()` executes a minimal 1-row head query (`profiles.select('id', { count: 'exact', head: true }).limit(1)`).
   - Runs automatically every **12 hours** via Agenda (`supabase keep-alive`) + an unref'd `setInterval` fallback, and is exposed at `GET /api/keep-alive` for external uptime monitors.

---

## 4. API & Test Coverage
- **Endpoints:** `GET /api/keep-alive` (returns `{ ok, status, latencyMs, timestamp }`).
- **Tests:**
  - [`server/tests/auth.test.js`](../../server/tests/auth.test.js) — 8/8 passing (missing/malformed headers, valid/invalid JWT, dev bypass).
  - [`server/tests/keepAlive.test.js`](../../server/tests/keepAlive.test.js) — 4/4 passing + verified live Supabase ping (`572ms`).
