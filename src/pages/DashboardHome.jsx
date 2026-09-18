import { useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
} from 'recharts';
import {
  Bell, Wallet, AlertTriangle, ShieldCheck, ChevronRight, Plus,
  ArrowUpRight, ArrowDownRight, Minus, Star, LayoutDashboard,
  CalendarDays, Timer,
} from 'lucide-react';
import './DashboardHome.css';
import { getFirstName } from '../utils/greeting';

const ACCENT = '#E4573D';
const TARGET_COLORS = [ACCENT, '#F5B301', '#DC2626'];
const TRACK_TINTS = ['#FDE9E2', '#FDF3D7', '#FBE0D9'];

function HdIllustration() {
  return (
    <svg viewBox="0 0 220 150" className="hd-illo-svg" role="img" aria-label="Person reviewing charts">
      <ellipse cx="110" cy="132" rx="86" ry="12" fill="#F1EDE8" />
      {/* board */}
      <rect x="104" y="18" width="92" height="76" rx="6" fill="#fff" stroke="#E2E8F0" strokeWidth="2" />
      {/* pie */}
      <circle cx="130" cy="48" r="14" fill={ACCENT} />
      <path d="M130 48 L130 34 A14 14 0 0 1 142 55 Z" fill="#3F3F46" />
      <circle cx="130" cy="48" r="5" fill="#fff" />
      {/* bars */}
      <rect x="152" y="58" width="8" height="16" rx="2" fill={ACCENT} opacity="0.85" />
      <rect x="163" y="48" width="8" height="26" rx="2" fill="#F5B301" />
      <rect x="174" y="40" width="8" height="34" rx="2" fill={ACCENT} opacity="0.45" />
      {/* stand */}
      <line x1="150" y1="94" x2="150" y2="126" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
      <line x1="138" y1="126" x2="162" y2="126" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
      {/* person */}
      <circle cx="66" cy="34" r="11" fill="#F2C9A4" />
      <path d="M55 32 a11 11 0 0 1 22 0 l0 -3 a11 8 0 0 0 -22 0 Z" fill="#3F3F46" />
      <rect x="52" y="48" width="30" height="42" rx="10" fill={ACCENT} />
      <rect x="58" y="58" width="14" height="18" rx="2" fill="#F5B301" />
      <rect x="52" y="88" width="11" height="34" rx="5" fill="#3F3F46" />
      <rect x="66" y="88" width="11" height="34" rx="5" fill="#3F3F46" />
      <rect x="78" y="58" width="26" height="9" rx="4.5" fill="#F2C9A4" />
      {/* plant */}
      <rect x="24" y="112" width="12" height="12" rx="2" fill={ACCENT} opacity="0.7" />
      <path d="M30 112 c-2 -8 -8 -10 -12 -11 M30 112 c0 -9 4 -13 9 -15 M30 112 c3 -7 8 -9 12 -9" stroke="#16A34A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function DashboardHome({
  user, meetings = [], dynamicData, projectSpendsSum = [], alertsCount = 0, onNavigate,
}) {
  const first = getFirstName(user);
  const go = (tab) => onNavigate && onNavigate(tab);

  const needsReview = useMemo(
    () => (meetings || []).filter((m) => m.status === 'needs_review').length,
    [meetings],
  );
  const approvalRate = useMemo(() => {
    const list = meetings || [];
    if (!list.length) return 0;
    return Math.round((list.filter((m) => m.status === 'approved').length / list.length) * 100);
  }, [meetings]);
  const total = dynamicData?.totalCost ?? 0;
  const accuracy = dynamicData?.accuracy ?? null;
  const accuracyLabel = accuracy === null ? '—' : `${accuracy}%`;
  const trend = dynamicData?.costOverTime || [];
  const isEmptySpend = Number(total) <= 0 && trend.every((p) => !Number(p?.cost));
  const tickInterval = Math.max(0, Math.ceil(trend.length / 4) - 1);
  const targets = (projectSpendsSum || []).slice(0, 3);
  const upcoming = (meetings || []).slice(0, 3);
  const started = approvalRate > 0;

  const kpis = [
    {
      icon: Wallet, tint: ACCENT, soft: 'rgba(228,87,61,0.12)',
      value: `$${Number(total).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      label: 'Attributed',
      delta: Number(total) > 0 ? 'up' : 'clear', onClick: () => go('Command Center'),
    },
    {
      icon: AlertTriangle, tint: '#DC2626', soft: 'rgba(220,38,38,0.12)',
      value: Number(needsReview).toLocaleString(),
      label: 'Needs review',
      delta: needsReview > 0 ? 'open' : 'clear', onClick: () => go('Attribution'),
    },
    {
      icon: ShieldCheck, tint: '#B45309', soft: 'rgba(245,179,1,0.18)',
      value: accuracyLabel,
      label: 'Accuracy',
      delta: accuracy === null ? 'clear' : accuracy >= 70 ? 'up' : 'down', onClick: () => go('Command Center'),
    },
  ];

  return (
    <div className="hd-wrap">
      {/* Top strip — intentionally empty except the bell */}
      <div className="hd-topstrip">
        <button type="button" className="hd-bell" onClick={() => go('Alerts')} title={`${alertsCount} active alerts`}>
          <Bell size={18} />
          {alertsCount > 0 && <span className="hd-bell-dot" />}
        </button>
      </div>

      <div className="hd-grid">
        {/* LEFT — greeting + illustration + progress card (reference order) */}
        <div className="hd-col">
          <div className="hd-greet">
            <h1>Hi {first},</h1>
            <h2>Welcome back!</h2>
            <p>
              This page is designed to give you the important signals about your workspace.
              Let&apos;s get your attribution to 100% together!
            </p>
          </div>
          <div className="hd-card hd-illo">
            <HdIllustration />
          </div>
          <div className="hd-card hd-congrats">
            <span className="hd-star"><Star size={16} /></span>
            <h3>{started ? `Congratulations ${first}` : `Let's get started, ${first}`}</h3>
            <p>
              {started
                ? `You have attributed ${approvalRate}% of your meetings. Your current progress is ${approvalRate >= 70 ? 'great' : 'getting there'}.`
                : 'Sync your calendar and attribute your first meeting to kick things off.'}
            </p>
            {started && (
              <div className="hd-bar"><div className="hd-fill" style={{ width: `${approvalRate}%` }} /></div>
            )}
            <button type="button" className="hd-white-btn" onClick={() => go('SettingsProfile')}>View Profile</button>
          </div>
        </div>

        {/* MIDDLE — KPIs + big chart */}
        <div className="hd-col">
          {kpis.map((k) => (
            <button type="button" key={k.label} className="hd-card hd-kpi" onClick={k.onClick}>
              <span className="hd-kpi-ico" style={{ background: k.soft, color: k.tint }}>
                <k.icon size={18} />
              </span>
              <span className="hd-kpi-txt"><b>{k.value}</b><small>{k.label}</small></span>
              <span className="hd-kpi-delta" style={{ color: k.delta === 'down' ? '#DC2626' : k.delta === 'open' ? '#64748B' : k.delta === 'clear' ? '#94A3B8' : '#16A34A' }}>
                {k.delta === 'down' ? <ArrowDownRight size={16} /> : k.delta === 'open' ? <ChevronRight size={16} /> : k.delta === 'clear' ? <Minus size={16} /> : <ArrowUpRight size={16} />}
              </span>
            </button>
          ))}

          <div className="hd-card hd-chart">
            <span className="hd-label">Meeting spend</span>
            {isEmptySpend ? (
              <div className="hd-chart-empty">
                <span className="hd-chart-empty-ico"><Wallet size={22} /></span>
                <b>No spend tracked yet</b>
                <p>Sync your calendar or tick a live meeting and your cost curve will appear here.</p>
                <div className="hd-chart-empty-cta">
                  <button type="button" className="hd-accent-btn" onClick={() => go('Calendar')}><CalendarDays size={14} /> Open calendar</button>
                  <button type="button" className="hd-grey-btn sm" onClick={() => go('Live Ticker')}><Timer size={14} /> Live ticker</button>
                </div>
              </div>
            ) : (
              <>
                <div className="hd-bignum">${Number(total).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                <div className="hd-chart-area">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend} margin={{ top: 5, right: 4, left: 4, bottom: 0 }}>
                      <defs>
                        <linearGradient id="hdSpark" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={ACCENT} stopOpacity={0.35} />
                          <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} interval={tickInterval} />
                      <YAxis hide domain={[0, 'auto']} />
                      <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Cost']} />
                      <Area type="monotone" dataKey="cost" stroke={ACCENT} strokeWidth={2.5} fill="url(#hdSpark)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
            <button type="button" className="hd-grey-btn" onClick={() => go('Command Center')}>
              <LayoutDashboard size={15} /> View Dashboard <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* RIGHT — targets + meetings (titles outside cards, like reference) */}
        <div className="hd-col">
          <div className="hd-card">
            <h3 className="hd-title">Targets</h3>
            {targets.length === 0 ? (
              <p className="hd-empty">No spend yet. <button type="button" className="hd-link" onClick={() => go('Budgets')}>Set a budget</button></p>
            ) : targets.map((t, i) => (
              <button type="button" key={t.name} className="hd-target" onClick={() => go('Budgets')}>
                <span className="hd-target-row"><small>{t.name}</small><small>{t.percentage}%</small></span>
                <span className="hd-bar sm" style={{ background: TRACK_TINTS[i % TRACK_TINTS.length] }}>
                  <span className="hd-fill" style={{ width: `${t.percentage}%`, background: TARGET_COLORS[i % TARGET_COLORS.length] }} />
                </span>
              </button>
            ))}
          </div>

          <div className="hd-meet-section">
            <h3 className="hd-section-title">Meetings</h3>
            {upcoming.length === 0 ? (
              <div className="hd-card">
                <p className="hd-empty">Nothing scheduled. <button type="button" className="hd-link" onClick={() => go('Calendar')}>Open calendar</button></p>
              </div>
            ) : upcoming.map((m) => (
              <button type="button" key={m.id} className="hd-card hd-meet" onClick={() => go('Meet')}>
                <img
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.title || 'M')}`}
                  alt="" className="hd-avatar"
                />
                <span className="hd-meet-txt"><b>{m.title || 'Untitled'}</b><small>{m.time || m.duration || ''}</small></span>
                <ChevronRight size={15} className="hd-chev" />
              </button>
            ))}
            <button type="button" className="hd-card hd-add" onClick={() => go('Calendar')} title="Open calendar"><Plus size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
