# Technology Stack - HR Cost Intelligence Engine

The **HR Cost Intelligence Engine** is built using modern, lightweight frameworks on both the frontend and backend.

---

## 💻 1. Frontend Web Client

- **Core Library:** React 19.2.6 (scaffolded via Vite) for building components and managing application state.
- **Build Tool:** Vite 8.0.12 for hot reloading and bundling.
- **Styling:** Vanilla CSS 3 with global variable presets, flexbox layout, custom animations (`@keyframes`), and glassmorphism styling parameters.
- **Icons:** `lucide-react` (v0.x) for clean vector line icons in menus and metrics.
- **Data Visualization:** `recharts` (v2.x) for SVG-based charts featuring gradients and interactive hover tooltips.
- **Authentication SDK:** Firebase Client SDK (v10.x) for user sign-in and Google OAuth access token generation.

---

## 🐍 2. Backend Server API

- **Language:** Python 3.14 (compatible with Python 3.8+)
- **API Framework:** FastAPI (v0.110.0+) for high-performance ASGI endpoints.
- **Server Runner:** Uvicorn (v0.28.0+) as the ASGI web server.
- **Firebase Administration:** `firebase-admin` (v6.5.0+) SDK for verifying client JWT ID tokens and security keys.
- **Google Calendar Client:** `google-api-python-client` (v2.122.0+) and `google-auth` (v2.29.0+) for authenticating and making requests to the Google Calendar API on behalf of users.
- **AI Classification Engine:** `google-generativeai` (v0.4.0+) SDK for communicating with Gemini models for taxonomy mapping.
