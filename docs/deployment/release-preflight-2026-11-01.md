# Release preflight — 1 November 2026

## Candidate

Branch: `codex/email-mobile-release`. The candidate aligns email campaign creation, delivery, status and retry; completes signed unsubscribe; improves versioned avatar upload; and adds the 390 × 844 mobile landing layout and seamless intro assets.

## Verified locally

- Backend suite: 256 tests passing on 31 October 2026. The restart integration test starts an API, schedules a campaign, stops the API, restarts it, and confirms one SMTP delivery with the original frozen content.
- Focused restart and avatar compression tests: 2 passing on 1 November 2026.
- Frontend production build: passing on 1 November 2026.
- Touched landing, tour, intro, and profile React files: ESLint passing on 1 November 2026.
- Browser at 390 × 844 and 320px: no page-level horizontal overflow; mobile navigation and account actions visible. Product tour is one column at 390px.
- Local `/api/email/worker-health`: HTTP 200, `{"ready":true}`.
- Supabase `email_send_log` unique campaign migration was applied to the configured project on 30 October 2026.

Repository-wide `npm run lint` is not a release signal yet: the current ESLint setup treats CommonJS backend globals such as `require` and `process` as undefined and reports many legacy errors (1,733 total). This candidate does not claim to fix that existing lint baseline.

## Live blockers and rollout

The Netlify site responded HTTP 200 on 1 November 2026. Its deployed JavaScript bundle points to `https://ledgerai-908y.onrender.com`, which the owner confirmed is the active Render service. The Render dashboard confirms that service is live on commit `9276d51` and auto-deploys from `main`. The service responds, but `/api/email/worker-health` returns HTTP 404 because this candidate has not been deployed there. An older guide pointed to `ledgerai-vjt8.onrender.com`; that separate service is suspended and is not the release target.

The active service is on Render's Free compute plan. It spins down after 15 minutes without inbound traffic, so its in-process Agenda worker cannot deliver scheduled campaigns promptly while idle. The dashboard offers an always-on 0.5 CPU / 512 MB plan at $7 per month; changing compute plans requires an explicit spending decision. Its direct environment variables currently omit `ENCRYPTION_KEY` and `FRONTEND_URL`, and no environment group is linked. Set a stable encryption key and the frontend origin before deploying the new email worker. The public API origin can use Render's `RENDER_EXTERNAL_URL` fallback.

1. Configure the active `ledgerai-908y` Render service with `FRONTEND_URL`, a stable `ENCRYPTION_KEY`, and an always-on compute plan for timely scheduling. Confirm the public HTTPS API origin (`PUBLIC_API_URL` or Render's `RENDER_EXTERNAL_URL`), MongoDB, Supabase, Cloudinary, and sender credentials.
2. Deploy the backend candidate, confirm worker health is HTTP 200, and inspect startup reconciliation logs.
3. Send a test campaign to controlled recipients, then schedule one across a backend restart. Verify Sent, Schedule, partial results, suppression, and selected retry without retrying unknown SMTP attempts automatically.
4. Deploy the frontend candidate. Check intro and mobile widths, the mapping and preview flow, queued progress, unsubscribe confirmation, and avatar replacement using a disposable test account.
5. If release checks fail, restore the prior backend and frontend deployments and preserve campaign records for manual review. Do not automatically retry unknown recipient attempts.

Local screenshots and the unrelated `synapse/` directory are excluded from the candidate commit.
