# Supabase Setup Guide — Step by Step

This guide walks you through setting up Supabase for the Leddger AI project from scratch.

---

## Table of Contents

1. [Create a Supabase Project](#1-create-a-supabase-project)
2. [Get Your API Keys](#2-get-your-api-keys)
3. [Configure Environment Variables](#3-configure-environment-variables)
4. [Run the SQL Schema](#4-run-the-sql-schema)
5. [Enable Google OAuth](#5-enable-google-oauth)
6. [Enable Email/Password Auth](#6-enable-emailpassword-auth)
7. [Verify Setup](#7-verify-setup)
8. [Production Checklist](#8-production-checklist)

---

## 1. Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign in (or create an account — free tier available)
3. Click **New Project**
4. Fill in:
   - **Name:** `leddger-ai` (or your preferred name)
   - **Database Password:** Choose a strong password (save it somewhere safe)
   - **Region:** Choose the closest to your users
   - **Pricing Plan:** Free (500MB database, 50K monthly active users)
5. Click **Create new project**
6. Wait 2–3 minutes for provisioning to complete

---

## 2. Get Your API Keys

1. Go to your project dashboard
2. Navigate to **Settings** → **API**
3. You'll see three values:

| Value | Where to Use | Env Var |
|-------|-------------|---------|
| **Project URL** | Frontend + Backend | `VITE_SUPABASE_URL` (frontend), `SUPABASE_URL` (backend) |
| **anon public** key | Frontend only | `VITE_SUPABASE_ANON_KEY` |
| **service_role** secret key | Backend only | `SUPABASE_SERVICE_ROLE_KEY` |

> **⚠️ CRITICAL:** The `service_role` key bypasses all Row Level Security. NEVER put it in frontend code, never commit it to git, and never expose it in browser network requests.

---

## 3. Configure Environment Variables

### Frontend `.env` (project root)

Create or update `.env` in the project root:

```ini
# Supabase (frontend — uses anon key, subject to RLS)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key

# API server URL
VITE_API_URL=http://localhost:5000
```

### Backend `server/.env`

Create or update `server/.env`:

```ini
# Supabase (backend — uses service role key, bypasses RLS)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key

# MongoDB (for Spreadsheet storage)
MONGODB_URI=mongodb+srv://your-connection-string

# Server
PORT=5000

# Email (Gmail OAuth2 — for form submission notifications)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REFRESH_TOKEN=your-google-refresh-token
GOOGLE_EMAIL=your-email@gmail.com
```

### Remove Old Firebase Variables

Delete these from `server/.env` if they exist:

```ini
# REMOVE THESE
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

---

## 4. Run the SQL Schema

This creates all tables, RLS policies, indexes, and the auto-profile trigger.

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New query**
4. Open the file `server/supabase_schema.sql` from your project
5. Copy the entire contents and paste into the SQL Editor
6. Click **Run**
7. You should see "Success. No rows returned." — this is normal for DDL statements

### Verify Tables Were Created

1. Go to **Table Editor** in the sidebar
2. You should see these tables:
   - `profiles`
   - `form_drafts`
   - `form_submissions`
   - `meetings`
   - `alerts`
   - `candidates`

### Verify RLS Is Enabled

1. Go to **Authentication** → **Policies**
2. Each table should show "RLS Enabled" with policies listed

---

## 5. Enable Google OAuth

### 5.1 Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project (you can reuse the existing `leddger-ai` Firebase project)
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Choose **Web application**
6. Set **Authorized JavaScript origins:**
   ```
   http://localhost:5173
   https://leddger-ai.netlify.app
   ```
7. Set **Authorized redirect URIs:**
   ```
   https://your-project-ref.supabase.co/auth/v1/callback
   ```
   > Replace `your-project-ref` with your actual Supabase project reference (found in Settings → API)
8. Click **Create**
9. Copy the **Client ID** and **Client Secret**

### 5.2 Enable Google Calendar API

1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for **Google Calendar API**
3. Click **Enable**

### 5.3 Configure in Supabase

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Find **Google** and click to expand
3. Toggle **Enable Google**
4. Paste the **Client ID** and **Client Secret** from step 5.1
5. Set the **Redirect URL** to:
   ```
   https://your-project-ref.supabase.co/auth/v1/callback
   ```
6. Click **Save**

### 5.4 Test Google Sign-In

1. Start your frontend: `npm run dev`
2. Open `http://localhost:5173`
3. Click **Sign In** → Google OAuth
4. You should be redirected to Google's consent page
5. After consent, you'll be redirected back to the app as an authenticated user

---

## 6. Enable Email/Password Auth

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Find **Email** and ensure it's **Enabled** (enabled by default)
3. Optionally configure:
   - **Confirm email:** On (requires SMTP setup) or Off (for development)
   - **Allow new signups:** On

### For Development (No Email Confirmation)

1. Go to **Authentication** → **Sign In / Up**
2. Under **Email**, turn OFF **Confirm email**
3. This allows instant login without email verification

---

## 7. Verify Setup

### 7.1 Check Frontend Build

```bash
npm run build
```
Should complete with no errors.

### 7.2 Check Backend Start

```bash
cd server
node index.js
```

You should see:
```
✅ Supabase Admin client initialized successfully via .env.
✅ Connected to MongoDB via Mongoose
🚀 Server running on port 5000 (bound to 0.0.0.0)
```

### 7.3 Test Auth Flow

1. Start both frontend and backend: `npm run dev`
2. Sign in with Google or email/password
3. Check Supabase Dashboard → **Authentication** → **Users** — your user should appear
4. Check **Table Editor** → `profiles` — a profile row should have been auto-created by the trigger

### 7.4 Test API Endpoints

```bash
# Get your access token from the browser's localStorage (key: sb-<ref>-auth-token)
# Then test:
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/user/departments
# Should return: { "departments": [] }
```

---

## 8. Production Checklist

Before deploying to production:

- [ ] Supabase project created and SQL schema run
- [ ] Google OAuth configured with production redirect URIs
- [ ] Google Calendar API enabled in Google Cloud Console
- [ ] `.env` (frontend) configured with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] `server/.env` configured with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `server/.env` configured with `MONGODB_URI`
- [ ] All old Firebase env vars removed
- [ ] `firebase` and `firebase-admin` packages uninstalled
- [ ] `src/firebaseAuth.js` deleted (dead code)
- [ ] Old Mongoose models (`User.js`, `FormDraft.js`, `FormSubmission.js`) deleted
- [ ] Email confirmation setting configured appropriately
- [ ] RLS policies verified in Supabase Dashboard
- [ ] Frontend build succeeds: `npm run build`
- [ ] Backend starts without errors: `cd server && node index.js`
- [ ] Google sign-in redirect works in production
- [ ] Test spreadsheet save/load/delete
- [ ] Test form draft creation and activation

---

## Troubleshooting

### "Invalid API key" error

- Double-check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct in `.env`
- Restart the Vite dev server after changing `.env` files

### Google OAuth redirect fails

- Ensure the redirect URI in Google Cloud Console exactly matches `https://your-project-ref.supabase.co/auth/v1/callback`
- Check that the redirect URI in Supabase Dashboard → Authentication → Providers → Google matches

### "permission denied" or RLS errors

- Ensure you're using the `service_role` key (not `anon`) in `server/.env`
- Verify RLS policies are created by checking Authentication → Policies in Supabase Dashboard

### Profile not auto-created on signup

- Verify the `handle_new_user()` trigger was created by running the SQL schema
- Check Database → Triggers in Supabase Dashboard

### MongoDB connection fails

- Ensure `MONGODB_URI` is set in `server/.env`
- Check network access / IP whitelist in MongoDB Atlas
