# Features - HR Cost Intelligence Engine

The **HR Cost Intelligence Engine** is a high-fidelity SaaS dashboard and data ingestion platform designed to track, audit, and analyze the human resource cost associated with calendar meetings.

---

## 🎨 1. SaaS Analytics Dashboard UI
A modern, dark-mode dashboard tailored for HR Operations and managers:
- **Navigation Shell:** A dark sidebar featuring clean line icons for: 'Dashboard' (active), 'Projects', 'Teams', 'Calendar', 'Reports', 'Alerts', and 'Settings'. Includes active states with subtle glowing borders and brand logo.
- **Top Bar:** Includes a search input to dynamically filter activities, a live date range preset selector, active alert notification triggers, and the VP user profile badge.
- **Key Metric KPI Cards:**
  - **Total Meeting Cost:** Shows the total expenditure for the selected range with an inline SVG gradient sparkline showing cost trend.
  - **AI Attribution Accuracy:** Displays the model matching accuracy with an SVG circular progress gauge.
  - **Anomalies Detected:** Displays unassigned meetings or budget overruns with a pulsing warning indicator.
  - **Unattributed Hours:** Tracks the delta of untagged calendar time using a progress bar.
- **Interactive Data Charts (Recharts):**
  - **Real-time HR Expenditure by Project:** Grouped bar chart visualizing cost distribution.
  - **Top Project Spends:** Ranked progress bars indicating relative cost weight of key initiatives.
  - **Meeting Cost Over Time:** Smooth area chart with glowing gradient fills outlining expenditure growth.
- **Calendar Activity & AI Attribution Table:** Displays recent calendar entries (meeting title, duration, attendee icons, and predicted project). Includes inline manual tagging overlays and click-to-approve triggers.
- **Alerts & Recommendations Feed:** Dynamic list flagging budget overruns or tagging tasks.

---

## 🔐 2. Client Authentication & Consent (Firebase Auth)
Pivoted login flows using the Firebase Client SDK to secure accounts:
- **Google Sign-In:** Utilizes Google OAuth Provider popup integration.
- **Google Calendar Permissions:** Configured to request the read-only calendar scope (`https://www.googleapis.com/auth/calendar.events.readonly`) during user consent.
- **Double Token Extraction:** Captures the **Firebase ID Token** (identifies user to backend) and the **Google Access Token** (authorizes backend reading).

---

## 🐍 3. FastAPI Backend Service
A secure API endpoints architecture:
- **Token Verification Dependency:** Decodes and verifies the signature of incoming Firebase ID Tokens using the `firebase-admin` SDK credentials.
- **Calendar Data Ingestion Endpoint:** Queries the Google Calendar API using the client's OAuth token to pull meetings from the past 7 days.
- **Clean Schema Extraction:** Extracts meeting titles, durations (computed from timestamp offsets), organizers, and attendees list (email, names, and responses).

---

## 🤖 4. AI Cost Attribution Classifier
Assigns meetings to project codes based on calendar descriptions and metadata:
- **Model Integration:** Communicates with the Google Gemini API (`gemini-1.5-flash`) using a custom system prompt.
- **Heuristic Fallback:** Utilizes an intelligent keyword-matching mechanism if the Gemini API key is not active, ensuring zero downtime.
- **Taxonomy Matching:** Maps meetings to one of the target codes:
  1. `Project Phoenix` (Backend/database upgrades)
  2. `Client ABC Onboarding` (Frontend/client calls for ABC)
  3. `Q4 Marketing Strategy` (Growth metrics/ad campaigns)
  4. `Internal Operations` (General standups/syncs/HR administrative work)

---

## 👤 5. Recruiter Candidate Smart Profile Image Switcher & Repo Analytics (Phases 1 & 2)
Built-in component integrations to handle candidate identity presentation and repository analysis in the Recruiter Control Center:
- **Form Integration:** Student portals securely prompt for the candidate's GitHub username and manual profile picture file upload.
- **Smart Avatar Component:** Evaluates candidate profiles on decryption using a tiered fallback system:
  1. Renders manually uploaded images (converted to Base64 strings) with a premium circular pill layout.
  2. Resolves GitHub usernames via API fetches to display official GitHub avatars.
  3. Reverts to stylized capitalized initials or a default placeholder bubble if no username or custom upload exists.
- **Local Client Decryption:** Decrypts candidates' profiles in real-time, feeding resolved username and image strings into rendering layers.
- **GitHub Repository Analysis Dashboard:** Renders an elegant telemetry grid under decrypted profiles:
  - **Commit Pulse Graph:** Identifies developer activity over a 90-day span with a contribution density map.
  - **Tech Stack bar:** Computes actual coding language usage percentages from active GitHub API requests.
  - **AI Analysis summary:** Measures code quality scores (readability, modularity) and highlights structural strengths and security flags based on candidate repositories and years of experience.


