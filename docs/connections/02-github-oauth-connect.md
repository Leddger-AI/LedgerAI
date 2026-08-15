# 02: GitHub OAuth Connect

## Feature Summary

User connects GitHub from Settings → Integrations. This uses Supabase's `signInWithOAuth` to link a GitHub identity to the existing Supabase user account. Unlike Google Drive (which uses a separate backend OAuth flow), GitHub connection goes entirely through Supabase's identity linking system.

## ASCII Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (IntegrationsSection.jsx)                              │
│                                                                   │
│  Page loads → fetchIdentities()                                   │
│  ├─ getUserIdentities() → supabase.auth.getUser()                │
│  └─ Returns array of linked identities (e.g. ['github','google'])│
│                                                                   │
│  hasProvider('github') checks if GitHub identity exists           │
│  ├─ YES → Show "Disconnect GitHub" button                        │
│  └─ NO  → Show "Connect GitHub" button                           │
│                                                                   │
│  User clicks "Connect GitHub"                                     │
│  └─ handleConnectGitHub()                                        │
│     └─ loginWithGitHub() → supabase.auth.signInWithOAuth({       │
│          provider: 'github',                                     │
│          options: { redirectTo: /dashboard }                     │
│        })                                                        │
│     └─ Browser redirects to GitHub consent screen                │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  GITHUB CONSENT SCREEN (external)                                │
│                                                                   │
│  User authorizes Leddger-AI app                                   │
│  └─ GitHub redirects back to Supabase callback URL               │
│     └─ Supabase links GitHub identity to existing user           │
│        └─ Redirects to /dashboard                                 │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  DISCONNECT FLOW                                                 │
│                                                                   │
│  User clicks "Disconnect GitHub"                                 │
│  └─ handleDisconnect('github')                                   │
│     ├─ confirm("Disconnect GitHub?")                             │
│     └─ unlinkProvider('github')                                  │
│        └─ supabase.auth.unlinkIdentity({ provider: 'github' })   │
│           └─ Supabase removes GitHub identity from user          │
│     └─ fetchIdentities() → refreshes UI                          │
└─────────────────────────────────────────────────────────────────┘
```

## File-by-File Trace

| Step | File | Lines | What Happens |
|------|------|-------|--------------|
| 1. Check status | `src/settings/IntegrationsSection.jsx` | 28-38 | `getUserIdentities()` on mount |
| 2. Has provider | `src/settings/IntegrationsSection.jsx` | 122 | `hasProvider('github')` |
| 3. Connect | `src/settings/IntegrationsSection.jsx` | 124-131 | `loginWithGitHub()` |
| 4. OAuth call | `src/supabaseAuth.js` | 27-41 | `signInWithOAuth({ provider: 'github' })` |
| 5. Disconnect | `src/settings/IntegrationsSection.jsx` | 80-97 | `unlinkProvider('github')` |
| 6. Unlink | `src/supabaseAuth.js` | 155-161 | `unlinkIdentity({ provider })` |

## Shared Dependencies

- **Supabase Auth** — handles OAuth flow and identity linking
- **No backend involvement** — GitHub connect/disconnect is entirely Supabase-side

## Error Paths

| Scenario | What Happens |
|----------|-------------|
| OAuth redirect fails | `loginWithGitHub()` throws, `showError()` toast displayed |
| Already linked | Supabase handles gracefully, identity already exists |
| Unlink fails | `unlinkProvider()` returns error, `showError()` toast |

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_SUPABASE_URL` | Frontend | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Supabase anon key |

## Key Difference from Google Drive

GitHub connection uses **Supabase's built-in identity linking** — no backend OAuth, no token storage in MongoDB. Google Drive uses a **separate backend OAuth flow** because it needs server-side access to the user's Drive files (see [04-google-drive-oauth-connect.md](./04-google-drive-oauth-connect.md)).
