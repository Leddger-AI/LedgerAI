# Leddger AI: Comprehensive Development Changelog
*June - August 2026*

This document outlines the entire development history, feature implementations, and architectural decisions made over the course of the project build.

---

## 1. Authentication & Security
- **Firebase & Google OAuth**: Resolved complex Firebase Auth integration issues (`auth/operation-not-allowed`) and successfully deployed a robust Google OAuth sign-in flow.
- **GitHub App Integration**: Configured and integrated a dedicated GitHub App (App ID `4104415`) for candidate authorization.
  - Users can securely grant Leddger AI read-only access to specific private repositories and profile data.
  - Designed the initial OAuth callback route to exchange temporary codes for user access tokens.
- **Google Cloud Verification**: Addressed Google Cloud domain verification issues by deploying `google-site-verification` HTML tags and metadata to confirm ownership of `https://leddger-ai.netlify.app`.

## 2. Core Dashboard & Candidate Analytics
- **Smart Profile Image Switcher**: Built a dynamic avatar component that automatically fetches a candidate's GitHub profile picture, with a fallback to their manually uploaded resume photo in a clean, pill-shaped UI.
- **GitHub Project Analysis UI**: Engineered a high-end dashboard to analyze candidate repositories:
  - **Commit Pulse Graph**: A micro-chart timeline illustrating commit activity to assess genuine engagement.
  - **Tech Stack Distribution**: Minimalist horizontal progress bars displaying the language breakdown (e.g., TypeScript 70%, Python 30%).
  - **AI Analysis Summary**: A specialized card component reserved for LLM-generated insights on code readability, modular structure, and security.

## 3. Recruiter Tools: Form Builder & Bulk Outreach
- **Form Customizer UI (Phase 1)**: Built a dark-themed (Charcoal `#1A1D1D`, Mint `#D7FEFA`) dashboard allowing recruiters to toggle form fields (Resume, GitHub Repo Access, Portfolio Link) and add custom recruiter notes.
- **Bulk Delivery Drawer (Phase 2)**: Engineered a slide-out Outreach Campaign drawer.
  - **Single Invite**: Manual email input for one-off candidate outreach.
  - **Bulk Campaign**: Implemented a drag-and-drop zone for `.csv` or `.xlsx` files that parses columns (Email, Candidate Name) and prepares automated mass outreach.

## 4. Legal & Compliance
- **Privacy Policy & Terms of Service**: Automatically generated and integrated standard legal pages (`/privacy` and `/terms`) directly into the router, specifically outlining how Google user data is accessed, used, and stored to comply with Google's API Services User Data Policy.

## 5. UI/UX: The Landing Page & Navigation
- **Dynamic Scroll Navbar**: Rebuilt the navigation bar into a minimalist text layout that smoothly animates into a visible, "floating pebble" background upon scrolling.
- **Landing Page Enhancements**: Implemented an exact pixel-perfect design matching provided design references, maintaining a unified cream background while heavily utilizing the dark charcoal/mint accent theme across internal tools.

## 6. Template Builder Engine & Architecture (Latest)
- **Advanced Routing**: Migrated the entire internal dashboard from basic React state (`activeTab`) to **React Router DOM**. This ensures persistent URLs, working back-buttons, and flawless state maintenance upon browser refresh.
- **Three Core Builders**: Developed standalone builders for **Student**, **Employee**, and **Team** evaluation templates.
- **Device-Responsive Live Preview**: Added a floating device toggle that seamlessly morphs the preview canvas between a 900px Desktop Monitor layout and a 375px Smartphone layout with independent internal scrolling.
- **Dynamic Email Domain Enforcer**: Implemented an industry-standard **Bracket Syntax** parser (`@[branch].sreenidhi.edu.in`).
  - Recruiters type templates with variables wrapped in brackets.
  - The Live Preview automatically converts this into a sleek, inline **Compound Input Field**, locking down the domain while letting the candidate edit the bracketed variables (like their specific branch).

## 7. Environment Readiness
- Secured all sensitive keys (GitHub Client Secret, Private `.pem` keys).
- Injected Cloudinary credentials (`CLOUDINARY_CLOUDNAME`, `API_KEY`) to prepare for the upcoming unified asset upload pipeline.

---

## 8. Supabase Migration & Dual-Database Architecture (August 2026)

> **See:** [Supabase Migration Overview](./migration/supabase-migration-overview.md) for complete details.

### Phase 1: Supabase Client Setup
- Installed `@supabase/supabase-js` on both frontend and backend.
- Created `src/supabaseClient.js` (frontend, anon key) and `server/supabaseClient.js` (backend, service role key).
- Created `src/supabaseAuth.js` with auth wrappers: Google OAuth, email/password login, sign-up, sign-out, session retrieval, `getAuthToken()`, `getCurrentUser()`, `onAuthChange()`.

### Phase 2: Frontend Auth Migration
- Migrated `App.jsx` from Firebase `onAuthStateChanged` to Supabase `getCurrentSession()` + `onAuthStateChange`.
- Updated Google OAuth from Firebase popup flow to Supabase redirect flow.
- Updated all token management from `firebaseIdToken` to `accessToken` (Supabase JWT).
- Migrated 9 frontend files: `App.jsx`, `ProtectedRoute.jsx`, `SettingsView.jsx`, `ActiveLinksView.jsx`, `DraftsView.jsx`, `EmployeeTemplateBuilder.jsx`, `StudentTemplateBuilder.jsx`, `TeamTemplateBuilder.jsx`, `StudentPortal.jsx`.
- Replaced `StudentPortal.jsx` Firebase anonymous auth with Supabase session check.

### Phase 3: Backend Auth Migration
- Completely rewrote `server/middleware/auth.js` from Firebase Admin SDK to Supabase JWT verification.
- Removed `firebase-admin` package (142 dependencies) from backend.
- Removed `firebase` package (80 dependencies) from frontend.
- Backend now verifies tokens via `supabase.auth.getUser(token)` using service role key.

### Phase 4: User Data Models → Supabase
- Created `server/supabase_schema.sql` with 6 tables: `profiles`, `form_drafts`, `form_submissions`, `meetings`, `alerts`, `candidates`.
- Implemented Row Level Security (RLS) policies for all tables.
- Added auto-profile creation trigger on user signup.
- Migrated all `server/index.js` endpoints from Mongoose models to Supabase queries.
- Deprecated Mongoose models: `User.js`, `FormDraft.js`, `FormSubmission.js` (dead code).

### Phase 5: Spreadsheet Model & 20-File Limit
- Created `server/models/Spreadsheet.js` (Mongoose) for MongoDB spreadsheet storage.
- Added 6 spreadsheet API endpoints with 20-file limit enforcement.
- Returns HTTP 409 when user exceeds 20 saved spreadsheets.

### Phase 6: Spreadsheet Cloud UI
- Updated `LedgerSpreadsheet.jsx` with Save to Cloud, Load from Cloud, Delete, and Export & Delete functionality.
- 5 modals: Save modal, Load modal, Limit reached modal, Delete confirmation, Export-before-delete confirmation.
- Export-before-delete flow: exports `.xlsx` locally via SheetJS, then deletes from MongoDB.

### Phase 7: Meetings & Alerts Persistence
- Added meetings CRUD endpoints (Supabase `meetings` table).
- Added alerts CRUD endpoints (Supabase `alerts` table).
- Wired `fetchMeetings()` and `fetchAlerts()` in `App.jsx` to load on auth state change.
- Fallback to mock data if API calls fail (graceful degradation).

---

## 8. Data Integrity & Bug Fix Pass (August 11, 2026)

A comprehensive pass to fix data flow issues, hardcoded URLs, missing endpoints, and UI gaps. See detailed documentation:

- **[docs/data-integrity-fixes.md](./data-integrity-fixes.md)** — Full issue-by-issue breakdown of all 14 fixes
- **[docs/api-endpoints.md](./api-endpoints.md)** — New and modified API endpoints reference
- **[docs/database-schema-changes.md](./database-schema-changes.md)** — Schema migration guide and RLS policy updates

### Key Changes:
- **Hardcoded URLs eliminated:** All `localhost:5000` and `localhost:5173` URLs replaced with `API_BASE_URL` env var and `window.location.origin`
- **Email draft updates:** Added PUT support to prevent duplicate drafts on resave
- **Send Campaign UI:** Full modal with CSV upload, recipient management, variable mapping, and result tracking
- **Submissions API:** New `GET /api/submissions` and `GET /api/submissions/:draftId` endpoints + viewer UI in DraftsView
- **Form submissions RLS:** Added `user_id` column for direct RLS checks instead of subquery-only approach
- **Email config OAuth2:** `clientId` now returned in API responses; sensitive fields show "saved" placeholders
- **Form submission emails:** Now uses the recruiter's own `EmailConfig` instead of global env vars
- **SourcingView:** Replaced hardcoded mock data with real API calls to drafts and submissions endpoints
- **Activate endpoint:** Returns full draft object to prevent state data loss in DraftsView
