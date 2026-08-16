// Per-user cooldown for the analytics export endpoints (issue #40).
// Building a CSV/JSON export means fetching up to MAX_EXPORT_SUBMISSIONS
// rows into memory at once — concurrent exports from multiple users could
// spike memory on the 512MB Render instance. A lightweight in-memory
// per-user gate (module-level Map, no new dependency) is enough here:
// unlike the OTP/email-account work, this doesn't need to survive a
// server restart, so there's no reason to reach for Supabase/Mongo.
const EXPORT_COOLDOWN_MS = 30 * 1000;

const lastExportAt = new Map();

function exportRateLimit(req, res, next) {
  const uid = req.user?.uid;
  if (!uid) return next();

  const now = Date.now();
  const last = lastExportAt.get(uid) || 0;
  const elapsed = now - last;

  if (elapsed < EXPORT_COOLDOWN_MS) {
    const retryAfterSeconds = Math.ceil((EXPORT_COOLDOWN_MS - elapsed) / 1000);
    res.setHeader('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({
      error: `Please wait ${retryAfterSeconds}s before requesting another export.`,
      retryAfterSeconds,
    });
  }

  lastExportAt.set(uid, now);
  next();
}

// Test-only: clears cooldown state between tests so they don't interfere
// with each other via the shared module-level Map.
function _resetExportRateLimitForTests() {
  lastExportAt.clear();
}

module.exports = { exportRateLimit, _resetExportRateLimitForTests, EXPORT_COOLDOWN_MS };
