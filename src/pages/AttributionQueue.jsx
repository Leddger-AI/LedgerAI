import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Loader2, AlertTriangle, GitBranch, Scale } from 'lucide-react';
import { getAuthToken } from '../supabaseAuth';
import './HomePages.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const PROJECTS = ['Project Phoenix', 'Client ABC Onboarding', 'Q4 Marketing Strategy', 'Corporate Operations', 'Internal Operations'];

function normConf(m) {
  const c = Number(m.ai_confidence ?? m.aiConfidence ?? 100);
  return c <= 1 ? c * 100 : c;
}

export default function AttributionQueue() {
  const [meetings, setMeetings] = useState([]);
  const [splits, setSplits] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acting, setActing] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editProject, setEditProject] = useState('');
  const [splitId, setSplitId] = useState(null);
  const [splitA, setSplitA] = useState({ project: PROJECTS[0], pct: 50 });
  const [splitB, setSplitB] = useState({ project: PROJECTS[3], pct: 50 });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      if (!token) { setError('Not authenticated.'); return; }
      const [mRes, sRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/meetings`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/meetings/splits`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (mRes.ok) {
        const d = await mRes.json();
        setMeetings(d.meetings || []);
      }
      if (sRes.ok) {
        const d = await sRes.json();
        const map = {};
        (d.splits || []).forEach((s) => { map[s.meetingId] = s; });
        setSplits(map);
      }
    } catch {
      setError('Failed to load queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchAll, 0);
    return () => clearTimeout(t);
  }, [fetchAll]);

  const queue = meetings.filter((m) => m.requires_human_review || normConf(m) < 70);

  const applyAttribution = async (m, project, reason) => {
    setActing(m.id);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/meetings/${m.id}/attribution`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ aiProject: project, overrideReason: reason || null }),
      });
      if (!res.ok) throw new Error('Failed');
      setEditId(null);
      fetchAll();
    } catch {
      setError('Failed to update attribution.');
    } finally {
      setActing(null);
    }
  };

  const applySplit = async (m) => {
    if (splitA.pct + splitB.pct !== 100) { setError('Split must sum to 100.'); return; }
    setActing(m.id);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/meetings/${m.id}/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ parts: [{ aiProject: splitA.project, pct: Number(splitA.pct) }, { aiProject: splitB.project, pct: Number(splitB.pct) }] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSplitId(null);
      fetchAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setActing(null);
    }
  };

  if (loading) return <div className="home-empty"><Loader2 size={20} className="spin" /> Loading review queue…</div>;

  return (
    <div className="home-page">
      <div className="home-head">
        <h2>Attribution Queue</h2>
        <p>Accept, change, or split ambiguous meetings. Every decision is audit-logged.</p>
      </div>
      {error && <div className="ea-test-status error"><AlertTriangle size={14} />{error}</div>}
      <div className="home-card">
        {queue.length === 0 ? (
          <div className="home-empty"><CheckCircle2 size={28} style={{ color: '#059669' }} /><p>Queue clear — every meeting is confidently attributed.</p></div>
        ) : queue.map((m) => (
          <div key={m.id}>
            <div className="home-row">
              <Scale size={16} style={{ color: '#0E9384', flexShrink: 0 }} />
              <div>
                <div className="home-title">{m.title}</div>
                <div className="home-meta">
                  {m.duration_minutes}m · {(m.attendees || []).length} attendees · {m.ai_project || 'Unattributed'} ({Math.round(normConf(m))}%)
                  {splits[m.id] && ` · split ${splits[m.id].parts.map((p) => `${p.aiProject} ${p.pct}%`).join(' / ')}`}
                </div>
              </div>
              <div className="home-actions">
                <button className="home-btn" disabled={acting === m.id} onClick={() => applyAttribution(m, m.ai_project || 'Internal Operations', 'accepted as-is')}>Accept</button>
                <button className="home-btn" onClick={() => { setEditId(editId === m.id ? null : m.id); setEditProject(m.ai_project || PROJECTS[0]); }}>Change</button>
                <button className="home-btn" onClick={() => setSplitId(splitId === m.id ? null : m.id)}><GitBranch size={14} /> Split</button>
              </div>
            </div>
            {editId === m.id && (
              <div className="home-row">
                <select className="home-select" value={editProject} onChange={(e) => setEditProject(e.target.value)}>
                  {PROJECTS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <div className="home-actions">
                  <button className="home-btn teal" disabled={acting === m.id} onClick={() => applyAttribution(m, editProject, 'manual re-tag')}>Apply</button>
                </div>
              </div>
            )}
            {splitId === m.id && (
              <div className="home-row">
                <select className="home-select" value={splitA.project} onChange={(e) => setSplitA({ ...splitA, project: e.target.value })}>
                  {PROJECTS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <input className="home-input" type="number" min="1" max="99" value={splitA.pct} onChange={(e) => setSplitA({ ...splitA, pct: Number(e.target.value) })} style={{ width: '80px' }} />
                <select className="home-select" value={splitB.project} onChange={(e) => setSplitB({ ...splitB, project: e.target.value })}>
                  {PROJECTS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <input className="home-input" type="number" min="1" max="99" value={splitB.pct} onChange={(e) => setSplitB({ ...splitB, pct: Number(e.target.value) })} style={{ width: '80px' }} />
                <div className="home-actions">
                  <button className="home-btn teal" disabled={acting === m.id} onClick={() => applySplit(m)}>Split {splitA.pct + splitB.pct}%</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
