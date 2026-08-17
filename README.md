# 📊 ai.leddger — HR Cost Intelligence & Meeting Analytics Engine

`ai.leddger` is an AI-powered SaaS analytics dashboard and backend platform designed to track, audit, and analyze the human resource cost burden associated with calendar meetings.

---

## 🎯 Project Overview

*   **What is the project about?** An automated SaaS platform that connects to corporate calendar systems (Google Calendar) to analyze meeting frequencies, durations, and participant list details.
*   **Who is it for?** HR Operations, finance directors, team leads, and executives who need visibility into organizational time expenditure and meeting costs.
*   **What problem does it solve?** It shines a light on "meeting overhead"—the hidden corporate cost sink of unproductive or unattributed calendar hours.
*   **How does it help the user?** By calculating the financial cost of every meeting based on attendees' average rates, classifying meetings into project codes via AI, and highlighting budget anomalies.

---

## 🚀 Key Features

### 1. SaaS Analytics Dashboard UI
*   **KPI Metrics:** Real-time tracking of *Total Meeting Cost* (with dynamic sparklines), *AI Attribution Accuracy*, *Anomalies Detected*, and *Unattributed Hours*.
*   **Visualizations (Recharts):** Expenditure by project (grouped bar chart), top project spend weights, and chronological area charts showing cost trends.
*   **Granular Calendar Ledger:** Table lists recent meetings, showing titles, durations, attendee counts, estimated costs, and AI project tags with options for manual re-tagging.

### 2. Dual-Database Authentication Flow
*   Powered by **Supabase Auth** and **Google OAuth** (redirect-based).
*   Extracts a **Supabase Access Token** (JWT, verifies client identity to the backend) and a **Google Provider Token** (authorizes the backend to query read-only calendar events for the past 7 days).
*   User data (profiles, drafts, submissions, meetings, alerts) stored in **Supabase (PostgreSQL)** with Row Level Security.
*   Spreadsheet data stored in **MongoDB** with a 20-file limit per user.

### 3. AI Cost Attribution Classifier
*   Classifies meetings into project categories (`Project Phoenix`, `Client ABC Onboarding`, `Q4 Marketing Strategy`, `Internal Operations`) based on descriptions and titles.
*   Uses **Gemini 2.5 Flash** with custom system instructions.
*   Features a **graceful heuristic fallback** mapping keywords if the Gemini API key is missing or calls fail.

### 4. Spreadsheet Cloud Storage with 20-File Limit
*   Save FortuneSheet workbooks to MongoDB cloud storage.
*   Load, update, and delete saved spreadsheets.
*   **20-file limit** per user — when reached, users must export files locally and delete them from the cloud.
*   Export-before-delete flow ensures data is never lost.

### 5. Row-Level Security (RLS)
*   Strict data isolation is enforced at the Supabase (PostgreSQL) database layer.
*   RLS policies ensure users can only access their own profiles, drafts, submissions, meetings, alerts, and candidates.
*   Backend uses a service role key that bypasses RLS for administrative operations.

### 6. Knowledge Base Ingestion API
*   **Document Ingestion:** Processes PDF, DOCX, and TXT files, breaking content into semantic chunks using a custom token-aware `RecursiveTextSplitter`.
*   **Slack Thread Ingestion:** Parses multi-turn conversations, formats timestamps/usernames, and indexes them with AI-generated tag metadata.

---

## 🛠️ Technology Stack

*   **Frontend:** React 19, Vite, Recharts (Charts), Lucide React (Icons), FortuneSheet (Spreadsheet), Vanilla CSS (Glassmorphism & animations).
*   **Auth:** Supabase Auth (Google OAuth redirect flow, email/password).
*   **Backend:** Node.js, Express 5, Supabase JS SDK (JWT verification), Google APIs (Calendar sync), Nodemailer (email notifications).
*   **Databases:** Supabase (PostgreSQL) for user/auth data, MongoDB (Mongoose) for spreadsheet data.
*   **AI:** Google Gemini 2.5 Flash (project attribution classifier).

---

## ⚙️ Environment Variables

### Frontend `.env` (project root)

```ini
# Supabase (frontend — uses anon key, subject to RLS)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key

# API server URL
VITE_API_URL=http://localhost:5000
```

### Backend `server/.env`

```ini
# Supabase (backend — uses service role key, bypasses RLS)
SUPABASE_URL=https://your-project.supabase.co
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

# GitHub (optional — raises the GitHub API rate limit for candidate GitHub
# analysis from 60/hr unauthenticated to 5,000/hr. A plain Personal Access
# Token with no scopes is sufficient, since only public repo data is read.)
GITHUB_TOKEN=your-github-personal-access-token
```

> **⚠️ CRITICAL:** Never expose the `SUPABASE_SERVICE_ROLE_KEY` in frontend code. Only use `VITE_SUPABASE_ANON_KEY` in the frontend.

---

## ⚡ Quick Start

### Prerequisites

1. Create a Supabase project at [https://app.supabase.com](https://app.supabase.com)
2. Run the SQL schema: copy `server/supabase_schema.sql` into Supabase Dashboard → SQL Editor → Run
3. Enable Google OAuth in Supabase Dashboard → Authentication → Providers → Google
4. Configure environment variables (see above)

### Backend Setup
1. The backend is in the `server/` directory and auto-installs via `postinstall`:
   ```bash
   npm install
   ```
2. Start the backend:
   ```bash
   npm run dev:backend
   ```
   Or from the server directory:
   ```bash
   cd server && node index.js
   ```

### Frontend Setup
1. Install dependencies from the root directory:
   ```bash
   npm install
   ```
2. Start the development client:
   ```bash
   npm run dev
   ```
   This runs both frontend (Vite on `http://localhost:5173`) and backend (Node.js on `http://localhost:5000`) concurrently.

---

## 📚 Documentation

### Migration Guides
- [Supabase Migration Overview](docs/migration/supabase-migration-overview.md)
- [Supabase Auth — Frontend](docs/migration/supabase-auth-frontend.md)
- [Supabase Auth — Backend](docs/migration/supabase-auth-backend.md)
- [Dual-Database Architecture](docs/migration/dual-database-architecture.md)
- [Spreadsheet Cloud Storage & 20-File Limit](docs/migration/spreadsheet-cloud-storage.md)
- [Meetings & Alerts Persistence](docs/migration/meetings-alerts-supabase.md)
- [Supabase Setup Guide](docs/migration/supabase-setup-guide.md)

### Architecture & Features
- [Authentication Flow](docs/authentication-flow.md)
- [API Endpoints](docs/backend/api_specs.md)
- [Drafts & Email Automation](docs/feature-drafts-and-email.md)
- [Drafts Dashboard Architecture](docs/drafts-dashboard-architecture.md)
- [Frontend Features](docs/frontend/features.md)
- [GitHub Integration](docs/frontend/github_integration.md)
- [Sidebar Architecture](docs/sidebar-architecture.md)
- [UI Layout Refactor](docs/ui-layout-refactor.md)
- [Production Deployment](docs/deployment/production_deployment.md)
