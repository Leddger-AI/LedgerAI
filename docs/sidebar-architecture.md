# 2-Tier Sidebar Architecture

This document explains the architectural teardown and rebuild of the navigation sidebar.

## Overview
The application's navigation was migrated from a standard monolithic sidebar (with a dark `#141414` theme) to a sophisticated, separated 2-tier white navigation system.

## 1. Physical Separation (The "Double Pill" Design)

Instead of nesting the Mini Sidebar inside the main application container, it was decoupled entirely. 

**Structure:**
- **Mini Sidebar (Level 1)**: Physically separated from the main app. It is rendered as an independent vertical "pill" (`width: 64px`, `border-radius: 24px`, solid white background) that floats directly on the cream canvas (`#f6eadc`).
- **Gap Margin**: The `.layout-wrapper` uses a `flex` layout with a `12px` gap. This forces a physical transparent space between the Mini Sidebar and the Secondary Sidebar.
- **Active State Highlights**: Because the Mini Sidebar is a white pill, active icons are highlighted using a subtle gray square (`#F5F5F5`), shifting away from the previous heavy drop-shadows.

## 2. Secondary Sidebar (Level 2)

The Secondary Sidebar handles sub-navigation based on the primary selection.

**Key Refactors:**
- **Alignment**: The header title (e.g., "Inbox") was changed from a stacked layout to a horizontal layout perfectly aligned with other header elements.
- **Minimalist Dividers**: Text-based category labels (like "VIEWS") were completely removed. They were replaced with thin, highly minimalist `<hr>` divider lines (`border-top: 1px solid #F0F0F0`).
- **Counts and Badges**: Secondary navigation items were upgraded to support right-aligned numerical counts (e.g., `46`, `12`, `50`) to match modern inbox designs.
- **Collapsible Headers**: Added support for collapsible section headers (e.g., "Others", "Team Inboxes") with right-aligned chevron arrows.

## 3. Removals for Cleanliness

To achieve a neater, less cluttered UI as per design specifications:
- **Toggle Collapse Button Removed**: The circular `>>` button that floated between the two sidebars was removed, enforcing a permanently expanded 2-tier layout that occupies the available widescreen real estate.
- **Sidebar Search Removed**: The secondary sidebar's inline `<Search...>` input box was deleted to reduce visual noise and tighten the header area spacing.
- **Icon Set Refactor**: Swapped all proprietary icons for standardized, thin `lucide-react` icons (rendered with `strokeWidth={1.5}` or `2`) to guarantee visual consistency.
