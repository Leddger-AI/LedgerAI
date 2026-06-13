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

### 2. Double-Token OAuth Consent Flow
*   Powered by the **Firebase Client SDK** and **Google OAuth**.
*   Simultaneously extracts a **Firebase ID Token** (verifies client identity to the backend) and a **Google Access Token** (authorizes the backend to query read-only calendar events for the past 7 days).

### 3. AI Cost Attribution Classifier
*   Classifies meetings into project categories (`Project Phoenix`, `Client ABC Onboarding`, `Q4 Marketing Strategy`, `Internal Operations`) based on descriptions and titles.
*   Uses **Gemini 2.5 Flash** with custom system instructions.
*   Features a **graceful heuristic fallback** mapping keywords if the Gemini API key is missing or calls fail.

### 4. Knowledge Base Ingestion API
*   **Document Ingestion:** Processes PDF, DOCX, and TXT files, breaking content into semantic chunks using a custom token-aware `RecursiveTextSplitter`.
*   **Slack Thread Ingestion:** Parses multi-turn conversations, formats timestamps/usernames, and indexes them with AI-generated tag metadata.

### 5. Row-Level Security (RLS)
*   Strict data isolation is enforced at the database layer (Supabase / Postgres / Redis).
*   Requests are filtered by access scopes (`personal`, `team`, or `org`) bound to the authenticated user's Firebase token claims, preventing unauthorized access to cross-organization files or logs.

### 6. Local AES Decryption & Temporary Auditor Bypass
*   **At-Rest Encryption:** Sensitive meeting details (meeting descriptions, specific attendee emails) are stored in the database encrypted via **AES-256**.
*   **Dynamic Decryption:** The executive report table uses a local AES decryption key loaded from the server's environment variable (`AES_DECRYPTION_SECRET`).
*   **Decryption Bypass Session:** A temporary local decryption token is generated upon authorization. This allows authorized auditors to bypass masks and decrypt sensitive titles and descriptions in-browser on the fly without storing plaintext on disk.

---

## 🛠️ Technology Stack

*   **Frontend:** React 19, Vite, Recharts (Charts), Lucide React (Icons), Vanilla CSS (Glassmorphism & animations).
*   **Backend:** FastAPI (ASGI Python framework), Uvicorn (Web Server), Firebase Admin SDK (JWT verification), Google API Client (Calendar sync), Google GenAI SDK (Gemini taxonomy classifier), Redis (Caching and token blacklist).

---

## ⚙️ Environment Variables

Configure the following variables in your backend `.env` file:

```ini
# Redis configuration
REDIS_URL=redis://default:...@cook-upcycled-capable-10909.db.redis.io:16518

# Firebase administration
FIREBASE_SERVICE_ACCOUNT_KEY=serviceAccountKey.json

# Gemini AI Engine
GEMINI_API_KEY=your_gemini_api_key_here

# Security configuration
AES_DECRYPTION_SECRET=your_local_aes_secret_key_here
```

---

## ⚡ Quick Start

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the development server:
   ```bash
   uvicorn main:app --reload
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
