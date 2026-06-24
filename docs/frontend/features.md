# Frontend Features - Ledger AI

Ledger AI features a high-fidelity, interactive client dashboard tailored for HR Operations, recruiters, and managers to analyze candidate details and calendar expenditures.

---

## 🎨 1. SaaS Analytics Dashboard
* **Navigation Shell**: A sidebar featuring clean vector line icons for: 'Dashboard' (active), 'Projects', 'Teams', 'Calendar', 'Reports', 'Alerts', and 'Settings' with glow parameters.
* **Top Bar**: Search parameters to dynamically filter calendar list views, a date range preset selector, active alert notification indicators, and VP user credentials.
* **Key Metric KPI Cards**:
  * **Total Meeting Cost**: Shows total expenditures for the selected date range alongside trend sparklines.
  * **AI Attribution Accuracy**: Displays the classification model match rate inside an SVG circular gauge.
  * **Anomalies Detected**: Flags unattributed meetings or budget overruns with a pulsing warning indicator.
  * **Unattributed Hours**: Shows the quantity of calendar hours missing project tags.
* **Interactive Recharts**:
  * **Real-time Project Spend**: Grouped bar chart showing relative project cost allocations.
  * **Top Project Spends**: Ranked progress indicators showing relative cost weights.
  * **Expenditure Trends**: Smooth area chart highlighting cost progressions over time.
* **Interactive Table Grid**: Lists all calendar entries, duration values, attendee avatar icons, and the predicted AI project attribution. Features inline approval triggers and manual tag editors.

---

## 👤 2. Recruiter Candidate Center & Smart Avatars
* **Student Portals**: Form integrations that prompt candidates for their GitHub username and a profile picture file upload.
* **Decryption Layer**: Decrypts candidate applications locally, resolving base64 string values and usernames.
* **Tiered Avatar Fallback Hierarchy**:
  1. Renders manually uploaded images (converted to base64 strings).
  2. Fetches the candidate's official GitHub avatar using the resolved username.
  3. Falls back to capitalized initials on a colored text bubble.
  4. Defaults to a standard user silhouette if no other identifiers are found.
