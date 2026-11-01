import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { getAuthToken } from '../supabaseAuth';
import '../EmailAutomationView.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const retryable = new Set(['failed', 'pending', 'unknown']);
const displayStatus = campaign => campaign.status === 'sent' && (campaign.failedCount || campaign.suppressedCount) ? 'partial' : campaign.status;

export default function SentView() {
  const [campaigns, setCampaigns] = useState([]);
  const [detail, setDetail] = useState(null);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const retryRequestId = useRef(null);

  const authFetch = useCallback(async (path, options = {}) => {
    const token = await getAuthToken();
    if (!token) throw new Error('Not authenticated');
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await authFetch('/api/email/campaigns?status=sent,partial,failed,needs_review');
      setCampaigns(data.campaigns || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [authFetch]);

  useEffect(() => {
    const timer = setTimeout(refresh, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const openDetail = async id => {
    setError(null); setMessage(null);
    try {
      const { campaign } = await authFetch(`/api/email/campaigns/${id}`);
      setDetail(campaign);
      setSelected(campaign.recipients.filter(r => ['failed', 'pending'].includes(r.status)).map(r => r._id));
      retryRequestId.current = crypto.randomUUID();
    } catch (err) { setError(err.message); }
  };

  const retry = async () => {
    const rows = detail.recipients.filter(r => selected.includes(r._id));
    if (!rows.length) return;
    const includeUnknown = rows.some(r => r.status === 'unknown');
    if (includeUnknown && !window.confirm('Some deliveries may already have succeeded. Retry these uncertain recipients anyway?')) return;
    setBusy(true); setError(null);
    try {
      const data = await authFetch(`/api/email/campaigns/${detail._id}/retry`, {
        method: 'POST', body: JSON.stringify({ recipientIds: selected, includeUnknown, requestId: retryRequestId.current }),
      });
      setMessage(`Retry queued as campaign ${data.campaignId}. Track it in Email Automation.`);
      setSelected([]);
      retryRequestId.current = crypto.randomUUID();
      await refresh();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="sent-view-container">
      <div className="section-header">
        <div><h2 className="section-title"><Send size={20} /> Sent Emails</h2><p className="section-subtitle">Campaign delivery and retry history</p></div>
        <button className="ea-refresh-btn" onClick={refresh}><RefreshCw size={14} /> Refresh</button>
      </div>
      {error && <div className="ea-test-status error"><AlertCircle size={14} /> {error}</div>}
      {message && <div className="ea-test-status success">{message}</div>}
      <div className="glass-panel" style={{ padding: 24 }}>
        {loading ? <Loader2 className="animate-spin" /> : campaigns.length === 0 ? <p>No completed campaigns yet.</p> : (
          <div style={{ overflowX: 'auto' }}><table className="email-history-table"><thead><tr><th>Campaign</th><th>Status</th><th>Sent</th><th>Failed</th><th>Suppressed</th><th>Recipients</th><th>Completed</th></tr></thead><tbody>
            {campaigns.map(c => <tr key={c._id}>
              <td><button className="ea-refresh-btn" onClick={() => openDetail(c._id)}>{c.name}</button></td><td>{displayStatus(c)}</td><td>{c.sentCount}</td><td>{c.failedCount}</td><td>{c.suppressedCount || 0}</td><td>{c.recipients?.length || 0}</td><td>{c.sentAt ? new Date(c.sentAt).toLocaleString() : '—'}</td>
            </tr>)}
          </tbody></table></div>
        )}
      </div>
      {detail && <div className="glass-panel" style={{ padding: 24, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><h3>{detail.name} · {displayStatus(detail)}</h3><button onClick={() => setDetail(null)}>Close</button></div>
        {detail.lastError && <p role="alert">{detail.lastError}</p>}
        <p>Select failed or pending recipients to retry. Unknown results require confirmation.</p>
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>{detail.recipients.map(r => <label key={r._id} style={{ display: 'flex', gap: 12, padding: 6 }}>
          <input type="checkbox" disabled={!retryable.has(r.status)} checked={selected.includes(r._id)} onChange={e => { retryRequestId.current = crypto.randomUUID(); setSelected(prev => e.target.checked ? [...prev, r._id] : prev.filter(id => id !== r._id)); }} />
          <span>{r.email}</span><strong>{r.status}</strong><span>{r.error}</span>
        </label>)}</div>
        <button className="ea-save-config-btn" disabled={busy || !selected.length} onClick={retry}>{busy ? 'Queueing...' : `Retry ${selected.length} selected`}</button>
      </div>}
    </div>
  );
}
