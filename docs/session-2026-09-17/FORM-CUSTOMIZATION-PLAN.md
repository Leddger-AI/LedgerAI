# Form Customization Implementation Plan

## Executive Summary

This plan addresses two critical needs:
1. **UUID-based draft saving** to prevent data mismatches (current system creates duplicates on every save)
2. **Full form customization** with drag-and-drop, field inspector, and theme controls

**Key Finding**: The current system has NO update endpoint for drafts—every "Save" creates a new row. This must be fixed first.

---

## Phase 1: Fix Draft Saving (UUID-Based Updates)

### 1.1 Add PATCH Endpoint for Draft Updates

**File**: `server/index.js`

Add new endpoint after line 310 (after GET /api/drafts):

```javascript
// PATCH /api/drafts/:draftId - Update existing draft
app.patch('/api/drafts/:draftId', requireAuth, async (req, res) => {
  try {
    const { draftId } = req.params;
    const { title, config, templateType } = req.body;
    
    // Validate UUID format
    if (!draftId || draftId.length !== 36) {
      return res.status(400).json({ error: 'Invalid draft ID format' });
    }
    
    // Update Supabase (only if status is 'draft')
    const { data: draft, error: fetchError } = await supabase
      .from('form_drafts')
      .select('status')
      .eq('draft_id', draftId)
      .single();
    
    if (fetchError || !draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }
    
    if (draft.status !== 'draft') {
      return res.status(400).json({ error: 'Can only edit drafts in draft status' });
    }
    
    // Build update object
    const updateData = { updated_at: new Date().toISOString() };
    if (title) updateData.title = title;
    if (config) updateData.config = config;
    if (templateType) updateData.template_type = templateType;
    
    // Update Supabase
    const { error: updateError } = await supabase
      .from('form_drafts')
      .update(updateData)
      .eq('draft_id', draftId);
    
    if (updateError) {
      console.error('Supabase update error:', updateError);
      return res.status(500).json({ error: 'Failed to update draft' });
    }
    
    // Sync to MongoDB
    await TemplateData.findOneAndUpdate(
      { draftId },
      { 
        config, 
        title, 
        templateType,
        updatedAt: new Date() 
      },
      { upsert: true }
    );
    
    res.json({ success: true, draftId });
  } catch (err) {
    console.error('Error updating draft:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### 1.2 Add MongoDB Sync to Schedule Endpoint

**File**: `server/index.js` (lines 438-494)

Add MongoDB sync after Supabase update in `PUT /api/drafts/:draftId/schedule`:

```javascript
// After line 478 (after Supabase update)
await TemplateData.findOneAndUpdate(
  { draftId: req.params.draftId },
  { 
    status: 'scheduled',
    expiresAt: expiryDate,
    updatedAt: new Date()
  },
  { upsert: true }
);
```

### 1.3 Add MongoDB Sync to Auto-Activation in Scheduler

**File**: `server/scheduler.js` (lines 139-156)

Add MongoDB sync after Supabase update in `'activate form draft'` job:

```javascript
// After line 149 (after Supabase update)
await TemplateData.findOneAndUpdate(
  { draftId },
  { 
    status: 'active',
    expiresAt: new Date(expiresAt),
    updatedAt: new Date()
  },
  { upsert: true }
);
```

### 1.4 Update Frontend Builders to Track Draft ID

**Files**: 
- `src/pages/StudentTemplateBuilder.jsx`
- `src/pages/EmployeeTemplateBuilder.jsx`
- `src/pages/TeamTemplateBuilder.jsx`

Add state to track existing draft ID:

```javascript
const [existingDraftId, setExistingDraftId] = useState(null);
```

Update `handleSaveDraft()` to use PATCH when `existingDraftId` exists:

```javascript
const handleSaveDraft = async () => {
  setIsSaving(true);
  try {
    const token = await getAuthToken();
    if (!token) return;
    
    const payload = {
      title: draftName || `${templateName} ${new Date().toLocaleDateString()}`,
      config: { toggles, emailFormat },
      templateType: templateName.toLowerCase().split(' ')[0],
    };
    
    const url = existingDraftId 
      ? `${API_BASE_URL}/api/drafts/${existingDraftId}`
      : `${API_BASE_URL}/api/drafts`;
    
    const method = existingDraftId ? 'PATCH' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    
    if (res.ok) {
      const data = await res.json();
      setExistingDraftId(data.draftId); // Track for future saves
      setMsg({ type: 'success', text: existingDraftId ? 'Draft updated.' : 'Draft saved.' });
    }
  } catch (err) {
    setMsg({ type: 'error', text: 'Save failed.' });
  } finally {
    setIsSaving(false);
  }
};
```

Load existing draft when builder opens (add to useEffect):

```javascript
useEffect(() => {
  // If coming from DraftsView with a selected draft, load it
  if (location.state?.draft) {
    const draft = location.state.draft;
    setExistingDraftId(draft.draftId);
    setDraftName(draft.title);
    setToggles(draft.config?.toggles || {});
    setEmailFormat(draft.config?.emailFormat || 'plain');
  }
}, [location.state]);
```

### 1.5 Remove Legacy FormDraft Model

**File**: `server/models/FormDraft.js` - DELETE this file (unused)

---

## Phase 2: Enhanced Config Structure

### 2.1 Extend Config Schema

**File**: `src/utils/formFields.js`

Update `fieldsFromToggles()` to support new config structure:

```javascript
export function fieldsFromToggles(templateType, config = {}) {
  // If config.fields exists (new format), use it directly
  if (config.fields && Array.isArray(config.fields)) {
    return config.fields.map(f => ({
      ...f,
      section: f.section || 'General'
    }));
  }
  
  // Legacy: build from toggles
  const { toggles = {}, theme = {} } = config;
  // ... existing toggle-based logic ...
}
```

### 2.2 Add Theme Defaults

**File**: `src/components/FormRenderer.jsx`

Read theme from config and apply:

```javascript
export default function FormRenderer({ 
  title, 
  subtitle, 
  fields, 
  emailFormat, 
  emptyHint,
  theme = {} // New prop
}) {
  const {
    accent = '#0E9384',
    font = 'Inter',
    radius = 8,
    spacing = 16
  } = theme;
  
  const themeStyle = {
    '--accent': accent,
    '--font': font,
    '--radius': `${radius}px`,
    '--spacing': `${spacing}px`,
  };
  
  return (
    <div className="form-paper" style={themeStyle}>
      {/* ... existing JSX ... */}
    </div>
  );
}
```

---

## Phase 3: Form Customization Features

### 3.1 Install Dependencies

```bash
npm i @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### 3.2 Create Field Inspector Component

**New File**: `src/components/FieldInspector.jsx`

```javascript
import { useState } from 'react';
import { X, GripVertical } from 'lucide-react';

export default function FieldInspector({ field, onUpdate, onClose }) {
  const [local, setLocal] = useState({ ...field });
  
  const handleChange = (key, value) => {
    const updated = { ...local, [key]: value };
    setLocal(updated);
    onUpdate(updated);
  };
  
  return (
    <div className="field-inspector">
      <div className="inspector-header">
        <h3>Edit Field</h3>
        <button onClick={onClose}><X size={16} /></button>
      </div>
      
      <div className="inspector-body">
        <label>Label</label>
        <input
          type="text"
          value={local.label}
          onChange={(e) => handleChange('label', e.target.value)}
        />
        
        <label>Placeholder</label>
        <input
          type="text"
          value={local.placeholder || ''}
          onChange={(e) => handleChange('placeholder', e.target.value)}
        />
        
        <label>Width</label>
        <select
          value={local.width || 'full'}
          onChange={(e) => handleChange('width', e.target.value)}
        >
          <option value="full">Full width</option>
          <option value="half">Half width</option>
        </select>
        
        <label>Required</label>
        <input
          type="checkbox"
          checked={local.required || false}
          onChange={(e) => handleChange('required', e.target.checked)}
        />
        
        <label>CSS Class</label>
        <input
          type="text"
          value={local.cssClass || ''}
          onChange={(e) => handleChange('cssClass', e.target.value)}
          placeholder="e.g. mt-4 text-sm"
        />
      </div>
    </div>
  );
}
```

### 3.3 Add Drag-and-Drop to Builder Canvas

**File**: `src/pages/StudentTemplateBuilder.jsx` (and other builders)

Replace static field list with sortable container:

```javascript
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableField({ field, isSelected, onSelect }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: field.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sortable-field ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(field)}
    >
      <div className="drag-handle" {...attributes} {...listeners}>
        <GripVertical size={16} />
      </div>
      <div className="field-preview">
        <label>{field.label}</label>
        <input type="text" placeholder={field.placeholder} disabled />
      </div>
    </div>
  );
}

// In main component:
const [fields, setFields] = useState(initialFields);
const [selectedField, setSelectedField] = useState(null);

const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);

const handleDragEnd = (event) => {
  const { active, over } = event;
  
  if (active.id !== over.id) {
    setFields((items) => {
      const oldIndex = items.findIndex(i => i.id === active.id);
      const newIndex = items.findIndex(i => i.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  }
};

return (
  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
    <SortableContext items={fields.map(f => f.id)}>
      {fields.map(field => (
        <SortableField
          key={field.id}
          field={field}
          isSelected={selectedField?.id === field.id}
          onSelect={setSelectedField}
        />
      ))}
    </SortableContext>
    
    {selectedField && (
      <FieldInspector
        field={selectedField}
        onUpdate={(updated) => {
          setFields(fields.map(f => f.id === updated.id ? updated : f));
          setSelectedField(updated);
        }}
        onClose={() => setSelectedField(null)}
      />
    )}
  </DndContext>
);
```

### 3.4 Add Theme Panel to Preview Studio

**File**: `src/pages/PreviewStudio.jsx`

Add theme controls to right rail:

```javascript
const [theme, setTheme] = useState({
  accent: '#0E9384',
  font: 'Inter',
  radius: 8,
  spacing: 16,
});

// In right rail JSX:
<div className="tb-category">
  <h3 className="tb-category-title">Theme</h3>
  
  <label>Accent Color</label>
  <div style={{ display: 'flex', gap: '8px' }}>
    {['#0E9384', '#E4573D', '#2563EB', '#7C3AED'].map(c => (
      <button
        key={c}
        onClick={() => setTheme({ ...theme, accent: c })}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: c,
          border: theme.accent === c ? '3px solid #141414' : '1px solid #E5E5E5',
          cursor: 'pointer',
        }}
      />
    ))}
  </div>
  
  <label>Font Family</label>
  <select
    value={theme.font}
    onChange={(e) => setTheme({ ...theme, font: e.target.value })}
  >
    <option value="Inter">Inter</option>
    <option value="Roboto">Roboto</option>
    <option value="Open Sans">Open Sans</option>
    <option value="Lato">Lato</option>
  </select>
  
  <label>Border Radius</label>
  <input
    type="range"
    min="0"
    max="24"
    value={theme.radius}
    onChange={(e) => setTheme({ ...theme, radius: parseInt(e.target.value) })}
  />
  
  <label>Spacing</label>
  <input
    type="range"
    min="8"
    max="32"
    value={theme.spacing}
    onChange={(e) => setTheme({ ...theme, spacing: parseInt(e.target.value) })}
  />
</div>
```

Persist theme with draft:

```javascript
const doAction = async (kind) => {
  // ... existing logic ...
  
  // Add theme to config
  const config = { ...draft.config, theme };
  
  await fetch(`${API_BASE_URL}/api/drafts/${draftId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ config }),
  });
};
```

---

## Phase 4: Testing Strategy

### 4.1 Backend Tests

**File**: `server/tests/api.test.js`

Add tests for new PATCH endpoint:

```javascript
describe('PATCH /api/drafts/:draftId', () => {
  it('updates draft config', async () => {
    const draftId = await createTestDraft();
    
    const res = await request(app)
      .patch(`/api/drafts/${draftId}`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({ config: { fields: [...], theme: {...} } });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    
    // Verify update
    const getRes = await request(app)
      .get('/api/drafts')
      .set('Authorization', `Bearer ${testToken}`);
    
    const draft = getRes.body.drafts.find(d => d.draftId === draftId);
    expect(draft.config.fields).toBeDefined();
    expect(draft.config.theme).toBeDefined();
  });
  
  it('rejects update for non-draft status', async () => {
    const draftId = await createTestDraft();
    await activateDraft(draftId);
    
    const res = await request(app)
      .patch(`/api/drafts/${draftId}`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({ config: { fields: [] } });
    
    expect(res.status).toBe(400);
  });
});
```

### 4.2 Frontend Tests

**File**: `src/__tests__/FormRenderer.test.jsx`

Add tests for theme application:

```javascript
it('applies theme styles', () => {
  const theme = { accent: '#FF0000', font: 'Roboto', radius: 12 };
  render(<FormRenderer fields={[]} theme={theme} />);
  
  const paper = screen.getByTestId('form-paper');
  expect(paper).toHaveStyle({ '--accent': '#FF0000' });
});
```

### 4.3 Integration Tests

Test full flow:
1. Create draft → Verify draftId returned
2. Update draft with PATCH → Verify config saved
3. Load draft in builder → Verify fields loaded
4. Reorder fields via drag-drop → Verify order persisted
5. Change theme → Verify theme applied in preview
6. Submit form → Verify submission linked to correct draftId

---

## Implementation Order

| Step | Task | Files | Est. Time |
|------|------|-------|-----------|
| 1 | Add PATCH endpoint | `server/index.js` | 30 min |
| 2 | Add MongoDB sync to schedule/activate | `server/index.js`, `server/scheduler.js` | 20 min |
| 3 | Update frontend builders to track draftId | `StudentTemplateBuilder.jsx` + others | 45 min |
| 4 | Install dnd-kit | package.json | 2 min |
| 5 | Create FieldInspector component | `src/components/FieldInspector.jsx` | 45 min |
| 6 | Add drag-and-drop to Student builder | `StudentTemplateBuilder.jsx` | 1 hour |
| 7 | Add theme panel to PreviewStudio | `PreviewStudio.jsx` | 45 min |
| 8 | Update FormRenderer to use theme | `FormRenderer.jsx` | 20 min |
| 9 | Add backend tests | `api.test.js` | 30 min |
| 10 | Add frontend tests | `FormRenderer.test.jsx` | 30 min |
| 11 | Run full test suite | - | 15 min |

**Total**: ~6 hours

---

## Success Criteria

1. ✅ Drafts save/update without creating duplicates
2. ✅ MongoDB stays in sync with Supabase for all status changes
3. ✅ Fields can be reordered via drag-and-drop
4. ✅ Each field can be customized (label, placeholder, width, required, CSS)
5. ✅ Theme controls affect preview in real-time
6. ✅ All existing drafts continue to work (backward compatible)
7. ✅ All tests pass (54 backend + frontend builds)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing drafts | High | `fieldsFromToggles()` falls back to toggles when `config.fields` missing |
| MongoDB sync failures | Medium | Use `upsert: true` and log errors; Supabase is source of truth |
| dnd-kit performance | Low | Only render visible fields; use virtualization if >50 fields |
| Theme CSS specificity | Low | Use CSS custom properties with `--` prefix |

---

## Next Steps After Implementation

1. **Roll out to Employee/Team builders** - Copy drag-drop pattern
2. **Add field types** - Date picker, file upload, signature
3. **Conditional logic** - Show/hide fields based on other field values
4. **Form templates** - Pre-built configs for common use cases
5. **Version history** - Track config changes over time
