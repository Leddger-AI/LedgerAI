import { useState, useEffect, useCallback } from 'react';
import { Wallet, Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { getAuthToken } from '../supabaseAuth';
import './HomePages.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Budgets() {
  const [rows, setRows] = useState([]);
  const [month, setMonth] = useState('');
  const [hourly, setHourly] = useState(75);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [project, setProject] = useState('');
  const [cap, setCap] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      if (!token) { setError('Not authenticated.'); return; }
      const [bRes, oRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/budgets`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/budgets/overview`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (oRes.ok) {
        const d = await oRes.json();
        setRows(d.rows || []);
        setMonth(d.month || '');
        setHourly(d.hourlyRate || 75);
      } else if (bRes.ok) {
        const d = await bRes.json();
        setRows((d.budgets || []).map((b) => ({ project: b.project, monthlyCap: b.monthlyCap, spent: 0, pct: 0 })));
      }
      if (!oRes.ok && !bRes.ok) setError('Failed to load budgets.');
    } catch {
      setError('Failed to load budgets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchAll, 0);
    return () => clearTimeout(t);
  }, [fetchAll]);

  const save = async () => {
    if (!project.trim() || cap === '') return;
    setSaving(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/budgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ project: project.trim(), monthlyCap: Number(cap) }),
      });
      if (!res.ok) throw new Error('Failed');
      setProject('');
      setCap('');
      fetchAll();
    } catch {
      setError('Failed to save budget.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    try {
      const token = await getAuthToken();
      const listRes = await fetch(`${API_BASE_URL}/api/budgets`, { headers: { Authorization: `Bearer ${token}` } });
      const list = await listRes.json().catch(() => ({}));
      const match = (list.budgets || []).find((b) => b.project === row.project);
      if (!match) { fetchAll(); return; }
      await fetch(`${API_BASE_URL}/api/budgets/${match._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAll();
    } catch {
      setError('Failed to delete budget.');
    }
  };

  if (loading) return <div className="home-empty"><Loader2 size={20} className="spin" /> Loading budgets…</div>;

  return (
    <div className="home-page">
      <div className="home-head">
        <h2>Budgets</h2>
        <p>{month ? `Live spend for ${month}` : 'Monthly caps'} · rate ${hourly}/h · breach at 100%.</p>
      </div>
      {error && <div className="ea-test-status error"><AlertTriangle size={14} />{error}</div>}
      <div className="home-card">
        <div className="home-row">
          <Wallet size={16} style={{ color: '#0E9384', flexShrink: 0 }} />
          <input className="home-input" value={project} onChange={(e) => setProject(e.target.value)} placeholder="Project name" style={{ flex: 2 }} />
          <input className="home-input" type="number" min="0" value={cap} onChange={(e) => setCap(e.target.value)} placeholder="Monthly cap $" style={{ flex: 1 }} />
          <div className="home-actions">
            <button className="home-btn primary" onClick={save} disabled={saving || !project.trim() || cap === ''}>
              <Plus size={14} /> {saving ? 'Saving…' : 'Set cap'}
            </button>
          </div>
        </div>
      </div>
      <div className="home-card">
        {rows.length === 0 ? (
          <div className="home-empty">No budgets yet — set a monthly cap above.</div>
        ) : rows.map((r) => {
          const spent = Number(r.spent) || 0;
          const pct = Number(r.pct) || 0;
          const tone = r.monthlyCap > 0 ? (pct >= 100 ? 'red' : pct >= 80 ? 'amber' : '') : '';
          return (
            <div key={r.project} style={{ padding: '12px 0', borderTop: '1px solid #F1F5F9' }}>
              <div className="home-row" style={{ borderTop: 'none', padding: '0 0 8px 0' }}>
                <div>
                  <div className="home-title">{r.project}</div>
                  <div className="home-meta">${spent.toFixed(2)} spent{r.monthlyCap > 0 ? ` of $${r.monthlyCap}` : ' · no cap set'}</div>
                </div>
                <div className="home-actions">
                  {r.monthlyCap > 0 && <span className={`home-chip ${tone || 'teal'}`}>{pct}%</span>}
                  {r.monthlyCap > 0 && pct >= 100 && <span className="home-chip red">BREACH</span>}
                  {r.monthlyCap > 0 && <button className="home-btn" onClick={() => remove(r)}><Trash2 size={14} /></button>}
                </div>
              </div>
              {r.monthlyCap > 0 && (
                <div className="home-bar"><div className={`home-fill ${tone}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
