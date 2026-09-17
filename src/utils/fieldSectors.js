// Sector/property declarations for the inspector — the GrapesJS-inspired
// pattern: rows are DATA ({ path, type, label, options }), rendered by
// typed inputs, not bespoke JSX. Each block type declares its own traits
// (Content), styles (Style), and rules (Validation); empty groups hide.
//
// Property path: ['payload', <key>] or ['style', <key>] on the block.
// Input types: text | textarea | checkbox | select | color | slider |
//              number | measure | iconRadio | fontPair | options
import {
  ArrowUpToLine, ArrowLeftToLine, EyeOff,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical, StretchHorizontal,
} from 'lucide-react';

export const FONT_FAMILIES = [
  'Inter', 'Plus Jakarta Sans', 'Roboto', 'Open Sans', 'Lato', 'Georgia', 'monospace',
];

export const FONT_WEIGHTS = [
  { value: 'regular', label: 'Regular' },
  { value: 'medium', label: 'Medium' },
  { value: 'semibold', label: 'Semi Bold' },
  { value: 'bold', label: 'Bold' },
];

const LABEL_POSITIONS = [
  { value: 'top', label: 'Top', icon: ArrowUpToLine },
  { value: 'left', label: 'Left', icon: ArrowLeftToLine },
  { value: 'placeholder', label: 'Placeholder', icon: EyeOff },
];

const TEXT_ALIGNS = [
  { value: 'left', label: 'Left', icon: AlignLeft },
  { value: 'center', label: 'Center', icon: AlignCenter },
  { value: 'right', label: 'Right', icon: AlignRight },
  { value: 'justify', label: 'Justify', icon: AlignJustify },
];

const BLOCK_ALIGNS = [
  { value: 'left', label: 'Left', icon: AlignStartVertical },
  { value: 'center', label: 'Center', icon: AlignCenterVertical },
  { value: 'right', label: 'Right', icon: AlignEndVertical },
  { value: 'stretch', label: 'Stretch', icon: StretchHorizontal },
];

const WIDTHS = [
  { value: 'full', label: 'Full' },
  { value: 'half', label: 'Half' },
  { value: 'third', label: 'Third' },
];

const HTML_TAGS = [
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
  { value: 'p', label: 'Paragraph' },
];

const TEXT_LIKE = ['text', 'email', 'phone', 'url', 'textarea', 'compoundEmail'];
export const OPTION_TYPES = ['radio', 'checkbox', 'dropdown'];
const NO_PLACEHOLDER = ['heading', 'divider', 'rating', 'radio', 'checkbox', 'date', 'file', 'photo'];
const NO_REQUIRED = ['heading', 'paragraph', 'divider'];

// ---------- Content traits per type (first text decl is the hero: "Your Text") ----------
function contentTraits(type) {
  if (type === 'divider') {
    return [{ path: ['payload', 'label'], type: 'text', label: 'Admin name (Layers)' }];
  }
  if (type === 'heading') {
    return [
      { path: ['payload', 'label'], type: 'text', label: 'Heading text', hero: true },
      { path: ['payload', 'htmlTag'], type: 'select', label: 'HTML tag', options: HTML_TAGS },
    ];
  }
  const traits = [{ path: ['payload', 'label'], type: 'text', label: 'Label', hero: true }];
  if (!NO_PLACEHOLDER.includes(type)) {
    traits.push({ path: ['payload', 'placeholder'], type: 'text', label: type === 'paragraph' ? 'Paragraph text' : 'Placeholder' });
  }
  if (type === 'paragraph') {
    traits.push({ path: ['payload', 'placeholder'], type: 'textarea', label: 'Paragraph text' });
  }
  traits.push({ path: ['payload', 'helpText'], type: 'text', label: 'Help text' });
  if (!NO_REQUIRED.includes(type)) {
    traits.push({ path: ['payload', 'isRequired'], type: 'checkbox', label: 'Required' });
  }
  if (OPTION_TYPES.includes(type)) {
    traits.push({ path: ['payload', 'options'], type: 'options', label: 'Options' });
  }
  return traits;
}

// ---------- Style properties per type (absence = not stylable) ----------
// group -> section header in the Appearance panel; row -> side-by-side duo.
function styleProps(type) {
  if (type === 'divider') return [];
  const props = [];
  if (type === 'heading' || type === 'paragraph') {
    props.push({ path: ['payload', 'fontFamily'], type: 'fontPair', label: 'Fonts', group: 'Typography' });
  }
  props.push(
    { path: ['style', 'labelPosition'], type: 'iconRadio', label: 'Label position', options: LABEL_POSITIONS, group: 'Layout' },
    { path: ['style', 'width'], type: 'select', label: 'Width', options: WIDTHS, group: 'Layout' },
  );
  if (['heading', 'paragraph', 'text', 'textarea'].includes(type)) {
    props.push({ path: ['style', 'textAlign'], type: 'iconRadio', label: 'Text Align', options: TEXT_ALIGNS, variant: 'plain', group: 'Typography' });
  }
  if (['heading', 'paragraph'].includes(type)) {
    props.push(
      { path: ['style', 'fontSize'], type: 'measure', label: 'Size', units: ['px', 'em', '%'], group: 'Typography', row: 'dims' },
      { path: ['style', 'letterSpacing'], type: 'measure', label: 'Kerning', units: ['%', 'px', 'em'], group: 'Typography', row: 'dims' },
    );
  } else {
    props.push({ path: ['style', 'fontSize'], type: 'text', label: 'Font size', placeholder: 'e.g. 14px', group: 'Typography' });
  }
  props.push(
    { path: ['style', 'color'], type: 'color', label: 'Text Color', group: 'Typography', row: 'colors' },
    { path: ['style', 'background'], type: 'color', label: 'Background', group: 'Typography', row: 'colors' },
  );
  if (!['heading', 'paragraph', 'divider'].includes(type)) {
    props.push({ path: ['style', 'align'], type: 'iconRadio', label: 'Align', options: BLOCK_ALIGNS, group: 'Typography' });
  }
  return props;
}

// ---------- Validation rules per type ----------
function validationProps(type) {
  if (TEXT_LIKE.includes(type)) {
    return [
      { path: ['payload', 'minLength'], type: 'number', label: 'Min length', min: 0 },
      { path: ['payload', 'maxLength'], type: 'number', label: 'Max length', min: 0 },
      { path: ['payload', 'pattern'], type: 'text', label: 'Pattern (regex)', placeholder: 'e.g. ^[A-Z]+$' },
    ];
  }
  if (type === 'rating') {
    return [{ path: ['payload', 'maxRating'], type: 'slider', label: 'Max rating', min: 1, max: 10 }];
  }
  return [];
}

export function sectorsFor(type) {
  return {
    content: contentTraits(type),
    style: styleProps(type),
    validation: validationProps(type),
  };
}
