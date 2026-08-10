# Supabase Auth — Frontend Migration (Phase 1 & 2)

This document details every change made to the frontend authentication system during the migration from Firebase to Supabase.

---

## Table of Contents

1. [Phase 1: Supabase Client & Auth Wrappers](#phase-1-supabase-client--auth-wrappers)
2. [Phase 2: Frontend File-by-File Migration](#phase-2-frontend-file-by-file-migration)
3. [Import Mapping Reference](#import-mapping-reference)
4. [Token Replacement Reference](#token-replacement-reference)
5. [Auth Flow Comparison](#auth-flow-comparison)

---

## Phase 1: Supabase Client & Auth Wrappers

### `src/supabaseClient.js` (Created)

Initializes the Supabase JS client using environment variables.

```js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
```

**Key decisions:**
- `persistSession: true` — Supabase stores the session in localStorage, surviving page refreshes (replaces Firebase's IndexedDB persistence).
- `autoRefreshToken: true` — Access tokens are automatically refreshed before expiry.
- `detectSessionInUrl: true` — Required for OAuth redirect flow (Google sign-in returns via URL hash).

### `src/supabaseAuth.js` (Created)

Wraps all Supabase auth methods into a clean API matching the old Firebase interface where possible.

#### Exported Functions

| Function | Supabase Method | Replaces (Firebase) |
|----------|----------------|---------------------|
| `loginWithGoogleAndCalendar()` | `supabase.auth.signInWithOAuth({ provider: 'google', scopes: '...' })` | `signInWithPopup(auth, provider)` |
| `loginWithEmail(email, password)` | `supabase.auth.signInWithPassword({ email, password })` | `signInWithEmailAndPassword(auth, email, password)` |
| `signUpWithEmail(email, password)` | `supabase.auth.signUp({ email, password })` | N/A (new) |
| `signOut()` | `supabase.auth.signOut()` | `signOut(auth)` |
| `getCurrentSession()` | `supabase.auth.getSession()` | `onAuthStateChanged` listener |
| `onAuthChange(callback)` | `supabase.auth.onAuthStateChange(callback)` | `onAuthStateChanged(auth, callback)` |
| `getAuthToken()` | `supabase.auth.getSession()` → `session.access_token` | `auth.currentUser.getIdToken()` |
| `getCurrentUser()` | `supabase.auth.getUser()` | `auth.currentUser` |

#### Key Differences from Firebase

1. **Google OAuth Flow:** Supabase uses **redirect-based** OAuth (not popup). The browser navigates to Google's consent page and returns to the app via URL redirect. The `detectSessionInUrl: true` option in the client config automatically parses the returning hash fragment.

2. **Token Type:** Firebase returned a `firebaseIdToken` (JWT). Supabase returns an `access_token` (JWT). Both are passed as `Bearer` tokens in the `Authorization` header to the backend.

3. **Provider Token:** Supabase stores the Google OAuth token as `session.provider_token`. This is the equivalent of Firebase's `credential.accessToken` and is used for Google Calendar API calls.

4. **No Anonymous Auth:** Firebase had `signInAnonymously()`. Supabase's free tier supports anonymous auth but it must be enabled in the dashboard. The `StudentPortal.jsx` was updated to gracefully handle the absence of a user session.

---

## Phase 2: Frontend File-by-File Migration

### 2.1 `src/App.jsx` (Major Refactor)

This is the largest and most critical file. It contains the auth state listener, login/logout handlers, token management, and calendar event fetching.

#### Import Changes

**Before:**
```js
import { auth, loginWithGoogleAndCalendar, loginWithEmail } from './firebaseAuth';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
```

**After:**
```js
import { loginWithGoogleAndCalendar, loginWithEmail, getCurrentSession, onAuthChange, signOut as supabaseSignOut, getAuthToken } from './supabaseAuth';
```

#### Auth State Listener (useEffect)

**Before (Firebase):**
```js
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      setUser(user);
      const idToken = await user.getIdToken();
      const googleToken = localStorage.getItem('googleAccessToken');
      setTokens({ firebaseIdToken: idToken, googleAccessToken: googleToken });
      if (googleToken) fetchEvents(idToken, googleToken);
    } else {
      // demo mode fallback
    }
    setAuthReady(true);
  });
  return () => unsubscribe();
}, []);
```

**After (Supabase):**
```js
useEffect(() => {
  // Check existing session on mount
  getCurrentSession().then((session) => {
    if (session) {
      setUser(session.user);
      const googleToken = session.providerToken || localStorage.getItem('googleAccessToken');
      setTokens({ accessToken: session.accessToken, googleAccessToken: googleToken });
      if (googleToken) fetchEvents(session.accessToken, googleToken);
      fetchMeetings(session.accessToken);
      fetchAlerts(session.accessToken);
    } else {
      // demo mode fallback
    }
    setAuthReady(true);
  });

  // Subscribe to auth state changes
  const subscription = onAuthChange(async (event, session) => {
    if (event === 'SIGNED_OUT') {
      setUser(null);
      setTokens(null);
      setAuthReady(true);
      return;
    }
    if (session?.user) {
      setUser(session.user);
      const googleToken = session.provider_token || localStorage.getItem('googleAccessToken');
      setTokens({ accessToken: session.access_token, googleAccessToken: googleToken });
      if (googleToken) await fetchEvents(session.access_token, googleToken);
      await fetchMeetings(session.access_token);
      await fetchAlerts(session.access_token);
    } else {
      // demo mode fallback
    }
    setAuthReady(true);
  });

  return () => subscription.unsubscribe();
}, []);
```

**Key changes:**
- `onAuthStateChanged(auth, callback)` → `getCurrentSession()` (initial check) + `onAuthChange(callback)` (subscription)
- `user.getIdToken()` → `session.accessToken` / `session.access_token`
- `credential.accessToken` → `session.providerToken` / `session.provider_token`
- Added `fetchMeetings()` and `fetchAlerts()` calls on auth (Phase 7)
- The unsubscribe function changed from `unsubscribe()` to `subscription.unsubscribe()`

#### Login Handler (`handleLogin`)

**Before:**
```js
const handleLogin = async () => {
  try {
    const { user, firebaseIdToken, googleAccessToken } = await loginWithGoogleAndCalendar();
    setUser(user);
    setTokens({ firebaseIdToken, googleAccessToken });
    localStorage.setItem('googleAccessToken', googleAccessToken);
    await fetchEvents(firebaseIdToken, googleAccessToken);
  } catch (error) {
    // show error modal
  }
};
```

**After:**
```js
const handleLogin = async () => {
  try {
    await loginWithGoogleAndCalendar();
    // Supabase OAuth uses redirect — the page will reload
    // onAuthChange will pick up the new session
  } catch (error) {
    // show error modal
  }
};
```

**Key change:** Supabase's `signInWithOAuth` triggers a full-page redirect. The user state is NOT set immediately — instead, the page reloads and the `onAuthChange` listener captures the new session. This is a fundamental difference from Firebase's popup flow.

#### Email Login Handler (`handleEmailLogin`)

**Before:**
```js
const { user, firebaseIdToken } = await loginWithEmail(email, password);
setUser(user);
setTokens({ firebaseIdToken, googleAccessToken: null });
```

**After:**
```js
const { user, accessToken } = await loginWithEmail(email, password);
setUser(user);
setTokens({ accessToken, googleAccessToken: null });
```

#### Logout Handler (`handleLogout`)

**Before:**
```js
await firebaseSignOut(auth);
```

**After:**
```js
await supabaseSignOut();
```

#### `fetchEvents` Function

**Before:**
```js
const response = await fetch(`${API_BASE_URL}/api/calendar/events?google_token=${tokens.googleAccessToken}`, {
  headers: { 'Authorization': `Bearer ${tokens.firebaseIdToken}` },
});
```

**After:**
```js
const response = await fetch(`${API_BASE_URL}/api/calendar/events?google_token=${googleAccessToken}`, {
  headers: { 'Authorization': `Bearer ${accessToken}` },
});
```

#### Demo Mode Token

**Before:**
```js
setTokens({ firebaseIdToken: 'demo-firebase-id-token', googleAccessToken: null });
```

**After:**
```js
setTokens({ accessToken: 'demo-supabase-access-token', googleAccessToken: null });
```

#### Error Modal Text

**Before:** "Firebase authentication failed..."
**After:** "Supabase authentication failed..."

---

### 2.2 `src/components/ProtectedRoute.jsx`

Minimal change — updated comment only.

**Before:**
```jsx
// ProtectedRoute checks if user is authenticated via Firebase
```

**After:**
```jsx
// ProtectedRoute checks if user is authenticated via Supabase
```

The component logic itself doesn't change because it receives `user` and `authReady` as props from `App.jsx`, which handles the auth provider abstraction.

---

### 2.3 `src/SettingsView.jsx`

Replaced the Firebase Service Key Path input with a read-only Supabase URL display.

**Before:**
```jsx
<label>Firebase Service Key Path</label>
<input value={serviceKeyPath} onChange={...} placeholder="path/to/serviceAccountKey.json" />
```

**After:**
```jsx
<label>Supabase URL</label>
<input value={import.meta.env.VITE_SUPABASE_URL || 'Not configured'} readOnly />
```

---

### 2.4 `src/pages/ActiveLinksView.jsx`

**Import change:**
```js
// Before
import { auth } from '../firebaseAuth';
// After
import { getAuthToken } from '../supabaseAuth';
```

**Token retrieval:**
```js
// Before
const token = await auth.currentUser.getIdToken();
// After
const token = await getAuthToken();
```

---

### 2.5 `src/pages/DraftsView.jsx`

Same pattern as ActiveLinksView. 4 call sites updated:

| Line | Before | After |
|------|--------|-------|
| Import | `import { auth } from '../firebaseAuth'` | `import { getAuthToken } from '../supabaseAuth'` |
| Load drafts | `auth.currentUser.getIdToken()` | `getAuthToken()` |
| Activate draft | `auth.currentUser.getIdToken()` | `getAuthToken()` |
| Delete draft | `auth.currentUser.getIdToken()` | `getAuthToken()` |

---

### 2.6 `src/pages/EmployeeTemplateBuilder.jsx`

Same pattern. Import + 1 call site updated.

---

### 2.7 `src/pages/StudentTemplateBuilder.jsx`

Same pattern. Import + 1 call site updated.

---

### 2.8 `src/pages/TeamTemplateBuilder.jsx`

**Import change:**
```js
// Before
import { auth } from '../firebaseAuth';
// After
import { getAuthToken, getCurrentUser } from '../supabaseAuth';
```

**User existence check:**
```js
// Before
if (!auth.currentUser) { /* show error */ }
// After
const currentUser = await getCurrentUser();
if (!currentUser) { /* show error */ }
```

**Token retrieval:**
```js
// Before
const token = await auth.currentUser.getIdToken();
// After
const token = await getAuthToken();
```

---

### 2.9 `src/pages/StudentPortal.jsx`

This file was the most complex migration because it used Firebase's `signInAnonymously` for candidate authentication.

**Import change:**
```js
// Before
import { auth } from '../firebaseAuth';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
// After
import { supabase } from '../supabaseClient';
import { getCurrentUser } from '../supabaseAuth';
```

**Auth state effect:**

Before (Firebase anonymous auth):
```js
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (!user) {
      try { await signInAnonymously(auth); } catch (err) { console.error(err); }
    }
  });
  // ... GitHub OAuth redirect handling ...
  return () => unsubscribe();
}, []);
```

After (Supabase session check — no anonymous auth):
```js
useEffect(() => {
  getCurrentUser().then((user) => {
    if (!user) {
      console.log('No authenticated user for student portal');
    }
  });
  // ... GitHub OAuth redirect handling ...
}, []);
```

**GitHub OAuth state parameter:**

Before:
```js
const firebaseUid = auth.currentUser ? auth.currentUser.uid : 'anonymous';
const state = `${random}:${firebaseUid}`;
```

After:
```js
const currentUser = await getCurrentUser();
const userId = currentUser?.id || 'anonymous';
const state = `${random}:${userId}`;
```

---

### 2.10 `src/LedgerSpreadsheet.jsx`

Added cloud save/load/delete functionality. See [spreadsheet-cloud-storage.md](./spreadsheet-cloud-storage.md) for full details.

**Import added:**
```js
import { getAuthToken } from './supabaseAuth';
```

---

## Import Mapping Reference

| Firebase Import | Supabase Replacement |
|----------------|---------------------|
| `import { auth } from './firebaseAuth'` | `import { getAuthToken, getCurrentUser } from './supabaseAuth'` |
| `import { loginWithGoogleAndCalendar, loginWithEmail } from './firebaseAuth'` | `import { loginWithGoogleAndCalendar, loginWithEmail } from './supabaseAuth'` |
| `import { onAuthStateChanged, signOut } from 'firebase/auth'` | `import { onAuthChange, signOut as supabaseSignOut } from './supabaseAuth'` |
| `import { signInAnonymously } from 'firebase/auth'` | *(removed — no direct equivalent)* |
| `import { auth } from '../firebaseAuth'` | `import { getAuthToken } from '../supabaseAuth'` |

---

## Token Replacement Reference

| Firebase Pattern | Supabase Pattern |
|-----------------|-----------------|
| `auth.currentUser.getIdToken()` | `await getAuthToken()` |
| `auth.currentUser.uid` | `(await getCurrentUser())?.id` |
| `auth.currentUser.email` | `(await getCurrentUser())?.email` |
| `auth.currentUser` (existence check) | `await getCurrentUser()` (null check) |
| `result.user.getIdToken()` | `session.access_token` or `session.accessToken` |
| `credential.accessToken` (Google token) | `session.provider_token` or `session.providerToken` |
| `firebaseIdToken` (variable name) | `accessToken` (variable name) |

---

## Auth Flow Comparison

### Google Sign-In Flow

**Firebase (Popup):**
1. User clicks "Sign In with Google"
2. `signInWithPopup(auth, provider)` opens a popup window
3. User authenticates in the popup
4. Popup closes, returns `result` with `user`, `credential.accessToken`, and `user.getIdToken()`
5. Frontend immediately sets user state and fetches events
6. No page reload

**Supabase (Redirect):**
1. User clicks "Sign In with Google"
2. `supabase.auth.signInWithOAuth({ provider: 'google' })` triggers a full-page redirect to Google
3. User authenticates on Google's page
4. Google redirects back to the app URL with a hash fragment containing the session
5. `detectSessionInUrl: true` parses the hash and stores the session
6. Page loads, `getCurrentSession()` finds the session
7. `onAuthChange` fires with `SIGNED_IN` event
8. Frontend sets user state and fetches events

### Session Persistence

**Firebase:**
- Session stored in IndexedDB
- `onAuthStateChanged` fires on page load if session exists
- Token auto-refreshed by SDK

**Supabase:**
- Session stored in localStorage (key: `sb-<project-ref>-auth-token`)
- `getCurrentSession()` retrieves it on page load
- `onAuthStateChange` fires with `INITIAL_SESSION` event on load
- Token auto-refreshed by SDK (`autoRefreshToken: true`)

### Logout

**Firebase:**
- `signOut(auth)` clears the session
- `onAuthStateChanged` fires with `null` user

**Supabase:**
- `supabase.auth.signOut()` clears the session
- `onAuthStateChange` fires with `SIGNED_OUT` event
