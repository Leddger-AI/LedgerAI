# Production Deployment Guide

This guide outlines steps to deploy the Ledger AI application in production, keep the backend active, and launch local environments.

> **Migration Note:** The backend has been migrated from Rust to Node.js/Express. Authentication has been migrated from Firebase to Supabase. See [Supabase Setup Guide](../migration/supabase-setup-guide.md) for Supabase configuration.

---

## 💻 1. Frontend Client (Netlify)

Configure the web app on Netlify using the following settings:
* **Repository**: `LedgerAI`
* **Branch to Deploy**: `main`
* **Build Command**: `npm run build`
* **Publish Directory**: `dist`
* **Environment Variables**:
  * `VITE_SUPABASE_URL`: Your Supabase project URL (e.g. `https://your-project.supabase.co`).
  * `VITE_SUPABASE_ANON_KEY`: Your Supabase anon public key.
  * `VITE_API_URL`: The public URL of your deployed backend (`https://ledgerai-908y.onrender.com` for the current Netlify release).

---

## 🟢 2. Backend API (Render)

Deploy the Node.js/Express backend as a **Web Service** on Render:
* **Repository**: `LedgerAI`
* **Language**: `Node`
* **Root Directory**: `server`
* **Build Command**: `npm install`
* **Start Command**: `node index.js`
* **Environment Variables**:
  * `SUPABASE_URL`: Your Supabase project URL.
  * `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role secret key (NOT the anon key).
  * `MONGODB_URI`: Your MongoDB connection string (for spreadsheet storage).
  * `FRONTEND_URL`: The Netlify site origin used by human unsubscribe links.
  * `PUBLIC_API_URL`: The external HTTPS Render API origin used by mailbox one-click unsubscribe. If omitted, Render's `RENDER_EXTERNAL_URL` is used.
  * `ENCRYPTION_KEY`: A stable 64-character hex secret for encrypted sender credentials and signed unsubscribe links.
  * `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: Avatar storage credentials.
  * `PORT`: `5000` (or let Render assign it).
  * `GOOGLE_CLIENT_ID`: Google OAuth client ID (for email notifications).
  * `GOOGLE_CLIENT_SECRET`: Google OAuth client secret.
  * `GOOGLE_REFRESH_TOKEN`: Gmail OAuth2 refresh token.
  * `GOOGLE_EMAIL`: The Gmail address sending notifications.
  * `GEMINI_API_KEY`: *(Optional, Google Gemini API key for AI attribution)*.

Before deploying the aligned email worker to an existing database, run
`server/email_send_log_migration.sql` in the Supabase SQL editor. Keep the
Render API service awake: its Agenda worker processes both immediate and
scheduled email campaigns. A sleeping service will delay delivery.

The migration was applied to the configured `Leddger-AI` Supabase project on
30 October 2026. A read-only query confirmed the unique
`idx_email_send_log_campaign_unique` index on `(user_id, campaign_id)`.

Before running migrations or testing a real avatar replacement, verify that
the configured Supabase project is active and that its hostname resolves. The
API must be able to read `profiles`; Cloudinary connectivity alone does not
confirm that an uploaded avatar can be saved to a user's profile.

---

## 🤖 3. Worker monitoring

Scheduled delivery needs an always-on Render compute plan. Render's Free web
services spin down after 15 minutes without inbound traffic and can restart at
other times; a periodic ping is monitoring, not a delivery guarantee. See
[Render's Free service limits](https://render.com/docs/free).

Monitor the email worker health endpoint (HTTP 200 means MongoDB and Agenda are
ready):
   ```text
   https://your-render-app.onrender.com/api/email/worker-health
   ```
Configure alerts for non-200 responses and check a scheduled test campaign
through a backend restart before rollout.

---

## 🖥️ 4. Local Development

To start both frontend and backend dev servers concurrently locally:
1. Configure `.env` (frontend) and `server/.env` (backend) with Supabase and MongoDB credentials.
2. Execute this single command from the project root:
   ```bash
   npm run dev
   ```
3. This runs `vite` (web frontend on `http://localhost:5173`) and `node index.js` (backend API on `http://localhost:5000`) concurrently.

---

## 📦 5. Supabase Setup (Required Before Deployment)

Before deploying, ensure your Supabase project is configured:
1. Create a Supabase project at [https://app.supabase.com](https://app.supabase.com)
2. Run `server/supabase_schema.sql` in Supabase Dashboard → SQL Editor
3. Enable Google OAuth in Authentication → Providers → Google
4. Set the redirect URI to `https://your-project.supabase.co/auth/v1/callback`
5. See [Supabase Setup Guide](../migration/supabase-setup-guide.md) for full instructions
