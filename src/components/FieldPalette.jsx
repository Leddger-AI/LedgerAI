import {
  Type, Mail, Phone, AlignLeft, CheckSquare, Circle,
  Calendar, Upload, Globe, Star, FileText, Image, Heading1, Minus, Link2,
  ChevronDown,
} from 'lucide-react';

const ITEMS = [
  { type: 'text', label: 'Text', icon: Type, payload: { label: 'Text Input', placeholder: 'Type here\u2026' } },
  { type: 'heading', label: 'Heading', icon: Heading1, payload: { label: 'New Heading', htmlTag: 'h1' }, style: { width: 'full', fontSize: '28px' } },
  { type: 'paragraph', label: 'Paragraph', icon: FileText, payload: { label: 'Text block', placeholder: 'Write something respondents will read\u2026' } },
  { type: 'textarea', label: 'Long Text', icon: AlignLeft, payload: { label: 'Long Answer', placeholder: 'Type here\u2026' } },
  { type: 'divider', label: 'Spacer', icon: Minus, payload: { label: 'Divider' } },
  { type: 'email', label: 'Email', icon: Mail, payload: { label: 'Email', placeholder: 'name@example.com' } },
  { type: 'phone', label: 'Phone', icon: Phone, payload: { label: 'Phone', placeholder: '+1 \u2026' } },
  { type: 'url', label: 'URL', icon: Globe, payload: { label: 'Website', placeholder: 'https://\u2026' } },
  { type: 'compoundEmail', label: 'College Email', icon: Link2, payload: { label: 'College Email' } },
  { type: 'date', label: 'Date', icon: Calendar, payload: { label: 'Date' } },
  { type: 'dropdown', label: 'Dropdown', icon: ChevronDown, payload: { label: 'Choose One' } },
  { type: 'radio', label: 'Radio', icon: Circle, payload: { label: 'Pick One' } },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare, payload: { label: 'Check All That Apply' } },
  { type: 'rating', label: 'Rating', icon: Star, payload: { label: 'Rate Us', maxRating: 5 } },
  { type: 'photo', label: 'Images', icon: Image, payload: { label: 'Photo' } },
  { type: 'file', label: 'Files', icon: Upload, payload: { label: 'Upload a File' } },
];

export default function FieldPalette({ onAdd }) {
  return (
    <div className="mw-panel">
      <h3 className="mw-panel-title">Components</h3>
      <div className="mw-card-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {ITEMS.map((item) => (
          <button
            key={item.type + item.label}
            type="button"
            className="mw-card"
            onClick={() => onAdd(item.type, { payload: item.payload, style: item.style })}
            title={`Add ${item.label}`}
          >
            <item.icon size={22} strokeWidth={1.75} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
