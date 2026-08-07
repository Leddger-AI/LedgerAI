# Authentication Flow & Firebase Integration

This document details the changes made to the authentication architecture in the Leddger-AI application.

## 1. Persistent Sessions (Logout on Refresh Fix)

**Issue**: The application previously logged the user out whenever the page was refreshed.
**Cause**: The application was strictly relying on ephemeral React state (`user` and `tokens`) to track authentication status, which resets on page reload.

**Solution**:
- Implemented `onAuthStateChanged` from `firebase/auth` within a `useEffect` hook in `App.jsx`.
- This hook actively listens to Firebase's underlying session state. If Firebase detects an active session (which it automatically persists in IndexedDB/Local Storage), it immediately restores the React state (`setUser`, `setTokens`, and `setShowDashboard(true)`).
- Added a `localStorage` fallback wrapper to ensure the UI immediately registers the user as logged in while the Firebase SDK initializes.

## 2. Google OAuth Domain Verification

**Issue**: Google OAuth was throwing a domain verification error (`admin_policy_enforced` / Developer contact mismatch).
**Solution**: 
- Added the Google Webmaster Tools verification HTML file (`public/googlec53d2ea560879c7c.html`) to the root of the application build.
- This allows the domain `ai.leddger@gmail.com` to be correctly verified via Google Search Console, authorizing the OAuth consent screen to be displayed to users without the "Unverified app" warning block.

## 3. Demo Mode Fallback

To ensure the application remains testable during API outages or when Firebase isn't fully configured:
- Created a robust `enterDemoMode` function.
- This allows developers and reviewers to bypass the Google Auth popup completely and populate the application state with mock user data (`photoURL`, `displayName`, etc.) to review UI components.
