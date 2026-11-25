# 03 — Projects, Teams, Hourly Rates & Automated Budget Alerts

> **Status:** Production-Ready | **Files:** [`src/ProjectsView.jsx`](../../src/ProjectsView.jsx), [`src/TeamsView.jsx`](../../src/TeamsView.jsx), [`src/pages/Budgets.jsx`](../../src/pages/Budgets.jsx), [`server/models/Project.js`](../../server/models/Project.js), [`server/models/TeamMember.js`](../../server/models/TeamMember.js), [`server/utils/budgetAlerts.js`](../../server/utils/budgetAlerts.js)

---

## 1. Research & Problem Statement
- Previously, `ProjectsView` and `TeamsView` stored project codes and team member hourly rates only in React `useState`, causing edits to vanish on refresh.
- Budget caps existed in `ProjectBudget`, but crossing 80% or 100% of a monthly cap never triggered automated alerts or email notifications.

---

## 2. Architecture & Design Plan
- Persist **Projects** in MongoDB (`Project` model, unique per `ownerUid + code`) and automatically synchronize each project's monthly cap to `ProjectBudget`.
- Persist **Team Members** in MongoDB (`TeamMember` model) with role, department, hourly rate, and tracked hours.
- Run `checkBudgetAlerts(ownerUid, project, userEmail)` asynchronously whenever a meeting is saved (`POST /api/meetings`), checking current-month spend against `ProjectBudget.monthlyCap`.

---

## 3. Implementation Details
1. **Projects (`src/ProjectsView.jsx` & `/api/projects`):**
   - Loads projects from `GET /api/projects` when authenticated (falls back to 4 sample codes in Demo Mode).
   - Supports creating/upserting projects (`POST /api/projects`) and inline monthly budget editing (`PATCH /api/projects/:id`).
2. **Teams & Rates (`src/TeamsView.jsx` & `/api/team-members`):**
   - Loads members from `GET /api/team-members`, filters by department/search, and persists rate edits (`PATCH`), additions (`POST`), and removals (`DELETE`).
3. **Budgets & Threshold Alerts (`src/pages/Budgets.jsx` & `server/utils/budgetAlerts.js`):**
   - `GET /api/budgets/overview` aggregates current-month meeting spend per project.
   - `checkBudgetAlerts()` computes spend percentage; at $\ge 80\%$ (`budget_warning`) or $\ge 100\%$ (`budget_exceeded`), it deduplicates by month tag (`YYYY-MM`), inserts a row in Supabase `alerts`, and emails the owner via their configured `EmailAccount`.

---

## 4. API Endpoints
- `GET /api/projects`, `POST /api/projects`, `PATCH /api/projects/:id`, `DELETE /api/projects/:id`
- `GET /api/team-members`, `POST /api/team-members`, `PATCH /api/team-members/:id`, `DELETE /api/team-members/:id`
- `GET /api/budgets`, `POST /api/budgets`, `DELETE /api/budgets/:id`, `GET /api/budgets/overview`
- `GET /api/alerts`, `POST /api/alerts`, `PUT /api/alerts/:id/resolve`, `DELETE /api/alerts/:id`
