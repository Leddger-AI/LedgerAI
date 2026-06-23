# Production Deployment Guide

This guide outlines steps to deploy the Ledger AI application in production, keep the backend active, and launch local environments.

---

## 💻 1. Frontend Client (Netlify)

Configure the web app on Netlify using the following settings:
* **Repository**: `LedgerAI`
* **Branch to Deploy**: `main`
* **Build Command**: `npm run build`
* **Publish Directory**: `dist`
* **Environment Variables**:
  * `VITE_API_URL`: The public URL of your deployed backend on Render (e.g. `https://ledgerai-vjt8.onrender.com`).

---

## 🦀 2. Backend API (Render)

Deploy the Rust backend as a **Web Service** on Render:
* **Repository**: `LedgerAI`
* **Language**: `Rust`
* **Root Directory**: `backend_rs`
* **Build Command**: `cargo build --release`
* **Start Command**: `./target/release/backend_rs`
* **Environment Variables**:
  * `REDIS_URL`: `redis://default:dlrCCvaJ0DdU5a6Up6dqPAM2Pj8p0swI@cook-upcycled-capable-10909.db.redis.io:16518` (saves session users)
  * `FRONTEND_URL`: `https://leddger-ai.netlify.app`
  * `GITHUB_CLIENT_ID`: `Iv23liDJmyW1k1Xc3aA6`
  * `GITHUB_CLIENT_SECRET`: `edbea8a8db2bd8b621bfcd46b5749344519aa2ff`
  * `GEMINI_API_KEY`: *(Optional, Google Gemini API key)*

---

## 🤖 3. UptimeRobot (Keep Awake)

To prevent Render's free tier from going to sleep after 15 minutes of inactivity:
1. Log in to [UptimeRobot.com](https://uptimerobot.com/).
2. Create a new monitor of type **`HTTP(s)`**.
3. Name it `LedgerAI Rust API`.
4. Set the URL to your Render document endpoint:
   ```text
   https://ledgerai-vjt8.onrender.com/api/kb/documents
   ```
5. Set the monitoring interval to **`5 minutes`**.

---

## 🖥️ 4. Local Development

To start both frontend and backend dev servers concurrently locally:
1. Execute this single command from your project root:
   ```bash
   npm run dev
   ```
2. This runs `vite` (web frontend on `http://localhost:5173`) and `cargo run` (backend API on `http://localhost:8000`) concurrently.
