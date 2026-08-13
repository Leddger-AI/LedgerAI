# Email Accounts Architecture

## Overview

Multi-email account support with AES-256-GCM encrypted credentials. Users can add unlimited Gmail accounts (app password or OAuth2), select a default sender, and choose which account to send campaigns from.

## Architecture

```
EmailSection.jsx (frontend)
  └── GET/POST/PUT/DELETE /api/email/accounts
        └── EmailAccount model (MongoDB)
              ├── appPassword: { encrypted, iv, tag } (AES-256-GCM)
              ├── refreshToken: { encrypted, iv, tag }
              └── clientSecret: { encrypted, iv, tag }
```

## Encryption

- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key**: 32-byte hex string from `ENCRYPTION_KEY` env var
- **IV**: 12-byte random per encryption
- **Auth Tag**: 16-byte GCM tag for integrity verification
- **Storage**: `{ encrypted: base64, iv: base64, tag: base64 }` stored as Mixed type in MongoDB

### Generate ENCRYPTION_KEY

```bash
node -e "console.log(crypto.randomBytes(32).toString('hex'))"
```

Add to `.env`:
```
ENCRYPTION_KEY=<64-char-hex-string>
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/email/accounts` | List all accounts (masked credentials) |
| POST | `/api/email/accounts` | Add new account (encrypts credentials) |
| PUT | `/api/email/accounts/:id` | Update account (re-encrypts if password provided) |
| DELETE | `/api/email/accounts/:id` | Delete account (auto-assigns new default) |
| PUT | `/api/email/accounts/:id/default` | Set as default sender |
| POST | `/api/email/accounts/:id/test` | Send test email from specific account |

### Legacy Compatibility

- `POST /api/email/test` — uses default account (or `accountId` in body)
- `POST /api/email/send` — accepts optional `accountId`, falls back to default
- `POST /api/email/schedule` — accepts optional `accountId`, falls back to default

### Migration

On first `GET /api/email/accounts` call, if no `EmailAccount` docs exist but a legacy `EmailConfig` does, it auto-migrates to an `EmailAccount` with `isDefault: true` and label "Migrated".

## EmailAccount Model

| Field | Type | Description |
|-------|------|-------------|
| ownerUid | String | User ID (indexed, not unique) |
| email | String | Gmail address |
| label | String | Optional label (Work, Personal) |
| authMethod | String | `app_password` or `oauth2` |
| smtpHost | String | Default: `smtp.gmail.com` |
| smtpPort | Number | Default: 587 |
| appPassword | Mixed | Encrypted `{ encrypted, iv, tag }` |
| refreshToken | Mixed | Encrypted (OAuth2) |
| clientId | String | OAuth2 client ID (not encrypted) |
| clientSecret | Mixed | Encrypted (OAuth2) |
| isDefault | Boolean | One default sender per user |
| isActive | Boolean | Account active flag |
| createdAt | Date | |
| updatedAt | Date | |

**Unique index**: `{ ownerUid: 1, email: 1 }` — one account per email per user.

## Response Format

Credentials are never returned in API responses. Only boolean flags:

```json
{
  "id": "...",
  "email": "user@gmail.com",
  "label": "Work",
  "authMethod": "app_password",
  "smtpHost": "smtp.gmail.com",
  "smtpPort": 587,
  "isDefault": true,
  "isActive": true,
  "hasAppPassword": true,
  "hasRefreshToken": false,
  "hasClientSecret": false
}
```
