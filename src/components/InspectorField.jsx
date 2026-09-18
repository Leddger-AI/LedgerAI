import { Plus, Trash2 } from 'lucide-react';
import { FONT_FAMILIES, FONT_WEIGHTS } from '../utils/fieldSectors';

function get(block, [section, key]) {
  return block?.[section]?.[key];
}

function parseMeasure(str) {
  const m = /^([\d.]+)\s*(px|em|rem|%|vh|vw)?$/i.exec(String(str || '').trim());
  if (!m) return { num: '', unit: 'px' };
  return { num: m[1], unit: (m[2] || 'px').toLowerCase() };
}

// Renders one sector property declaration. update(section, key, value)
// writes back to the block; undefined values clear the key.
export default function InspectorField({ block, decl, update }) {
  const [section, key] = decl.path;
  const value = get(block, decl.path);
  const set = (v) => update(section, key, v);

  const row = (control) => (
    <label className="inspector-row">
      <span className="inspector-label">{decl.label}</span>
      {control}
    </label>
  );

  switch (decl.type) {
    case 'textarea':
      return row(
        <textarea className="form-textarea" style={{ minHeight: '64px' }} value={value || ''} onChange={(e) => set(e.target.value || undefined)} />
      );
    case 'checkbox':
      return row(
        <input type="checkbox" checked={!!value} onChange={(e) => set(e.target.checked)} />
      );
    case 'select':
      return row(
        <select className="form-input" style={{ width: '100%' }} value={value ?? ''} onChange={(e) => set(e.target.value || undefined)}>
          <option value="">—</option>
          {(decl.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    case 'color': {
      const hex = typeof value === 'string' ? value : '';
      return (
        <div className="inspector-row">
          <span className="inspector-label">{decl.label}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              className="form-input" type="text" value={hex} placeholder="#000000"
              onChange={(e) => set(e.target.value || undefined)} style={{ flex: 1 }}
            />
            <input
              type="color" aria-label={`${decl.label} swatch`}
              value={/^#[0-9a-f]{6}$/i.test(hex) ? hex : '#000000'}
              onChange={(e) => set(e.target.value)}
              style={{ width: '38px', height: '38px', padding: '2px', border: '1px solid #E5E5E5', borderRadius: '50%', background: '#fff', cursor: 'pointer', flexShrink: 0 }}
            />
          </div>
        </div>
      );
    }
    case 'slider':
      return (
        <div className="inspector-row">
          <span className="inspector-label">{decl.label} — {value ?? decl.min ?? 0}</span>
          <input
            type="range" min={decl.min ?? 0} max={decl.max ?? 100}
            value={value ?? decl.min ?? 0}
            onChange={(e) => set(Number(e.target.value))}
          />
        </div>
      );
    case 'number':
      return row(
        <input
          className="form-input" type="number" min={decl.min} max={decl.max}
          value={value ?? ''} onChange={(e) => set(e.target.value === '' ? undefined : Number(e.target.value))}
        />
      );
    case 'measure': {
      const { num, unit } = parseMeasure(value);
      const commit = (n, u) => set(n === '' ? undefined : `${n}${u}`);
      return (
        <div className="inspector-row">
          <span className="inspector-label">{decl.label}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              className="form-input" type="number" min={0} value={num}
              onChange={(e) => commit(e.target.value, unit)} style={{ flex: 1 }}
            />
            <select
              className="form-input" value={unit} onChange={(e) => commit(num, e.target.value)}
              style={{ width: '84px' }}
            >
              {(decl.units || ['px']).map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
      );
    }
    case 'iconRadio': {
      const opts = decl.options || [];
      const current = value || opts[0]?.value;
      const plain = decl.variant === 'plain';
      return (
        <div className="inspector-row">
          <span className="inspector-label">{decl.label}</span>
          <div style={{ display: 'flex', gap: plain ? '2px' : '6px' }}>
            {opts.map((o) => (
              <button
                key={o.value} type="button" title={o.label}
                className={`icon-radio-btn${plain ? ' plain' : ''}${current === o.value ? ' active' : ''}`}
                onClick={() => set(o.value)}
              >
                <o.icon size={15} />
              </button>
            ))}
          </div>
        </div>
      );
    }
    case 'fontPair': {
      // Single dropdown, "Family – Weight" pairs like the design shot.
      const cur = `${block?.payload?.fontFamily || ''}||${block?.payload?.fontWeight || ''}`;
      const combos = [];
      for (const f of FONT_FAMILIES) {
        for (const w of FONT_WEIGHTS) combos.push({ value: `${f}||${w.value}`, label: `${f} – ${w.label}` });
      }
      return (
        <div className="inspector-row">
          <span className="inspector-label">{decl.label}</span>
          <select
            className="form-input mw-select" style={{ width: '100%', fontWeight: 700 }}
            value={cur}
            onChange={(e) => {
              const [fam, wt] = e.target.value.split('||');
              update('payload', 'fontFamily', fam || undefined);
              update('payload', 'fontWeight', wt || undefined);
            }}
          >
            <option value="||">Default</option>
            {combos.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      );
    }
    case 'options': {
      const options = Array.isArray(block?.payload?.options) ? block.payload.options : [];
      return (
        <div className="inspector-options">
          <span className="inspector-label">{decl.label}</span>
          {options.map((o, i) => (
            <div key={i} className="inspector-option-row">
              <input
                className="form-input" type="text" value={o.label}
                onChange={(e) => {
                  const next = [...options];
                  next[i] = { ...next[i], label: e.target.value };
                  update('payload', 'options', next);
                }}
                placeholder="Label"
              />
              <button type="button" className="canvas-block-delete" title="Remove" onClick={() => update('payload', 'options', options.filter((_, j) => j !== i))}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button
            type="button" className="form-btn"
            onClick={() => update('payload', 'options', [...options, { label: `Option ${options.length + 1}`, value: `option-${options.length + 1}` }])}
          >
            <Plus size={13} /> Add option
          </button>
        </div>
      );
    }
    case 'text':
    default:
      return row(
        <input
          className="form-input" type="text" value={value || ''} placeholder={decl.placeholder || ''}
          onChange={(e) => set(e.target.value || undefined)}
        />
      );
  }
}
