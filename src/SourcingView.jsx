import { useState, useEffect, useCallback, useRef } from 'react';
import { UserSearch, Plus, Copy, Check, ExternalLink, FileText, Users, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken } from './supabaseAuth';
import { migrateToBlocks, blockToField } from './utils/formSchema';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function formatRelativeTime(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'Unknown date';
  const now = new Date();
  const diffMs = now - d;
  if (diffMs < 0) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function SourcingView() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateError, setCandidateError] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const copyTimerRef = useRef(null);

  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const [draftsRes, subsRes, candidatesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/drafts`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/submissions`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/candidates`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (draftsRes.ok) {
        const data = await draftsRes.json();
        setDrafts(data.drafts || []);
      }
      if (subsRes.ok) {
        const data = await subsRes.json();
        setSubmissions(data.submissions || []);
      }
      if (candidatesRes.ok) {
        const data = await candidatesRes.json();
        setCandidates(data.candidates || []);
      } else setCandidateError('Could not load candidates. Refresh to try again.');
    } catch (err) {
      console.error('Error fetching sourcing data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchData, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const handleCopyLink = (draft) => {
    const link = `${window.location.origin}/form/${encodeURIComponent(draft.title)}/${draft.draftId}`;
    if (!navigator.clipboard?.writeText) return;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(draft.draftId);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedId(null), 1500);
    }).catch(() => {});
  };

  const getDraftFields = (draft) => {
    try {
      const cfg = typeof draft.config === 'string' ? JSON.parse(draft.config) : draft.config;
      const fields = migrateToBlocks(draft.templateType || 'student', cfg || {}).blocks
        .map(blockToField).filter(f => !f.hidden && !['heading', 'divider', 'paragraph'].includes(f.type));
      return fields.length ? fields.map(f => f.label || f.id) : ['No fields configured'];
    } catch {
      return ['Form fields'];
    }
  };

  const fieldLabel = (draftId, id) => {
    const draft = drafts.find(d => d.draftId === draftId);
    if (!draft) return id;
    const field = migrateToBlocks(draft.templateType || 'student', draft.config || {}).blocks
      .map(blockToField).find(f => f.id === id);
    return field?.label || id;
  };

  const getSubmissionCount = (draftId) => {
    return submissions.filter(s => s.draftId === draftId).length;
  };

  const totalSubmissions = submissions.length;
  const filteredCandidates = candidates.filter(c => `${c.name || ''} ${c.email || ''}`.toLowerCase().includes(candidateSearch.toLowerCase()));
  const activeCount = drafts.filter(d => d.status === 'active').length;

  const openCandidate = async id => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/candidates/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Could not load candidate.');
      setSelectedCandidate(await res.json());
      setCandidateError('');
    } catch (err) { setCandidateError(err.message); }
  };

  const updateStatus = async status => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/candidates/${selectedCandidate.candidate.id}`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Could not save candidate status.');
      const { candidate } = await res.json();
      setSelectedCandidate(current => ({ ...current, candidate }));
      setCandidates(current => current.map(c => c.id === candidate.id ? candidate : c));
      setCandidateError('');
    } catch (err) { setCandidateError(err.message); }
  };

  return (
    <div className="sourcing-container">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <UserSearch size={20} style={{ color: 'var(--color-cyan)' }} />
            Sourcing & Application Templates
          </h2>
          <p className="section-subtitle">Build shareable candidate application forms and manage your incoming talent pool</p>
        </div>
        <button type="button"
          className="table-action-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: 'rgba(20, 20, 20, 0.06)', borderColor: 'var(--border-color)' }}
          onClick={() => navigate('/recruiter')}
        >
          <Plus size={16} />
          <span>New Template</span>
        </button>
      </div>

      {/* KPI stats */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Active Templates</span>
            <div className="kpi-icon-wrapper cyan"><FileText size={16} /></div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{activeCount} Live</span>
            <span className="kpi-trend positive">of {drafts.length} total</span>
          </div>
        </div>
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Submissions</span>
            <div className="kpi-icon-wrapper purple"><Users size={16} /></div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{totalSubmissions} Submissions</span>
            <span className="kpi-trend positive">Across all templates</span>
          </div>
        </div>
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Talent Pool Size</span>
            <div className="kpi-icon-wrapper cyan"><UserSearch size={16} /></div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{candidates.length} Profiles</span>
            <span className="kpi-trend positive">Ready to review</span>
          </div>
        </div>
      </div>

      {/* Template Cards */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : drafts.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <FileText size={40} style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>No Templates Yet</h3>
          <p style={{ fontSize: '13px' }}>Create a form template to start collecting submissions.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          {drafts.map(draft => (
            <div className="glass-panel" key={draft.draftId} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>{draft.title}</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{draft.templateType || 'form'}</span>
                </div>
                <span style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: '600',
                  backgroundColor: draft.status === 'active' ? 'var(--color-success-glow)' : 'rgba(20,20,20,0.06)',
                  color: draft.status === 'active' ? 'var(--color-success)' : 'var(--text-muted)'
                }}>
                  {draft.status ? draft.status.charAt(0).toUpperCase() + draft.status.slice(1) : 'Draft'}
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {getDraftFields(draft).map(f => (
                  <span key={f} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '12px', backgroundColor: 'rgba(20,20,20,0.05)', color: 'var(--text-secondary)' }}>
                    {f}
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{getSubmissionCount(draft.draftId)}</strong> submissions
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button"
                    onClick={() => handleCopyLink(draft)}
                    title="Copy shareable link"
                    style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-secondary)' }}
                  >
                    {copiedId === draft.draftId ? <Check size={12} style={{ color: 'var(--color-success)' }} /> : <Copy size={12} />}
                    {copiedId === draft.draftId ? 'Copied' : 'Copy Link'}
                  </button>
                  <button type="button"
                    onClick={() => navigate('/recruiter')}
                    title="Edit template"
                    style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}
                  >
                    <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="glass-panel" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>Candidates</h3>
        <input className="form-input" aria-label="Search candidates" placeholder="Search name or email"
          value={candidateSearch} onChange={e => setCandidateSearch(e.target.value)} style={{ maxWidth: 360, marginBottom: 16 }} />
        {candidateError && <p role="alert">{candidateError}</p>}
        {filteredCandidates.length === 0 ? <p>No candidates found.</p> : <div style={{ display: 'grid', gap: 8 }}>
          {filteredCandidates.map(candidate => <button type="button" key={candidate.id}
            onClick={() => openCandidate(candidate.id)} className="table-action-btn"
            style={{ textAlign: 'left', padding: 12, display: 'flex', justifyContent: 'space-between' }}>
            <span>{candidate.name || 'Name needs review'} · {candidate.email || 'Email needs review'}</span>
            <span>{candidate.status}</span>
          </button>)}
        </div>}
      </div>
      {selectedCandidate && <section className="glass-panel" style={{ padding: 24, marginBottom: 24 }} aria-label="Candidate detail">
        <button type="button" onClick={() => setSelectedCandidate(null)}>Close</button>
        <h3>{selectedCandidate.candidate.name || 'Name needs review'}</h3>
        <p>{selectedCandidate.candidate.email || 'Email needs review'}</p>
        <label>Status <select className="form-input" style={{ maxWidth: 240 }} value={selectedCandidate.candidate.status}
          onChange={e => updateStatus(e.target.value)}>
          {['new', 'needs_contact_review', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'].map(status =>
            <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
        </select></label>
        <h4>Applications</h4>
        {selectedCandidate.applications.map(application => <details key={application.submissionId} style={{ marginTop: 12 }}>
          <summary>{application.title} · {formatRelativeTime(application.submittedAt)}</summary>
          <dl>{Object.entries(application.submittedData || {}).map(([key, value]) =>
            <div key={key}><dt style={{ fontWeight: 600 }}>{fieldLabel(application.draftId, key)}</dt><dd>{String(value)}</dd></div>)}</dl>
        </details>)}
      </section>}

      {/* Talent Pool Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Users size={16} style={{ color: 'var(--color-cyan)' }} />
          Recent Submissions
        </h3>
        {submissions.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>No submissions yet.</p>
        ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="meetings-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Form</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Submitted Data</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {submissions.slice(0, 20).map(s => (
                <tr key={s.submissionId} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                  <td style={{ padding: '14px 16px', fontWeight: '600', color: 'var(--text-primary)' }}>{s.title}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {Object.entries(s.submittedData || {}).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ')}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{formatRelativeTime(s.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
}
