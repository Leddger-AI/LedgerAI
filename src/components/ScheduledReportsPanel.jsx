import { useState, useEffect, useCallback } from 'react';
import {
  CalendarClock, Plus, Trash2, Pause, Play, Loader2, AlertCircle,
  CheckCircle2, Mail, Clock, ChevronDown,
} from 'lucide-react';
import { getAuthToken } from '../supabaseAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const FREQUENCIES = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

const FORMATS = [
  { id: 'csv', label: 'CSV' },
  { id: 'json', label: 'JSON' },
  { id: 'pdf', label: 'PDF' },
];

export default function ScheduledReportsPanel({ templates = [] }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [formError, setFormError] = useState(null);

  // New-report form state
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState('weekly');
  const [scope, setScope] = useState('overview');
  const [draftId, setDraftId] = useState('');
  const [format, setFormat] = useState('csv');
  const [recipients, setRecipients] = useState('');

  const fetchReports = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/analytics/reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch scheduled reports');
      const data = await res.json();
      setReports(data.reports || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const resetForm = () => {
    setName('');
    setFrequency('weekly');
    setScope('overview');
    setDraftId('');
    setFormat('csv');
    setRecipients('');
    setFormError(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError(null);
    const recipientEmails = recipients
      .split(/[\s,;]+/)
      .map(s => s.trim())
      .filter(Boolean);
    if (recipientEmails.length === 0) {
      setFormError('At least one recipient email is required');
      return;
    }
    if (scope === 'template' && !draftId) {
      setFormError('Select a template when scope is "template"');
      return;
    }
    setSubmitting(true);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/analytics/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: name || `${scope} report`,
          frequency,
          scope,
          draftId: scope === 'template' ? draftId : null,
          format,
          recipientEmails,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create report');
      resetForm();
      setShowForm(false);
      fetchReports();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePause = async (report) => {
    setActionId(report._id);
    try {
      const token = await getAuthToken();
      const nextStatus = report.status === 'active' ? 'paused' : 'active';
      const res = await fetch(`${API_BASE_URL}/api/analytics/reports/${report._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error('Failed to update report');
      fetchReports();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (report) => {
    if (!confirm(`Delete scheduled report "${report.name}"? This cannot be undone.`)) return;
    setActionId(report._id);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/analytics/reports/${report._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete report');
      fetchReports();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="glass-panel analytics-reports-panel">
      <div className="analytics-reports-header">
        <h3 className="analytics-chart-title">
          <CalendarClock size={16} />
          Scheduled Reports
        </h3>
        <button
          className="analytics-reports-add-btn"
          onClick={() => { setShowForm(s => !s); if (!showForm) resetForm(); }}
          type="button"
        >
          {showForm ? <ChevronDown size={14} /> : <Plus size={14} />}
          {showForm ? 'Cancel' : 'New Report'}
        </button>
      </div>

      {error && (
        <div className="analytics-error-banner">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {showForm && (
        <form className="analytics-report-form" onSubmit={handleCreate}>
          <div className="analytics-form-row">
            <label className="analytics-form-label">
              <span>Report name</span>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Weekly Overview Digest"
                className="analytics-form-input"
              />
            </label>
            <label className="analytics-form-label">
              <span>Frequency</span>
              <select value={frequency} onChange={e => setFrequency(e.target.value)} className="analytics-form-select">
                {FREQUENCIES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </label>
          </div>

          <div className="analytics-form-row">
            <label className="analytics-form-label">
              <span>Scope</span>
              <select value={scope} onChange={e => setScope(e.target.value)} className="analytics-form-select">
                <option value="overview">Overview (all templates)</option>
                <option value="template">Single template</option>
              </select>
            </label>
            {scope === 'template' && (
              <label className="analytics-form-label">
                <span>Template</span>
                <select value={draftId} onChange={e => setDraftId(e.target.value)} className="analytics-form-select">
                  <option value="">Select a template…</option>
                  {templates.map(t => (
                    <option key={t.draftId} value={t.draftId}>{t.title}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="analytics-form-label">
              <span>Format</span>
              <select value={format} onChange={e => setFormat(e.target.value)} className="analytics-form-select">
                {FORMATS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </label>
          </div>

          <label className="analytics-form-label">
            <span>Recipient emails (comma or space separated)</span>
            <input
              type="text"
              value={recipients}
              onChange={e => setRecipients(e.target.value)}
              placeholder="alice@example.com, bob@example.com"
              className="analytics-form-input"
            />
          </label>

          {formError && (
            <div className="analytics-error-banner"><AlertCircle size={14} /> {formError}</div>
          )}

          <button type="submit" className="analytics-sync-btn" disabled={submitting}>
            {submitting ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
            {submitting ? 'Creating…' : 'Create Scheduled Report'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="analytics-loading" style={{ padding: '32px 0' }}>
          <Loader2 size={20} className="spin" />
          <span>Loading scheduled reports…</span>
        </div>
      ) : reports.length === 0 ? (
        <div className="analytics-empty-table">
          <CalendarClock size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
          <p>No scheduled reports yet. Create one to receive analytics in your inbox on a recurring schedule.</p>
        </div>
      ) : (
        <div className="analytics-table-wrapper">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Frequency</th>
                <th>Scope</th>
                <th>Format</th>
                <th>Recipients</th>
                <th>Last Run</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r._id}>
                  <td className="analytics-table-title">{r.name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{r.frequency}</td>
                  <td style={{ textTransform: 'capitalize' }}>
                    {r.scope}{r.scope === 'template' ? ` · ${String(r.draftId).slice(0, 8)}…` : ''}
                  </td>
                  <td><span className="analytics-type-badge unknown">{r.format.toUpperCase()}</span></td>
                  <td>
                    <span className="analytics-reports-recipients">
                      <Mail size={12} /> {r.recipientEmails.length}
                    </span>
                  </td>
                  <td>
                    {r.lastRunAt ? (
                      <span className="analytics-detail-meta-item">
                        <Clock size={12} /> {new Date(r.lastRunAt).toLocaleDateString()}
                        {r.lastRunStatus === 'failed' && (
                          <span className="analytics-status-badge expired" style={{ marginLeft: 6 }}>failed</span>
                        )}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    <span className={`analytics-status-badge ${r.status === 'active' ? 'active' : 'draft'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    <div className="analytics-reports-actions">
                      <button
                        className="analytics-reports-icon-btn"
                        onClick={() => handleTogglePause(r)}
                        disabled={actionId === r._id}
                        title={r.status === 'active' ? 'Pause' : 'Resume'}
                        type="button"
                      >
                        {actionId === r._id ? <Loader2 size={13} className="spin" /> :
                          r.status === 'active' ? <Pause size={13} /> : <Play size={13} />}
                      </button>
                      <button
                        className="analytics-reports-icon-btn danger"
                        onClick={() => handleDelete(r)}
                        disabled={actionId === r._id}
                        title="Delete"
                        type="button"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
