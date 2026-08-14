# Phase 6: Optimization & Cleanup

## PR
[#31](https://github.com/Leddger-AI/LedgerAI/pull/31) — `feature/analytics-phase6` — **Open**

## Overview

Phase 6 optimizes server memory usage for the Render 512MB plan and cleans up dead code from the Firebase→Supabase migration. Three key changes reduce server RAM by ~107MB (49%) at startup.

## Changes

### 1. Lazy-load googleapis (`server/utils/emailService.js`)

**Problem:** `googleapis` was loaded at module top-level via `const { google } = require('googleapis')`, consuming **62MB heap** at server startup — even if no emails were being sent.

**Fix:** Replaced with a lazy-load helper function:
```js
function getOAuth2Client() {
  const { google } = require('googleapis');
  return google.auth.OAuth2;
}
```

Now `googleapis` is only loaded when `createTransporter()` is actually called (i.e., when sending an email). The 62MB heap cost is deferred to first email send.

**Impact:** Server startup heap drops from 101MB → 30MB.

**Files already lazy-loading googleapis (no change needed):**
- `server/index.js:1088` — `require('googleapis')` inside `buildTransporterFromAccount()`
- `server/scheduler.js:59` — `require('googleapis')` inside scheduled email send
- `server/startupCheck.js:83` — `require('googleapis')` inside `checkGmailOAuth2()`

### 2. Remove dead User model (`server/index.js`)

**Problem:** The MongoDB `User` model (`server/models/User.js`) used `firebaseUid` as its primary key — a leftover from the Firebase→Supabase migration (PR #12). Departments were migrated to Supabase's `profiles` table, making the `User` MongoDB model dead code. The only references were in two account-deletion endpoints.

**Fix:** Removed `require('./models/User')` and `User.deleteMany({ firebaseUid: userId })` from both:
- `DELETE /api/user/data` — reset user data
- `DELETE /api/user/account` — permanently delete account

These endpoints now only delete from Supabase + the 5 active MongoDB models (EmailAccount, EmailConfig, EmailDraft, EmailCampaign, Spreadsheet) + Cloudinary.

**Note:** `server/models/User.js` file is left in place to avoid breaking any potential references, but it is no longer imported anywhere in production code.

### 3. Code-split AnalyticsPage (`src/App.jsx`)

**Problem:** `AnalyticsPage.jsx` was a static import, bundled into the main 5.95MB JS chunk even though most users never visit the analytics page.

**Fix:** Changed to lazy import:
```js
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage.jsx'));
```

**Impact:**
- New chunk: `AnalyticsPage-*.js` (21.7KB, gzipped 4.6KB)
- Main bundle: 5,950KB → 5,927KB (−23KB)
- Analytics page code only loads when user navigates to `/dashboard/template-analytics`

### 4. Health monitoring endpoint (`server/index.js`)

Added `GET /api/health` for Render monitoring:

```json
{
  "status": "ok",
  "uptime": 3600,
  "memory": {
    "rss": "113MB",
    "heapUsed": "30MB",
    "heapTotal": "61MB",
    "external": "3MB"
  }
}
```

No auth required — safe to expose basic memory stats. Use for Render health checks and memory monitoring dashboards.

---

## Memory Benchmarks

### Before Phase 6 (origin/main)

| Metric | Value |
|---|---|
| RSS | 220MB |
| Heap Used | 101MB |
| Heap Total | 212MB |
| External | 21MB |

### After Phase 6

| Metric | Value | Delta |
|---|---|---|
| RSS | **113MB** | **−107MB (−49%)** |
| Heap Used | **30MB** | **−71MB (−70%)** |
| Heap Total | **61MB** | **−151MB (−71%)** |
| External | **3MB** | **−18MB** |

### Render 512MB Plan Headroom

| | Before | After |
|---|---|---|
| Server RSS | 220MB | 113MB |
| Available for runtime growth | 292MB | **399MB** |
| Status | Tight at scale | **Comfortable** |

When googleapis loads on first email send, heap temporarily increases by ~62MB (30MB → ~92MB), still well within the 512MB limit.

---

## Frontend Bundle Comparison

| Chunk | Before | After |
|---|---|---|
| Main bundle (`index-*.js`) | 5,950KB | 5,927KB |
| AnalyticsPage chunk | — | 21.7KB (separate) |
| AnalyticsPage CSS | — | 8.5KB (separate) |
| Total dist | 7.3MB | 7.3MB |

---

## Files Changed

| File | Change |
|---|---|
| `server/utils/emailService.js` | Lazy-load googleapis via `getOAuth2Client()` |
| `server/index.js` | Remove dead User model refs, add `/api/health` endpoint |
| `src/App.jsx` | Code-split AnalyticsPage as lazy route |

---

## Commits

| # | Message |
|---|---|
| 1 | `perf(ram): lazy-load googleapis + remove dead User model + add health endpoint` |
| 2 | `perf(frontend): code-split AnalyticsPage as lazy route` |
| 3 | `docs: add Phase 6 optimization and cleanup documentation` |
