# Rust Backend Architecture (LEGACY)

> **⚠️ DEPRECATED:** This Rust backend (`backend_rs/`) is legacy and no longer the active backend for Leddger AI. The current backend is the Node.js/Express server in `server/`. The Rust backend's Firebase JWT verification (`auth.rs`) has been superseded by Supabase JWT verification in `server/middleware/auth.js`. See [Supabase Auth — Backend](../migration/supabase-auth-backend.md) for the current architecture.

Leddger AI features a high-performance, asynchronous Rust API server built on Axum and Tokio.

---

## 📁 1. Module Layout

* [main.rs](file:///c:/PROJECTS/EXPERIMENT/Leddger-AI/backend_rs/src/main.rs): Launches server, mounts routes, manages CORS layers, and handles dynamic port binding.
* [auth.rs](file:///c:/PROJECTS/EXPERIMENT/Leddger-AI/backend_rs/src/auth.rs): Decodes Firebase JWT authorization headers using standard base64 decoding for local test runs.
* [routes.rs](file:///c:/PROJECTS/EXPERIMENT/Leddger-AI/backend_rs/src/routes.rs): Retrieves calendar events and handles GitHub App Callback redirects.
* [ai_engine.rs](file:///c:/PROJECTS/EXPERIMENT/Leddger-AI/backend_rs/src/ai_engine.rs): Queries the Gemini API model (`gemini-2.5-flash`) for project attribution, falling back to a keyword-matching heuristic.
* [knowledge_base/](file:///c:/PROJECTS/EXPERIMENT/Leddger-AI/backend_rs/src/knowledge_base/): Houses text parsing, chunk splitting, tag generation, and mock JSON database endpoints.

---

## 🖥️ 2. Execution Setup

* **Port Binding**: Binds dynamically to the `PORT` environment variable assigned by cloud providers (such as Render), falling back to `8000` locally.
* **Environment Loader**: Reads configuration parameters (Redis connection strings, OAuth client IDs, and secret tokens) from the root `.env` file using the `dotenvy` crate.
