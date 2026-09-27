import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import {
  Search, Mic, CalendarDays, ArrowRight, Lock, Mail, ShieldCheck,
} from 'lucide-react';
import { getAuthToken } from '../supabaseAuth';
import './OverviewDashboard.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const ACCENT = '#E4573D';

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export default function OverviewDashboard({ dynamicData, projectSpendsSum, meetings, onNavigate }) {
  const [senderOk, setSenderOk] = useState(null);
  const [monthSpend, setMonthSpend] = useState(null);
  const [query, setQuery] = useState('');
  const [chip, setChip] = useState('All');
  const [range, setRange] = useState('Today');
  const [model, setModel] = useState('approval');
  const [dayFilter, setDayFilter] = useState(null);
  const [rolesSummary, setRolesSummary] = useState(null);
  const [threshold, setThreshold] = useState('');
  const [thresholdMsg, setThresholdMsg] = useState(null);
  const [now] = useState(() => Date.now());
  const go = (tab) => onNavigate && onNavigate(tab);

  const today = new Date();
  const year = today.getFullYear();
  const monthIdx = today.getMonth();
  const dayNum = today.getDate();
  const weekday = today.toLocaleDateString('en-US', { weekday: 'short' });
  const monthName = today.toLocaleDateString('en-US', { month: 'long' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getAuthToken();
        if (!token) return;
        const [aRes, bRes, dRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/email/accounts`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
          fetch(`${API_BASE_URL}/api/budgets/overview`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
          fetch(`${API_BASE_URL}/api/drafts`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        ]);
        if (cancelled) return;
        if (aRes && aRes.ok) {
          const d = await aRes.json().catch(() => ({}));
          setSenderOk((d.accounts || []).length > 0);
        }
        if (bRes && bRes.ok) {
          const d = await bRes.json().catch(() => ({}));
          const rows = d.rows || [];
          setMonthSpend(rows.reduce((a, r) => a + (r.spent || 0), 0));
        }
        if (dRes && dRes.ok) {
          const d = await dRes.json().catch(() => ({}));
          const drafts = d.drafts || [];
          setRolesSummary({
            active: drafts.filter((x) => x.status === 'active').length,
            drafts: drafts.filter((x) => x.status === 'draft').length,
          });
        }
      } catch { /* widgets stay in local-data mode */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const activeDays = useMemo(() => {
    const set = new Set();
    (meetings || []).forEach((m) => {
      const t = m.start_time || m.startTime || m.time;
      const d = t ? new Date(t).getTime() : NaN;
      if (!Number.isNaN(d)) set.add(startOfDay(d));
    });
    return set;
  }, [meetings]);

  const monthCells = useMemo(() => {
    const first = new Date(year, monthIdx, 1).getDay();
    const days = new Date(year, monthIdx + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < (first + 6) % 7; i++) cells.push(null);
    for (let d = 1; d <= Math.min(days, 31); d++) cells.push(d);
    // 6 rows: 31-day months starting on a weekend need up to 42 cells
    return cells.slice(0, 42);
  }, [year, monthIdx]);

  const hasDay = (d) => {
    if (!d) return false;
    return activeDays.has(startOfDay(new Date(year, monthIdx, d)));
  };

  const activity = useMemo(() => {
    const q = query.toLowerCase();
    return (meetings || [])
      .filter((m) => (m.title || '').toLowerCase().includes(q) || (m.project || '').toLowerCase().includes(q))
      .filter((m) => {
        if (dayFilter) {
          const t = m.start_time || m.startTime || m.time;
          const d = t ? new Date(t).getTime() : NaN;
          if (Number.isNaN(d) || startOfDay(d) !== dayFilter) return false;
        }
        if (chip === 'Team') return (m.attendees || []).length > 1;
        if (chip === 'Insights') {
          const c = Number(m.confidence ?? m.ai_confidence ?? 100);
          return (c <= 1 && c > 0 ? c * 100 : c) < 70 || m.status === 'needs_review';
        }
        if (chip === 'Today') {
          const t = m.start_time || m.startTime || m.time;
          const d = t ? new Date(t).getTime() : NaN;
          return !Number.isNaN(d) && startOfDay(d) === startOfDay(new Date());
        }
        return true;
      })
      .slice(0, 5);
  }, [meetings, query, chip, dayFilter]);

  const top4 = useMemo(() => {
    const total = projectSpendsSum.reduce((a, p) => a + p.cost, 0) || 1;
    return projectSpendsSum.slice(0, 4).map((p) => ({ ...p, share: Math.round((p.cost / total) * 100) }));
  }, [projectSpendsSum]);

  const maxAct = Math.max(1, ...activity.map((m) => Number(m.cost) || 0));
  const trend = dynamicData.costOverTime || [];
  // No fabricated fallback: with no data there is no trend to report.
  const delta = trend.length > 1 && trend[0].cost > 0
    ? Math.round(((trend[trend.length - 1].cost - trend[0].cost) / trend[0].cost) * 100)
    : null;
  const reviewOpen = meetings.filter((m) => m.status === 'needs_review').length;

  const rangedMeetings = useMemo(() => {
    if (range === 'All') return meetings || [];
    const span = range === 'Today' ? 86400000 : range === 'Week' ? 7 * 86400000 : 30 * 86400000;
    const cutoff = now - span;
    return (meetings || []).filter((m) => {
      const t = m.start_time || m.startTime || m.time;
      const d = t ? new Date(t).getTime() : NaN;
      return !Number.isNaN(d) && d >= cutoff;
    });
  }, [meetings, range, now]);
  const rangedCost = useMemo(
    () => Math.round(rangedMeetings.reduce((a, m) => a + (Number(m.cost) || 0), 0) * 100) / 100,
    [rangedMeetings]
  );
  const approvalRate = useMemo(() => {
    const list = rangedMeetings.length ? rangedMeetings : meetings || [];
    if (!list.length) return dynamicData.accuracy ?? null;
    return Math.round((list.filter((m) => m.status === 'approved').length / list.length) * 100);
  }, [rangedMeetings, meetings, dynamicData.accuracy]);
  const avgConf = useMemo(() => {
    const list = rangedMeetings.length ? rangedMeetings : meetings || [];
    if (!list.length) return dynamicData.accuracy ?? null;
    const vals = list.map((m) => {
      const c = Number(m.confidence ?? m.ai_confidence ?? 0);
      return c <= 1 && c > 0 ? c * 100 : c;
    });
    return Math.round(vals.reduce((a, v) => a + v, 0) / vals.length);
  }, [rangedMeetings, meetings, dynamicData.accuracy]);
  const shownAccuracy = model === 'approval' ? approvalRate : avgConf;
  const accuracyLabel = shownAccuracy === null || shownAccuracy === undefined ? '—' : `${shownAccuracy}%`;
  const burnPerMin = useMemo(() => {
    if (!rangedMeetings.length) return 0;
    const mins = rangedMeetings.reduce((a, m) => a + (Number(m.durationMinutes ?? m.duration_minutes ?? 60)), 0) || 1;
    return rangedCost / mins;
  }, [rangedMeetings, rangedCost]);
  const needsReview = useMemo(
    () => (meetings || []).filter((m) => m.status === 'needs_review' || Number(m.confidence ?? m.ai_confidence ?? 100) < 70).slice(0, 4),
    [meetings]
  );

  const setAlertThreshold = async () => {
    const v = Number(threshold);
    if (!v || v <= 0) { setThresholdMsg('Enter an amount first.'); return; }
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: 'warning', title: `Budget watch: ${top4[0]?.name || 'spend'}`, description: `Alert me when spend passes $${v}.` }),
      });
      setThresholdMsg(res.ok ? `Watching above $${v}.` : 'Could not save alert.');
      if (res.ok) setThreshold('');
    } catch {
      setThresholdMsg('Could not save alert.');
    }
  };

  return (
    <div className="ov-wrap">
      <div className="ov-topbar">
        <div className="ov-date">
          <span className="ov-daynum">{dayNum}</span>
          <span className="ov-daymeta">{weekday},<br />{monthName}</span>
        </div>
        <button type="button" className="ov-tasks" onClick={() => go('Attribution')}>
          Show my Tasks {reviewOpen > 0 && <span className="ov-countbadge">{reviewOpen}</span>} <ArrowRight size={15} />
        </button>
        <button type="button"
          className="ov-iconbtn"
          onClick={() => go('Calendar')}
          title={(meetings || []).filter((m) => { const t = m.start_time || m.startTime || m.time; return t && startOfDay(t) === startOfDay(new Date()); }).length + ' meetings today'}
        >
          <CalendarDays size={16} />
          {activeDays.size > 0 && <span className="ov-dot" />}
        </button>
        <button type="button" className="ov-ask" onClick={() => go('Knowledge Base')}>
          <b>Hey, Need help? <span role="img" aria-label="wave">👋</span></b>
          <span>Just ask me anything!</span>
        </button>
        <button type="button" className="ov-iconbtn" title="Ask the knowledge base" onClick={() => go('Knowledge Base')}><Mic size={16} /></button>
      </div>

      <div className="ov-bento">
        <div className="ov-card b-wallet">
          <div className="ov-cardhead"><span className="ov-label">Meeting spend</span><button type="button" className="ov-mini">Live meetings ▾</button></div>
          <div className="ov-sub">Time-cost, not money out</div>
          <div className="ov-cardnum">•••• {(monthSpend ?? dynamicData.totalCost).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div className="ov-sub">Burning <b>${burnPerMin.toFixed(2)}/min</b> in range</div>
          <div className="ov-btnrow">
            <button type="button" className="ov-pill dark" onClick={() => go('Live Ticker')}>Tick</button>
            <button type="button" className="ov-pill" onClick={() => go('Budgets')}>Cap</button>
          </div>
          <div className="ov-feerow">
            <span className="ov-sub">Accuracy <b>{accuracyLabel}</b></span>
            <button type="button" className="ov-link" onClick={() => go('Budgets')}>Edit caps limitation</button>
          </div>
        </div>

        <div className="ov-card b-attr">
          <div className="ov-kv"><span className="ov-label">Attributed $</span>
            <select className="ov-mini" value={range} onChange={(e) => setRange(e.target.value)} aria-label="Range">
              {['Today', 'Week', 'Month', 'All'].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="ov-big">${rangedCost.toLocaleString()}</div>
          <div className="ov-kv" style={{ marginTop: '10px' }}><span className="ov-label">Accuracy</span>
            <select className="ov-mini" value={model} onChange={(e) => setModel(e.target.value)} aria-label="Model" title={model === 'approval' ? 'Share of approved meetings' : 'Average AI confidence'}>
              <option value="approval">Approvals</option>
              <option value="confidence">AI confidence</option>
            </select>
          </div>
          <div className="ov-big">{accuracyLabel}</div>
          <div className="ov-sub">Anomalies <b style={{ color: '#E4573D' }}>{dynamicData.anomalies}</b> · Unattributed <b>{dynamicData.unattributedHours}h</b></div>
          <button type="button" className="ov-link" onClick={() => go('Template Analytics')}>View on chart mode</button>
        </div>

        <div className="ov-card b-trend" role="button" tabIndex={0} title="Open Template Analytics" onClick={() => go('Template Analytics')} onKeyDown={(e) => { if (e.key === 'Enter') go('Template Analytics'); }} style={{ cursor: 'pointer' }}>
          <div className="ov-cardhead"><b>Trend</b>{delta === null ? <span className="ov-sub">no data</span> : <span className={`ov-delta ${delta >= 0 ? 'up' : 'down'}`}>{delta >= 0 ? '+' : ''}{delta}%</span>}</div>
          <div style={{ height: '110px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ovSpark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ACCENT} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="cost" stroke={ACCENT} strokeWidth={2} fill="url(#ovSpark)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="ov-card b-lock ov-center" role="button" tabIndex={0} title="Row-level security — open Security settings" onClick={() => go('SettingsSecurity')} onKeyDown={(e) => { if (e.key === 'Enter') go('SettingsSecurity'); }} style={{ cursor: 'pointer' }}>
          <Lock size={15} />
          <div className="ov-label">Data Lock</div>
          <div className="ov-ring"><span>RLS<br />ON</span></div>
        </div>

        <div className="ov-card b-days">
          <div className="ov-label">{activeDays.size} Active days</div>
          <div className="ov-sub">{monthName} {year}{dayFilter ? ' · filtered — click again to clear' : ' · click a day'}</div>
          <div className="ov-dots">
            {monthCells.map((d, i) => (
              <span
                key={i}
                role={d && hasDay(d) ? 'button' : undefined}
                tabIndex={d && hasDay(d) ? 0 : undefined}
                onClick={() => {
                  if (!d || !hasDay(d)) return;
                  const key = startOfDay(new Date(year, monthIdx, d));
                  setDayFilter((prev) => (prev === key ? null : key));
                }}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && d && hasDay(d)) {
                    const key = startOfDay(new Date(year, monthIdx, d));
                    setDayFilter((prev) => (prev === key ? null : key));
                  }
                }}
                className={`ov-dotcell ${d && hasDay(d) ? 'on clickable' : ''} ${d === dayNum ? 'today' : ''}`}
              />
            ))}
          </div>
        </div>

        <div className="ov-card b-rings">
          <div className="ov-cardhead"><b>Cost concentric</b><button type="button" className="ov-mini" onClick={() => go('Budgets')}>Caps ▾</button></div>
          {top4.length === 0 ? (
            <div className="ov-empty">No spend yet — <button type="button" className="ov-link" onClick={() => go('Live Ticker')}>tick a meeting</button></div>
          ) : (
            <>
              <div className="ov-rings">
                {top4.map((p, i) => (
                  <div key={p.name} className="ov-ring-i clickable" role="button" tabIndex={0} title={`Filter activity: ${p.name}`} onClick={() => setQuery(p.name)} onKeyDown={(e) => { if (e.key === 'Enter') setQuery(p.name); }} style={{ width: `${150 - i * 28}px`, height: `${150 - i * 28}px`, background: `rgba(228,87,61,${0.16 + (3 - i) * 0.2})`, cursor: 'pointer' }}>
                    <span>${p.cost >= 1000 ? `${(p.cost / 1000).toFixed(1)}K` : Math.round(p.cost)}</span>
                  </div>
                ))}
              </div>
              <div className="ov-legend">{top4.map((p) => <span key={p.name} className="clickable" role="button" tabIndex={0} onClick={() => setQuery(p.name)} onKeyDown={(e) => { if (e.key === 'Enter') setQuery(p.name); }} style={{ cursor: 'pointer' }}>{p.name}</span>)}</div>
            </>
          )}
        </div>

        <div className="ov-card b-activity">
          <div className="ov-cardhead"><b>Activity manager</b><span className="ov-icons">⋮ ✦ Filters</span></div>
          <div className="ov-search"><Search size={14} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search in activities…" /></div>
          <div className="ov-chips">
            {['All', 'Team', 'Insights', 'Today'].map((c) => (
              <button type="button" key={c} className={`ov-chip ${c === chip ? 'on' : ''}`} onClick={() => setChip(c)}>{c} ×</button>
            ))}
          </div>
          <div className="ov-split">
            <div className="ov-minibars">
              <div className="ov-big" style={{ fontSize: '22px' }}>${activity.reduce((a, m) => a + (Number(m.cost) || 0), 0).toFixed(2)}</div>
              <div className="ov-bars">
                {activity.length === 0
                  ? <span className="ov-sub">No bars yet</span>
                  : activity.map((m, i) => (
                    <span key={m.id || i} className="ov-bar clickable" role="button" tabIndex={0} title={m.title} onClick={() => setQuery(m.title || '')} onKeyDown={(e) => { if (e.key === 'Enter') setQuery(m.title || ''); }} style={{ height: `${12 + ((maxAct ? (Number(m.cost) || 0) / maxAct : 0) * 44)}px`, background: i % 2 ? ACCENT : '#141414', cursor: 'pointer' }} />
                  ))}
              </div>
            </div>
            <div className="ov-plans">
              <b>Open roles</b>
              {rolesSummary === null
                ? <span className="ov-sub">Loading…</span>
                : <><span><i />{rolesSummary.active} live links</span><span><i />{rolesSummary.drafts} drafts</span></>}
              <button type="button" className="ov-link" onClick={() => go('Drafts')}>Manage templates</button>
            </div>
            <div className="ov-verify">
              <b>Sender verification</b>
              <span className="ov-sub">{senderOk === null ? 'Checking…' : senderOk ? 'A sender is active' : 'No sender yet'}</span>
              <button type="button" className="ov-pill dark" style={{ background: ACCENT }} onClick={() => go('SettingsEmail')}>
                <ShieldCheck size={14} /> {senderOk ? 'Verify' : 'Enable'}
              </button>
            </div>
          </div>
          <div className="ov-activity">
            {activity.length === 0 ? (
              <div className="ov-empty">Nothing scheduled. <button type="button" className="ov-link" onClick={() => go('Calendar')}>Open calendar</button></div>
            ) : activity.map((m, i) => (
              <div className="ov-actrow" key={m.id || i}>
                <span className="ov-acttitle">{m.title}</span>
                <span className="ov-actcost">${m.cost || 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ov-card b-verify">
          <div className="ov-cardhead"><b>Top project</b><Mail size={15} /></div>
          {top4.length === 0
            ? <span className="ov-sub">Set a budget to crown one.</span>
            : <><div className="ov-big" style={{ fontSize: '20px' }}>{top4[0].name}</div><span className="ov-sub">${top4[0].cost.toLocaleString()} this month</span></>}
          <div className="ov-thresh">
            <input className="ov-input" type="number" min="1" value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder="Alert above $" />
            <button type="button" className="ov-pill" onClick={setAlertThreshold}>Watch</button>
          </div>
          {thresholdMsg && <span className="ov-sub">{thresholdMsg}</span>}
          <div className="ov-rate">
            <span className="ov-sub">Needs review</span>
            {needsReview.length === 0
              ? <b>All clear ✓</b>
              : <><b>{needsReview.length} item{needsReview.length !== 1 ? 's' : ''} await you</b>
                <div className="ov-reviewlist">
                  {needsReview.map((m, i) => (
                    <button type="button" key={m.id || i} className="ov-link" style={{ display: 'block', textAlign: 'left', marginTop: '4px' }} onClick={() => go('Attribution')}>{m.title || 'Untitled'}</button>
                  ))}
                </div></>}
            <button type="button" className="ov-pill dark" style={{ marginTop: '8px', alignSelf: 'flex-start' }} onClick={() => go('Attribution')}>Open queue</button>
          </div>
        </div>
      </div>
    </div>
  );
}
