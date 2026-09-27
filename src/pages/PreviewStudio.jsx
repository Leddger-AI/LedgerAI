import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  Monitor, Smartphone, Tablet, Link2, Send, Clock, Eye,
  Layers, MessageSquare, Star, FileText, CheckCircle2, AlertTriangle, Loader2,
  ChevronDown, ChevronUp, Plus, PenLine,
} from 'lucide-react';
import { getAuthToken } from '../supabaseAuth';
import { groupBySection, SECTION_TITLES } from '../utils/formFields';
import {
  migrateToBlocks, createBlock, blockToField, newBlockId, ThemeSchema, blocksToToggles,
} from '../utils/formSchema';
import { themeVars } from '../utils/formTheme';
import { sectorsFor, FONT_FAMILIES, FONT_WEIGHTS } from '../utils/fieldSectors';
import SortableBlock from '../components/SortableBlock';
import FieldPalette from '../components/FieldPalette';
import FieldInspector from '../components/FieldInspector';
import LayersPanel from '../components/LayersPanel';
import './TemplateBuilder.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const daysFromNow = (n) => new Date(Date.now() + n * 86400000).toISOString();
const FORMATS = [
  { id: 'classic', label: 'Classic', icon: Layers },
  { id: 'conversational', label: 'Conversational', icon: MessageSquare },
  { id: 'scorecard', label: 'Score Card', icon: Star },
];
const ACCENTS = ['#0E9384', '#E4573D', '#2563EB', '#7C3AED', '#141414', '#DB2777'];
const FONTS = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Georgia', 'monospace'];

const DEFAULT_THEME = {
  colors: { background: '#ffffff', text: '#37352f', accent: '#0E9384', buttonBackground: '#0E9384', buttonText: '#ffffff', error: '#DC2626' },
  fonts: { family: 'Inter', sizes: { label: '14px', input: '16px', heading: '24px' } },
  spacing: { fieldGap: '16px', sectionGap: '32px', padding: '24px' },
  border: { radius: '8px', width: '1px', color: '#E5E5E5' },
  customCSS: '',
};

function themeFromDraft(draft) {
  if (!draft?.config) return DEFAULT_THEME;
  try {
    const migrated = migrateToBlocks(draft.templateType || draft.template_type || 'student', draft.config);
    const parsed = ThemeSchema.safeParse(migrated.settings?.styles || {});
    const styles = parsed.success ? parsed.data : {};
    const legacy = draft.config.theme || {};
    return {
      ...DEFAULT_THEME,
      ...styles,
      colors: { ...DEFAULT_THEME.colors, ...(styles.colors || {}), ...(legacy.accent ? { accent: legacy.accent, buttonBackground: legacy.accent } : {}) },
      fonts: { ...DEFAULT_THEME.fonts, ...(styles.fonts || {}), ...(legacy.font ? { family: legacy.font } : {}) },
      spacing: { ...DEFAULT_THEME.spacing, ...(styles.spacing || {}), ...(legacy.spacing !== undefined ? { fieldGap: `${legacy.spacing}px` } : {}) },
      border: { ...DEFAULT_THEME.border, ...(styles.border || {}), ...(legacy.radius !== undefined ? { radius: `${legacy.radius}px` } : {}) },
    };
  } catch {
    return DEFAULT_THEME;
  }
}

function sectionTitle(key) {
  return SECTION_TITLES[key] || String(key).charAt(0).toUpperCase() + String(key).slice(1);
}

// Hex + dot color control (design shot): typed hex with a circle swatch.
function HexDot({ label, value, fallback, onChange }) {
  const hex = typeof value === 'string' ? value : '';
  return (
    <label className="inspector-row" style={{ flex: 1 }}>
      <span className="inspector-label">{label}</span>
      <div className="mw-hexdot">
        <input
          className="form-input" type="text" value={hex} placeholder={fallback}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
        <input
          type="color" className="mw-dot" aria-label={`${label} swatch`}
          value={/^#[0-9a-f]{6}$/i.test(hex) ? hex : fallback}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </label>
  );
}

export default function PreviewStudio() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draftId, setDraftId] = useState('');
  const [device, setDevice] = useState('desktop');
  const [format, setFormat] = useState('classic');
  const [hidden, setHidden] = useState([]);
  const [step, setStep] = useState(0);
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [themeOpen, setThemeOpen] = useState(true);
  const [blocks, setBlocks] = useState([]);
  const [selectedUuid, setSelectedUuid] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [acting, setActing] = useState(false);
  const [msg, setMsg] = useState(null);
  const [layersOpen, setLayersOpen] = useState(true);
  const themeDirty = useRef(false);
  const blocksDirty = useRef(false);

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/drafts`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        const list = d.drafts || [];
        setDrafts(list);
        if (list.length && !draftId) setDraftId(list[0].draftId || list[0].draft_id);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchDrafts, 0);
    return () => clearTimeout(t);
  }, [fetchDrafts]);

  const draft = drafts.find((d) => (d.draftId || d.draft_id) === draftId) || null;
  const templateType = draft?.templateType || draft?.template_type || 'student';

  // Load blocks + theme when switching drafts
  useEffect(() => {
    const t = setTimeout(() => {
      setStep(0);
      setHidden([]);
      setSelectedUuid(null);
      setIsDragging(false);
      setThemeOpen(true);
      themeDirty.current = false;
      blocksDirty.current = false;
      const migrated = migrateToBlocks(templateType, draft?.config || {});
      setBlocks(migrated.blocks);
      setTheme(themeFromDraft(draft));
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  // Single debounced autosave for blocks AND theme — one PATCH per pause,
  // always against the same draft UUID (drafts only, never active/scheduled).
  useEffect(() => {
    if ((!themeDirty.current && !blocksDirty.current) || !draft || draft.status !== 'draft') return;
    const id = draft.draftId || draft.draft_id;
    const t = setTimeout(async () => {
      try {
        const token = await getAuthToken();
        if (!token) return;
        const patch = { ...(draft.config || {}) };
        if (blocksDirty.current) {
          patch.blocks = blocks;
          patch.fields = blocks.map(blockToField);
        }
        if (themeDirty.current) {
          patch.settings = { styles: theme };
          patch.theme = {
            accent: theme.colors?.accent,
            font: theme.fonts?.family,
            radius: parseInt(theme.border?.radius, 10) || 8,
            spacing: parseInt(theme.spacing?.fieldGap, 10) || 16,
          };
        }
        await fetch(`${API_BASE_URL}/api/drafts/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ config: patch }),
        });
        themeDirty.current = false;
        blocksDirty.current = false;
      } catch { /* autosave is best-effort */ }
    }, 900);
    return () => clearTimeout(t);
  }, [blocks, theme, draft]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const allFields = useMemo(() => blocks.map(blockToField), [blocks]);
  const visibleFields = allFields.filter((f) => !hidden.includes(f.id));
  const groups = groupBySection(visibleFields);
  const flat = groups.flatMap(([, items]) => items);
  const current = flat[Math.min(step, Math.max(0, flat.length - 1))];

  const canvasGroups = useMemo(() => {
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

  const selectedBlock = blocks.find((b) => b.uuid === selectedUuid) || null;

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setIsDragging(false);
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.uuid === active.id);
    const newIndex = blocks.findIndex((b) => b.uuid === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const moved = arrayMove(blocks, oldIndex, newIndex);
    const targetSection = blocks[newIndex].groupType;
    blocksDirty.current = true;
    setBlocks(moved.map((b) => (b.uuid === active.id ? { ...b, groupType: targetSection } : b)));
  };

  const deleteBlock = (uuid) => {
    blocksDirty.current = true;
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
    blocksDirty.current = true;
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.uuid === uuid);
      return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
    });
    setSelectedUuid(copy.uuid);
  };

  const toggleHidden = (uuid) => {
    blocksDirty.current = true;
    setBlocks((prev) => prev.map((b) => (
      b.uuid === uuid ? { ...b, style: { ...(b.style || {}), hidden: !(b.style || {}).hidden || undefined } } : b
    )));
  };

  const addBlock = (type, spawn = {}) => {
    const fresh = createBlock(type, {
      groupType: 'general',
      groupUuid: 'sec-general',
      payload: spawn.payload,
      style: spawn.style,
    });
    blocksDirty.current = true;
    setBlocks((prev) => [...prev, fresh]);
    setSelectedUuid(fresh.uuid);
  };

  const updateTheme = (patch) => {
    themeDirty.current = true;
    setTheme((prev) => ({ ...prev, ...patch }));
  };
  const updateColors = (patch) => {
    themeDirty.current = true;
    setTheme((prev) => ({ ...prev, colors: { ...prev.colors, ...patch } }));
  };

  const publicUrl = (d) => {
    if (!d) return '';
    const id = d.draftId || d.draft_id;
    return `${window.location.origin}/form/${encodeURIComponent(d.title || 'form')}/${id}`;
  };

  const doAction = async (kind) => {
    if (!draft) return;
    setActing(true);
    setMsg(null);
    try {
      const token = await getAuthToken();
      const id = draft.draftId || draft.draft_id;
      if (kind === 'copy') {
        await navigator.clipboard.writeText(publicUrl(draft)).catch(() => {});
        setMsg({ type: 'success', text: 'Link copied.' });
      } else if (kind === 'activate') {
        const expiresAt = daysFromNow(7);
        const res = await fetch(`${API_BASE_URL}/api/drafts/${id}/activate`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ expiresAt }),
        });
        setMsg(res.ok ? { type: 'success', text: 'Active for 7 days.' } : { type: 'error', text: 'Activate failed.' });
      } else if (kind === 'schedule') {
        const goesLiveAt = daysFromNow(1);
        const expiresAt = daysFromNow(8);
        const res = await fetch(`${API_BASE_URL}/api/drafts/${id}/schedule`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ goesLiveAt, expiresAt }),
        });
        setMsg(res.ok ? { type: 'success', text: 'Goes live tomorrow.' } : { type: 'error', text: 'Schedule failed.' });
      }
      fetchDrafts();
    } catch {
      setMsg({ type: 'error', text: 'Action failed.' });
    } finally {
      setActing(false);
    }
  };

  const toggleSection = (section) => {
    const ids = allFields.filter((f) => f.section === section).map((f) => f.id);
    const allHidden = ids.every((id) => hidden.includes(id));
    setHidden((prev) => (allHidden ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]));
  };

  const radiusPx = parseInt(theme.border?.radius, 10) || 8;
  const gapPx = parseInt(theme.spacing?.fieldGap, 10) || 16;

  return (
    <div className="template-builder-container">
      {/* LEFT — palette (visible when classic format + block editing) */}
      {format === 'classic' && (
        <div className="tb-sidebar" style={{ flex: 0.9 }}>
          <FieldPalette onAdd={addBlock} />
        </div>
      )}

      {/* CENTER — canvas */}
      <div className="tb-preview-panel" style={{ flex: format === 'classic' ? 4 : 5 }}>
        <div className="studio-toolbar">
          <div className="device-toggle-container">
            {[
              { id: 'desktop', icon: Monitor }, { id: 'tablet', icon: Tablet }, { id: 'mobile', icon: Smartphone },
            ].map((d) => (
              <div key={d.id} className={`device-toggle-btn ${device === d.id ? 'active' : ''}`} onClick={() => setDevice(d.id)} title={d.id}>
                <d.icon size={16} />
              </div>
            ))}
          </div>
          <div className="device-toggle-container studio-format-bar">
            {FORMATS.map((f) => (
              <div
                key={f.id}
                className={`device-toggle-btn ${format === f.id ? 'active' : ''}`}
                onClick={() => { setFormat(f.id); setStep(0); }}
                title={f.label}
                style={format === f.id ? {} : { width: 'auto', padding: '0 10px' }}
              >
                <f.icon size={16} />
              </div>
            ))}
          </div>
        </div>

        <div className={`device-frame ${device}`}>
          {format === 'classic' && (
            <div className="form-paper canvas-guide-wrap" style={themeVars(theme)}>
              {isDragging && <div className="canvas-guide" />}
              <div className="form-paper-header">
                <h1 className="form-paper-title">{draft?.title || 'Preview Studio'}</h1>
                <p className="form-paper-subtitle">
                  {blocks.length > 0
                    ? `${templateType} \u00B7 click a block to edit, drag to reorder`
                    : 'Add blocks from the left palette or pick a saved draft.'}
                </p>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={() => setIsDragging(true)} onDragEnd={handleDragEnd} onDragCancel={() => setIsDragging(false)}>
                <SortableContext items={blocks.map((b) => b.uuid)} strategy={verticalListSortingStrategy}>
                  {canvasGroups.map(([section, items]) => (
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
                          emailFormat={draft?.config?.emailFormat}
                        />
                      ))}
                    </div>
                  ))}
                </SortableContext>
              </DndContext>
              {blocks.length === 0 && (
                <div className="form-empty-state"><p>No blocks yet. Add from the left palette.</p></div>
              )}
            </div>
          )}
          {format === 'conversational' && (
            <div className="form-paper" style={themeVars(theme)}>
              <div className="form-paper-header">
                <h1 className="form-paper-title">{draft?.title || 'Preview Studio'}</h1>
                <p className="form-paper-subtitle">{flat.length ? `Question ${Math.min(step + 1, flat.length)} of ${flat.length}` : ''}</p>
              </div>
              {current ? (
                <div className="form-section">
                  <div className="form-field full">
                    <label className="form-label" style={{ fontSize: '18px' }}>{current.label}</label>
                    <input type="text" className="form-input" placeholder="Type your answer\u2026" disabled />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button className="form-btn" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</button>
                    <button className="form-btn primary" disabled={step >= flat.length - 1} onClick={() => setStep((s) => Math.min(flat.length - 1, s + 1))}>Next</button>
                  </div>
                  <div className="home-bar" style={{ marginTop: '16px' }}>
                    <div className="home-fill" style={{ width: `${flat.length ? ((step + 1) / flat.length) * 100 : 0}%`, background: theme.colors?.accent }} />
                  </div>
                </div>
              ) : (
                <div className="form-empty-state"><p>No fields to preview.</p></div>
              )}
            </div>
          )}
          {format === 'scorecard' && (
            <div className="form-paper" style={themeVars(theme)}>
              <div className="form-paper-header">
                <h1 className="form-paper-title">{draft?.title || 'Preview Studio'}</h1>
                <p className="form-paper-subtitle">Score Card</p>
              </div>
              <div className="form-section">
                <h3 className="form-section-title">Ratings</h3>
                {visibleFields.filter((f) => f.type === 'rating' || f.type === 'textarea').map((f) => (
                  <div className="form-field full" key={f.id}>
                    <label className="form-label">{f.label}</label>
                    {f.type === 'rating'
                      ? <div style={{ display: 'flex', gap: '6px' }}>{Array.from({ length: Math.min(10, Math.max(1, f.maxRating || 5)) }, (_, i) => <span key={i} className="form-rating-dot">{i + 1}</span>)}</div>
                      : <textarea className="form-textarea" disabled />}
                  </div>
                ))}
                {visibleFields.filter((f) => f.type === 'rating' || f.type === 'textarea').length === 0 && (
                  <div className="form-empty-state"><p>No rating or feedback fields in this draft.</p></div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — options rail: always shows Theme + Draft picker + Publish.
          When a block is selected: Appearance inspector on top, Theme below.
          When nothing selected: Layers + Theme together. */}
      <div className="tb-sidebar studio-rail" style={{ flex: 3 }}>
        {/* Draft picker + title */}
        <div className="tb-sidebar-header">
          <h1 className="tb-sidebar-title">Preview Studio</h1>
          <p className="tb-sidebar-desc">Edit any block, style every pixel, publish when ready.</p>
          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Saved draft</label>
            {loading ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px' }}><Loader2 size={14} className="spin" /> Loading\u2026</div>
            ) : drafts.length === 0 ? (
              <div className="studio-empty">
                <p>No drafts yet. Create one in a builder and it will appear here for pixel-level editing.</p>
                <button className="form-btn primary" style={{ width: '100%' }} onClick={() => navigate('/dashboard/templates/student')}>
                  <Plus size={14} /> New Student form
                </button>
              </div>
            ) : (
              <select className="form-input" style={{ width: '100%' }} value={draftId} onChange={(e) => setDraftId(e.target.value)}>
                {drafts.map((d) => (
                  <option key={d.draftId || d.draft_id} value={d.draftId || d.draft_id}>
                    {d.title} ({d.status || 'draft'})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Appearance: block inspector (on top when block selected) */}
        {selectedBlock && format === 'classic' && (
          <div className="studio-rail-section">
            <FieldInspector
              block={selectedBlock}
              onChange={(updated) => {
                blocksDirty.current = true;
                setBlocks((prev) => prev.map((b) => (b.uuid === updated.uuid ? updated : b)));
              }}
              onClose={() => setSelectedUuid(null)}
            />
          </div>
        )}

        {/* Layers: always show when classic + blocks present */}
        {format === 'classic' && blocks.length > 0 && !selectedBlock && (
          <div className="studio-rail-section">
            <h3 className="tb-category-title collapsible" onClick={() => setLayersOpen((v) => !v)}>
              Layers ({blocks.length}) {layersOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </h3>
            {layersOpen && (
              <LayersPanel
                blocks={blocks}
                selectedUuid={selectedUuid}
                onSelect={setSelectedUuid}
                onToggleHidden={toggleHidden}
                onDelete={deleteBlock}
              />
            )}
          </div>
        )}

        {/* Theme — always visible */}
        <div className="studio-rail-section">
          <h3 className="tb-category-title collapsible" onClick={() => setThemeOpen((v) => !v)}>
            Theme {draft && draft.status !== 'draft' && <span style={{ fontWeight: 400, textTransform: 'none' }}>(locked)</span>}
            {themeOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </h3>
          {themeOpen && (
            <div className="studio-theme-grid">
              <div>
                <span className="inspector-label">Accent</span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  {ACCENTS.map((c) => (
                    <button
                      key={c}
                      onClick={() => updateColors({ accent: c, buttonBackground: c })}
                      aria-label={`Accent ${c}`}
                      className={`studio-accent-dot${theme.colors?.accent === c ? ' active' : ''}`}
                      style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, border: theme.colors?.accent === c ? '3px solid #141414' : '1px solid #E5E5E5', cursor: 'pointer' }}
                    />
                  ))}
                </div>
              </div>
              <div className="inspector-duo">
                <HexDot label="Background" value={theme.colors?.background} fallback="#ffffff" onChange={(v) => updateColors({ background: v })} />
                <HexDot label="Text" value={theme.colors?.text} fallback="#37352f" onChange={(v) => updateColors({ text: v })} />
              </div>
              <label className="inspector-row">
                <span className="inspector-label">Font family</span>
                <select
                  className="form-input" style={{ width: '100%' }}
                  value={theme.fonts?.family || 'Inter'}
                  onChange={(e) => updateTheme({ fonts: { ...theme.fonts, family: e.target.value } })}
                >
                  {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </label>
              <label className="inspector-row">
                <span className="inspector-label">Corner radius \u2014 {radiusPx}px</span>
                <input type="range" className="mw-range" min={0} max={24} value={radiusPx} onChange={(e) => updateTheme({ border: { ...theme.border, radius: `${e.target.value}px` } })} />
              </label>
              <label className="inspector-row">
                <span className="inspector-label">Field spacing \u2014 {gapPx}px</span>
                <input type="range" className="mw-range" min={8} max={32} value={gapPx} onChange={(e) => updateTheme({ spacing: { ...theme.spacing, fieldGap: `${e.target.value}px` } })} />
              </label>
              <label className="inspector-row">
                <span className="inspector-label">Custom CSS</span>
                <textarea
                  className="form-textarea" style={{ minHeight: '60px', fontFamily: 'monospace', fontSize: '12px' }}
                  value={theme.customCSS || ''}
                  onChange={(e) => updateTheme({ customCSS: e.target.value })}
                  placeholder=".form-input { border-width: 2px; }"
                />
              </label>
              {draft && draft.status !== 'draft' && (
                <p className="inspector-hint">Theme edits save only on drafts \u2014 activate/schedule locks the form.</p>
              )}
            </div>
          )}
        </div>

        {/* Publish */}
        <div className="studio-rail-section">
          <h3 className="tb-category-title">Publish</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="form-btn" onClick={() => doAction('copy')} disabled={!draft || acting}><Link2 size={14} /> Copy link</button>
            <button className="form-btn primary" onClick={() => doAction('activate')} disabled={!draft || acting}><Send size={14} /> Activate 7d</button>
            <button className="form-btn" onClick={() => doAction('schedule')} disabled={!draft || acting}><Clock size={14} /> Live tomorrow</button>
          </div>
          {msg && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: msg.type === 'success' ? '#059669' : '#DC2626', marginTop: '8px' }}>
              {msg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}{msg.text}
            </div>
          )}
          {draft && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '8px' }}>
              <Eye size={12} style={{ display: 'inline', verticalAlign: '-2px' }} /> {`${window.location.origin}/form/${encodeURIComponent(draft.title || 'form')}/${draft.draftId || draft.draft_id}`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
