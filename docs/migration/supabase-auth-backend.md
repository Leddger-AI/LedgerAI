# Supabase Auth — Backend Migration (Phase 3)

This document details the complete rewrite of the backend authentication middleware from Firebase Admin SDK to Supabase JWT verification.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Before: Firebase Admin SDK](#2-before-firebase-admin-sdk)
3. [After: Supabase JWT Verification](#3-after-supabase-jwt-verification)
4. [Backend Supabase Client](#4-backend-supabase-client)
5. [Token Verification Flow](#5-token-verification-flow)
6. [Development Bypass Mode](#6-development-bypass-mode)
7. [Environment Variables](#7-environment-variables)

---

## 1. Overview

The backend authentication middleware (`server/middleware/auth.js`) is the gatekeeper for all protected API endpoints. It verifies the JWT token sent by the frontend in the `Authorization: Bearer <token>` header.

During the migration, this file was completely rewritten to replace Firebase Admin SDK's `verifyIdToken()` with Supabase's `auth.getUser()` method.

---

## 2. Before: Firebase Admin SDK

```js
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

let adminInitialized = false;

if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    })
  });
  adminInitialized = true;
}

const verifyToken = async (req, res, next) => {
  const idToken = authHeader.split('Bearer ')[1];

  if (!adminInitialized) {
    req.user = { uid: "DEV_MOCK_UID_" + idToken.substring(0, 5) };
    return next();
  }

  const decodedToken = await getAuth().verifyIdToken(idToken);
  req.user = decodedToken;
  next();
};
```

**Required env vars:**
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

**How it worked:**
1. Firebase Admin SDK initialized with service account credentials
2. `verifyIdToken()` decoded and verified the Firebase JWT
3. The decoded token contained `uid`, `email`, `email_verified`, etc.
4. `req.user.uid` was used throughout the app as the user identifier

---

## 3. After: Supabase JWT Verification

```js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = null;

if (supabaseUrl && supabaseServiceRoleKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

const verifyToken = async (req, res, next) => {
  const token = authHeader.split('Bearer ')[1];

  if (!supabaseAdmin) {
    req.user = { uid: "DEV_MOCK_UID_" + token.substring(0, 5), email: "dev@localhost" };
    return next();
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
  req.user = { uid: user.id, email: user.email, ...user };
  next();
};
```

**Required env vars:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**How it works:**
1. Supabase admin client initialized with the **service role key** (bypasses RLS)
2. `supabase.auth.getUser(token)` verifies the JWT and returns the user object
3. `req.user.uid` is set to `user.id` (Supabase UUID)
4. `req.user.email` is set to `user.email`
5. The full user object is spread into `req.user` for any additional fields

---

## 4. Backend Supabase Client

A separate Supabase client was created for backend use: `server/supabaseClient.js`

```js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

module.exports = supabase;
```

**Why a separate client?**
- The backend uses the **service role key**, which bypasses Row Level Security (RLS). This is necessary for server-side operations that need to read/write across all users.
- `persistSession: false` — the server doesn't need to maintain a session.
- `autoRefreshToken: false` — the server doesn't need to refresh tokens.
- This client is imported by both `middleware/auth.js` and `server/index.js` for data operations.

**⚠️ Security Warning:** The service role key must NEVER be exposed to the frontend. It has full access to all database operations without RLS restrictions.

---

## 5. Token Verification Flow

```
Frontend                    Backend
────────                    ───────
User logs in                ──►
  Supabase returns
  access_token (JWT)

API call made with
  Authorization: Bearer <JWT>
                            ──►
                            middleware/auth.js
                              supabase.auth.getUser(token)
                                │
                                ├─ Valid token ──► req.user = { uid, email, ... }
                                │                   next() ──► route handler
                                │
                                └─ Invalid/expired ──► 401 Unauthorized
```

### `req.user` Shape

| Field | Type | Source |
|-------|------|--------|
| `uid` | string (UUID) | `user.id` from Supabase |
| `email` | string | `user.email` from Supabase |
| `...user` | object | Full Supabase user object (for any additional fields) |

**Important:** The `uid` field is named to maintain backward compatibility with existing route handlers that use `req.user.uid`. In Supabase, this is the user's UUID (`user.id`).

---

## 6. Development Bypass Mode

When Supabase environment variables are not set, the middleware enters a development bypass mode:

```js
if (!supabaseAdmin) {
  req.user = { uid: "DEV_MOCK_UID_" + token.substring(0, 5), email: "dev@localhost" };
  return next();
}
```

This allows local development without a Supabase project configured. The mock UID is derived from the first 5 characters of the token, providing consistent user identification across requests.

**Warning messages on startup:**
```
⚠️ WARNING: Supabase environment variables not found in server/.env. Skipping Supabase Admin initialization.
⚠️ WARNING: API requests will bypass authentication. THIS IS FOR LOCAL DEV ONLY.
```

---

## 7. Environment Variables

### Required for Production

```ini
# server/.env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Removed (Firebase)

The following env vars are no longer needed and should be removed from `server/.env`:

```ini
# REMOVE THESE — no longer used
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

### Where to Find the Keys

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → use as `SUPABASE_URL`
   - **service_role** secret → use as `SUPABASE_SERVICE_ROLE_KEY`

> **⚠️ NEVER** use the `anon` key as `SUPABASE_SERVICE_ROLE_KEY`. The anon key is for frontend use only and is subject to RLS policies.

---

## Package Changes

### Removed

```
npm uninstall firebase-admin    # in server/
```

### Added

```
npm install @supabase/supabase-js    # in server/
```

The `firebase-admin` package (142 dependencies) was completely removed from the backend.
