import React, { useState, useEffect, useCallback } from 'react';
import { Send, Mail, Clock, CheckCircle2, XCircle, Loader2, RefreshCw, Calendar, AlertCircle } from 'lucide-react';
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

export default function SentView() {
  const [sendLog, setSendLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSendLog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      if (!token) { setError('Not authenticated.'); return; }
      const res = await fetch(`${API_BASE_URL}/api/email/send-log`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch send log');
      const data = await res.json();
      setSendLog(data.sendLog || []);
    } catch (err) {
      console.error('Error fetching send log:', err);
      setError('Failed to load send history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSendLog();
  }, [fetchSendLog]);

  const totalSent = sendLog.reduce((acc, e) => acc + (e.sent_count || 0), 0);
  const totalFailed = sendLog.reduce((acc, e) => acc + (e.failed_count || 0), 0);
  const totalRecipients = sendLog.reduce((acc, e) => acc + (e.recipient_count || 0), 0);

  return (
    <div className="sent-view-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Send size={20} style={{ color: 'var(--color-cyan)' }} />
            Sent Emails
          </h2>
          <p className="section-subtitle">Track every email campaign you've sent — sender, recipients, and delivery status</p>
        </div>
        <button
          className="ea-refresh-btn"
          onClick={fetchSendLog}
          title="Refresh"
          style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* KPI Stats */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Campaigns</span>
            <div className="kpi-icon-wrapper cyan"><Send size={16} /></div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{sendLog.length}</span>
            <span className="kpi-trend positive">All time</span>
          </div>
        </div>
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Emails Delivered</span>
            <div className="kpi-icon-wrapper"><CheckCircle2 size={16} /></div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{totalSent}</span>
            <span className="kpi-trend positive">{totalRecipients} recipients</span>
          </div>
        </div>
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Failed Deliveries</span>
            <div className="kpi-icon-wrapper"><XCircle size={16} /></div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{totalFailed}</span>
            <span className="kpi-trend">{totalRecipients > 0 ? `${Math.round((totalFailed / totalRecipients) * 100)}% failure rate` : 'No failures'}</span>
          </div>
        </div>
      </div>

      {/* Send Log Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Mail size={16} style={{ color: 'var(--color-cyan)' }} />
          Campaign History
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
        ) : sendLog.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <Send size={40} style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>No Emails Sent Yet</h3>
            <p style={{ fontSize: '13px' }}>Send a campaign from the Email Automation tab to see it here.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="meetings-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Draft Title</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Sender Email</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Recipients</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Sent</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Failed</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Sent At</th>
                </tr>
              </thead>
              <tbody>
                {sendLog.map((entry) => (
                  <tr key={entry.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                    <td style={{ padding: '14px 16px', fontWeight: '600', color: 'var(--text-primary)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.draft_title}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Mail size={12} style={{ color: 'var(--color-cyan)' }} />
                        {entry.sender_email}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{entry.recipient_count}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontWeight: '600', color: 'var(--color-success)' }}>{entry.sent_count}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontWeight: '600', color: entry.failed_count > 0 ? 'var(--color-warning)' : 'var(--text-muted)' }}>{entry.failed_count}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: '600',
                        backgroundColor: entry.status === 'sent' ? 'var(--color-success-glow)' : entry.status === 'failed' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(20,20,20,0.06)',
                        color: entry.status === 'sent' ? 'var(--color-success)' : entry.status === 'failed' ? '#ef4444' : 'var(--text-muted)'
                      }}>
                        {entry.status ? entry.status.charAt(0).toUpperCase() + entry.status.slice(1) : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        {formatDateTime(entry.sent_at)}
                      </span>
                    </td>
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
