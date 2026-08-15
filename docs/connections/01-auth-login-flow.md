# 01: Authentication & Login Flow

## Feature Summary

User logs in via Google OAuth, GitHub OAuth, or Email/Password. Supabase issues a JWT that persists in the browser. The JWT is sent as a Bearer token on every API call. The backend verifies it via Supabase admin SDK.

## ASCII Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (Login page)                                           │
│                                                                  │
│  User clicks "Sign in with Google" / "GitHub" / "Email"          │
│         │                                                        │
│  ┌──────┴──────┐──────────────────┐──────────────────┐          │
│  ▼             ▼                  ▼                  │          │
│  loginWithGoogleAndCalendar()  loginWithGitHub()  loginWithEmail()│
│  └─ supabase.auth.signInWithOAuth({ provider, redirectTo })     │
│     └─ Browser redirects to Google/GitHub consent screen         │
│        └─ After consent, redirects back to /dashboard            │
│           └─ Supabase SDK stores session in localStorage         │
│                                                                  │
│  Email path: supabase.auth.signInWithPassword({ email, password })│
│  └─ Returns { user, session } immediately (no redirect)         │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  APP.JSX — Auth State Listener                                   │
│                                                                  │
│  onAuthChange((event, session) => { ... })                       │
│  ├─ SIGNED_IN → setUser(session.user), setAuthReady(true)       │
│  ├─ SIGNED_OUT → setUser(null), navigate to /                   │
│  └─ TOKEN_REFRESHED → session updated automatically             │
│                                                                  │
│  ProtectedRoute checks: user && authReady                        │
│  └─ If false → redirect to / (login page)                       │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼ (on every API call)
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND API CALL                                               │
│                                                                  │
│  const token = await getAuthToken();                             │
│  └─ supabase.auth.getSession() → session.access_token            │
│                                                                  │
│  fetch(`${API_BASE_URL}/api/...`, {                              │
│    headers: { Authorization: `Bearer ${token}` }                │
│  })                                                              │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND — verifyToken middleware                                │
│  server/middleware/auth.js:7                                     │
│                                                                  │
│  ├─ Extract Bearer token from Authorization header               │
│  ├─ supabaseAdmin.auth.getUser(token)                            │
│  │  └─ Validates JWT via Supabase service role                   │
│  ├─ If valid → req.user = { uid: user.id, email: user.email }   │
│  ├─ If invalid → 401 Unauthorized                               │
│  └─ Dev bypass: if no Supabase env vars, mocks user             │
└─────────────────────────────────────────────────────────────────┘
```

## File-by-File Trace

| Step | File | Lines | What Happens |
|------|------|-------|--------------|
| 1. Google login | `src/supabaseAuth.js` | 7-21 | `signInWithOAuth({ provider: 'google' })` |
| 2. GitHub login | `src/supabaseAuth.js` | 27-41 | `signInWithOAuth({ provider: 'github' })` |
| 3. Email login | `src/supabaseAuth.js` | 47-62 | `signInWithPassword({ email, password })` |
| 4. Supabase client | `src/supabaseClient.js` | 10-16 | `createClient` with `persistSession: true` |
| 5. Auth listener | `src/App.jsx` | — | `onAuthChange` sets user state |
| 6. Route guard | `src/components/ProtectedRoute.jsx` | — | Checks `user && authReady` |
| 7. Get JWT | `src/supabaseAuth.js` | 116-119 | `getAuthToken()` → `session.access_token` |
| 8. Verify JWT | `server/middleware/auth.js` | 7-34 | `supabaseAdmin.auth.getUser(token)` |
| 9. Supabase admin | `server/supabaseClient.js` | — | Service role key, bypasses RLS |

## Shared Dependencies

- **Supabase Auth** — issues JWT, manages session
- **localStorage** — persists session across refreshes (`persistSession: true`)
- **Supabase Admin SDK** — server-side JWT verification (service role key)

## Error Paths

| Scenario | What Happens |
|----------|-------------|
| Invalid/expired JWT | `verifyToken` returns 401, frontend gets error, user redirected to login |
| No Supabase env vars (dev) | `verifyToken` mocks user with `DEV_MOCK_UID_` prefix |
| Session expired | `autoRefreshToken: true` auto-refreshes before expiry |
| OAuth redirect fails | Supabase SDK shows error, user stays on login page |

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_SUPABASE_URL` | Frontend | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Supabase anon key (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | Service role key (admin, bypasses RLS) |
| `SUPABASE_URL` | Backend | Supabase project URL |
