# Drafts Dashboard & Expiry Scheduling Architecture

This document tracks the UI/UX redesign and backend refactoring to move public form expiration logic out of the template builders and into a dedicated Drafts management interface.

## 1. Objective
Provide recruiters with a cleaner template building experience by removing the "expiration dropdown" from the builder UI. Instead, saved templates remain strictly in a "Draft" status (un-shareable and inaccessible) until the recruiter goes to the Drafts Dashboard, selects a specific date/time calendar option, and activates the link.

## 2. Backend Updates (`server/`)

### Mongoose Models
- **`FormDraft.js`**: `expiresAt` is no longer required upon creation. When `expiresAt` is `null`, the draft is considered inactive. The `status` will now properly flow through `draft` -> `active` -> `expired`.

### API Endpoints
- **`POST /api/drafts`**: Simplified to only take `title` and `config`. Generates a Draft with a `null` expiration and `draft` status.
- **`GET /api/drafts`**: New endpoint that queries the DB for all `FormDraft` records where `recruiterId` matches the authenticated `req.user.uid`.
- **`PUT /api/drafts/:draftId/activate`**: New endpoint that takes an exact ISO `expiresAt` timestamp and updates the draft's status to `active`.
- **`GET /api/forms/:draftId` (Public)**: Updated to strictly enforce 410 (Gone) or 403 (Forbidden) if the draft's `expiresAt` is `null` (not yet activated) or if the current time exceeds `expiresAt`.

## 3. Frontend Updates (`src/`)

### Cleaned Template Builders
- Removed `isSaving`, `draftLink`, and `expiresInHours` state.
- Removed the public link preview box and copy buttons.
- The UI simply has a "Save as Draft" button which persists the toggles.

### Drafts Dashboard (`src/pages/DraftsView.jsx`)
- **Split-Pane Layout**: A modern white-and-grey UI featuring a list of templates on the right, and an active configuration screen on the left.
- **Draft List**: Displays the template title, creation date, and a pill-badge for status (`Draft`, `Active`, `Expired`).
- **Calendar UI**: Standard HTML5 `<input type="date">` and `<input type="time">` elements, elegantly styled to match the minimalist aesthetic.
- **Activation Flow**: Upon selecting a date and time, the UI hits the `PUT /api/drafts/:draftId/activate` endpoint, updates the state, and immediately renders the copyable public link.
