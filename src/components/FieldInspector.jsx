import { useState } from 'react';
import { X } from 'lucide-react';
import { sectorsFor } from '../utils/fieldSectors';
import InspectorField from './InspectorField';

const TABS = ['Content', 'Style', 'Validation', 'Advanced'];

// Declaration-driven inspector: each block type declares its traits,
// styles, and rules (see fieldSectors.js); this component only renders
// them with typed inputs. Empty groups auto-hide (GrapesJS pattern).
export default function FieldInspector({ block, onChange, onClose }) {
  const [tab, setTab] = useState('Content');
  if (!block) return null;

  const update = (section, key, value) => {
    onChange({ ...block, [section]: { ...block[section], [key]: value } });
  };

  const sectors = sectorsFor(block.type);
  const raw = tab === 'Content' ? sectors.content : tab === 'Style' ? sectors.style : sectors.validation;
  // Hero decl renders as "Your Text" (design shot).
  const list = raw.map((d) => (d.hero && tab === 'Content' ? { ...d, label: 'Your Text' } : d));

  // Style tab: group by decl.group with section headers; same-row decls sit side-by-side.
  const renderStyle = () => {
    const out = [];
    let lastGroup = null;
    let i = 0;
    while (i < list.length) {
      const decl = list[i];
      if (decl.group !== lastGroup) {
        lastGroup = decl.group;
        if (lastGroup) out.push(<h4 key={`g-${lastGroup}`} className="inspector-group-title">{lastGroup}</h4>);
      }
      if (decl.row && list[i + 1]?.row === decl.row) {
        out.push(
          <div key={`duo-${decl.path.join('.')}`} className="inspector-duo">
            <InspectorField block={block} decl={decl} update={update} />
            <InspectorField block={block} decl={list[i + 1]} update={update} />
          </div>
        );
        i += 2;
      } else {
        out.push(<InspectorField key={decl.path.join('.')} block={block} decl={decl} update={update} />);
        i += 1;
      }
    }
    return out;
  };

  return (
    <div className="tb-inspector">
      <div className="tb-inspector-header appearance-head">
        <div>
          <h3 className="tb-inspector-title">Appearance</h3>
          <span className="canvas-block-type">{block.type}</span>
        </div>
        <button type="button" className="canvas-block-delete" onClick={onClose} title="Close">
          <X size={15} />
        </button>
      </div>

      <div className="inspector-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`inspector-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="inspector-body">
        {(tab === 'Content' || tab === 'Validation') && (
          <>
            {list.map((decl) => (
              <InspectorField key={decl.path.join('.')} block={block} decl={decl} update={update} />
            ))}
            {list.length === 0 && (
              <p className="inspector-hint">
                {tab === 'Validation'
                  ? 'No extra validation rules for this field type — Required (Content tab) always applies.'
                  : 'Nothing to configure here for this field type.'}
              </p>
            )}
          </>
        )}

        {tab === 'Style' && (
          <>{renderStyle()}{list.length === 0 && <p className="inspector-hint">Nothing to configure here for this field type.</p>}</>
        )}

        {tab === 'Advanced' && (
          <>
            <label className="inspector-row">
              <span className="inspector-label">Section key</span>
              <input
                className="form-input" type="text" value={block.groupType || 'general'}
                onChange={(e) => onChange({ ...block, groupType: e.target.value || 'general' })}
                placeholder="general"
              />
            </label>
            <label className="inspector-row">
              <span className="inspector-label">CSS class</span>
              <input
                className="form-input" type="text" value={block.style?.className || ''}
                onChange={(e) => update('style', 'className', e.target.value || undefined)}
                placeholder="e.g. mt-4 highlight"
              />
            </label>
            <label className="inspector-row">
              <span className="inspector-label">Hide in form</span>
              <input
                type="checkbox" checked={!!block.style?.hidden}
                onChange={(e) => update('style', 'hidden', e.target.checked || undefined)}
              />
            </label>
            <p className="inspector-hint">Block ID <code>{block.uuid}</code> — stable across saves, used for drag order and submissions.</p>
          </>
        )}
      </div>
    </div>
  );
}
