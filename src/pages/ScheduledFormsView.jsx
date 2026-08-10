import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Calendar, Copy, Trash2, Loader2, RefreshCw, Send, GraduationCap, Briefcase, Users, File, XCircle } from 'lucide-react';
import { getAuthToken } from '../supabaseAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  });
}

function timeUntil(dateStr) {
  const d = new Date(dateStr);
  const diffMs = d - new Date();
  if (diffMs <= 0) return 'Live now';
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays > 0) return `in ${diffDays}d ${diffHours % 24}h`;
  if (diffHours > 0) return `in ${diffHours}h ${diffMins % 60}m`;
  if (diffMins > 0) return `in ${diffMins}m`;
  return 'in <1m';
}

function getTemplateIcon(type) {
  switch (type) {
    case 'student': return <GraduationCap size={16} />;
    case 'employee': return <Briefcase size={16} />;
    case 'team': return <Users size={16} />;
    default: return <File size={16} />;
  }
}

export default function ScheduledFormsView() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  const fetchScheduled = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      if (!token) { setError('Not authenticated.'); return; }
      const res = await fetch(`${API_BASE_URL}/api/drafts/scheduled`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch scheduled drafts');
      const data = await res.json();
      setDrafts(data.drafts || []);
    } catch (err) {
      console.error('Error fetching scheduled drafts:', err);
      setError('Failed to load scheduled forms.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScheduled();
  }, [fetchScheduled]);

  const handleCancel = async (draftId) => {
    setCancelling(draftId);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/drafts/${draftId}/schedule`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to cancel');
      }
      setDrafts(prev => prev.filter(d => d.draftId !== draftId));
    } catch (err) {
      console.error('Error cancelling schedule:', err);
      alert(err.message);
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="drafts-container">
      <div className="drafts-main-panel">
        <div className="drafts-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} style={{ color: '#06B6D4' }} />
            Scheduled Form Links
          </h2>
          <p>Form links scheduled to go live at a future date and time.</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button
            onClick={fetchScheduled}
            title="Refresh"
            style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', fontSize: '13px' }}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
            <p>{error}</p>
          </div>
        ) : drafts.length === 0 ? (
          <div className="empty-state">
            <Clock size={48} />
            <h3>No Scheduled Forms</h3>
            <p>Select a draft in the Drafts tab and use the Schedule toggle to schedule a form link for future activation.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {drafts.map(draft => (
              <div
                key={draft.draftId}
                className="draft-card"
                style={{ cursor: 'default', border: '1px solid #E2E8F0', padding: '20px' }}
              >
                {/* Title row */}
                <div className="draft-card-title-row" style={{ marginBottom: '14px' }}>
                  {getTemplateIcon(draft.templateType)}
                  <div className="draft-card-title">{draft.title}</div>
                  <span style={{
                    marginLeft: 'auto', fontSize: '11px', padding: '3px 10px',
                    borderRadius: '12px', fontWeight: 600,
                    background: 'rgba(6, 182, 212, 0.1)', color: '#06B6D4'
                  }}>
                    Scheduled
                  </span>
                </div>

                {/* Times */}
                <div style={{ display: 'flex', gap: '24px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '12px', color: '#475569' }}>
                    <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Send size={12} style={{ color: '#06B6D4' }} />
                      Goes Live
                    </div>
                    {formatDateTime(draft.goesLiveAt)}
                    <span style={{ color: '#94A3B8', marginLeft: '6px' }}>({timeUntil(draft.goesLiveAt)})</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569' }}>
                    <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} style={{ color: '#EF4444' }} />
                      Expires
                    </div>
                    {formatDateTime(draft.expiresAt)}
                  </div>
                </div>

                {/* Link + Cancel */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div className="live-link-box" style={{ flex: 1 }}>
                    <input
                      type="text"
                      className="live-link-input"
                      value={`${window.location.origin}/form/${encodeURIComponent(draft.title)}/${draft.draftId}`}
                      readOnly
                    />
                    <button
                      className="copy-btn"
                      onClick={() => navigator.clipboard.writeText(`${window.location.origin}/form/${encodeURIComponent(draft.title)}/${draft.draftId}`)}
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  <button
                    onClick={() => handleCancel(draft.draftId)}
                    disabled={cancelling === draft.draftId}
                    style={{
                      padding: '10px 16px', background: 'none', color: '#EF4444',
                      border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px',
                      fontSize: '13px', fontWeight: 600, cursor: cancelling === draft.draftId ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: '6px',
                      opacity: cancelling === draft.draftId ? 0.6 : 1, whiteSpace: 'nowrap'
                    }}
                  >
                    {cancelling === draft.draftId ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                    {cancelling === draft.draftId ? 'Cancelling...' : 'Cancel'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
