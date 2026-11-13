import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Clock3, RefreshCw, Timer, Video } from 'lucide-react';
import { getAuthToken } from './supabaseAuth';
import './MeetView.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function when(value) {
  if (!value) return 'No time set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'No time set' : date.toLocaleString();
}

export default function MeetView({ onNavigate }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
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
      if (!token) throw new Error('Sign in to view your meetings.');
      const response = await fetch(`${API_BASE_URL}/api/meetings`, {
        headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
      });
      if (!response.ok) throw new Error('Could not load your meetings. Try again.');
      const data = await response.json();
      if (!Array.isArray(data.meetings)) throw new Error('The meetings response was incomplete. Try again.');
      if (!controller.signal.aborted) setMeetings(data.meetings);
    } catch (cause) {
      if (!controller.signal.aborted && cause.name !== 'AbortError') {
        setError(cause.message || 'Could not load your meetings.');
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(refresh);
    return () => requestRef.current?.abort();
  }, [refresh]);

  const reviewCount = meetings.filter(meeting => meeting.requires_human_review).length;
  const totalCost = meetings.reduce((sum, meeting) => sum + (Number(meeting.cost) || 0), 0);
  const go = tab => onNavigate?.(tab);

  return <div className="meeting-log">
    <header className="meeting-log-header">
      <div><span className="meeting-log-eyebrow">WORKSPACE / MEETINGS</span><h1>Meeting log</h1>
        <p>Saved meetings, their estimated time cost, and attribution review.</p></div>
      <button type="button" className="meeting-log-refresh" onClick={refresh} disabled={loading}>
        <RefreshCw size={16} aria-hidden="true" /> {loading ? 'Updating…' : 'Refresh'}
      </button>
    </header>

    {error && <div className="meeting-log-error" role="alert"><AlertCircle size={17} />
      <span>{error}</span><button type="button" onClick={refresh}>Try again</button></div>}

    {(!error || meetings.length > 0) && <div className="meeting-log-summary" aria-label="Meeting summary">
      <div><span>Saved meetings</span><strong>{loading && !meetings.length ? '—' : meetings.length}</strong></div>
      <div><span>Need attribution review</span><strong>{loading && !meetings.length ? '—' : reviewCount}</strong></div>
      <div><span>Estimated time cost</span><strong>{loading && !meetings.length ? '—' : `$${totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}</strong></div>
    </div>}

    {(!error || meetings.length > 0) && <section className="meeting-log-list" aria-labelledby="meeting-log-title">
      <div className="meeting-log-list-head"><h2 id="meeting-log-title">Recent records</h2>
        <button type="button" onClick={() => go('Live Ticker')}><Timer size={16} /> Record a meeting</button></div>
      {loading && !meetings.length ? <p className="meeting-log-empty" role="status">Loading your meetings…</p>
        : !error && meetings.length === 0 ? <div className="meeting-log-empty"><Video size={24} />
          <p>No meetings saved yet.</p><button type="button" onClick={() => go('Live Ticker')}>Record your first meeting <ArrowRight size={15} /></button>
        </div> : meetings.map(meeting => <div className="meeting-log-row" key={meeting.id}>
          <div className="meeting-log-row-main"><strong>{meeting.title || 'Untitled meeting'}</strong>
            <span><Clock3 size={14} /> {when(meeting.start_time || meeting.created_at)} · {Number(meeting.duration_minutes) || 0} min · {meeting.ai_project || 'Unattributed'}</span></div>
          <div className="meeting-log-row-end">
            <span className="meeting-log-cost">${(Number(meeting.cost) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            {meeting.requires_human_review
              ? <button type="button" onClick={() => go('Attribution')}>Review attribution <ArrowRight size={15} /></button>
              : <span className="meeting-log-status">Attributed</span>}
          </div>
        </div>)}
    </section>}
  </div>;
}
