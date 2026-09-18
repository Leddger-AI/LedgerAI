import { Camera, FileUp } from 'lucide-react';
import { groupBySection, SECTION_TITLES } from '../utils/formFields';
import { sanitizeCss, themeVars } from '../utils/formTheme';
import '../pages/TemplateBuilder.css';

// Shared live renderer: builder preview, Studio stage, and public form all
// render the SAME field list through this component. Disabled inputs =
// preview mode; pass interactive to make it fillable.
//
// Theming: pass `theme` (settings.styles shape) to control accent, fonts,
// spacing, radius, colors, and custom CSS. Custom CSS is sanitized before
// injection (tags and @imports stripped) — the server strips <script>
// blocks at save time as well.
//
// Per-field overrides honored: width (full/half/third), labelPosition
// (top/left/placeholder), required, helpText, fontSize, color, className,
// options (string[] or {label,value}[]), maxRating, placeholder.
function normalizeOptions(options) {
  if (!Array.isArray(options)) return [];
  return options.map((o, i) => (
    typeof o === 'string' ? { label: o, value: o } : { label: o.label ?? `Option ${i + 1}`, value: o.value ?? `option-${i + 1}` }
  ));
}

const WEIGHT_MAP = { regular: 400, medium: 500, semibold: 600, bold: 700 };

// Kerning input accepts "5%" (shots) or "2px"/"0.1em" — % converts to em.
function kerningToCss(ls) {
  if (typeof ls !== 'string' || !ls.trim()) return undefined;
  const m = /^([\d.]+)\s*(%|px|em|rem)?$/i.exec(ls.trim());
  if (!m) return undefined;
  if ((m[2] || 'px').toLowerCase() === '%') return `${Number(m[1]) / 100}em`;
  return `${m[1]}${(m[2] || 'px').toLowerCase()}`;
}

function typeStyle(f) {
  const s = {};
  if (f.fontFamily) s.fontFamily = f.fontFamily;
  if (f.fontWeight && WEIGHT_MAP[f.fontWeight]) s.fontWeight = WEIGHT_MAP[f.fontWeight];
  if (f.fontSize) s.fontSize = f.fontSize;
  if (f.color) s.color = f.color;
  const ls = kerningToCss(f.letterSpacing);
  if (ls) s.letterSpacing = ls;
  return s;
}

export default function FormRenderer({
  title,
  subtitle,
  fields,
  emailFormat,
  interactive = false,
  emptyHint = 'Toggle fields on the left to build your template.',
  theme = {},
}) {
  const groups = groupBySection(fields || []);
  const dis = interactive ? {} : { disabled: true };
  const css = sanitizeCss(theme.customCSS);

  const labelNode = (f, forInput = true) => {
    if ((f.labelPosition || 'top') === 'placeholder') return null;
    return (
      <label className="form-label" style={typeStyle(f)}>
        {f.label}
        {f.required && forInput && <span className="form-required"> *</span>}
      </label>
    );
  };

  const helpNode = (f) => (
    f.helpText ? <p className="form-help">{f.helpText}</p> : null
  );

  // Block-level wrapper style: background, text align, grid alignment.
  const wrapStyle = (f) => {
    const s = {};
    if (f.background) s.background = f.background;
    if (f.textAlign) s.textAlign = f.textAlign;
    if (f.align === 'left') s.justifySelf = 'start';
    else if (f.align === 'center') s.justifySelf = 'center';
    else if (f.align === 'right') s.justifySelf = 'end';
    else if (f.align === 'stretch') s.justifySelf = 'stretch';
    return s;
  };

  const widthClass = (f) => {
    const w = f.width || 'full';
    if (w === 'third') return 'third';
    if (w === 'half') return '';
    return 'full';
  };

  const fieldClass = (f, extra = '') => (
    `form-field ${widthClass(f)}${(f.labelPosition === 'left') ? ' label-left' : ''}${f.className ? ` ${f.className}` : ''}${extra ? ` ${extra}` : ''}`
  );

  const placeholderFor = (f) => (
    (f.labelPosition === 'placeholder' ? `${f.label || ''}${f.required ? ' *' : ''}${f.placeholder ? ` — ${f.placeholder}` : ''}` : (f.placeholder || ''))
  );

  const renderCompoundEmail = (formatStr, placeholder = 'john.doe') => {
    if (!formatStr) {
      return <input type="email" className="form-input" placeholder={`${placeholder}@college.edu`} {...dis} />;
    }
    const parts = formatStr.split(/(\[.*?\])/g).filter(Boolean);
    return (
      <div className="compound-input-group">
        <input type="text" className="compound-input-field" placeholder={placeholder} style={{ flex: 2 }} {...dis} />
        {parts.map((part, index) => {
          if (part.startsWith('[') && part.endsWith(']')) {
            const fieldName = part.slice(1, -1);
            return (
              <input
                key={index}
                type="text"
                className="compound-input-field"
                placeholder={fieldName}
                style={{ flex: 1, minWidth: '60px', borderLeft: '1px solid #E5E5E5', borderRight: '1px solid #E5E5E5' }}
                {...dis}
              />
            );
          }
          return (
            <div key={index} className="compound-input-addon">
              {part}
            </div>
          );
        })}
      </div>
    );
  };

  const renderField = (f) => {
    if (f.hidden) return null;
    switch (f.type) {
      case 'heading': {
        const Tag = ['h1', 'h2', 'h3', 'p'].includes(f.htmlTag) ? f.htmlTag : 'h3';
        return <Tag key={f.id} className="canvas-heading" style={{ ...typeStyle(f), ...(f.textAlign ? { textAlign: f.textAlign } : {}) }}>{f.label}</Tag>;
      }
      case 'divider':
        return <hr key={f.id} className="canvas-divider" />;
      case 'photo':
        return (
          <div className={fieldClass(f)} style={{ marginBottom: '24px', ...wrapStyle(f) }} key={f.id}>
            <div className="photo-box">
              <Camera size={24} />
              <span style={{ fontSize: '10px', marginTop: '4px' }}>Upload Photo</span>
            </div>
            {helpNode(f)}
          </div>
        );
      case 'file':
        return (
          <div className={fieldClass(f)} style={wrapStyle(f)} key={f.id}>
            {labelNode(f)}
            <div className="upload-box">
              <FileUp size={24} />
              <div>Drag and drop your file here, or click to browse</div>
            </div>
            {helpNode(f)}
          </div>
        );
      case 'textarea':
        return (
          <div className={fieldClass(f)} style={wrapStyle(f)} key={f.id}>
            {labelNode(f)}
            <textarea className="form-textarea" placeholder={placeholderFor(f)} style={f.textAlign ? { textAlign: f.textAlign } : {}} {...dis} />
            {helpNode(f)}
          </div>
        );
      case 'rating': {
        const count = Math.min(10, Math.max(1, f.maxRating || 5));
        return (
          <div className={fieldClass(f)} style={wrapStyle(f)} key={f.id}>
            {labelNode(f)}
            <div className="form-rating-container">
              <div className="form-rating-scale">
                <div className="form-rating-line" />
                {Array.from({ length: count }, (_, i) => (
                  <span key={i + 1} className="form-rating-dot">{i + 1}</span>
                ))}
              </div>
            </div>
            {helpNode(f)}
          </div>
        );
      }
      case 'compoundEmail':
        return (
          <div className={fieldClass(f)} style={wrapStyle(f)} key={f.id}>
            {labelNode(f)}
            {renderCompoundEmail(emailFormat)}
            {helpNode(f)}
          </div>
        );
      case 'radio': {
        const opts = normalizeOptions(f.options);
        const list = opts.length > 0 ? opts : [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }];
        return (
          <div className={fieldClass(f)} style={wrapStyle(f)} key={f.id}>
            {labelNode(f)}
            {list.map((o) => (
              <label key={o.value} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px' }}>
                <input type="radio" name={f.id} {...dis} /> {o.label}
              </label>
            ))}
            {helpNode(f)}
          </div>
        );
      }
      case 'checkbox':
        return (
          <div className={fieldClass(f)} style={wrapStyle(f)} key={f.id}>
            <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px' }}>
              <input type="checkbox" {...dis} /> {f.label}
              {f.required && <span className="form-required"> *</span>}
            </label>
            {helpNode(f)}
          </div>
        );
      case 'dropdown': {
        const opts = normalizeOptions(f.options);
        return (
          <div className={fieldClass(f)} style={wrapStyle(f)} key={f.id}>
            {labelNode(f)}
            <select className="form-input" {...dis}>
              {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {helpNode(f)}
          </div>
        );
      }
      case 'date':
        return (
          <div className={fieldClass(f)} style={wrapStyle(f)} key={f.id}>
            {labelNode(f)}
            <input type="date" className="form-input" {...dis} />
            {helpNode(f)}
          </div>
        );
      case 'paragraph':
        return <p key={f.id} style={{ fontSize: '13px', color: 'var(--text-secondary)', ...typeStyle(f), ...(f.textAlign ? { textAlign: f.textAlign } : {}) }}>{f.placeholder || f.label}</p>;
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
      default:
        return (
          <div className={fieldClass(f)} style={wrapStyle(f)} key={f.id}>
            {labelNode(f)}
            <input
              type={f.type === 'email' ? 'email' : f.type === 'url' ? 'url' : f.type === 'phone' ? 'tel' : 'text'}
              className="form-input"
              placeholder={placeholderFor(f)}
              style={{ ...(f.fontFamily ? { fontFamily: f.fontFamily } : {}), ...(f.textAlign ? { textAlign: f.textAlign } : {}) }}
              {...dis}
            />
            {helpNode(f)}
          </div>
        );
    }
  };

  return (
    <div className="form-paper" style={themeVars(theme)}>
      {css && <style>{css}</style>}
      <div className="form-paper-header">
        <h1 className="form-paper-title">{title || 'Untitled Form'}</h1>
        {subtitle && <p className="form-paper-subtitle">{subtitle}</p>}
      </div>

      {groups.length === 0 && (
        <div className="form-empty-state">
          <p>{emptyHint}</p>
        </div>
      )}

      {groups.map(([section, items]) => {
        const shown = items.filter((f) => !f.hidden);
        if (shown.length === 0) return null;
        return (
          <div className="form-section" key={section}>
            <h3 className="form-section-title">{SECTION_TITLES[section] || section}</h3>
            <div className="form-grid-2">
              {shown.map(renderField)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
