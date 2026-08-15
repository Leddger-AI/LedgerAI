# 03: Google Calendar Connect

## Feature Summary

User connects Google Calendar from Settings → Integrations. This uses Supabase's `signInWithOAuth` with the Google provider, which links a Google identity (including calendar scope) to the existing Supabase user. Like GitHub, this goes through Supabase's identity linking system — no separate backend OAuth.

## ASCII Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (IntegrationsSection.jsx)                              │
│                                                                   │
│  Page loads → fetchIdentities()                                   │
│  └─ hasProvider('google') checks if Google identity exists       │
│                                                                   │
│  User clicks "Connect Google"                                     │
│  └─ handleConnectGoogle()                                        │
│     └─ loginWithGoogleAndCalendar()                              │
│        └─ supabase.auth.signInWithOAuth({                        │
│             provider: 'google',                                  │
│             options: { redirectTo: /dashboard }                  │
│           })                                                     │
│        └─ Browser redirects to Google consent screen             │
│           └─ Google asks for calendar + profile permissions      │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  GOOGLE CONSENT SCREEN (external)                                │
│                                                                   │
│  User authorizes Leddger-AI app                                   │
│  └─ Google redirects back to Supabase callback URL               │
│     └─ Supabase links Google identity to existing user           │
│        └─ provider_token available in session (for Calendar API) │
│        └─ Redirects to /dashboard                                 │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  DISCONNECT FLOW                                                 │
│                                                                   │
│  User clicks "Disconnect Google"                                 │
│  └─ handleDisconnect('google')                                   │
│     ├─ confirm("Disconnect Google Calendar?")                    │
│     └─ unlinkProvider('google')                                  │
│        └─ supabase.auth.unlinkIdentity({ provider: 'google' })   │
│     └─ fetchIdentities() → refreshes UI                          │
└─────────────────────────────────────────────────────────────────┘
```

## File-by-File Trace

| Step | File | Lines | What Happens |
|------|------|-------|--------------|
| 1. Check status | `src/settings/IntegrationsSection.jsx` | 28-38 | `getUserIdentities()` on mount |
| 2. Has provider | `src/settings/IntegrationsSection.jsx` | 122 | `hasProvider('google')` |
| 3. Connect | `src/settings/IntegrationsSection.jsx` | 133-141 | `loginWithGoogleAndCalendar()` |
| 4. OAuth call | `src/supabaseAuth.js` | 7-21 | `signInWithOAuth({ provider: 'google' })` |
| 5. Get provider token | `src/supabaseAuth.js` | 100-109 | `getCurrentSession()` includes `providerToken` |
| 6. Disconnect | `src/settings/IntegrationsSection.jsx` | 80-97 | `unlinkProvider('google')` |
| 7. Unlink | `src/supabaseAuth.js` | 155-161 | `unlinkIdentity({ provider })` |

## Shared Dependencies

- **Supabase Auth** — handles OAuth flow and identity linking
- **Supabase session** — stores `provider_token` for Google Calendar API access

## Error Paths

| Scenario | What Happens |
|----------|-------------|
| OAuth redirect fails | `loginWithGoogleAndCalendar()` throws, `showError()` toast |
| Already linked | Supabase handles gracefully |
| Unlink fails | `unlinkProvider()` returns error, toast shown |

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_SUPABASE_URL` | Frontend | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Supabase anon key |

## Key Difference from Google Drive

Google Calendar uses **Supabase identity linking** (same as GitHub). The `provider_token` in the Supabase session can be used for Calendar API calls. Google Drive uses a **separate backend OAuth flow** because:
1. It needs `drive.file` scope (not included in default Google login scope)
2. It needs server-side refresh token handling for background uploads
3. It should be connectable/disconnectable independently from Google login

See [04-google-drive-oauth-connect.md](./04-google-drive-oauth-connect.md) for the Drive-specific flow.
