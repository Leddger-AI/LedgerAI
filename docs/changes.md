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
- **Created:** [src/supabaseClient.js](file:///c:/PROJECTS/MAIN%20Projects/Leddger-AI/src/supabaseClient.js)
  - Set up initialization for Supabase JS Client SDK.
  - Configured Google OAuth redirect flow requesting read-only calendar scope.
  - Extracted Supabase Access Token (JWT) + Google Provider Token for backend authorization.
- **Created:** [src/supabaseAuth.js](file:///c:/PROJECTS/MAIN%20Projects/Leddger-AI/src/supabaseAuth.js)
  - Wraps all Supabase auth methods: `loginWithGoogleAndCalendar()`, `loginWithEmail()`, `signUpWithEmail()`, `signOut()`, `getCurrentSession()`, `onAuthChange()`, `getAuthToken()`, `getCurrentUser()`.
- **Deprecated:** `src/firebaseAuth.js` — Dead code, no longer imported. Safe to delete.

> **Note:** The original Firebase auth setup (`src/firebaseAuth.js`) has been fully replaced by Supabase. See [Supabase Migration Overview](./migration/supabase-migration-overview.md) for details.

---

## � 4. Backend Service Core (Node.js + Express)
- **Created:** [server/index.js](file:///c:/PROJECTS/MAIN%20Projects/Leddger-AI/server/index.js)
  - Node.js + Express 5 backend server.
  - JWT verification via Supabase service role key (`supabase.auth.getUser(token)`).
  - Calendar API query for past 7 days events with attendee lists and duration parsing.
  - User data stored in Supabase (PostgreSQL). Spreadsheet data stored in MongoDB.
- **Created:** [server/middleware/auth.js](file:///c:/PROJECTS/MAIN%20Projects/Leddger-AI/server/middleware/auth.js)
  - Token verification using Supabase JWT (replaces Firebase Admin SDK).
- **Created:** [server/supabaseClient.js](file:///c:/PROJECTS/MAIN%20Projects/Leddger-AI/server/supabaseClient.js)
  - Backend Supabase client with service role key (bypasses RLS).

> **Note:** The original Python/FastAPI backend (`backend/`) has been replaced by the Node.js/Express backend (`server/`). The Rust backend (`backend_rs/`) is legacy. See [Dual-Database Architecture](./migration/dual-database-architecture.md) for details.

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

---

## 👤 7. Recruiter Candidate smart profile image switcher (Phase 1)
- **Modified:** [src/pages/StudentPortal.jsx](file:///C:/PROJECTS/EXPERIMENT/Leddger-AI/src/pages/StudentPortal.jsx)
  - Added input field for `githubUsername` and file upload element for manual profile pictures.
  - Form data converts manually uploaded images to Base64 strings.
  - Package both fields into the encrypted AES JSON payload before local local submission.
  - Changed text colors of headers and decrypted values to pure white to conform to the strict white-text theme rule.
- **Modified:** [src/pages/RecruiterDashboard.jsx](file:///C:/PROJECTS/EXPERIMENT/Leddger-AI/src/pages/RecruiterDashboard.jsx)
  - Created `CandidateAvatar` component to resolve and switch candidate avatars based on the fallback hierarchy (manual image > GitHub API URL > initials text bubble > default placeholder).
  - Integrated `<CandidateAvatar />` inside the mapping loop of decrypted submissions.
  - Adjusted the default initials placeholder text to pure white.
  - Updated `generateCode()` mock candidate payload to include a sample GitHub username for instant decryption test validation.
- **Created:** [docs/github_integration.md](file:///C:/PROJECTS/EXPERIMENT/Leddger-AI/docs/github_integration.md)
  - Authored documentation explaining the avatar lookup fallback hierarchy and the secure client-side encryption workflow.

---

## 📊 8. GitHub Project Analysis & Engagement Tracker (Phase 2)
- **Modified:** [src/pages/RecruiterDashboard.jsx](file:///C:/PROJECTS/EXPERIMENT/Leddger-AI/src/pages/RecruiterDashboard.jsx)
  - Implemented the `GithubAnalysis` React component. It triggers a REST API query to fetch repositories from `https://api.github.com/users/{username}/repos` on candidate decryption.
  - Programmed a 14x7 contribution micro-grid (Commit Pulse Graph) rendering code intensity squares in varying shades/opacities of cyan (`#00f0ff`).
  - Added dynamic stack bar calculations dividing repository languages into percentage segments with distinct colors.
  - Created a contextualized AI Review card extracting readability and structure metrics based on candidate repositories and years of experience.
  - Wired `<GithubAnalysis />` inside the decrypted application list block.
- **Modified:** [docs/github_integration.md](file:///C:/PROJECTS/EXPERIMENT/Leddger-AI/docs/github_integration.md)
  - Documented grid features, telemetry algorithms, and fallback states.
- **Modified:** [docs/features.md](file:///C:/PROJECTS/EXPERIMENT/Leddger-AI/docs/features.md)
  - Updated candidate features list to describe the repository analysis dashboard and visual widgets.


