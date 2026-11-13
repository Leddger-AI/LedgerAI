import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Bell, Check, CheckCircle2, RefreshCw } from 'lucide-react';
import { getAuthToken } from './supabaseAuth';
import './AlertsView.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function AlertsView({ onResolveAlert }) {
  const [alerts, setAlerts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const requestRef = useRef(null);
  const refresh = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError('');
    try {
      const token = await getAuthToken();
      if (controller.signal.aborted) return;
      if (!token) throw new Error('Sign in to view your alerts.');
      const response = await fetch(`${API_BASE_URL}/api/alerts`, {
        headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
      });
      if (!response.ok) throw new Error('Could not load alerts. Try again.');
      const data = await response.json();
      if (!Array.isArray(data.alerts)) throw new Error('The alerts response was incomplete. Try again.');
      if (!controller.signal.aborted) {
        setAlerts(data.alerts.map(item => ({
          id: item.id, title: item.title, desc: item.description,
          resolved: item.resolved, createdAt: item.created_at,
        })));
        setLoaded(true);
      }
    } catch (cause) {
      if (!controller.signal.aborted && cause.name !== 'AbortError') setError(cause.message || 'Could not load alerts.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(refresh);
    return () => requestRef.current?.abort();
  }, [refresh]);

  const active = alerts.filter(alert => !alert.resolved);
  const resolved = alerts.filter(alert => alert.resolved);

  const resolve = async id => {
    setSavingId(id);
    setError('');
    const saved = await onResolveAlert?.(id);
    if (saved) setAlerts(previous => previous.map(alert => alert.id === id ? { ...alert, resolved: true } : alert));
    else setError('Could not resolve this alert. Please try again.');
    setSavingId(null);
  };

  return <div className="alerts-page">
    <header className="alerts-page-header">
      <div><span className="alerts-eyebrow">HOME / ALERTS</span>
        <h1>Alerts</h1>
        <p>Review alerts saved to your workspace and track which ones you have resolved.</p></div>
      <button type="button" className="alerts-refresh" onClick={refresh} disabled={loading}><RefreshCw size={16} /> {loading ? 'Updating…' : 'Refresh'}</button>
    </header>
    {error && <div className="alerts-error" role="alert"><AlertCircle size={17} />{error}</div>}
    {!loaded && loading && <p className="alerts-loading" role="status">Loading your alerts…</p>}
    {loaded &&
    <div className="alerts-grid">
      <section className="alerts-panel" aria-labelledby="active-alerts-title">
        <div className="alerts-panel-heading"><div><span className="alerts-eyebrow">NEEDS ATTENTION</span>
          <h2 id="active-alerts-title">Active alerts</h2></div><span className="alerts-count">{active.length}</span></div>
        {active.length === 0 ? <div className="alerts-empty"><CheckCircle2 size={24} />
          <p>No active alerts right now.</p></div>
          : active.map(alert => <article className="alerts-item" key={alert.id}>
            <span className="alerts-item-icon"><Bell size={18} /></span>
            <div><h3>{alert.title}</h3><p>{alert.desc || 'No further details were saved.'}</p>
              <small>{alert.createdAt ? new Date(alert.createdAt).toLocaleString() : 'Saved alert'}</small></div>
            <button type="button" onClick={() => resolve(alert.id)} disabled={savingId === alert.id}>
              <Check size={15} /> {savingId === alert.id ? 'Saving…' : 'Resolve'}
            </button>
          </article>)}
      </section>
      <section className="alerts-panel" aria-labelledby="resolved-alerts-title">
        <div className="alerts-panel-heading"><div><span className="alerts-eyebrow">HISTORY</span>
          <h2 id="resolved-alerts-title">Resolved alerts</h2></div><span className="alerts-count">{resolved.length}</span></div>
        {resolved.length === 0 ? <div className="alerts-empty"><p>No resolved alerts yet.</p></div>
          : resolved.map(alert => <article className="alerts-item" key={alert.id}>
            <span className="alerts-item-icon"><CheckCircle2 size={18} /></span>
            <div><h3>{alert.title}</h3><p>{alert.desc || 'No further details were saved.'}</p>
              <small>Resolved</small></div>
          </article>)}
      </section>
    </div>}
  </div>;
}
