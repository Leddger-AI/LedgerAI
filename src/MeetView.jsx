import { useState, useRef, useEffect } from 'react';
import { Video, Calendar, Clock, Users, Check, PlusCircle, Link2, Download, X } from 'lucide-react';
import { getAuthToken } from './supabaseAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DEFAULT_UPCOMING = [
  { id: 1, candidate: 'Ava Thompson', role: 'Senior Frontend Engineer', time: 'Today, 3:00 PM', duration: '45m', type: 'Technical Interview', link: 'https://meet.jit.si/leddger-ava-thompson-fe' },
  { id: 2, candidate: 'Marcus Lee', role: 'Backend / Rust Engineer', time: 'Tomorrow, 11:00 AM', duration: '30m', type: 'Screening Call', link: 'https://meet.jit.si/leddger-marcus-lee-be' },
  { id: 3, candidate: 'Priya Nair', role: 'Senior Frontend Engineer', time: 'Fri, 2:30 PM', duration: '1h', type: 'Panel Interview', link: 'https://meet.jit.si/leddger-priya-nair-fe' }
];

const DEFAULT_PAST = [
  { id: 4, candidate: 'Daniel Osei', role: 'Summer Internship 2026', time: 'Yesterday', outcome: 'Advanced to next round' },
  { id: 5, candidate: 'Sofia Ramirez', role: 'Backend / Rust Engineer', time: '3 days ago', outcome: 'Not moving forward' }
];

export default function MeetView() {
  const [upcomingMeets, setUpcomingMeets] = useState(DEFAULT_UPCOMING);
  const [pastMeets, setPastMeets] = useState(DEFAULT_PAST);
  const [isLive, setIsLive] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [showScheduler, setShowScheduler] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [role, setRole] = useState('');
  const [scheduledAt, setScheduledAt] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [sendInvite, setSendInvite] = useState(true);
  const [saving, setSaving] = useState(false);
  const copyTimerRef = useRef(null);

  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = await getAuthToken();
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/api/interviews`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setIsLive(true);
        const list = data.interviews || [];
        setUpcomingMeets(
          list
            .filter((i) => i.status === 'scheduled')
            .map((i) => ({
              id: i._id,
              candidate: i.candidateName,
              role: i.role,
              time: new Date(i.scheduledAt).toLocaleString(),
              duration: `${i.durationMinutes || 45}m`,
              type: 'Jitsi Video Room',
              link: i.meetingUrl,
            }))
        );
        setPastMeets(
          list
            .filter((i) => i.status !== 'scheduled')
            .map((i) => ({
              id: i._id,
              candidate: i.candidateName,
              role: i.role,
              time: new Date(i.scheduledAt).toLocaleDateString(),
              outcome: i.status === 'completed' ? 'Completed' : 'Cancelled',
            }))
        );
      } catch { /* keep sample preview */ }
    })();
  }, []);

  const handleSchedule = async (e) => {
    e.preventDefault();
    if (!candidateName.trim()) return;
    setSaving(true);
    try {
      const token = await getAuthToken();
      if (token) {
        const res = await fetch(`${API_BASE_URL}/api/interviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            candidateName: candidateName.trim(),
            candidateEmail: candidateEmail.trim(),
            role: role.trim() || 'Candidate Interview',
            scheduledAt,
            durationMinutes: Number(durationMinutes) || 45,
            sendInvite,
          }),
        });
        if (res.ok) {
          const { interview } = await res.json();
          setUpcomingMeets((prev) => [{
            id: interview._id,
            candidate: interview.candidateName,
            role: interview.role,
            time: new Date(interview.scheduledAt).toLocaleString(),
            duration: `${interview.durationMinutes}m`,
            type: 'Jitsi Video Room',
            link: interview.meetingUrl,
          }, ...prev]);
        }
      } else {
        const slug = candidateName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
        setUpcomingMeets((prev) => [{
          id: Date.now(),
          candidate: candidateName.trim(),
          role: role.trim() || 'Candidate Interview',
          time: new Date(scheduledAt).toLocaleString(),
          duration: `${durationMinutes}m`,
          type: 'Jitsi Video Room',
          link: `https://meet.jit.si/leddger-${slug}-${String(Date.now()).slice(-4)}`,
        }, ...prev]);
      }
      setShowScheduler(false);
      setCandidateName('');
      setCandidateEmail('');
      setRole('');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = (m) => {
    if (!navigator.clipboard?.writeText) return;
    const url = m.link.startsWith('http') ? m.link : `https://${m.link}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(m.id);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedId(null), 1500);
    }).catch(() => {});
  };

  const handleJoin = (m) => {
    if (!m.link) return;
    const url = m.link.startsWith('http') ? m.link : `https://${m.link}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadIcs = async (m) => {
    const token = await getAuthToken();
    if (!token || !/^[a-f0-9]{24}$/i.test(String(m.id))) return;
    const res = await fetch(`${API_BASE_URL}/api/interviews/${m.id}/ics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-${m.id}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="meet-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Video size={20} style={{ color: 'var(--color-cyan)' }} />
            Candidate Meetings
          </h2>
          <p className="section-subtitle">Schedule Jitsi video interviews with automatic .ics calendar invites</p>
          <span className={`confidence-badge ${isLive ? 'high' : 'low'}`} style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 'bold' }}>
            {isLive ? 'Live Jitsi + ICS' : 'Sample preview'}
          </span>
        </div>
        <button
          type="button"
          className="table-action-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: 'rgba(20, 20, 20, 0.06)', borderColor: 'var(--border-color)' }}
          onClick={() => setShowScheduler((v) => !v)}
        >
          {showScheduler ? <X size={16} /> : <PlusCircle size={16} />}
          <span>{showScheduler ? 'Close' : 'Schedule Meeting'}</span>
        </button>
      </div>

      {showScheduler && (
        <form onSubmit={handleSchedule} className="glass-panel" style={{ padding: '20px', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <input type="text" placeholder="Candidate Name *" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} required style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
          <input type="email" placeholder="Candidate Email (for .ics invite)" value={candidateEmail} onChange={(e) => setCandidateEmail(e.target.value)} style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
          <input type="text" placeholder="Role (e.g. Frontend Engineer)" value={role} onChange={(e) => setRole(e.target.value)} style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
          <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
          <input type="number" min="15" max="180" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <input type="checkbox" checked={sendInvite} onChange={(e) => setSendInvite(e.target.checked)} />
            Send .ics Email Invite
          </label>
          <button type="submit" className="table-action-btn" disabled={saving} style={{ padding: '8px 14px', backgroundColor: 'var(--color-cyan-glow)' }}>
            {saving ? 'Scheduling...' : 'Create Jitsi Room'}
          </button>
        </form>
      )}

      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Upcoming Meetings</span>
            <div className="kpi-icon-wrapper cyan"><Calendar size={16} /></div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{upcomingMeets.length} Scheduled</span>
            <span className="kpi-trend positive">Jitsi Meet Ready</span>
          </div>
        </div>
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Interview Hours</span>
            <div className="kpi-icon-wrapper purple"><Clock size={16} /></div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{(upcomingMeets.length * 0.75).toFixed(2)} hrs</span>
            <span className="kpi-trend positive">Scheduled</span>
          </div>
        </div>
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Candidates Interviewed</span>
            <div className="kpi-icon-wrapper cyan"><Users size={16} /></div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{pastMeets.length} Completed</span>
            <span className="kpi-trend positive">This month</span>
          </div>
        </div>
      </div>

      {/* Upcoming meetings list */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>Upcoming Interviews</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {upcomingMeets.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid var(--border-color)', borderRadius: '10px', backgroundColor: 'rgba(20,20,20,0.02)' }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--text-primary)' }}>{m.candidate}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{m.role} &middot; {m.type}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)' }}>{m.time}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.duration}</div>
                </div>
                {/^[a-f0-9]{24}$/i.test(String(m.id)) && (
                  <button type="button" onClick={() => handleDownloadIcs(m)} title="Download .ics invite" style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <Download size={12} /> .ics
                  </button>
                )}
                <button type="button"
                  onClick={() => handleCopy(m)}
                  style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-secondary)' }}
                >
                  {copiedId === m.id ? <Check size={12} style={{ color: 'var(--color-success)' }} /> : <Link2 size={12} />}
                  {copiedId === m.id ? 'Copied' : 'Copy Link'}
                </button>
                <button
                  type="button"
                  className="table-action-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', fontSize: '12px', backgroundColor: 'var(--color-success-glow)', borderColor: 'transparent', color: 'var(--color-success)' }}
                  onClick={() => handleJoin(m)}
                >
                  <Video size={13} />
                  Join
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Past meetings */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>Past Interviews</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="meetings-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Candidate</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Role</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>When</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {pastMeets.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                  <td style={{ padding: '14px 16px', fontWeight: '600', color: 'var(--text-primary)' }}>{m.candidate}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{m.role}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{m.time}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      fontSize: '11px', padding: '3px 8px', borderRadius: '4px', fontWeight: '600',
                      backgroundColor: m.outcome.includes('Advanced') || m.outcome === 'Completed' ? 'var(--color-success-glow)' : 'var(--color-danger-glow)',
                      color: m.outcome.includes('Advanced') || m.outcome === 'Completed' ? 'var(--color-success)' : 'var(--color-danger)'
                    }}>
                      {m.outcome}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
