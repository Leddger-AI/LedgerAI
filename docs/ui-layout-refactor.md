# UI Layout & Container Refactor

This document outlines the macro-level layout changes implemented in the application to achieve the "Box-in-a-Box" floating window aesthetic.

## 1. Global Background & Layout Wrapper

**Previous State**: 
The `.app-container` stretched to `100vw` and `100vh`, effectively touching all edges of the browser window.

**Current State**:
- The `body` element is now purely a canvas. It uses a flex layout to center its children and applies the global cream background (`#f6eadc`).
- A new `.layout-wrapper` was introduced as the master root container.
- `.layout-wrapper` uses a mathematically precise calculation (`width: calc(100vw - 32px); height: calc(100vh - 32px);`) to ensure there is a perfect `16px` gap floating on all four edges of the screen (Top, Bottom, Left, and Right).

## 2. Floating App Container (Main Window)

**Previous State**:
The app container acted as the root layout, holding all sidebars and main content directly.

**Current State**:
- The `.app-container` has been downgraded from a master root wrapper to a specific "Main Window" container.
- It now only houses the Secondary Sidebar and the Main Workspace.
- It features a strict `border-radius: 24px`, a subtle drop shadow (`0 10px 40px rgba(0,0,0,0.05)`), and a solid white background (`#FFFFFF`).

## 3. Responsive Stretching

To prevent "wasted space" on very large widescreen monitors, the `max-width: 1600px` limitation was removed from the layout hierarchy. The layout wrapper now dynamically stretches horizontally across any screen size while maintaining the `16px` floating edge gap, making it look substantially neater and more immersive on 4K/Ultrawide displays.
