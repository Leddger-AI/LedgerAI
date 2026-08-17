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
  * `VITE_API_URL`: The public URL of your deployed backend (e.g. `https://ledgerai-vjt8.onrender.com`).

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
  * `PORT`: `5000` (or let Render assign it).
  * `GOOGLE_CLIENT_ID`: Google OAuth client ID (for email notifications).
  * `GOOGLE_CLIENT_SECRET`: Google OAuth client secret.
  * `GOOGLE_REFRESH_TOKEN`: Gmail OAuth2 refresh token.
  * `GOOGLE_EMAIL`: The Gmail address sending notifications.
  * `GEMINI_API_KEY`: *(Optional, Google Gemini API key for AI attribution)*.
  * `GITHUB_TOKEN`: *(Optional, GitHub Personal Access Token — raises the GitHub API rate limit for candidate GitHub analysis from 60/hr to 5,000/hr)*.

---

## 🤖 3. UptimeRobot (Keep Awake)

To prevent Render's free tier from going to sleep after 15 minutes of inactivity:
1. Log in to [UptimeRobot.com](https://uptimerobot.com/).
2. Create a new monitor of type **`HTTP(s)`**.
3. Name it `LedgerAI Node API`.
4. Set the URL to your Render health endpoint:
   ```text
   https://your-render-app.onrender.com/api/user/departments
   ```
5. Set the monitoring interval to **`5 minutes`**.

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
