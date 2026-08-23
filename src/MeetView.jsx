import { useMemo, useState } from 'react';
import { Video, Calendar, Link2, FolderClock, Check, ChevronRight } from 'lucide-react';
import MeetingCalendarWidget from './components/MeetingCalendarWidget.jsx';
import './MeetView.css';

// Dates are computed relative to "now" at load time (not hardcoded to a
// fixed month, unlike the older mock data) so the relative labels
// ("Today", "Tomorrow", "Yesterday") and the calendar's dot markers stay
// meaningful no matter when this page is opened.
const daysFromNow = (n, hour, minute) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const rawMeetings = [
  { id: 1, candidate: 'Ava Thompson', role: 'Senior Frontend Engineer', type: 'Technical Interview', date: daysFromNow(0, 15, 0), duration: 45, link: 'meet.ledgerai.app/ava-thompson-fe', status: 'upcoming' },
  { id: 2, candidate: 'Marcus Lee', role: 'Backend / Rust Engineer', type: 'Screening Call', date: daysFromNow(1, 11, 0), duration: 30, link: 'meet.ledgerai.app/marcus-lee-be', status: 'upcoming' },
  { id: 3, candidate: 'Priya Nair', role: 'Senior Frontend Engineer', type: 'Panel Interview', date: daysFromNow(4, 14, 30), duration: 60, link: 'meet.ledgerai.app/priya-nair-fe', status: 'upcoming' },
  { id: 4, candidate: 'Daniel Osei', role: 'Summer Internship 2026', type: 'Screening Call', date: daysFromNow(-1, 10, 0), duration: 30, outcome: 'Advanced to next round', status: 'past' },
  { id: 5, candidate: 'Sofia Ramirez', role: 'Backend / Rust Engineer', type: 'Technical Interview', date: daysFromNow(-3, 13, 0), duration: 45, outcome: 'Not moving forward', status: 'past' },
];

const QUICK_ACTIONS = [
  { id: 'instant', label: 'Start an Instant Meeting', description: 'Launch a meeting immediately with your team.', icon: Video, highlighted: true, wide: true },
  { id: 'scheduled', label: 'Set a Scheduled Meeting', description: 'Pick a date and time to notify your team in advance.', icon: Calendar },
  { id: 'history', label: 'Meeting History', description: 'Access recordings, notes, and attendance logs.', icon: FolderClock, scrollTo: 'meeting-schedule' },
];

function formatRelativeDay(date, today) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((d - t) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays < 0 && diffDays >= -6) return `${Math.abs(diffDays)} days ago`;
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(date) {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function avatarUrl(name) {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
}

export default function MeetView({ meetings: meetingsProp }) {
  const [copiedId, setCopiedId] = useState(null);
  const today = useMemo(() => new Date(), []);

  // meetingsProp is accepted so this component is ready to take real data
  // once the backend is wired up — it's unused for now (mock only).
  const meetings = meetingsProp && meetingsProp.length > 0 ? meetingsProp : rawMeetings;

  const sorted = useMemo(
    () => [...meetings].sort((a, b) => a.date - b.date),
    [meetings]
  );

  const upcomingCount = meetings.filter(m => m.status === 'upcoming').length;
  const pastCount = meetings.filter(m => m.status === 'past').length;

  const markersByMonth = useMemo(() => {
    const map = {};
    meetings.forEach(m => {
      const key = `${m.date.getFullYear()}-${m.date.getMonth()}`;
      if (!map[key]) map[key] = {};
      const color = m.status === 'past' ? (m.outcome?.includes('Advanced') ? 'green' : 'red') : 'green';
      map[key][m.date.getDate()] = color;
    });
    return map;
  }, [meetings]);

  const handleCopy = async (m) => {
    try {
      await navigator.clipboard?.writeText(`https://${m.link}`);
      setCopiedId(m.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.warn('Failed to copy meeting link to clipboard:', err);
    }
  };

  const handleQuickAction = (action) => {
    if (action.scrollTo) {
      document.getElementById(action.scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Other quick actions are not wired up yet — UI-only for now.
  };

  return (
    <div className="meet-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Video size={20} style={{ color: 'var(--color-cyan)' }} />
            Candidate Meetings
          </h2>
          <p className="section-subtitle">Plan interviews, check schedules, and stay connected with your candidates.</p>
        </div>
      </div>

      <div className="meet-top-grid">
        <div className="meet-quick-actions">
          {QUICK_ACTIONS.map(action => {
            const Icon = action.icon;
            const cardClass = [
              'glass-panel',
              'meet-quick-action-card',
              action.highlighted ? 'meet-quick-action-highlighted' : '',
              action.wide ? 'meet-quick-action-wide' : '',
            ].filter(Boolean).join(' ');
            return (
              <button
                type="button"
                key={action.id}
                className={cardClass}
                onClick={() => handleQuickAction(action)}
              >
                <span className="meet-quick-action-icon"><Icon size={action.wide ? 24 : 20} /></span>
                <span className="meet-quick-action-text">
                  <span className="meet-quick-action-label">{action.label}</span>
                  <span className="meet-quick-action-desc">{action.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        <MeetingCalendarWidget markersByMonth={markersByMonth} today={today} />
      </div>

      <div className="glass-panel meet-schedule-panel" id="meeting-schedule">
        <div className="meet-schedule-header">
          <div>
            <h3 className="meet-schedule-title">Meeting Schedule</h3>
            <p className="meet-schedule-subtitle">{upcomingCount} upcoming &middot; {pastCount} past</p>
          </div>
        </div>

        <div className="meet-schedule-list">
          {sorted.map(m => (
            <div key={m.id} className="meet-schedule-row">
              <img className="meet-avatar" src={avatarUrl(m.candidate)} alt={m.candidate} />

              <div className="meet-schedule-main">
                <div className="meet-schedule-candidate">{m.candidate}</div>
                <div className="meet-schedule-meta">{m.role} &middot; {m.type}</div>
              </div>

              <div className="meet-schedule-when">
                <div className="meet-schedule-date">{formatRelativeDay(m.date, today)}</div>
                <div className="meet-schedule-time">{formatTime(m.date)} &middot; {formatDuration(m.duration)}</div>
              </div>

              {m.status === 'upcoming' ? (
                <div className="meet-schedule-actions">
                  <button type="button" className="meet-icon-btn" onClick={() => handleCopy(m)} title="Copy meeting link">
                    {copiedId === m.id ? <Check size={14} style={{ color: 'var(--color-success)' }} /> : <Link2 size={14} />}
                  </button>
                  <button type="button" className="meet-icon-btn meet-icon-btn-primary" title="Join meeting">
                    <Video size={14} />
                  </button>
                </div>
              ) : (
                <span className={`meet-outcome-badge ${m.outcome?.includes('Advanced') ? 'positive' : 'negative'}`}>
                  {m.outcome}
                </span>
              )}

              <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
