# Authentication Flow & Supabase Integration

This document details the authentication architecture in the Leddger-AI application after the migration from Firebase to Supabase.

> **Migration Note:** This document was originally written for Firebase Auth. It has been completely rewritten to reflect the Supabase Auth architecture. For migration details, see [Supabase Auth — Frontend](./migration/supabase-auth-frontend.md).

---

## 1. Architecture Overview

Leddger AI uses **Supabase Auth** for authentication with **Google OAuth** (redirect-based) and **Email/Password** sign-in. The auth flow is powered by the Supabase JS SDK (`@supabase/supabase-js`).

### Key Files

| File | Purpose |
|------|---------|
| `src/supabaseClient.js` | Initializes the Supabase client with env vars |
| `src/supabaseAuth.js` | Wraps all auth methods (login, logout, session, token helpers) |
| `src/App.jsx` | Auth state listener, login/logout handlers, token management |
| `src/components/ProtectedRoute.jsx` | Route guard using `user` and `authReady` props |
| `server/middleware/auth.js` | Backend JWT verification using Supabase service role key |

---

## 2. Persistent Sessions (Logout on Refresh Fix)

**Issue**: The application previously logged the user out whenever the page was refreshed.
**Cause**: The application was strictly relying on ephemeral React state (`user` and `tokens`) to track authentication status, which resets on page reload.

**Solution (Supabase)**:
- The Supabase client is configured with `persistSession: true` and `autoRefreshToken: true` in `src/supabaseClient.js`.
- Supabase stores the session in `localStorage` (key: `sb-<project-ref>-auth-token`), which survives page reloads.
- On mount, `getCurrentSession()` from `src/supabaseAuth.js` checks for an existing session and restores the React state (`setUser`, `setTokens`).
- The `onAuthChange()` subscription (wrapping `supabase.auth.onAuthStateChange`) fires with an `INITIAL_SESSION` event on page load, ensuring the auth state is synchronized.
- A `localStorage` fallback wrapper ensures the UI immediately registers demo mode users while the Supabase SDK initializes.

---

## 3. Google OAuth Flow (Redirect-Based)

Unlike Firebase's popup-based OAuth, Supabase uses a **redirect-based** flow:

1. User clicks "Sign In with Google"
2. `loginWithGoogleAndCalendar()` from `src/supabaseAuth.js` calls `supabase.auth.signInWithOAuth({ provider: 'google', scopes: '...' })`
3. The browser navigates to Google's consent page
4. User authenticates on Google's page
5. Google redirects back to the app URL with a hash fragment containing the session
6. `detectSessionInUrl: true` in the Supabase client config parses the hash and stores the session
7. The page loads, `getCurrentSession()` finds the session
8. `onAuthChange` fires with a `SIGNED_IN` event
9. The frontend sets user state, retrieves the access token and Google provider token, and fetches calendar events

### Google Calendar Scope

The OAuth request includes the scope `https://www.googleapis.com/auth/calendar.events.readonly`, which allows the app to read the user's Google Calendar events for the past 7 days. The Google provider token (`session.provider_token`) is stored and passed to the backend's calendar API endpoint.

### Domain Verification

Google OAuth requires domain verification. The verification HTML file (`public/googlec53d2ea560879c7c.html`) must be present in the build output. The authorized redirect URI must be set to `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback` in both Google Cloud Console and Supabase Dashboard.

---

## 4. Token Management

### Supabase Access Token (JWT)

- Issued by Supabase Auth on login
- Stored in localStorage as part of the session object
- Passed as `Bearer` token in the `Authorization` header to all protected API endpoints
- Retrieved on the frontend via `getAuthToken()` from `src/supabaseAuth.js`
- Verified on the backend via `supabase.auth.getUser(token)` in `server/middleware/auth.js`

### Google Provider Token

- Issued by Google during the OAuth flow
- Stored as `session.provider_token` in the Supabase session
- Used to call Google Calendar API via the backend's `/api/calendar/events` endpoint
- Also stored in `localStorage` as `googleAccessToken` for persistence across reloads

---

## 5. Demo Mode Fallback

To ensure the application remains testable during API outages or when Supabase isn't fully configured:
- Created a robust `enterDemoMode` function.
- This allows developers and reviewers to bypass the Google Auth redirect completely and populate the application state with mock user data (`photoURL`, `displayName`, etc.) to review UI components.
- Demo mode sets `tokens.accessToken` to `'demo-supabase-access-token'` which the backend accepts in development bypass mode (when `SUPABASE_SERVICE_ROLE_KEY` is not set).

---

## 6. Backend Token Verification

The backend (`server/middleware/auth.js`) verifies the Supabase JWT using the service role key:

1. Extracts the `Bearer` token from the `Authorization` header
2. Calls `supabaseAdmin.auth.getUser(token)` which verifies the JWT signature and returns the user
3. Sets `req.user = { uid: user.id, email: user.email, ...user }`
4. If verification fails, returns `401 Unauthorized`

### Development Bypass

When `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are not set in `server/.env`, the middleware enters a bypass mode that creates a mock user from the token prefix. This allows local development without a Supabase project.

See [Supabase Auth — Backend](./migration/supabase-auth-backend.md) for full details.

---

## 7. Protected Routes

The `ProtectedRoute` component (`src/components/ProtectedRoute.jsx`) guards authenticated routes:

- Receives `user` and `authReady` as props from `App.jsx`
- If `authReady` is false, shows a loading spinner (Supabase session is being checked)
- If `authReady` is true but `user` is null, redirects to the landing page
- If `user` exists, renders the protected content

This component is auth-provider-agnostic — it doesn't reference Supabase or Firebase directly, making it immune to auth provider changes.

---

## 8. Related Documentation

- [Supabase Auth — Frontend Migration](./migration/supabase-auth-frontend.md) — Detailed file-by-file migration
- [Supabase Auth — Backend Migration](./migration/supabase-auth-backend.md) — Backend middleware rewrite
- [Supabase Setup Guide](./migration/supabase-setup-guide.md) — Dashboard configuration steps
- [Dual-Database Architecture](./migration/dual-database-architecture.md) — Supabase + MongoDB design
