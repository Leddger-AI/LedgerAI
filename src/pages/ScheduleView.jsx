import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Calendar, Send, Trash2, Loader2, RefreshCw, AlertCircle, CheckCircle2, Mail, Users } from 'lucide-react';
import { getAuthToken } from '../supabaseAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function timeUntil(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = d - now;
  if (diffMs <= 0) return 'Overdue';
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays > 0) return `in ${diffDays}d ${diffHours % 24}h`;
  if (diffHours > 0) return `in ${diffHours}h ${diffMins % 60}m`;
  if (diffMins > 0) return `in ${diffMins}m`;
  return 'in <1m';
}

export default function ScheduleView() {
  const [scheduled, setScheduled] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  const fetchScheduled = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      if (!token) { setError('Not authenticated.'); return; }
      const res = await fetch(`${API_BASE_URL}/api/email/scheduled`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch scheduled campaigns');
      const data = await res.json();
      setScheduled(data.campaigns || []);
    } catch (err) {
      console.error('Error fetching scheduled campaigns:', err);
      setError('Failed to load scheduled campaigns.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScheduled();
  }, [fetchScheduled]);

  const handleCancel = async (campaignId) => {
    setCancelling(campaignId);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/email/schedule/${campaignId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to cancel');
      }
      setScheduled(prev => prev.filter(c => c._id !== campaignId));
    } catch (err) {
      console.error('Error cancelling campaign:', err);
      alert(err.message);
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="sent-view-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Clock size={20} style={{ color: 'var(--color-cyan)' }} />
            Scheduled Campaigns
          </h2>
          <p className="section-subtitle">View and manage email campaigns scheduled for future delivery</p>
        </div>
        <button
          onClick={fetchScheduled}
          title="Refresh"
          style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Scheduled Campaigns */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={16} style={{ color: 'var(--color-cyan)' }} />
          Upcoming Campaigns ({scheduled.length})
        </h3>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <AlertCircle size={32} style={{ marginBottom: '8px' }} />
            <p>{error}</p>
          </div>
        ) : scheduled.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <Clock size={40} style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>No Scheduled Campaigns</h3>
            <p style={{ fontSize: '13px' }}>Go to Email Automation, open a draft's Send Campaign modal, and click "Schedule" to schedule a campaign for future delivery.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px' }}>
            {scheduled.map(campaign => (
              <div
                key={campaign._id}
                className="glass-panel"
                style={{ padding: '20px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                {/* Campaign Name + Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>{campaign.name}</h3>
                    {campaign.draftId?.subject && (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        <Mail size={11} style={{ display: 'inline', marginRight: '4px' }} />
                        {campaign.draftId.subject}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: '11px',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontWeight: '600',
                    backgroundColor: 'var(--color-success-glow)',
                    color: 'var(--color-success)'
                  }}>
                    Scheduled
                  </span>
                </div>

                {/* Schedule Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <Clock size={14} style={{ color: 'var(--color-cyan)' }} />
                    <span>{formatDateTime(campaign.scheduledAt)}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      ({timeUntil(campaign.scheduledAt)})
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <Users size={14} style={{ color: 'var(--color-cyan)' }} />
                    <span>{campaign.recipients?.length || 0} recipients</span>
                  </div>
                </div>

                {/* Cancel Button */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleCancel(campaign._id)}
                    disabled={cancelling === campaign._id}
                    style={{
                      background: 'none',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      cursor: cancelling === campaign._id ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      color: '#ef4444',
                      opacity: cancelling === campaign._id ? 0.6 : 1
                    }}
                  >
                    {cancelling === campaign._id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Trash2 size={12} />
                    )}
                    {cancelling === campaign._id ? 'Cancelling...' : 'Cancel'}
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
