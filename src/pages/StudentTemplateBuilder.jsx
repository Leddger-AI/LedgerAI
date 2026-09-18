import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { User, Globe, Link, Mail, BookOpen, Star, Target, MessageSquare, ClipboardList, Clock, Layers, Monitor, Smartphone, Tablet, Camera, FileUp } from 'lucide-react';
import { getAuthToken } from '../supabaseAuth';
import { fieldDefs, SECTION_TITLES } from '../utils/formFields';
import {
  migrateToBlocks, createBlock, newBlockId, blockToField, blocksToToggles, validateFormConfig,
} from '../utils/formSchema';
import FieldPalette from '../components/FieldPalette';
import SortableBlock from '../components/SortableBlock';
import FieldInspector from '../components/FieldInspector';
import LayersPanel from '../components/LayersPanel';
import './TemplateBuilder.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DEFAULT_TOGGLES = {
  fullName: true,
  profilePhoto: false,
  resume: false,
  rollNo: true,
  collegeEmail: true,
  github: false,
  linkedin: false,
  portfolio: false,
  projects: false,
  programPhase: true,
  meetingFreq: false,
  techSkills: true,
  softSkills: false,
  goals: false,
  learningDiff: true,
  keyStrengths: false,
  actionItems: true
};

const REGISTRY_ORDER = fieldDefs('student').map((d) => d.toggle);

function registryBlockFor(toggleKey) {
  const def = fieldDefs('student').find((d) => d.toggle === toggleKey);
  if (!def) return null;
  return {
    uuid: `fld-${def.id}`,
    type: def.type,
    groupUuid: `sec-${def.section}`,
    groupType: def.section,
    payload: {
      label: def.label,
      ...(def.placeholder ? { placeholder: def.placeholder } : {}),
      isRequired: false,
    },
    style: { labelPosition: 'top', width: 'full' },
  };
}

function sectionTitle(key) {
  return SECTION_TITLES[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

export default function StudentTemplateBuilder() {
  const location = useLocation();
  // Blocks are the source of truth: order, labels, widths, validation.
  // Toggles/fields are derived at save time for backward compatibility.
  const [blocks, setBlocks] = useState(() => migrateToBlocks('student', { toggles: DEFAULT_TOGGLES }).blocks);
  const [draftSettings, setDraftSettings] = useState({});
  const [selectedUuid, setSelectedUuid] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [formTitle, setFormTitle] = useState('Student Evaluation Form');
  const [emailFormat, setEmailFormat] = useState('@[branch].sreenidhi.edu.in');

  // Draft Generation State
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [saveMsg, setSaveMsg] = useState('Draft saved.');
  // UUID of the draft being edited (null = new draft). Re-saving PATCHes
  // the same draft instead of creating duplicates.
  const [existingDraftId, setExistingDraftId] = useState(null);

  // Registry toggle state derives from blocks (on = block present)
  const toggles = useMemo(() => {
    const on = blocksToToggles(blocks);
    const full = {};
    for (const key of REGISTRY_ORDER) full[key] = !!on[key];
    return full;
  }, [blocks]);

  // Hydrate from a draft opened via DraftsView → Edit (router state)
  useEffect(() => {
    const draft = location.state?.draft;
    if (!draft || draft.templateType !== 'student') return;
    const t = setTimeout(() => {
      const migrated = migrateToBlocks('student', draft.config || {});
      setBlocks(migrated.blocks);
      setDraftSettings(migrated.settings || {});
      setSelectedUuid(null);
      setExistingDraftId(draft.draftId || null);
      if (draft.title) setFormTitle(draft.title);
      if (draft.config?.emailFormat) setEmailFormat(draft.config.emailFormat);
      setSaveMsg('Draft loaded — saving will update it.');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const toggleField = (key) => {
    const uuid = `fld-${key}`;
    if (blocks.some((b) => b.uuid === uuid)) {
      setBlocks((prev) => prev.filter((b) => b.uuid !== uuid));
      if (selectedUuid === uuid) setSelectedUuid(null);
      return;
    }
    const fresh = registryBlockFor(key);
    if (!fresh) return;
    // Insert at registry position so re-enabled fields land where expected
    setBlocks((prev) => {
      const order = REGISTRY_ORDER.indexOf(key);
      let idx = prev.length;
      for (let i = 0; i < prev.length; i += 1) {
        const id = prev[i].uuid.startsWith('fld-') ? prev[i].uuid.slice(4) : null;
        const pos = id ? REGISTRY_ORDER.indexOf(id) : -1;
        if (pos !== -1 && pos > order) { idx = i; break; }
      }
      return [...prev.slice(0, idx), fresh, ...prev.slice(idx)];
    });
  };

  const addBlock = (type, spawn = {}) => {
    const fresh = createBlock(type, {
      groupType: 'general',
      groupUuid: 'sec-general',
      payload: spawn.payload,
      style: spawn.style,
    });
    setBlocks((prev) => [...prev, fresh]);
    setSelectedUuid(fresh.uuid);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setIsDragging(false);
    if (!over || active.id === over.id) return;
    setBlocks((prev) => {
      const oldIndex = prev.findIndex((b) => b.uuid === active.id);
      const newIndex = prev.findIndex((b) => b.uuid === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const moved = arrayMove(prev, oldIndex, newIndex);
      // Adopt the section of the drop target so headers stay truthful
      const targetSection = prev[newIndex].groupType;
      return moved.map((b) => (b.uuid === active.id ? { ...b, groupType: targetSection } : b));
    });
  };

  const deleteBlock = (uuid) => {
    setBlocks((prev) => prev.filter((b) => b.uuid !== uuid));
    if (selectedUuid === uuid) setSelectedUuid(null);
  };

  const duplicateBlock = (uuid) => {
    const src = blocks.find((b) => b.uuid === uuid);
    if (!src) return;
    const copy = {
      ...src,
      uuid: newBlockId(),
      groupUuid: newBlockId(),
      payload: { ...src.payload, label: `${src.payload?.label || src.type} (copy)` },
      style: { ...(src.style || {}) },
    };
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.uuid === uuid);
      return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
    });
    setSelectedUuid(copy.uuid);
  };

  const toggleHidden = (uuid) => {
    setBlocks((prev) => prev.map((b) => (
      b.uuid === uuid ? { ...b, style: { ...(b.style || {}), hidden: !(b.style || {}).hidden || undefined } } : b
    )));
  };

  const selectedBlock = blocks.find((b) => b.uuid === selectedUuid) || null;

  const handleSaveDraft = async () => {
    const check = validateFormConfig({ blocks, settings: draftSettings });
    if (!check.ok) {
      alert(`Cannot save — fix these first:\n${check.errors.slice(0, 5).join('\n')}`);
      return;
    }
    setIsSaving(true);
    try {
      const config = {
        toggles,
        emailFormat,
        blocks,
        fields: blocks.map(blockToField),
        settings: draftSettings,
      };

      const token = await getAuthToken();
      if (!token) return;

      // PATCH the same UUID when editing; POST only for brand-new drafts
      const url = existingDraftId
        ? `${API_BASE_URL}/api/drafts/${existingDraftId}`
        : `${API_BASE_URL}/api/drafts`;

      const response = await fetch(url, {
        method: existingDraftId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formTitle,
          templateType: 'student',
          config
        })
      });

      const data = await response.json();
      if (response.ok) {
        if (data.draftId) setExistingDraftId(data.draftId);
        setSaveMsg(existingDraftId ? 'Draft updated.' : 'Draft saved.');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2500);
      } else {
        console.error('Failed to save draft:', data.error);
        alert(data.error || 'Failed to save draft.');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving draft.');
    } finally {
      setIsSaving(false);
    }
  };

  // Group blocks by section, preserving first-appearance order
  const groups = useMemo(() => {
    const out = [];
    const seen = new Map();
    for (const b of blocks) {
      const key = b.groupType || 'general';
      if (!seen.has(key)) {
        seen.set(key, []);
        out.push([key, seen.get(key)]);
      }
      seen.get(key).push(b);
    }
    return out;
  }, [blocks]);

  return (
    <div className="template-builder-container">
      {showSuccess && (
        <div className="success-overlay">
          <video src="/Sucess.webm" autoPlay muted className="success-video" />
          <p className="success-text">{saveMsg}</p>
        </div>
      )}

      {/* LEFT PANEL - Sidebar Controls */}
      <div className="tb-sidebar">
        <div className="tb-sidebar-header">
          <h1 className="tb-sidebar-title">Student Template</h1>
          <p className="tb-sidebar-desc">Toggle fields, add new ones, then drag them into order on the canvas.</p>

          <div style={{ marginTop: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Form Title</label>
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', backgroundColor: '#FFFFFF', border: '1px solid #E5E5E5' }}
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
            />
          </div>

          <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '12px' }}>Save Form</h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="form-btn primary"
                style={{ width: '100%' }}
                onClick={handleSaveDraft}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : (existingDraftId ? 'Update Draft' : 'Save as Draft')}
              </button>
            </div>
          </div>
        </div>

        <FieldPalette onAdd={addBlock} />

        {/* Category: Basic Details */}
        <div className="tb-category">
          <h3 className="tb-category-title">Basic Details</h3>

          <ToggleRow label="Profile Photo" icon={<Camera size={16}/>} active={toggles.profilePhoto} onClick={() => toggleField('profilePhoto')} />
          <ToggleRow label="Full Name" icon={<User size={16}/>} active={toggles.fullName} onClick={() => toggleField('fullName')} />
          <ToggleRow label="Roll Number" icon={<ClipboardList size={16}/>} active={toggles.rollNo} onClick={() => toggleField('rollNo')} />
          <ToggleRow label="College Email" icon={<Mail size={16}/>} active={toggles.collegeEmail} onClick={() => toggleField('collegeEmail')}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Email Format Template</label>
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', fontSize: '12px', padding: '6px 10px' }}
              placeholder="e.g. @[branch].college.edu"
              value={emailFormat}
              onChange={(e) => setEmailFormat(e.target.value)}
            />
          </ToggleRow>
          <ToggleRow label="GitHub URL" icon={<Globe size={16}/>} active={toggles.github} onClick={() => toggleField('github')} />
          <ToggleRow label="LinkedIn URL" icon={<Link size={16}/>} active={toggles.linkedin} onClick={() => toggleField('linkedin')} />
          <ToggleRow label="Portfolio" icon={<BookOpen size={16}/>} active={toggles.portfolio} onClick={() => toggleField('portfolio')} />
          <ToggleRow label="Projects" icon={<BookOpen size={16}/>} active={toggles.projects} onClick={() => toggleField('projects')} />
          <ToggleRow label="Resume / CV Upload" icon={<FileUp size={16}/>} active={toggles.resume} onClick={() => toggleField('resume')} />
        </div>

        {/* Category: Mentorship Tracking */}
        <div className="tb-category">
          <h3 className="tb-category-title">Mentorship Tracking</h3>
          <ToggleRow label="Program Phase" icon={<Layers size={16}/>} active={toggles.programPhase} onClick={() => toggleField('programPhase')} />
          <ToggleRow label="Meeting Frequency" icon={<Clock size={16}/>} active={toggles.meetingFreq} onClick={() => toggleField('meetingFreq')} />
        </div>

        {/* Category: Evaluation Metrics */}
        <div className="tb-category">
          <h3 className="tb-category-title">Evaluation Ratings (1-5)</h3>
          <ToggleRow label="Technical Skills" icon={<Star size={16}/>} active={toggles.techSkills} onClick={() => toggleField('techSkills')} />
          <ToggleRow label="Soft Skills" icon={<MessageSquare size={16}/>} active={toggles.softSkills} onClick={() => toggleField('softSkills')} />
          <ToggleRow label="Goal Achievement" icon={<Target size={16}/>} active={toggles.goals} onClick={() => toggleField('goals')} />
        </div>

        {/* Category: Qualitative Feedback */}
        <div className="tb-category">
          <h3 className="tb-category-title">Qualitative Feedback</h3>
          <ToggleRow label="Learning Difficulties" icon={<BookOpen size={16}/>} active={toggles.learningDiff} onClick={() => toggleField('learningDiff')} />
          <ToggleRow label="Key Strengths" icon={<Star size={16}/>} active={toggles.keyStrengths} onClick={() => toggleField('keyStrengths')} />
          <ToggleRow label="Action Items" icon={<Target size={16}/>} active={toggles.actionItems} onClick={() => toggleField('actionItems')} />
        </div>
      </div>

      {/* CENTER - SORTABLE CANVAS */}
      <div className="tb-preview-panel">

        {/* Floating Device Toggle */}
        <div className="device-toggle-container">
          <div
            className={`device-toggle-btn ${previewMode === 'desktop' ? 'active' : ''}`}
            onClick={() => setPreviewMode('desktop')}
          >
            <Monitor size={16} />
          </div>
          <div
            className={`device-toggle-btn ${previewMode === 'mobile' ? 'active' : ''}`}
            onClick={() => setPreviewMode('mobile')}
          >
            <Smartphone size={16} />
          </div>
          <div
            className={`device-toggle-btn ${previewMode === 'tablet' ? 'active' : ''}`}
            onClick={() => setPreviewMode('tablet')}
          >
            <Tablet size={16} />
          </div>
        </div>

        <div className={`device-frame ${previewMode}`}>
          <div className="form-paper canvas-guide-wrap">
            {isDragging && <div className="canvas-guide" />}
            <div className="form-paper-header">
              <h1 className="form-paper-title">{formTitle || 'Untitled Form'}</h1>
              <p className="form-paper-subtitle">Mentor Assessment Template — click a field to edit, drag to reorder</p>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={() => setIsDragging(true)} onDragEnd={handleDragEnd} onDragCancel={() => setIsDragging(false)}>
              <SortableContext items={blocks.map((b) => b.uuid)} strategy={verticalListSortingStrategy}>
                {groups.map(([section, items]) => (
                  <div key={section}>
                    <h3 className="canvas-section-title">{sectionTitle(section)}</h3>
                    {items.map((block) => (
                      <SortableBlock
                        key={block.uuid}
                        block={block}
                        selected={selectedUuid === block.uuid}
                        onSelect={setSelectedUuid}
                        onDelete={deleteBlock}
                        onDuplicate={duplicateBlock}
                        emailFormat={emailFormat}
                      />
                    ))}
                  </div>
                ))}
              </SortableContext>
            </DndContext>
            {blocks.length === 0 && (
              <div className="form-empty-state">
                <p>Canvas is empty — toggle fields on the left or add new ones above.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT - INSPECTOR (selection) or LAYERS (overview) */}
      {selectedBlock ? (
        <FieldInspector
          block={selectedBlock}
          onChange={(updated) => setBlocks((prev) => prev.map((b) => (b.uuid === updated.uuid ? updated : b)))}
          onClose={() => setSelectedUuid(null)}
        />
      ) : (
        <div className="tb-inspector">
          <div className="tb-inspector-header">
            <div>
              <h3 className="tb-inspector-title">Canvas</h3>
              <span className="canvas-block-type">{blocks.length} block{blocks.length === 1 ? '' : 's'}</span>
            </div>
          </div>
          <LayersPanel
            blocks={blocks}
            selectedUuid={selectedUuid}
            onSelect={setSelectedUuid}
            onToggleHidden={toggleHidden}
            onDelete={deleteBlock}
          />
          {blocks.length > 0 && (
            <p className="inspector-hint" style={{ marginTop: '12px' }}>Select any block or layer to edit its content and style.</p>
          )}
        </div>
      )}
    </div>
  );
}

// Subcomponents for the Builder UI
function ToggleRow({ label, icon, active, onClick, children }) {
  return (
    <div className={`tb-toggle-row ${active ? 'active' : ''}`} style={children && active ? { flexDirection: 'column', alignItems: 'stretch', height: 'auto', padding: '12px', gap: 0 } : {}}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', cursor: 'pointer' }} onClick={onClick}>
        <div className="tb-toggle-label">
          {icon}
          {label}
        </div>
        <div className={`tb-switch ${active ? 'on' : ''}`}>
          <div className="tb-switch-thumb" />
        </div>
      </div>
      {active && children && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.05)', cursor: 'default' }} onClick={e => e.stopPropagation()}>
          {children}
        </div>
      )}
    </div>
  );
}
