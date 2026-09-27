import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Copy } from 'lucide-react';

function MiniPreview({ block, emailFormat }) {
  const { payload } = block;
  const label = (
    <span className="form-label">
      {payload.label}
      {payload.isRequired && <span style={{ color: '#DC2626' }}> *</span>}
    </span>
  );
  switch (block.type) {
    case 'heading': {
      const Tag = ['h1', 'h2', 'h3', 'p'].includes(payload.htmlTag) ? payload.htmlTag : 'h3';
      return <Tag className="canvas-heading">{payload.label}</Tag>;
    }
    case 'paragraph':
      return <p className="canvas-paragraph">{payload.placeholder || payload.label}</p>;
    case 'divider':
      return <hr className="canvas-divider" />;
    case 'textarea':
      return (
        <div className="form-field full">
          {label}
          <textarea className="form-textarea" rows={2} placeholder={payload.placeholder} disabled />
        </div>
      );
    case 'rating':
      return (
        <div className="form-field full">
          {label}
          <div style={{ display: 'flex', gap: '6px' }}>
            {Array.from({ length: payload.maxRating || 5 }, (_, i) => (
              <span key={i} className="form-rating-dot">{i + 1}</span>
            ))}
          </div>
        </div>
      );
    case 'radio':
    case 'checkbox':
      return (
        <div className="form-field full">
          {label}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(payload.options || []).map((o) => (
              <span key={o.value} className="canvas-opt-chip">{o.label}</span>
            ))}
          </div>
        </div>
      );
    case 'dropdown':
      return (
        <div className="form-field full">
          {label}
          <select className="form-input" disabled>
            {(payload.options || []).map((o) => (
              <option key={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      );
    case 'compoundEmail':
      return (
        <div className="form-field full">
          {label}
          <div className="compound-input-group">
            <input type="text" className="compound-input-field" placeholder="name" style={{ flex: 2 }} disabled />
            <div className="compound-input-addon">{emailFormat || '@college.edu'}</div>
          </div>
        </div>
      );
    default:
      return (
        <div className="form-field full">
          {label}
          <input
            type={block.type === 'date' ? 'date' : 'text'}
            className="form-input"
            placeholder={payload.placeholder}
            disabled
          />
        </div>
      );
  }
}

export default function SortableBlock({ block, selected, onSelect, onDelete, onDuplicate, emailFormat }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: block.uuid });
  const hidden = !!block.style?.hidden;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : hidden ? 0.55 : 1 }}
      className={`canvas-block ${selected ? 'selected' : ''} ${hidden ? 'is-hidden' : ''}`}
      onClick={() => onSelect(block.uuid)}
    >
      <div className="canvas-block-handle" {...attributes} {...listeners} title="Drag to reorder">
        <GripVertical size={14} />
      </div>
      <div className="canvas-block-body">
        <MiniPreview block={block} emailFormat={emailFormat} />
      </div>
      <div className="canvas-block-actions">
        <span className="canvas-block-type">{hidden ? 'hidden' : block.type}</span>
        {onDuplicate && (
          <button
            type="button"
            className="canvas-block-delete"
            title="Duplicate field"
            onClick={(e) => { e.stopPropagation(); onDuplicate(block.uuid); }}
          >
            <Copy size={13} />
          </button>
        )}
        <button
          type="button"
          className="canvas-block-delete"
          title="Remove field"
          onClick={(e) => { e.stopPropagation(); onDelete(block.uuid); }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
