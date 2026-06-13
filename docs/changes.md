# Codebase Changes & Modifications

This document summarizes the changes, creations, and configuration modifications made to implement the **HR Cost Intelligence Engine**.

---

## 🔒 1. Security & Exclusions
- **Modified:** [.gitignore](file:///c:/PROJECTS/EXPERIMENT/reactHackathorn/.gitignore)
  - Excluded sensitive API files (`credentials.json`, `serviceAccountKey.json`, `firebase-credentials.json`, and `.env`).
  - Added wildcard rules to ignore OAuth configuration descriptors (`*googleusercontent.com`).

---

## 🎨 2. UI Aesthetics & Layout
- **Created/Modified:** [src/index.css](file:///c:/PROJECTS/EXPERIMENT/reactHackathorn/src/index.css)
  - Reset standard margins and set up Google Fonts imports (`Outfit` and `Inter`).
  - Defined design custom variables (colors, shadows, fonts, transition animations, and pulse warning alerts).
- **Created/Modified:** [src/App.css](file:///c:/PROJECTS/EXPERIMENT/reactHackathorn/src/App.css)
  - Coded grid definitions for KPI cards and layout structures for charts.
  - Implemented responsive table formatting, confidence badges, avatar groups, and modal layouts.
- **Created/Modified:** [src/App.jsx](file:///c:/PROJECTS/EXPERIMENT/reactHackathorn/src/App.jsx)
  - Designed App shell (Sidebar, Header, Main, and Modals).
  - Integrated charts (using Area and Bar charts from Recharts).
  - Added client-side interactions: search matching, metric updating via date preset changes, inline approval actions, and a manual tag editor.

---

## 🔐 3. Authentication & API Integration
- **Created:** [src/firebaseAuth.js](file:///c:/PROJECTS/EXPERIMENT/reactHackathorn/src/firebaseAuth.js)
  - Set up initialization for Firebase Client SDK.
  - Configured Google OAuth sign-in popups requesting read-only calendar scope.
  - Extracted double tokens (Firebase ID Token + Google Access Token) for backend authorization.

---

## 🐍 4. Backend Service Core
- **Created:** [backend/requirements.txt](file:///c:/PROJECTS/EXPERIMENT/reactHackathorn/backend/requirements.txt)
  - Listed Python packages (fastapi, uvicorn, firebase-admin, google-api-python-client, google-auth, google-generativeai).
- **Created:** [backend/auth.py](file:///c:/PROJECTS/EXPERIMENT/reactHackathorn/backend/auth.py)
  - Wrote token decoding utility utilizing Firebase cert certificates for backend protection.
- **Created:** [backend/main.py](file:///c:/PROJECTS/EXPERIMENT/reactHackathorn/backend/main.py)
  - Setup core FastAPI server framework.
  - Coded Calendar API query for past 7 days events with attendee lists and duration parsing.

---

## 🤖 5. AI Attribution Engine & local testing
- **Created:** [backend/ai_engine.py](file:///c:/PROJECTS/EXPERIMENT/reactHackathorn/backend/ai_engine.py)
  - Created taxonomy classification configurations using the Gemini API.
  - Created a keyword-matching heuristic fallback to ensure operation if API keys are not specified.
- **Modified:** [backend/main.py](file:///c:/PROJECTS/EXPERIMENT/reactHackathorn/backend/main.py)
  - Connected calendar events list endpoint to the AI engine to tag each ingested meeting before return.
- **Created:** [backend/test_ai_attribution.py](file:///c:/PROJECTS/EXPERIMENT/reactHackathorn/backend/test_ai_attribution.py)
  - Wrote a local unit-test file verifying project taxonomy mappings for typical calendar titles.

---

## 🚀 6. Premium Landing Page & Auth Flow Merger
- **Added:** [src/LandingPage.jsx](file:///c:/PROJECTS/EXPERIMENT/reactHackathorn/src/LandingPage.jsx) & [src/LandingPage.css](file:///c:/PROJECTS/EXPERIMENT/reactHackathorn/src/LandingPage.css)
  - Pulled premium landing page design from remote and resolved merge conflicts to retain local enhancements.
  - Linked landing page buttons ("Sign In", "Get Started", and "Get Started Now") directly to the Firebase Google Calendar sign-in flow.
  - Configured automated redirection: once a user signs in, their calendar events are fetched in the background from the FastAPI backend and they are transitioned straight into the active cost dashboard.
  - Integrated loading indicators and floating error banners on the landing page UI for smooth user feedback.
