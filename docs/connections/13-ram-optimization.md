# 13: RAM Optimization for 512MB Render Instance

## Problem

Render's free/starter tier provides **512MB RAM** with **750 instance hours/month**. The Leddger-AI backend loads several heavy Node.js modules at startup, causing high baseline memory usage even when features aren't being used. This can lead to OOM (Out of Memory) crashes on the 512MB limit.

## Root Causes

| Module | Load Pattern | RAM Impact | Used By |
|---|---|---|---|
| `googleapis` | Top-level in `emailService.js:2` | ~30-50MB | Email sending (form submission notifications) |
| `sharp` | Top-level in `index.js:1629` | ~20-30MB | Avatar compression (rarely used) |
| `multer` | Top-level in `index.js:1628` | ~5MB | File upload middleware (avatar + generic upload) |
| **Total wasted** | | **~55-85MB** | Loaded at startup, even if never used |

## Solution: Lazy-Loading

Each heavy module is now loaded **only when the feature that needs it is actually called**. This defers memory allocation until first use, keeping startup RAM low.

### Changes Made

#### 1. `server/utils/emailService.js` — googleapis + nodemailer

**Before:**
```js
const nodemailer = require('nodemailer');        // ~10MB at startup
const { google } = require('googleapis');        // ~30-50MB at startup
const OAuth2 = google.auth.OAuth2;
```

**After:**
```js
let _nodemailer = null;
let _OAuth2 = null;

function getOAuth2() {
  if (!_OAuth2) {
    const { google } = require('googleapis');    // Loaded only when email is sent
    _OAuth2 = google.auth.OAuth2;
  }
  return _OAuth2;
}

function getNodemailer() {
  if (!_nodemailer) _nodemailer = require('nodemailer');  // Loaded only when email is sent
  return _nodemailer;
}

const createTransporter = async (emailConfig = null) => {
  const OAuth2 = getOAuth2();
  const nodemailer = getNodemailer();
  // ... rest unchanged
};
```

**Savings:** ~40-60MB at startup

#### 2. `server/index.js` — sharp

**Before:**
```js
const sharp = require('sharp');    // ~20-30MB at startup (native addon)
```

**After:**
```js
async function compressToTargetSize(buffer, maxBytes, dimension) {
  const sharp = require('sharp');  // Loaded only when avatar is uploaded
  // ...
}
```

**Savings:** ~20-30MB at startup

#### 3. `server/index.js` — multer

**Before:**
```js
const multer = require('multer');  // ~5MB at startup
const upload = multer({ storage: multer.memoryStorage(), ... });

app.post('/api/cloudinary/avatar', verifyToken, upload.single('file'), handler);
```

**After:**
```js
let _upload = null;
function getUpload() {
  if (!_upload) {
    const multer = require('multer');  // Loaded only on first file upload
    _upload = multer({ storage: multer.memoryStorage(), ... });
  }
  return _upload;
}

app.post('/api/cloudinary/avatar', verifyToken,
  (req, res, next) => { getUpload().single('file')(req, res, next); },
  handler
);
```

**Savings:** ~5MB at startup

### Already Optimized (No Changes Needed)

| Module | File | Pattern | Why It's Fine |
|---|---|---|---|
| `googleapis` | `googleDriveOAuth.js` | Lazy-loaded inside each function | ✅ Only loaded on Drive API calls |
| `googleapis` | `googleDriveUpload.js` | Lazy-loaded inside `getDriveClient()` | ✅ Only loaded on Drive upload |
| `googleapis` | `scheduler.js` | Lazy-loaded inside Agenda job | ✅ Only loaded when campaign sends |
| `googleapis` | `index.js` `buildTransporterFromAccount` | Lazy-loaded inside function | ✅ Only loaded on email send |
| `cloudinary` | `index.js` | Lazy-loaded via `getCloudinary()` | ✅ Only loaded on image upload |
| `agenda` | `scheduler.js` | Lazy-loaded via `getAgenda()` | ✅ Only loaded when scheduler needed |
| `app.listen` | `index.js` | Guarded by `require.main === module` | ✅ Prevents double-start in tests |

## Memory Budget Estimate

```
BEFORE (startup):                    AFTER (startup):
┌──────────────────────────┐        ┌──────────────────────────┐
│ Express + core    ~40MB  │        │ Express + core    ~40MB  │
│ Mongoose           ~20MB │        │ Mongoose           ~20MB │
│ Supabase SDK       ~10MB │        │ Supabase SDK       ~10MB │
│ googleapis (email) ~40MB │        │ ─────────────────────── │
│ sharp              ~25MB │        │ (deferred)         ~0MB  │
│ multer              ~5MB │        │ ─────────────────────── │
│ ─────────────────────── │        │ TOTAL startup    ~70MB   │
│ TOTAL startup   ~140MB   │        │                          │
│                          │        │ First email send: +50MB  │
│ 512MB limit              │        │ First avatar:     +25MB  │
│ Available:      ~372MB   │        │ 512MB limit              │
│                          │        │ Available:      ~442MB   │
└──────────────────────────┘        └──────────────────────────┘

Savings: ~70MB freed at startup (~50% reduction)
```

## File-by-File Changes

| File | Lines Changed | What Changed |
|---|---|---|
| `server/utils/emailService.js` | 1-19 | Top-level `require` → lazy `getOAuth2()` + `getNodemailer()` |
| `server/index.js` | 1628-1646 | Top-level `require('multer')` → lazy `getUpload()` |
| `server/index.js` | 1680-1681 | Top-level `require('sharp')` → lazy inside `compressToTargetSize()` |
| `server/index.js` | 1715 | `upload.single('file')` → `getUpload().single('file')` wrapper |
| `server/index.js` | 1805 | `upload.single('file')` → `getUpload().single('file')` wrapper |

## Trade-offs

| Concern | Answer |
|---|---|
| First request latency | ~100-200ms extra on first email send / avatar upload (one-time module load) |
| Module caching | Node.js caches `require()` — subsequent calls are instant |
| Code readability | Slightly more verbose, but well-commented and follows existing pattern |
| Risk | Low — same pattern already used for `cloudinary`, `agenda`, `googleapis` in other files |

## Environment Variables

No new env vars needed. This is a pure code optimization.
