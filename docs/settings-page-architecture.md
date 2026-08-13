# Leddger-AI Settings Page — Architecture & Implementation

## Overview

The Settings page has been redesigned from a single-page form into a modular, sidebar-navigated interface with 7 focused sections. This document covers the full architecture, design decisions, and technical implementation.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [File Structure](#file-structure)
3. [Settings Layout & Navigation](#settings-layout--navigation)
4. [Section Components](#section-components)
5. [Design System](#design-system)
6. [Responsive Behavior](#responsive-behavior)
7. [State Management](#state-management)
8. [Data Flow](#data-flow)

---

## Architecture Overview

```
App.jsx (main app with 2-level sidebar navigation)
  ├── Level 1: Mini Sidebar (icon rail) — Settings gear icon
  ├── Level 2: Secondary Sidebar (text nav) — 7 settings sub-items
  │     ├── Profile & Account      → /dashboard/settings/profile
  │     ├── Departments            → /dashboard/settings/departments
  │     ├── Email Configuration    → /dashboard/settings/email
  │     ├── AI & GenAI Keys        → /dashboard/settings/ai
  │     ├── Integrations           → /dashboard/settings/integrations
  │     ├── Appearance             → /dashboard/settings/appearance
  │     └── Account & Security     → /dashboard/settings/security
  └── Content Area: SettingsView.jsx (receives 'section' prop, renders section component)
        ├── ProfileSection.jsx        → Cloudinary avatar + Supabase profile
        ├── DepartmentsSection.jsx    → Department CRUD (MongoDB)
        ├── EmailSection.jsx          → SMTP/OAuth2 email config
        ├── AISection.jsx             → Gemini API key + confidence threshold
        ├── IntegrationsSection.jsx   → Cloudinary status + config
        ├── AppearanceSection.jsx     → Demo mode + billing rate
        └── SecuritySection.jsx       → Sign out + danger zone
```

### Design Principles

- **Single Responsibility**: Each section component handles one domain of settings
- **Prop Drilling Avoidance**: `SettingsView` receives all props from `App.jsx` and distributes them to the appropriate section via a render prop pattern
- **Self-Contained API Calls**: Sections that need backend data (Profile, Email, Departments, Integrations) make their own fetch calls, reducing prop drilling
- **Consistent UI Patterns**: All sections use shared CSS classes from `settings.css`

---

## File Structure

```
src/
├── SettingsView.jsx              # Entry point — switch/case on 'section' prop
├── settings/
│   ├── settings.css              # All settings-specific styles (content only, no sidebar)
│   ├── ProfileSection.jsx        # Avatar upload + account info
│   ├── DepartmentsSection.jsx    # Department tag management
│   ├── EmailSection.jsx          # Email SMTP/OAuth2 configuration
│   ├── AISection.jsx             # Gemini API key + model + threshold
│   ├── IntegrationsSection.jsx   # Cloudinary integration status
│   ├── AppearanceSection.jsx     # Demo mode + billing rate
│   └── SecuritySection.jsx       # Sign out + cache reset
```

---

## Settings Layout & Navigation

### Integration with App Sidebar

The settings sections are **integrated directly into the app's existing 2-level sidebar navigation** — no separate settings sidebar is created.

**App.jsx Navigation Structure:**

| Level | Component | Purpose |
|-------|-----------|---------|
| Level 1 | Mini Sidebar (icon rail) | Primary nav categories (Home, Inbox, Workspace, Templates, Analytics, Intelligence, Settings) |
| Level 2 | Secondary Sidebar (text nav) | Sub-items for the active primary nav. Settings has 7 sub-items. |
| Content | Main workspace area | Renders the active section component via `SettingsView` |

**Settings Secondary Nav Items:**

| Tab ID | Label | Icon | Route Path |
|--------|-------|------|------------|
| `SettingsProfile` | Profile & Account | `User` | `/dashboard/settings/profile` |
| `SettingsDepartments` | Departments | `Building2` | `/dashboard/settings/departments` |
| `SettingsEmail` | Email Configuration | `Mail` | `/dashboard/settings/email` |
| `SettingsAI` | AI & GenAI Keys | `Shield` | `/dashboard/settings/ai` |
| `SettingsIntegrations` | Integrations | `Plug` | `/dashboard/settings/integrations` |
| `SettingsAppearance` | Appearance | `Palette` | `/dashboard/settings/appearance` |
| `SettingsSecurity` | Account & Security | `Lock` | `/dashboard/settings/security` |

### SettingsView.jsx

`SettingsView` receives a `section` prop from `App.jsx` and renders the corresponding section component via a simple switch/case. No layout wrapper — the app's existing sidebar handles navigation.

```jsx
<SettingsView section="profile" user={user} ... />
```

---

## Section Components

### ProfileSection

- **Purpose**: Avatar upload via Cloudinary + display name management
- **API Calls**: `GET /api/user/profile`, `POST /api/cloudinary/avatar`, `DELETE /api/cloudinary/avatar`, `PUT /api/user/profile`
- **Features**: 
  - Fetches profile on mount, falls back to `user` prop
  - Client-side file validation (type + size)
  - Loading states for upload/remove/save
  - Success/error toast messages

### DepartmentsSection

- **Purpose**: Manage department tags used for categorization
- **API Calls**: `GET /api/user/departments`, `POST /api/user/departments`
- **Features**: Tag-style add/remove UI with chips

### EmailSection

- **Purpose**: Configure SMTP settings for email sending
- **API Calls**: `GET /api/email/config`, `PUT /api/email/config`, `POST /api/email/test`, `DELETE /api/email/config`
- **Features**: App Password or OAuth2 auth methods, test email sending

### AISection

- **Purpose**: Gemini API key management + AI confidence threshold
- **Props**: `defaultRate`, `confidenceThreshold`, `onUpdateSettings`
- **Features**: API key stored in localStorage, model selection dropdown, range slider for threshold

### IntegrationsSection

- **Purpose**: Cloudinary integration status and configuration
- **API Calls**: `GET /api/cloudinary/status`
- **Features**: Connection status badge, config form, refresh button

### AppearanceSection

- **Purpose**: Demo mode toggle + default billing rate
- **Props**: `demoActive`, `onToggleDemo`, `defaultRate`, `onUpdateSettings`
- **Features**: Toggle switch UI, rate input

### SecuritySection

- **Purpose**: Session management + danger zone
- **Props**: `onLogout`, `onResetData`
- **Features**: Sign out button, cache reset with confirmation dialog

---

## Design System

All settings components use CSS variables from the global `index.css` theme:

| Variable | Value | Usage |
|----------|-------|-------|
| `--bg-card` | `#FFFFFF` | Card backgrounds |
| `--border-color` | `rgba(20,20,20,0.08)` | Card borders |
| `--text-primary` | `#141414` | Headings, labels |
| `--text-secondary` | `rgba(20,20,20,0.65)` | Body text |
| `--text-muted` | `rgba(20,20,20,0.42)` | Hints, descriptions |
| `--color-cyan` | `#141414` | Primary accent (buttons, active states) |
| `--color-danger` | `#DC2626` | Destructive actions |
| `--color-success` | `#16A34A` | Success messages |
| `--font-display` | `Outfit` | Headings |
| `--font-body` | `Inter` | Body text |

### CSS Class Naming Convention

- `.settings-*` prefix for all settings-specific styles
- BEM-like naming: `.settings-card-title`, `.settings-nav-item`, `.settings-btn-primary`
- No CSS modules — plain CSS with scoped class names

---

## Responsive Behavior

| Breakpoint | Layout | Sidebar |
|------------|--------|---------|
| Desktop (>768px) | Flex row: sidebar + content | Sticky vertical sidebar, 220px wide |
| Mobile (≤768px) | Flex column | Horizontal scrollable tab bar at top |

The responsive switch happens via a `@media (maxWidth: 768px)` query in `settings.css`.

---

## State Management

### Props from App.jsx → SettingsView

| Prop | Type | Source | Used By |
|------|------|--------|---------|
| `user` | Object | Supabase auth | ProfileSection |
| `defaultRate` | Number | App state | AISection, AppearanceSection |
| `confidenceThreshold` | Number | App state | AISection |
| `onUpdateSettings` | Function | App handler | AISection, AppearanceSection |
| `onResetData` | Function | App handler | SecuritySection |
| `onToggleDemo` | Function | App handler | AppearanceSection |
| `demoActive` | Boolean | App state | AppearanceSection |
| `onLogout` | Function | App handler | SecuritySection |

### Internal State (per section)

Each section manages its own local state via `useState`. No global state library (Redux/Zustand) is used — the settings page is simple enough for local state + fetch calls.

---

## Data Flow

```
User interacts with section component
        │
        ├── If prop-based (AI, Appearance, Security):
        │     └── Calls onUpdateSettings/onToggleDemo/onLogout
        │           └── Updates App.jsx state → re-renders
        │
        └── If API-based (Profile, Email, Departments, Integrations):
              └── Makes fetch() to backend API
                    └── Updates local state
                    └── Shows success/error toast
```
