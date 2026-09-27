// Form schema — Zod contracts for the block-based form config.
// One form = { blocks: [...], settings: { styles, layout } }.
// Stored inside the draft's `config` JSONB (Supabase) / `config` (Mongo),
// keyed by the draft UUID — never by row position — so edits PATCH the
// same draft instead of creating duplicates.
//
// Backward compat: drafts saved before blocks existed only carry
// `config.toggles` (+ optional `config.theme`). migrateToBlocks() bridges
// those into blocks on load; nothing old breaks.
import { z } from 'zod';
import { fieldsFromToggles } from './formFields';

export const BLOCK_TYPES = [
  'text',
  'email',
  'compoundEmail',
  'phone',
  'textarea',
  'radio',
  'checkbox',
  'dropdown',
  'date',
  'file',
  'url',
  'rating',
  'paragraph',
  'photo',
  'heading',
  'divider',
];

export const BlockOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const BlockPayloadSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  isRequired: z.boolean().default(false),
  options: z.array(BlockOptionSchema).optional(),
  minLength: z.number().int().nonnegative().optional(),
  maxLength: z.number().int().nonnegative().optional(),
  pattern: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  maxRating: z.number().int().min(1).max(10).optional(),
  fontFamily: z.string().optional(),
  fontWeight: z.enum(['regular', 'medium', 'semibold', 'bold']).optional(),
  htmlTag: z.enum(['h1', 'h2', 'h3', 'p']).optional(),
});

export const BlockStyleSchema = z.object({
  labelPosition: z.enum(['top', 'left', 'placeholder']).default('top'),
  width: z.enum(['full', 'half', 'third']).default('full'),
  fontSize: z.string().optional(),
  color: z.string().optional(),
  className: z.string().optional(),
  letterSpacing: z.string().optional(),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
  align: z.enum(['left', 'center', 'right', 'stretch']).optional(),
  background: z.string().optional(),
  hidden: z.boolean().optional(),
});

export const BlockSchema = z.object({
  // Stable identity string (registry fields use `fld-<id>`, new blocks use UUIDs)
  uuid: z.string().min(1),
  type: z.enum(BLOCK_TYPES),
  groupUuid: z.string().min(1),
  // Section key this block belongs to (e.g. 'basic', 'ratings')
  groupType: z.string().default('general'),
  payload: BlockPayloadSchema,
  style: BlockStyleSchema.default({}),
});

export const ThemeSchema = z.object({
  colors: z.object({
    background: z.string().default('#ffffff'),
    text: z.string().default('#37352f'),
    accent: z.string().default('#0E9384'),
    buttonBackground: z.string().default('#0E9384'),
    buttonText: z.string().default('#ffffff'),
    error: z.string().default('#DC2626'),
  }).default({}),
  fonts: z.object({
    family: z.string().default('Inter'),
    sizes: z.object({
      label: z.string().default('14px'),
      input: z.string().default('16px'),
      heading: z.string().default('24px'),
    }).default({}),
  }).default({}),
  spacing: z.object({
    fieldGap: z.string().default('16px'),
    sectionGap: z.string().default('32px'),
    padding: z.string().default('24px'),
  }).default({}),
  border: z.object({
    radius: z.string().default('8px'),
    width: z.string().default('1px'),
    color: z.string().default('#E5E5E5'),
  }).default({}),
  customCSS: z.string().optional(),
});

export const FormSettingsSchema = z.object({
  styles: ThemeSchema.default({}),
  layout: z.object({
    labelPosition: z.enum(['top', 'left', 'placeholder']).default('top'),
    columns: z.number().int().min(1).max(3).default(1),
  }).default({}),
});

export const FormConfigSchema = z.object({
  blocks: z.array(BlockSchema),
  settings: FormSettingsSchema.default({}),
});

// ---------- factories ----------

export function newBlockId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `blk-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

const TYPE_LABELS = {
  text: 'Text Input',
  email: 'Email',
  compoundEmail: 'Compound Email',
  phone: 'Phone',
  textarea: 'Text Area',
  radio: 'Radio Group',
  checkbox: 'Checkboxes',
  dropdown: 'Dropdown',
  date: 'Date',
  file: 'File Upload',
  url: 'URL',
  rating: 'Rating',
  paragraph: 'Paragraph',
  photo: 'Photo',
  heading: 'Heading',
  divider: 'Divider',
};

export function createBlock(type, overrides = {}) {
  if (!BLOCK_TYPES.includes(type)) throw new Error(`Unknown block type: ${type}`);
  const payload = {
    label: TYPE_LABELS[type],
    isRequired: false,
    ...(type === 'rating' ? { maxRating: 5 } : {}),
    ...(['radio', 'checkbox', 'dropdown'].includes(type)
      ? { options: [{ label: 'Option 1', value: 'option-1' }, { label: 'Option 2', value: 'option-2' }] }
      : {}),
    ...(overrides.payload || {}),
  };
  return {
    uuid: newBlockId(),
    type,
    groupUuid: overrides.groupUuid || newBlockId(),
    groupType: overrides.groupType || 'general',
    payload,
    style: { labelPosition: 'top', width: 'full', ...(overrides.style || {}) },
  };
}

// ---------- migration ----------

// Registry field type -> block type (registry already uses block-compatible names).
// Accepts merged field objects (def + stored overrides from config.fields),
// so widths/labels customized in the builder survive reload.
function registryFieldToBlock(f) {
  const style = { labelPosition: 'top', width: 'full' };
  if (['full', 'half', 'third'].includes(f.width)) style.width = f.width;
  if (f.fontSize) style.fontSize = f.fontSize;
  if (f.color) style.color = f.color;
  if (f.className) style.className = f.className;
  if (f.letterSpacing) style.letterSpacing = f.letterSpacing;
  if (f.textAlign) style.textAlign = f.textAlign;
  if (f.align) style.align = f.align;
  if (f.background) style.background = f.background;
  if (f.hidden) style.hidden = true;
  const payload = {
    label: f.label || f.id,
    ...(f.placeholder ? { placeholder: f.placeholder } : {}),
    ...(f.helpText ? { helpText: f.helpText } : {}),
    isRequired: !!f.required,
    ...(Array.isArray(f.options) ? { options: f.options } : {}),
    ...(f.maxRating ? { maxRating: f.maxRating } : {}),
    ...(f.fontFamily ? { fontFamily: f.fontFamily } : {}),
    ...(f.fontWeight ? { fontWeight: f.fontWeight } : {}),
    ...(f.htmlTag ? { htmlTag: f.htmlTag } : {}),
  };
  return {
    uuid: `fld-${f.id}`,
    type: BLOCK_TYPES.includes(f.type) ? f.type : 'text',
    groupUuid: `sec-${f.section || 'general'}`,
    groupType: f.section || 'general',
    payload,
    style,
  };
}

function themeToStyles(theme = {}) {
  const styles = {};
  if (theme.accent) {
    styles.colors = { accent: theme.accent, buttonBackground: theme.accent };
  }
  if (theme.font) styles.fonts = { family: theme.font };
  if (theme.radius !== undefined) styles.border = { radius: `${theme.radius}px` };
  if (theme.spacing !== undefined) styles.spacing = { fieldGap: `${theme.spacing}px` };
  if (theme.customCSS) styles.customCSS = theme.customCSS;
  return styles;
}

// Resolve ANY stored config (new blocks | legacy toggles | legacy fields)
// into a validated { blocks, settings } pair. Never throws — falls back
// to an empty form with default settings.
export function migrateToBlocks(templateType, config = {}) {
  const fallback = { blocks: [], settings: { styles: {}, layout: { labelPosition: 'top', columns: 1 } } };
  try {
    if (config && Array.isArray(config.blocks)) {
      const parsed = FormConfigSchema.safeParse(config);
      if (parsed.success) return parsed.data;
      // Blocks present but invalid — still honor them loosely rather than wiping
      return {
        blocks: config.blocks.filter((b) => b && b.uuid && b.type && b.payload),
        settings: config.settings || fallback.settings,
      };
    }
    const fields = fieldsFromToggles(templateType, config);
    return {
      blocks: fields.map(registryFieldToBlock),
      settings: {
        styles: themeToStyles(config.theme),
        layout: { labelPosition: 'top', columns: 1 },
      },
    };
  } catch {
    return fallback;
  }
}

// Blocks -> legacy config.fields entries so older readers (previews,
// public form) that consume `fields` see labels, widths, and order too.
// Registry blocks map back to their field id; custom blocks keep their uuid.
export function blockToField(b) {
  return {
    id: b.uuid.startsWith('fld-') ? b.uuid.slice(4) : b.uuid,
    type: b.type,
    label: b.payload?.label,
    ...(b.payload?.placeholder ? { placeholder: b.payload.placeholder } : {}),
    ...(b.payload?.helpText ? { helpText: b.payload.helpText } : {}),
    ...(b.payload?.isRequired ? { required: true } : {}),
    ...(Array.isArray(b.payload?.options) ? { options: b.payload.options } : {}),
    ...(b.payload?.maxRating ? { maxRating: b.payload.maxRating } : {}),
    ...(b.payload?.fontFamily ? { fontFamily: b.payload.fontFamily } : {}),
    ...(b.payload?.fontWeight ? { fontWeight: b.payload.fontWeight } : {}),
    ...(b.payload?.htmlTag ? { htmlTag: b.payload.htmlTag } : {}),
    section: b.groupType || 'general',
    width: b.style?.width || 'full',
    ...(b.style?.fontSize ? { fontSize: b.style.fontSize } : {}),
    ...(b.style?.color ? { color: b.style.color } : {}),
    ...(b.style?.className ? { className: b.style.className } : {}),
    ...(b.style?.letterSpacing ? { letterSpacing: b.style.letterSpacing } : {}),
    ...(b.style?.textAlign ? { textAlign: b.style.textAlign } : {}),
    ...(b.style?.align ? { align: b.style.align } : {}),
    ...(b.style?.background ? { background: b.style.background } : {}),
    ...(b.style?.hidden ? { hidden: true } : {}),
  };
}

// Blocks -> legacy toggles map (registry fields only; custom blocks have none)
export function blocksToToggles(blocks) {
  const toggles = {};
  for (const b of blocks) {
    if (b.uuid.startsWith('fld-')) toggles[b.uuid.slice(4)] = true;
  }
  return toggles;
}

// Validate before publish/save. Returns { ok, errors } — persist the
// ORIGINAL object (not parsed output) so unknown future keys survive.
export function validateFormConfig(config) {
  const result = FormConfigSchema.safeParse(config);
  if (result.success) return { ok: true, errors: [] };
  return {
    ok: false,
    errors: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
  };
}
