# 10 — Settings Hub, Avatar Pipeline, OTP Security & Collaborator Network

> **Status:** Production-Ready | **Files:** [`src/SettingsView.jsx`](../../src/SettingsView.jsx), [`src/settings/`](../../src/settings/), [`src/CollaboratorNetwork.jsx`](../../src/CollaboratorNetwork.jsx), [`server/utils/avatarImage.js`](../../server/utils/avatarImage.js), [`server/utils/otp.js`](../../server/utils/otp.js), [`server/models/Collaborator.js`](../../server/models/Collaborator.js)

---

## 1. Research & Problem Statement
- Account-level operations (avatar processing, OAuth linking, destructive account/data deletion) require strong memory optimization on 512MB hosts, cryptographic OTP gates, and cascading cleanup across both databases + external CDNs.

---

## 2. Implementation Details
1. **7-Section Settings Hub (`src/SettingsView.jsx` & `src/settings/`):**
   - `ProfileSection`, `DepartmentsSection`, `EmailSection`, `AISection`, `IntegrationsSection` (with authenticated Cloudinary status check), `AppearanceSection`, `SecuritySection`.
2. **Avatar Processing Pipeline (`server/utils/avatarImage.js` & `POST /api/cloudinary/avatar`):**
   - Lazy-loads `multer` and `sharp` (~25–35MB startup RAM savings).
   - Crops to $256 \times 256$ WebP and iteratively reduces quality until $\le 50\text{ KB}$, then uploads to Cloudinary (`avatars/{userId}`) and updates Supabase `profiles.avatar_url`.
3. **OTP Security Gates & Cascading Deletion (`server/utils/otp.js`):**
   - `POST /api/user/send-otp` issues a 6-digit HMAC-hashed OTP stored in Supabase `otp_challenges` (`5 min` TTL, `60s` resend cooldown, `5` max attempts, `15 min` lockout).
   - `DELETE /api/user/data` and `DELETE /api/user/account` require verified OTP + email confirmation and cascade across Supabase tables, MongoDB collections, Cloudinary, and Google Drive tokens.
4. **Open-Source Collaborator Network (`src/CollaboratorNetwork.jsx` & `@octokit/rest`):**
   - `POST /api/collaborators` uses `@octokit/rest` to fetch real GitHub user profiles, avatars, repo counts, followers, and top languages, persisting contributors in MongoDB `Collaborator`.

---

## 3. API Endpoints & Testing
- **Endpoints:** `GET/PUT /api/user/profile`, `GET/POST /api/user/departments`, `GET /api/user/export`, `POST /api/user/send-otp`, `DELETE /api/user/data`, `DELETE /api/user/account`, `GET /api/cloudinary/status`, `POST/DELETE /api/cloudinary/avatar`, `GET/POST /api/collaborators`.
- **Tests:** [`server/tests/otp.test.js`](../../server/tests/otp.test.js) (15/15 passing), [`server/tests/avatarImage.test.js`](../../server/tests/avatarImage.test.js), and live E2E browser verification of `@octokit/rest` (`octocat` → `201 Created`).
