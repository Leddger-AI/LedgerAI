# 04 — Form Builder, Preview Studio & Draft Scheduling

> **Status:** Production-Ready | **Files:** [`src/pages/PreviewStudio.jsx`](../../src/pages/PreviewStudio.jsx), [`src/pages/StudentTemplateBuilder.jsx`](../../src/pages/StudentTemplateBuilder.jsx), [`src/pages/EmployeeTemplateBuilder.jsx`](../../src/pages/EmployeeTemplateBuilder.jsx), [`src/pages/TeamTemplateBuilder.jsx`](../../src/pages/TeamTemplateBuilder.jsx), [`src/pages/DraftsView.jsx`](../../src/pages/DraftsView.jsx), [`src/pages/PublicFormView.jsx`](../../src/pages/PublicFormView.jsx), [`src/utils/formSchema.js`](../../src/utils/formSchema.js)

---

## 1. Research & Problem Statement
- Recruiters need customizable, branded evaluation forms (Student, Employee, Team) with drag-and-drop ordering, theme controls, domain-locked email inputs (`@[branch].sreenidhi.edu.in`), and scheduled go-live windows without duplicating drafts on every save.

---

## 2. Architecture & Design Plan
- **Blocks as Source of Truth:** 16 block types validated via **Zod v4** (`src/utils/formSchema.js`), with backward-compatible toggle derivation (`blocksToToggles()`).
- **UUID-Based PATCH Autosave:** Drafts are created once and updated via `PATCH /api/drafts/:draftId` with a 900ms debounce in `PreviewStudio.jsx`.
- **Theme CSS Variables:** `themeVars()` maps colors, fonts, spacing, and border radius onto `--form-*` CSS custom properties; server-side sanitization strips `<script>` tags from custom CSS.
- **Agenda Activation:** Drafts scheduled via `PUT /api/drafts/:draftId/schedule` are activated automatically at `goesLiveAt` by the Agenda `'activate form draft'` job (`server/utils/formActivation.js`).

---

## 3. Database & Security
- **Primary Store:** Supabase `form_drafts` (`draft_id`, `user_id`, `title`, `config` JSONB, `template_type`, `status`, `expires_at`, `goes_live_at`).
- **Analytics Mirror:** MongoDB `TemplateData` (`server/models/TemplateData.js`).
- **Public Portal Protection:** `POST /api/forms/:draftId/submit` is protected by an in-memory sliding-window rate limiter (`30 req/min/IP`), field-schema validation (`server/utils/publicFormFields.js`), and payload size/count caps.

---

## 4. API Endpoints & Testing
- **Endpoints:** `POST/GET /api/drafts`, `PATCH/DELETE /api/drafts/:draftId`, `PUT /api/drafts/:draftId/activate`, `GET /api/drafts/scheduled`, `PUT/DELETE /api/drafts/:draftId/schedule`, `GET /api/forms/:draftId`, `POST /api/forms/:draftId/submit`.
- **Tests:** Drafts, scheduling, and public form validation are verified in [`server/tests/api.test.js`](../../server/tests/api.test.js), [`server/tests/publicFormFields.test.js`](../../server/tests/publicFormFields.test.js), and [`server/tests/scheduler.test.js`](../../server/tests/scheduler.test.js).
