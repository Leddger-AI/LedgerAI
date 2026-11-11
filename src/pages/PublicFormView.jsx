import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { migrateToBlocks, blockToField } from '../utils/formSchema';
import { sanitizeCss, themeVars } from '../utils/formTheme';
import './TemplateBuilder.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const UPLOAD = new Set(['photo', 'file']);

export default function PublicFormView() {
  const { draftId } = useParams();
  const [form, setForm] = useState(null);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`${API_BASE_URL}/api/forms/${draftId}`).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load this form.');
      if (live) {
        setForm(data);
        if (data.templateType === 'team') setValues({
          ...(data.config?.autoAssignLead ? { teamLead: 'Auto-assigned' } : {}),
          ...(data.config?.titlePrefix ? { teamTitle: data.config.titlePrefix } : {}),
        });
      }
    }).catch(err => { if (live) setError(err.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [draftId]);

  const resolved = useMemo(() => form
    ? migrateToBlocks(form.templateType || 'student', form.config || {})
    : { blocks: [], settings: {} }, [form]);
  const fields = useMemo(() => resolved.blocks.map(blockToField).filter(f => !f.hidden), [resolved]);
  const theme = resolved.settings?.styles || {};
  const unsupported = fields.find(f => f.required && UPLOAD.has(f.type));
  const setValue = (id, value) => setValues(current => ({ ...current, [id]: value }));
  const optionsFor = f => (f.options || []).map(o => typeof o === 'string' ? { label: o, value: o } : o);

  const renderField = f => {
    if (f.type === 'heading') return <h2 key={f.id} className="canvas-heading">{f.label}</h2>;
    if (f.type === 'divider') return <hr key={f.id} className="canvas-divider" />;
    if (f.type === 'paragraph') return <p key={f.id}>{f.placeholder || f.label}</p>;
    if (UPLOAD.has(f.type)) return <p key={f.id}>{f.label}: uploads are not available on this form yet.</p>;

    const required = !!f.required;
    const value = values[f.id] ?? '';
    let input;
    const teamDepartmentOptions = form.templateType === 'team' && f.id === 'department'
      && form.config?.deptInputMode === 'dropdown' ? form.config.selectedDepartments || [] : null;
    if (f.type === 'textarea') input = <textarea className="form-textarea" id={f.id} value={value} required={required}
      placeholder={f.placeholder || ''} onChange={e => setValue(f.id, e.target.value)} />;
    else if (f.type === 'dropdown' || teamDepartmentOptions) {
      const options = teamDepartmentOptions ? teamDepartmentOptions.map(v => ({ label: v, value: v })) : optionsFor(f);
      input = <select className="form-input" id={f.id} value={value} required={required} onChange={e => setValue(f.id, e.target.value)}>
        <option value="">Select an option</option>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>;
    } else if (f.type === 'radio') input = <div>{optionsFor(f).map(o => <label key={o.value} style={{ display: 'block' }}>
      <input type="radio" name={f.id} value={o.value} checked={value === o.value} required={required}
        onChange={e => setValue(f.id, e.target.value)} /> {o.label}</label>)}</div>;
    else if (f.type === 'checkbox') input = <input id={f.id} type="checkbox" checked={value === true}
      required={required} onChange={e => setValue(f.id, e.target.checked)} />;
    else if (f.type === 'rating') input = <select className="form-input" id={f.id} value={value} required={required}
      onChange={e => setValue(f.id, e.target.value)}><option value="">Choose rating</option>
      {Array.from({ length: f.maxRating || 5 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select>;
    else input = <input className="form-input" id={f.id}
      type={['email', 'compoundEmail'].includes(f.type) ? 'email' : f.type === 'phone' ? 'tel' : f.type === 'url' ? 'url' : f.type === 'date' ? 'date' : 'text'}
      value={value} required={required} placeholder={f.placeholder || ''}
      readOnly={form.templateType === 'team' && f.id === 'teamLead' && !!form.config?.autoAssignLead}
      onChange={e => setValue(f.id, e.target.value)} />;
    return <div className={`form-field ${f.width === 'half' ? '' : 'full'}`} key={f.id}>
      <label className="form-label" htmlFor={f.id}>{f.label}{required ? ' *' : ''}</label>{input}
      {f.helpText && <p className="form-help">{f.helpText}</p>}
    </div>;
  };

  const handleSubmit = async event => {
    event.preventDefault();
    if (unsupported) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/forms/${draftId}/submit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submittedData: values }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not submit form.');
      setSubmitted(true);
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return <main className="form-paper" style={{ margin: '40px auto', padding: 32 }}>Loading form…</main>;
  if (!form) return <main className="form-paper" style={{ margin: '40px auto', padding: 32 }} role="alert">{error}</main>;
  if (submitted) return <main className="form-paper" style={{ margin: '40px auto', padding: 32 }}>
    <h1>Application received</h1><p>Your answers were saved successfully.</p></main>;
  return <main className="form-paper" style={{ ...themeVars(theme), maxWidth: 720, margin: '40px auto', padding: '32px 24px' }}>
    {theme.customCSS && <style>{sanitizeCss(theme.customCSS)}</style>}
    <h1 className="form-paper-title">{form.title}</h1>
    <p className="form-paper-subtitle">Please complete the fields below.</p>
    {error && <p role="alert" style={{ color: 'var(--form-error, #b42318)' }}>{error}</p>}
    {unsupported && <p role="alert">This form contains an upload field that is not available yet. Please contact the form owner.</p>}
    <form onSubmit={handleSubmit} className="form-grid-2">
      {fields.map(renderField)}
      <button type="submit" className="form-btn primary" disabled={submitting || !!unsupported}>
        {submitting ? 'Submitting…' : 'Submit form'}
      </button>
    </form>
  </main>;
}
