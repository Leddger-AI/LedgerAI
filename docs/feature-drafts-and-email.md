# Feature: Drafts, Temporary Links, & Email Automation

This document outlines the architecture, data models, and logic implemented to support the creation of form drafts, temporary public links, and automated email notifications in the Leddger AI platform.

## 1. Overview
The goal of this feature is to allow recruiters to configure a custom form template (e.g., Team Builder), save it as a "Draft" with a strict expiration timeline, and generate a temporary URL to share with end users. When users submit the form, the data is stored securely in MongoDB, and the recruiter receives an instant email notification via an automated OAuth2 Gmail integration.

## 2. Frontend Updates

### Sidebar Navigation (`src/App.jsx`)
- Restructured the sidebar navigation layout to group `Sent`, `Draft`, and `Schedule` items logically.
- Added dividers (`isDivider: true`) to distinctly section off these features from the core inbox items and team spaces, matching the new minimalist UI.

### Team Template Builder (`src/pages/TeamTemplateBuilder.jsx`)
- Introduced a **"Save & Generate Link"** control panel.
- Allows recruiters to set an expiration period (`24 Hours`, `3 Days`, `7 Days`).
- **Draft Creation Flow**:
  1. Compiles the current UI configuration (`toggles`, `selectedDepartments`, `leadRestriction`, etc.) into a config object.
  2. Sends an authenticated `POST` request to `/api/drafts` with the configuration and expiration time.
  3. Receives a `draftId` and generates a public-facing URL: `/form/[Title]/[draftId]`.

### Public Form View (`src/pages/PublicFormView.jsx`)
- Created a brand new React route (`/form/:title/:draftId`) designed to be accessed without authentication.
- **Expiration Protection**: Automatically queries the backend to verify the link's validity. If the backend returns a `410 Gone` status, it strictly blocks access and renders a "Link Expired" warning.
- Dynamically generates form inputs (`Team Name`, `Department`, `Team Lead`, `Objective`) strictly based on what the recruiter originally configured in the Template Builder.

## 3. Backend Architecture (Node.js & MongoDB)

### Data Models
Two new Mongoose schemas were introduced to `server/models/`:

1. **`FormDraft.js`**
   - Serves as the blueprint saved by the recruiter.
   - `draftId`: Unique UUID.
   - `recruiterId`: The Firebase UID of the creator.
   - `config`: JSON object storing all toggle states.
   - `expiresAt`: Date object defining the exact moment the link dies.
   - `status`: String (`draft`, `active`, `expired`).

2. **`FormSubmission.js`**
   - Captures the actual data submitted by the end user.
   - `submissionId`: Unique UUID.
   - `draftId`: Foreign key linking back to the `FormDraft`.
   - `submittedData`: The JSON payload of what the user typed.

### API Endpoints (`server/index.js`)
- `POST /api/drafts` (Protected): Generates the expiration date, creates the UUID, and saves the `FormDraft` model to MongoDB.
- `GET /api/forms/:draftId` (Public): Validates the `draftId`. Performs a strict check: `if (new Date() > draft.expiresAt)`. If expired, it permanently updates the DB status to `expired` and rejects the request with a `410`.
- `POST /api/forms/:draftId/submit` (Public): Receives the payload, saves it as a `FormSubmission`, and triggers the automated email script in the background.

## 4. Gmail OAuth2 Automation

### Email Service (`server/utils/emailService.js`)
- Replaced generic SMTP configurations with a secure Google OAuth2 implementation utilizing `nodemailer` and `googleapis`.
- Rather than using an app password, the application dynamically generates short-lived access tokens using a persistent `GOOGLE_REFRESH_TOKEN`.
- **Workflow**:
  1. The user submits the public form.
  2. The backend fires `sendFormSubmissionEmail(title, submittedData)`.
  3. `emailService.js` creates an OAuth2 transporter using the Client ID, Client Secret, and Refresh Token.
  4. Formats the submitted JSON data into a clean HTML email and sends it to the configured `GOOGLE_EMAIL` address.

## 5. Security & Authentication Overhaul
- Upgraded the Firebase Admin SDK initialization in `server/middleware/auth.js`.
- Shifted from using a hardcoded `serviceAccountKey.json` file to securely parsing environment variables (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`).
- This change ensures that production secrets never accidentally leak into version control, satisfying enterprise-level security standards.
