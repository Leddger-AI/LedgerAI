# Leddger AI: Comprehensive Development Changelog
*June - August 2026*

This document outlines the entire development history, feature implementations, and architectural decisions made over the course of the project build.

---

## 1. Authentication & Security
- **Firebase & Google OAuth**: Resolved complex Firebase Auth integration issues (`auth/operation-not-allowed`) and successfully deployed a robust Google OAuth sign-in flow.
- **GitHub App Integration**: Configured and integrated a dedicated GitHub App (App ID `4104415`) for candidate authorization.
  - Users can securely grant Leddger AI read-only access to specific private repositories and profile data.
  - Designed the initial OAuth callback route to exchange temporary codes for user access tokens.
- **Google Cloud Verification**: Addressed Google Cloud domain verification issues by deploying `google-site-verification` HTML tags and metadata to confirm ownership of `https://leddger-ai.netlify.app`.

## 2. Core Dashboard & Candidate Analytics
- **Smart Profile Image Switcher**: Built a dynamic avatar component that automatically fetches a candidate's GitHub profile picture, with a fallback to their manually uploaded resume photo in a clean, pill-shaped UI.
- **GitHub Project Analysis UI**: Engineered a high-end dashboard to analyze candidate repositories:
  - **Commit Pulse Graph**: A micro-chart timeline illustrating commit activity to assess genuine engagement.
  - **Tech Stack Distribution**: Minimalist horizontal progress bars displaying the language breakdown (e.g., TypeScript 70%, Python 30%).
  - **AI Analysis Summary**: A specialized card component reserved for LLM-generated insights on code readability, modular structure, and security.

## 3. Recruiter Tools: Form Builder & Bulk Outreach
- **Form Customizer UI (Phase 1)**: Built a dark-themed (Charcoal `#1A1D1D`, Mint `#D7FEFA`) dashboard allowing recruiters to toggle form fields (Resume, GitHub Repo Access, Portfolio Link) and add custom recruiter notes.
- **Bulk Delivery Drawer (Phase 2)**: Engineered a slide-out Outreach Campaign drawer.
  - **Single Invite**: Manual email input for one-off candidate outreach.
  - **Bulk Campaign**: Implemented a drag-and-drop zone for `.csv` or `.xlsx` files that parses columns (Email, Candidate Name) and prepares automated mass outreach.

## 4. Legal & Compliance
- **Privacy Policy & Terms of Service**: Automatically generated and integrated standard legal pages (`/privacy` and `/terms`) directly into the router, specifically outlining how Google user data is accessed, used, and stored to comply with Google's API Services User Data Policy.

## 5. UI/UX: The Landing Page & Navigation
- **Dynamic Scroll Navbar**: Rebuilt the navigation bar into a minimalist text layout that smoothly animates into a visible, "floating pebble" background upon scrolling.
- **Landing Page Enhancements**: Implemented an exact pixel-perfect design matching provided design references, maintaining a unified cream background while heavily utilizing the dark charcoal/mint accent theme across internal tools.

## 6. Template Builder Engine & Architecture (Latest)
- **Advanced Routing**: Migrated the entire internal dashboard from basic React state (`activeTab`) to **React Router DOM**. This ensures persistent URLs, working back-buttons, and flawless state maintenance upon browser refresh.
- **Three Core Builders**: Developed standalone builders for **Student**, **Employee**, and **Team** evaluation templates.
- **Device-Responsive Live Preview**: Added a floating device toggle that seamlessly morphs the preview canvas between a 900px Desktop Monitor layout and a 375px Smartphone layout with independent internal scrolling.
- **Dynamic Email Domain Enforcer**: Implemented an industry-standard **Bracket Syntax** parser (`@[branch].sreenidhi.edu.in`).
  - Recruiters type templates with variables wrapped in brackets.
  - The Live Preview automatically converts this into a sleek, inline **Compound Input Field**, locking down the domain while letting the candidate edit the bracketed variables (like their specific branch).

## 7. Environment Readiness
- Secured all sensitive keys (GitHub Client Secret, Private `.pem` keys).
- Injected Cloudinary credentials (`CLOUDINARY_CLOUDNAME`, `API_KEY`) to prepare for the upcoming unified asset upload pipeline.
