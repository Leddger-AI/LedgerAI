import { useState, useEffect, useRef } from 'react';
import { Timer, Play, Pause, RotateCcw, Save, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getAuthToken } from '../supabaseAuth';
import './HomePages.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function LiveTicker() {
  const [rate, setRate] = useState(null);
  const [rateError, setRateError] = useState('');
  const [attendees, setAttendees] = useState(4);
  const [title, setTitle] = useState('Live meeting');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const startRef = useRef(0);
  const firstStartedAtRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getAuthToken();
        if (!token) throw new Error('Sign in to load your account rate.');
        const res = await fetch(`${API_BASE_URL}/api/rates`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Could not load your account rate.');
        const d = await res.json();
        if (!Number.isFinite(Number(d.defaultHourlyRate))) throw new Error('Account rate is unavailable.');
        setRate(Number(d.defaultHourlyRate));
      } catch (cause) { setRateError(cause.message || 'Account rate is unavailable.'); }
    })();
    return () => clearInterval(timerRef.current);
  }, []);

  const cost = rate === null ? null : (elapsed / 3600) * rate * Math.max(attendees, 1);
  const tone = cost >= 200 ? 'red' : cost >= 50 ? 'amber' : '';

  const start = () => {
    if (rate === null) return;
    if (firstStartedAtRef.current === null) firstStartedAtRef.current = Date.now();
    startRef.current = Date.now() - elapsed * 1000;
    setRunning(true);
    timerRef.current = setInterval(() => setElapsed((Date.now() - startRef.current) / 1000), 500);
  };
  const pause = () => {
    clearInterval(timerRef.current);
    setElapsed((Date.now() - startRef.current) / 1000);
    setRunning(false);
  };
  const reset = () => {
    clearInterval(timerRef.current);
    setRunning(false);
    setElapsed(0);
    firstStartedAtRef.current = null;
    setStatus(null);
  };

  const fmt = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const save = async () => {
    if (elapsed < 1 || rate === null || !title.trim()) return;
    setSaving(true);
    setStatus(null);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          startTime: new Date(firstStartedAtRef.current).toISOString(),
          endTime: new Date().toISOString(),
          durationMinutes: Math.max(1, Math.round(elapsed / 60)),
          attendees: Array.from({ length: attendees }, (_, i) => ({ name: `Attendee ${i + 1}` })),
          aiProject: 'Internal Operations',
          aiConfidence: 50,
          requiresHumanReview: true,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      reset();
      setStatus({ type: 'success', message: 'Meeting saved. Review its attribution in the queue.' });
    } catch {
      setStatus({ type: 'error', message: 'Failed to save meeting.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="home-page">
      <div className="home-head">
        <h2>Live Ticker</h2>
        <p>Watch the money tick while you meet. Green → amber at $50 → red at $200.</p>
      </div>
      <div className="home-grid-2">
        <div className="home-card" style={{ textAlign: 'center' }}>
          <div className={`ticker-num ${tone}`}>{cost === null ? '—' : `$${cost.toFixed(2)}`}</div>
          <div className="ticker-sub"><Timer size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> {fmt(elapsed)} elapsed</div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
            {!running
              ? <button className="home-btn primary" onClick={start} disabled={rate === null}><Play size={14} /> Start</button>
              : <button className="home-btn" onClick={pause}><Pause size={14} /> Pause</button>}
            <button className="home-btn" onClick={reset}><RotateCcw size={14} /> Reset</button>
            <button className="home-btn teal" onClick={save} disabled={saving || elapsed < 1 || rate === null || !title.trim()}>
              {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save
            </button>
          </div>
          {status && <div className={`ea-test-status ${status.type}`} style={{ marginTop: '12px' }}>{status.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}{status.message}</div>}
          {rateError && <div className="ea-test-status error" role="alert" style={{ marginTop: '12px' }}><AlertTriangle size={14} />{rateError}</div>}
        </div>
        <div className="home-card">
          <div className="home-row">
            <div><div className="home-title">Title</div></div>
            <div className="home-actions"><input className="home-input" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%' }} /></div>
          </div>
          <div className="home-row">
            <div><div className="home-title">Hourly rate</div><div className="home-meta">Per attendee</div></div>
            <div className="home-actions">
              <span className="home-chip">{rate === null ? 'Loading rate…' : `Account default $${rate}/h`}</span>
            </div>
          </div>
          <div className="home-row">
            <div><div className="home-title">Attendees</div></div>
            <div className="home-actions">
              <button className="home-btn" onClick={() => setAttendees(Math.max(1, attendees - 1))}>−</button>
              <span className="home-chip">{attendees}</span>
              <button className="home-btn" onClick={() => setAttendees(Math.min(200, attendees + 1))}>+</button>
            </div>
          </div>
          <div className="home-row">
            <div><div className="home-title">Burn rate</div></div>
            <div className="home-actions"><span className="home-chip">{rate === null ? '—' : `$${((rate * attendees) / 60).toFixed(2)}/min`}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
