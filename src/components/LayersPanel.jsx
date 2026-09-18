import { Eye, EyeOff, Trash2, Layers } from 'lucide-react';

// Layers list: the canvas order as a navigable outline (GrapesJS Layers
// module pattern). Click to select, eye to hide/show, trash to remove.
export default function LayersPanel({ blocks, selectedUuid, onSelect, onToggleHidden, onDelete }) {
  if (blocks.length === 0) return null;
  return (
    <div className="tb-category">
      <h3 className="tb-category-title"><Layers size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />Layers</h3>
      <div className="layers-list">
        {blocks.map((b, i) => {
          const hidden = !!b.style?.hidden;
          return (
            <div
              key={b.uuid}
              className={`layers-row ${selectedUuid === b.uuid ? 'selected' : ''} ${hidden ? 'is-hidden' : ''}`}
              onClick={() => onSelect(b.uuid)}
            >
              <span className="layers-index">{i + 1}</span>
              <span className="layers-name">{b.payload?.label || b.type}</span>
              <span className="canvas-block-type">{b.type}</span>
              <button
                type="button" className="canvas-block-delete" title={hidden ? 'Show' : 'Hide'}
                onClick={(e) => { e.stopPropagation(); onToggleHidden(b.uuid); }}
              >
                {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
              <button
                type="button" className="canvas-block-delete" title="Remove"
                onClick={(e) => { e.stopPropagation(); onDelete(b.uuid); }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
