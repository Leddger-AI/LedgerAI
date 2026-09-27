# Form Builder & Preview Studio — Complete Session Log

> **Date**: 2026-09-17 through 2026-09-22
> **Scope**: Customizable form builder with drag-and-drop, per-block Appearance inspector, global theme controls, UUID-based draft saving, Mailwave-inspired design language
> **Stack**: React 19 + Vite, Zod v4, @dnd-kit, Node/Express 5, Supabase Postgres, MongoDB
> **Test Discipline**: Every fix = change → test → test again. Backend: 224/224 across 9 suites. Frontend: `npm run build` ×2 + ESLint.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Research & Design References](#2-research--design-references)
3. [Architecture: Block-Based Form System](#3-architecture-block-based-form-system)
4. [Phase 0 — Dependencies](#4-phase-0--dependencies)
5. [Phase 1 — UUID-Based Draft Saving (PATCH Endpoint)](#5-phase-1--uuid-based-draft-saving-patch-endpoint)
6. [Phase 2 — Zod Schema Validation](#6-phase-2--zod-schema-validation)
7. [Phase 3 — 3-Column Student Builder](#7-phase-3--3-column-student-builder)
8. [Phase 4 — Theme System & FormRenderer](#8-phase-4--theme-system--formrenderer)
9. [Phase 5 — Preview Studio (Block Editor)](#9-phase-5--preview-studio-block-editor)
10. [Phase 6 — Mailwave Design Language](#10-phase-6--mailwave-design-language)
11. [Phase 7 — Toolbar Centering & Layout Fix](#11-phase-7--toolbar-centering--layout-fix)
12. [Phase 8 — FieldPalette Simplification](#12-phase-8--fieldpalette-simplification)
13. [Component Reference](#13-component-reference)
14. [File Change Manifest](#14-file-change-manifest)
15. [Test Results](#15-test-results)
16. [Known Limitations & Future Work](#16-known-limitations--future-work)

---

## 1. Executive Summary

This session built a **fully customizable form builder** with a drag-and-drop canvas, per-block Appearance inspector (Font, Color, Size, Align, Kerning), global theme controls, and UUID-based draft saving — matching Mailwave/email-editor UI patterns.

### What Was Built

| Feature | Status |
|---------|--------|
| UUID-based PATCH saving (no duplicate drafts) | ✅ |
| Zod v4 schema validation for blocks | ✅ |
| 3-column Student builder (Palette / Canvas / Inspector) | ✅ |
| Block system (16 types: text, heading, paragraph, email, phone, etc.) | ✅ |
| Drag-and-drop reorder (@dnd-kit) | ✅ |
| Per-block Appearance inspector (Content / Style / Validation / Advanced tabs) | ✅ |
| Typed inspector fields (text, color, iconRadio, fontPair, measure, slider, options) | ✅ |
| Global theme controls (accent, colors, font, radius, spacing, custom CSS) | ✅ |
| CSS custom properties via `themeVars()` | ✅ |
| FormRenderer with per-field style overrides | ✅ |
| Layers panel (numbered list, eye hide/show, delete) | ✅ |
| Preview Studio (selectable canvas + inspector + autosave) | ✅ |
| Mailwave design language (red chevrons, hex+dot colors, plain icon radios) | ✅ |
| Docked toolbar (device left, format centered, above canvas) | ✅ |
| Flat component palette (no search, no accordion) | ✅ |
| Draft Edit pencil in DraftsView | ✅ |
| Server-side `<script>` stripping in custom CSS | ✅ |
| Mongo sync in schedule/unschedule/auto-activate | ✅ |

### Key Design Decisions

1. **Blocks as source of truth**: Toggles/fields are derived at save time via `blocksToToggles()` for backward compat.
2. **UUID identity**: Registry fields use `fld-<id>`, custom blocks use `crypto.randomUUID()`. Drafts PATCH by UUID.
3. **Declaration-driven inspector**: `fieldSectors.js` declares traits as data; `InspectorField.jsx` renders them with typed inputs. Empty groups auto-hide.
4. **Theme as CSS custom properties**: `themeVars()` maps the theme object to `--form-accent`, `--form-bg`, etc. FormRenderer injects these on `.form-paper`.
5. **Combined autosave**: PreviewStudio debounces both blocks and theme changes into a single PATCH per 900ms pause.

---

## 2. Research & Design References

### 2.1 GrapesJS Patterns Studied

Research was conducted on GrapesJS (open-source web builder framework) to inform the inspector and layer panel design:

- **Block Manager**: Blocks are declarative objects with traits, styles, and components. Drag-to-reorder is first-class.
- **Style Manager**: Properties organized into sectors (General, Dimension, Typography, Decorations, Extra). Each sector has properties with types (text, color, select, composite).
- **Layers Module**: Canvas order as a navigable outline. Click to select, eye to hide/show, trash to remove.
- **Key Insight**: Separate DATA (property declarations) from RENDERING (typed input components). This is the "declaration-driven inspector" pattern used in `fieldSectors.js`.

### 2.2 Mailwave / Email Editor UI

The design language was directly inspired by Mailwave's email editor:

- **Three-column layout**: Components palette (left) / Canvas (center) / Appearance inspector (right)
- **Red chevron selects**: All `<select>` elements use a red SVG chevron (`#E4573D`) via CSS `background-image`
- **Hex + dot color controls**: Typed hex input + circular color swatch side by side
- **Font + weight combined dropdown**: Single `<select>` showing "Inter – Regular", "Inter – Bold", etc.
- **Plain icon radios**: Borderless buttons with underline indicator for text-align controls
- **Group headers**: Bold section titles (Typography, Layout) with duo rows for related controls
- **Hero "Your Text" input**: The label field renders as a prominent "Your Text" label in the Content tab

### 2.3 Typeform Patterns

- Conversational format: one question per screen with progress bar
- Score card format: grouped ratings + feedback

---

## 3. Architecture: Block-Based Form System

### 3.1 Data Model

```
Draft (Supabase form_drafts)
├── draft_id (UUID, primary key)
├── title
├── template_type ('student' | 'employee' | 'team')
├── status ('draft' | 'active' | 'scheduled' | 'expired')
└── config (JSONB)
    ├── blocks: Block[]          ← NEW: source of truth
    ├── fields: Field[]          ← derived from blocks via blockToField()
    ├── toggles: { [key]: bool } ← derived from blocks via blocksToToggles()
    ├── settings: { styles: Theme, layout }
    ├── theme: { accent, font, radius, spacing } ← legacy flat theme
    └── emailFormat: string
```

### 3.2 Block Shape

```typescript
{
  uuid: string,          // "fld-fullName" (registry) or crypto.randomUUID() (custom)
  type: BlockType,       // 'text' | 'email' | 'heading' | ... (16 types)
  groupUuid: string,     // section group ID
  groupType: string,     // section key: 'basic' | 'ratings' | 'general' | ...
  payload: {
    label: string,
    placeholder?: string,
    helpText?: string,
    isRequired: boolean,
    options?: { label, value }[],
    maxRating?: number,
    fontFamily?: string,
    fontWeight?: 'regular' | 'medium' | 'semibold' | 'bold',
    htmlTag?: 'h1' | 'h2' | 'h3' | 'p',
    minLength?: number,
    maxLength?: number,
    pattern?: string,
  },
  style: {
    labelPosition: 'top' | 'left' | 'placeholder',
    width: 'full' | 'half' | 'third',
    fontSize?: string,
    color?: string,
    background?: string,
    className?: string,
    letterSpacing?: string,
    textAlign?: 'left' | 'center' | 'right' | 'justify',
    align?: 'left' | 'center' | 'right' | 'stretch',
    hidden?: boolean,
  },
}
```

### 3.3 Migration Strategy

`migrateToBlocks(templateType, config)` handles three config shapes:

1. **New block-based config** (`config.blocks` exists): Validate with `FormConfigSchema.safeParse()`, return parsed data or loose fallback.
2. **Legacy toggle-based config** (`config.toggles` exists): Convert via `fieldsFromToggles()` → `registryFieldToBlock()` for each field.
3. **Empty/unknown config**: Return empty blocks with default settings.

This ensures drafts saved before blocks existed still load correctly.

### 3.4 Backward Compatibility Chain

```
blocks → blockToField() → fields (for older readers, previews, public forms)
blocks → blocksToToggles() → toggles (for Student builder's toggle UI)
```

---

## 4. Phase 0 — Dependencies

### New Packages Added

| Package | Version | Purpose |
|---------|---------|---------|
| `zod` | ^4.6.5 | Schema validation for blocks, themes, form configs |
| `@dnd-kit/core` | ^6.3.1 | Drag-and-drop foundation (sensors, context) |
| `@dnd-kit/sortable` | ^10.0.0 | Sortable list with vertical strategy |
| `@dnd-kit/utilities` | — | CSS transform helpers for sortable items |
| `dompurify` | ^3.4.15 | Client-side CSS sanitization in FormRenderer |

### UUID Handling

- **Browser**: `crypto.randomUUID()` with fallback to `blk-${Date.now()}-${random}`
- **Server tests**: `server/tests/__mocks__/uuid.js` — `validate` does real regex check (not always-true)

---

## 5. Phase 1 — UUID-Based Draft Saving (PATCH Endpoint)

### Problem

Every "Save" created a new Supabase row. No update endpoint existed. Users accumulated duplicate drafts.

### Solution

**File**: `server/index.js` (lines 337–420)

```
PATCH /api/drafts/:draftId
├── verifyToken (auth)
├── Validate UUID format via isUuid()
├── Validate body has title | config | templateType
├── Fetch draft from Supabase (must exist + own it + status === 'draft')
├── sanitizeDraftConfig() — strips <script> from customCSS
├── Supabase update
├── Mongo upsert (TemplateData)
└── Audit log (draft.updated)
```

### Validation Guards

1. **UUID format**: `isUuid(draftId)` — real regex check, not length-only
2. **Draft status**: Only `status === 'draft'` can be edited. Active/scheduled links are immutable.
3. **Empty update**: Rejects if body has no title, config, or templateType
4. **Config type**: Must be an object (not array, not null)
5. **Script stripping**: `sanitizeDraftConfig()` removes `<script>` tags from `config.customCSS`, `config.settings.styles.customCSS`, and `config.theme.customCSS`

### MongoDB Sync

The PATCH endpoint mirrors changes to MongoDB `TemplateData` via `findOneAndUpdate` with `upsert: true`. This ensures analytics and other Mongo-dependent features stay in sync.

### Mongo Sync in Other Endpoints

Schedule, unschedule, and auto-activate endpoints also sync to MongoDB after status changes:
- `PUT /api/drafts/:draftId/activate` → syncs status + config
- `PUT /api/drafts/:draftId/schedule` → syncs goesLiveAt + expiresAt
- Auto-activate job in `server/scheduler.js` → syncs on activation

### Tests (D40–D45)

| Test | Description |
|------|-------------|
| D40 | Updates draft config and syncs MongoDB mirror |
| D41 | Returns 404 when draft not found |
| D42 | Returns 400 when draft is not in draft status |
| D43 | Returns 400 when body has nothing to update |
| D44 | Returns 400 on invalid UUID format |
| D45 | Strips `<script>` tags from customCSS before persisting |

---

## 6. Phase 2 — Zod Schema Validation

### File: `src/utils/formSchema.js`

#### Schemas

| Schema | Purpose |
|--------|---------|
| `BlockOptionSchema` | `{ label: string, value: string }` |
| `BlockPayloadSchema` | Label, placeholder, helpText, isRequired, options, min/max, maxRating, fontFamily, fontWeight, htmlTag |
| `BlockStyleSchema` | labelPosition, width, fontSize, color, className, letterSpacing, textAlign, align, background, hidden |
| `BlockSchema` | uuid, type, groupUuid, groupType, payload, style |
| `ThemeSchema` | colors (6), fonts (family + sizes), spacing (3), border (3), customCSS |
| `FormSettingsSchema` | styles (ThemeSchema), layout (labelPosition, columns) |
| `FormConfigSchema` | blocks (BlockSchema[]), settings (FormSettingsSchema) |

#### Factory Functions

| Function | Description |
|----------|-------------|
| `newBlockId()` | `crypto.randomUUID()` with browser fallback |
| `createBlock(type, overrides)` | Creates a complete block with sensible defaults per type |
| `blockToField(b)` | Blocks → legacy field object (for backward compat) |
| `blocksToToggles(blocks)` | Blocks → toggles map (registry fields only) |
| `migrateToBlocks(templateType, config)` | Any config shape → validated `{ blocks, settings }` |
| `validateFormConfig(config)` | Returns `{ ok, errors[] }` for pre-save validation |

#### Block Types Supported

```
text, email, compoundEmail, phone, textarea, radio, checkbox,
dropdown, date, file, url, rating, paragraph, photo, heading, divider
```

---

## 7. Phase 3 — 3-Column Student Builder

### File: `src/pages/StudentTemplateBuilder.jsx`

#### Layout

```
┌─────────────┬────────────────────┬─────────────┐
│   Palette   │      Canvas        │  Inspector  │
│  (left)     │   (center)         │  (right)    │
│             │                    │             │
│ Components  │  [Device Toggle]   │  Appearance │
│   grid      │  ┌──────────────┐  │  or Layers  │
│             │  │  Form Paper   │  │             │
│ Toggles     │  │  [Blocks]     │  │  Content    │
│ for fields  │  │  [DnD]        │  │  Style      │
│             │  └──────────────┘  │  Validation │
│             │                    │  Advanced   │
└─────────────┴────────────────────┴─────────────┘
```

#### Key Implementation Details

1. **Blocks as source of truth**: `const [blocks, setBlocks] = useState(...)`. Toggles are derived via `useMemo(() => blocksToToggles(blocks), [blocks])`.

2. **Registry field toggling**: `toggleField(key)` checks if `fld-${key}` exists in blocks. If yes, removes it. If no, creates via `registryBlockFor(key)` and inserts at the correct registry position.

3. **Custom block addition**: `addBlock(type, spawn)` creates via `createBlock()`, appends to blocks, selects the new block.

4. **Drag-and-drop**: `@dnd-kit` with `PointerSensor` (distance: 4px activation) + `KeyboardSensor`. `handleDragEnd` adopts the section of the drop target.

5. **Block operations**: `deleteBlock`, `duplicateBlock` (deep-clones with new UUID), `toggleHidden` (flips `style.hidden`).

6. **Draft saving**: `handleSaveDraft()` validates with `validateFormConfig()`, POSTs new drafts, PATCHes existing ones (tracked via `existingDraftId` state).

7. **Hydration from DraftsView**: `useEffect` reads `location.state?.draft` and calls `migrateToBlocks()` to populate blocks.

---

## 8. Phase 4 — Theme System & FormRenderer

### Theme Object Shape

```javascript
{
  colors: {
    background: '#ffffff',
    text: '#37352f',
    accent: '#0E9384',
    buttonBackground: '#0E9384',
    buttonText: '#ffffff',
    error: '#DC2626',
  },
  fonts: {
    family: 'Inter',
    sizes: { label: '14px', input: '16px', heading: '24px' },
  },
  spacing: {
    fieldGap: '16px',
    sectionGap: '32px',
    padding: '24px',
  },
  border: {
    radius: '8px',
    width: '1px',
    color: '#E5E5E5',
  },
  customCSS: '',
}
```

### CSS Custom Properties (`themeVars()`)

Maps theme → CSS vars injected on `.form-paper`:

| Theme Path | CSS Variable |
|-----------|-------------|
| `colors.accent` | `--form-accent` |
| `colors.background` | `--form-bg` |
| `colors.text` | `--form-text` |
| `colors.error` | `--form-error` |
| `fonts.family` | `--form-font` |
| `spacing.fieldGap` | `--form-gap` |
| `border.radius` | `--form-radius` |

### FormRenderer Per-Field Overrides

`FormRenderer.jsx` honors these per-field properties from `blockToField()` output:

| Property | Effect |
|----------|--------|
| `width` | `'full'` → span 6 cols, `'half'` → span 3, `'third'` → span 2 |
| `labelPosition` | `'top'` (default), `'left'` (flex-row), `'placeholder'` (no label) |
| `fontFamily` | Inline `font-family` on the input |
| `fontWeight` | Maps `'regular'→400`, `'medium'→500`, `'semibold'→600`, `'bold'→700` |
| `fontSize` | Inline `font-size` |
| `letterSpacing` | Kerning: `'5%'` → `'0.05em'`, `'2px'` → `'2px'` |
| `textAlign` | `text-align` on input/textarea |
| `color` | Text color on input |
| `background` | Background on input |
| `htmlTag` | Heading blocks render as `<h1>`–`<h3>` or `<p>` |
| `maxRating` | Rating blocks: number of dots |
| `hidden` | Field skipped in render |
| `helpText` | Shown below input as `.form-help` |
| `className` | Added to `.form-field` wrapper |

### CSS Sanitization

`sanitizeCss()` in `formTheme.js`:
1. Strip HTML tags: `/<[^>]*>/g`
2. Strip `@import` rules: `/@import[^;]+;/gi`
3. Truncate to 20,000 chars

Server-side `sanitizeDraftConfig()` additionally strips `<script>` tags from all customCSS fields before persisting.

---

## 9. Phase 5 — Preview Studio (Block Editor)

### File: `src/pages/PreviewStudio.jsx`

### Architecture

Preview Studio is a **standalone block editor** that loads saved drafts and provides pixel-level editing. It has a three-column layout:

```
┌──────────┬───────────────────────────┬──────────────────┐
│ Palette  │        Canvas             │    Right Rail     │
│ (left)   │  [Device] [Format]        │                  │
│          │  ┌─────────────────────┐  │  Draft Picker    │
│ All 16   │  │  Form Paper          │  │  (select)        │
│ component│  │  [Selectable Blocks] │  │                  │
│ cards    │  │  [DnD Reorder]       │  │  Appearance      │
│          │  └─────────────────────┘  │  (FieldInspector) │
│          │                           │                  │
│          │                           │  Layers          │
│          │                           │  (numbered list)  │
│          │                           │                  │
│          │                           │  Theme           │
│          │                           │  (always visible) │
│          │                           │                  │
│          │                           │  Publish         │
│          │                           │  (copy/activate)  │
└──────────┴───────────────────────────┴──────────────────┘
```

### Key Implementation Details

1. **Draft loading**: Fetches all user drafts on mount. Auto-selects first draft. Draft picker is a `<select>` with red chevron.

2. **Block selection**: Clicking a block on the canvas sets `selectedUuid`. When selected:
   - Block gets `.selected` border (teal `#0E9384`)
   - Right rail shows `FieldInspector` at the top
   - Theme section collapses below the inspector
   - Clicking X on inspector deselects, Theme re-expands

3. **Block creation in Studio**: `FieldPalette` on the left allows adding blocks directly without first saving a draft. New blocks spawn on the canvas immediately.

4. **Combined autosave**: Single `useEffect` watches `[blocks, theme, draft]`. After 900ms pause, PATCHes the draft with both blocks and theme changes in one request.

5. **Format switching**: Three formats (Classic, Conversational, Score Card) all derive from the same blocks array. Switching format doesn't lose data.

6. **Right rail sections** (always in this order):
   - `studio-rail-section`: Draft picker
   - `studio-rail-section`: Appearance inspector (when block selected)
   - `studio-rail-section`: Layers (when no block selected, blocks > 0)
   - `studio-rail-section`: Theme (always, collapsible)
   - `studio-rail-section`: Publish (copy link, activate, schedule)

### Drag-and-Drop in Studio

Same `@dnd-kit` setup as the Student builder. `handleDragEnd` uses `arrayMove()` and adopts the target section's `groupType`.

---

## 10. Phase 6 — Mailwave Design Language

### CSS Classes & Patterns

#### Red Chevron Selects

All `<select>` elements in the sidebar and inspector use a red SVG chevron:

```css
.tb-sidebar select.form-input,
.inspector-body select.form-input {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=US-ASCII,...#E4573D...");
  background-position: right 10px center;
  background-size: 14px;
  padding-right: 32px;
}
```

#### Hex + Dot Color Controls

`HexDot` component: typed hex `<input>` + circular `<input type="color">` swatch.

```css
.mw-hexdot {
  display: flex;
  gap: 8px;
  align-items: center;
}
.mw-dot {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid #E5E5E5;
}
```

#### Icon Radio Controls (Plain Variant)

Text align buttons use the `.plain` variant — borderless with underline indicator:

```css
.icon-radio-btn.plain {
  border: none;
  background: transparent;
  color: #B0B0B0;
}
.icon-radio-btn.plain.active {
  color: #141414;
}
.icon-radio-btn.plain.active::after {
  content: '';
  position: absolute;
  left: 6px; right: 6px; bottom: -2px;
  height: 2px;
  background: #141414;
}
```

#### Font + Weight Combined Dropdown

`InspectorField` `fontPair` type: single `<select>` with options like "Inter – Regular", "Inter – Bold". Updates both `payload.fontFamily` and `payload.fontWeight`.

#### Styled Range Sliders

```css
input[type="range"].mw-range {
  width: 100%;
  accent-color: #2563EB;
}
```

#### Studio Rail Sections

```css
.studio-rail-section {
  padding: 0 20px;
  border-top: 1px solid #ECECEE;
  padding-top: 16px;
}
```

#### Accent Dot Active Ring

```css
.studio-accent-dot.active {
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px #141414;
}
```

---

## 11. Phase 7 — Toolbar Centering & Layout Fix

### Problem

Device toggles were `position: absolute; top: 24px; right: 24px` — floating over the canvas, overlapping content. Format toggles weren't centered above the preview.

### Solution

#### CSS Changes in `TemplateBuilder.css`

1. **`.tb-preview-panel`**: Changed from `display: flex; justify-content: center; align-items: flex-start` to `flex-direction: column; align-items: center`. This makes the panel a vertical flex container with everything centered.

2. **`.device-toggle-container`**: Removed `position: absolute; top: 24px; right: 24px`. Toggles are now in-flow, sitting above the device frame in normal document flow.

3. **`.studio-toolbar`**: Added `width: 100%; max-width: 900px` so both toggle bars are centered together above the canvas.

4. **Responsive override cleanup**: Removed dead `top: 12px; right: 12px` from `@media (max-width: 992px)`.

### Result

Both toggle bars (device left, format right) sit centered in a row directly above the device frame. No floating, no overlapping.

---

## 12. Phase 8 — FieldPalette Simplification

### File: `src/components/FormPalette.jsx`

### Before

- Search bar with live filtering
- 4 accordion categories (Blocks, Inputs, Choices, Media Gallery)
- Red chevron toggles to expand/collapse
- Empty state message when no matches

### After

- No search bar
- No accordion sections
- All 16 components in a flat 2-column grid
- Every component immediately visible

### Components in Flat Grid

| # | Type | Label | Icon |
|---|------|-------|------|
| 1 | text | Text | Type |
| 2 | heading | Heading | Heading1 |
| 3 | paragraph | Paragraph | FileText |
| 4 | textarea | Long Text | AlignLeft |
| 5 | divider | Spacer | Minus |
| 6 | email | Email | Mail |
| 7 | phone | Phone | Phone |
| 8 | url | URL | Globe |
| 9 | compoundEmail | College Email | Link2 |
| 10 | date | Date | Calendar |
| 11 | dropdown | Dropdown | ChevronDown |
| 12 | radio | Radio | Circle |
| 13 | checkbox | Checkbox | CheckSquare |
| 14 | rating | Rating | Star |
| 15 | photo | Images | Image |
| 16 | file | Files | Upload |

---

## 13. Component Reference

### `src/components/FieldPalette.jsx`
Flat grid of 16 component cards. Each card calls `onAdd(type, { payload, style })` to spawn a block on the canvas.

### `src/components/SortableBlock.jsx`
Drag-sortable block with:
- Grip handle (left)
- `MiniPreview` rendering (htmlTag-aware: h1/h2/h3/p for headings, textarea preview, rating dots, option chips, etc.)
- Duplicate button
- Delete button
- Hidden dimming (dashed border, reduced opacity when `style.hidden`)
- Selection highlight (teal border + glow)

### `src/components/FieldInspector.jsx`
Right-rail inspector with 4 tabs:
- **Content**: Hero "Your Text" input, placeholder, helpText, required toggle, options editor
- **Style**: Grouped by `decl.group` (Typography, Layout). Duo rows for related controls (fontSize + letterSpacing side by side, color + background side by side)
- **Validation**: minLength, maxLength, pattern (text types); maxRating slider (rating type)
- **Advanced**: Section key, CSS class, hide toggle, block ID

Uses `sectorsFor(type)` to get declarations, then renders them with typed inputs via `InspectorField`.

### `src/components/InspectorField.jsx`
Renders a single sector property declaration. Supports 10 input types:

| Type | Renders |
|------|---------|
| `text` | `<input type="text">` |
| `textarea` | `<textarea>` |
| `checkbox` | `<input type="checkbox">` |
| `select` | `<select>` with red chevron |
| `color` | Hex input + dot swatch |
| `slider` | Range input with value label |
| `number` | `<input type="number">` |
| `measure` | Number + unit select (px/em/%) |
| `iconRadio` | Button grid with icons (plain or bordered variant) |
| `fontPair` | Combined fontFamily–fontWeight dropdown |
| `options` | Editable list of {label, value} pairs |

### `src/components/LayersPanel.jsx`
Numbered list of blocks. Each row shows: index, label, type badge, eye toggle (hide/show), trash button.

### `src/utils/fieldSectors.js`
Declaration-driven sector definitions. Each block type declares its:
- **Content traits** (`contentTraits(type)`): label (hero), placeholder, helpText, required, options
- **Style properties** (`styleProps(type)`): labelPosition, width, textAlign (plain variant), fontSize, letterSpacing (duo), color + background (duo), align, fontFamily (fontPair)
- **Validation rules** (`validationProps(type)`): minLength, maxLength, pattern, maxRating

Exports: `FONT_FAMILIES`, `FONT_WEIGHTS`, `OPTION_TYPES`, `sectorsFor(type)`

### `src/utils/formTheme.js`
- `sanitizeCss(css)`: Strip tags, @import, truncate to 20k
- `themeVars(theme)`: Theme object → CSS custom properties object

### `src/utils/formSchema.js`
Zod schemas + factories + migration (detailed in Phase 2 above).

---

## 14. File Change Manifest

### New Files Created

| File | Purpose |
|------|---------|
| `src/utils/formSchema.js` | Zod schemas, block factories, migration, validation |
| `src/utils/formTheme.js` | sanitizeCss + themeVars (extracted from FormRenderer for react-refresh) |
| `src/utils/fieldSectors.js` | Sector/property declarations for the inspector |
| `src/components/FieldPalette.jsx` | Components panel (flat grid) |
| `src/components/FieldInspector.jsx` | Appearance inspector (tabbed, declaration-driven) |
| `src/components/InspectorField.jsx` | Typed input renderer for sector declarations |
| `src/components/LayersPanel.jsx` | Layers list (numbered, hide/show, delete) |
| `server/tests/__mocks__/uuid.js` | UUID mock with real regex validate |

### Modified Files

| File | Changes |
|------|---------|
| `src/pages/StudentTemplateBuilder.jsx` | Rewritten: blocks as source of truth, 3-column layout, palette + canvas + inspector/layers |
| `src/pages/PreviewStudio.jsx` | Rewritten: selectable canvas, Appearance inspector, Theme always visible, docked toolbar, block creation, combined autosave |
| `src/pages/DraftsView.jsx` | Added Edit pencil button (navigates to builder via router state) |
| `src/pages/TemplateBuilder.css` | Added: studio-rail, studio-toolbar, mw-hexdot, mw-dot, mw-range, icon-radio-btn.plain, inspector-group-title, inspector-duo, layers-list, canvas-guide, studio-format-bar, studio-accent-dot. Fixed: device-toggle-container position, tb-preview-panel flex-direction, responsive overrides |
| `src/components/FormRenderer.jsx` | Added: htmlTag, kerning (letterSpacing %→em), hidden, fontFamily/Weight, background, textAlign, align, className, helpText per-field overrides |
| `server/index.js` | Added: PATCH /api/drafts/:draftId (UUID check, status guard, sanitizeDraftConfig, Mongo sync, audit). Added Mongo sync to schedule/unschedule endpoints. Added `isUuid` import |
| `server/scheduler.js` | Auto-activate job now syncs to MongoDB TemplateData |
| `server/tests/api.test.js` | Added 6 PATCH tests (D40–D45): success, 404, wrong status, empty body, bad UUID, script stripping |
| `server/tests/__mocks__/uuid.js` | `validate` now does real regex check |

### Deleted Files

| File | Reason |
|------|--------|
| `server/models/FormDraft.js` | Legacy model no longer needed (using Supabase + Mongo mirror) |

---

## 15. Test Results

### Backend (Jest — `server/` directory)

```
Test Suites: 9 passed, 9 total
Tests:       224 passed, 224 total
Duration:    22.15s
```

| Suite | Tests | Key Coverage |
|-------|-------|--------------|
| api.test.js | 60 | D1–D45 (drafts), F1–F12 (forms), P1–P4 (profile), S1–S14 (spreadsheets), M1–M3 (meetings), AL1–AL4 (alerts) |
| email.test.js | 40 | E1–E40 (drafts, accounts, send, schedule, log, test, departments) |
| analytics.test.js | 47 | TemplateData, TemplateSubmission models, GET endpoints, githubAnalyzer, sync |
| analyticsExport.test.js | 33 | CSV/JSON/PDF export, report CRUD |
| otp.test.js | 15 | OTP send, verify, lockout, action isolation |
| auth.test.js | 8 | Auth middleware: bypass, token validation, error handling |
| scheduler.test.js | 13 | Agenda schedule/cancel, campaign job handler, draft activation |
| emailService.test.js | 5 | Transporter, submission email, error swallowing |
| googleDriveToken.test.js | 4 | Mongoose pre-save hook, updatedAt |

### Frontend (Vite Build)

```
✓ built in 1.75s
dist/index.html                    0.88 kB
dist/assets/index-*.css          206.79 kB
dist/assets/index-*.js         6,201.76 kB (6.2 MB — pre-code-split)
```

Build succeeds with no errors. Only warning is chunk size (pre-existing, not addressed in this session).

---

## 16. Known Limitations & Future Work

### Current Limitations

1. **Employee/Team builders**: Still use toggle-only UI. Blocks system only wired into Student builder and Preview Studio.
2. **No server-side block validation**: PATCH accepts any config shape. Zod validation runs client-side only (in `validateFormConfig()` before save).
3. **Theme persistence**: Theme changes in Preview Studio autosave, but there's no visual "saved" indicator beyond the debounced PATCH.
4. **Chunk size**: `index.js` is 6.2 MB. Needs code-splitting (dynamic imports for routes).

### Future Work

1. **Wire Employee/Team builders to blocks**: Same pattern as Student builder — `migrateToBlocks()` already supports all template types.
2. **Server-side Zod validation**: Add `FormConfigSchema.safeParse()` check in PATCH endpoint.
3. **Undo/redo**: Track block operation history for Ctrl+Z support.
4. **Block templates**: Pre-built block groups (e.g., "Contact Info" = name + email + phone).
5. **Conditional visibility**: Show/hide blocks based on other field values.
6. **Export to PDF/Word**: Render FormRenderer output to printable format.
7. **Collaborative editing**: Real-time multi-user block editing via WebSocket.
8. **Code-splitting**: Dynamic imports for route components to reduce initial bundle.

---

## Appendix: CSS Class Reference

### Builder Layout

| Class | Purpose |
|-------|---------|
| `.template-builder-container` | Flex row: palette + canvas + rail |
| `.tb-sidebar` | Left panel (grey tile, rounded) |
| `.tb-preview-panel` | Center panel (flex column, centered) |
| `.tb-inspector` | Right panel (sticky, scrollable) |
| `.studio-rail` | Right rail in Preview Studio |
| `.studio-rail-section` | Section within the rail (border-top divider) |

### Canvas

| Class | Purpose |
|-------|---------|
| `.canvas-block` | Individual block on canvas |
| `.canvas-block.selected` | Teal border + glow |
| `.canvas-block.is-hidden` | Dashed border, reduced opacity |
| `.canvas-block-handle` | Drag grip (left side) |
| `.canvas-block-actions` | Duplicate + delete buttons |
| `.canvas-section-title` | Section header (uppercase, muted) |
| `.canvas-guide` | Red crosshair overlay during drag |
| `.canvas-guide-wrap` | Relative container for guide positioning |

### Inspector

| Class | Purpose |
|-------|---------|
| `.inspector-tabs` | Tab bar (Content/Style/Validation/Advanced) |
| `.inspector-tab.active` | White background + shadow |
| `.inspector-body` | Tab content area |
| `.inspector-row` | Label + input stacked vertically |
| `.inspector-label` | Uppercase, muted, 11.5px |
| `.inspector-group-title` | Bold section header (Typography, Layout) |
| `.inspector-duo` | Two inspector-rows side by side |
| `.inspector-hint` | Muted helper text |
| `.icon-radio-btn` | Bordered icon button |
| `.icon-radio-btn.plain` | Borderless variant with underline |
| `.icon-radio-btn.plain.active::after` | Underline indicator |

### Layers

| Class | Purpose |
|-------|---------|
| `.layers-list` | Flex column container |
| `.layers-row` | Individual layer row |
| `.layers-row.selected` | Teal border |
| `.layers-row.is-hidden` | Opacity 0.55, dashed border |
| `.layers-index` | Block number (1, 2, 3...) |
| `.layers-name` | Block label (truncated) |

### Mailwave Components

| Class | Purpose |
|-------|---------|
| `.mw-panel` | Panel wrapper (padding) |
| `.mw-panel-title` | "Components" header |
| `.mw-card-grid` | 2-column grid for component cards |
| `.mw-card` | Individual component card (icon + label) |
| `.mw-hexdot` | Hex input + dot swatch row |
| `.mw-dot` | Circular color swatch (30px) |
| `input[type="range"].mw-range` | Styled range slider |
| `.studio-accent-dot.active` | Black ring on selected accent |

### Toolbar

| Class | Purpose |
|-------|---------|
| `.studio-toolbar` | Flex row: device + format toggles, centered |
| `.device-toggle-container` | Pill-shaped toggle group |
| `.device-toggle-btn` | Individual toggle button |
| `.device-toggle-btn.active` | Blue background + shadow |
| `.studio-format-bar` | Format toggle container |
