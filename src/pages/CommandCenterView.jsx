import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity, AlertCircle, ArrowRight, ArrowUpRight, CheckCircle2,
  Clock3, FileText, FolderOpen, Mail, RefreshCw, Send, Settings2, Users,
} from 'lucide-react';
import { getAuthToken } from '../supabaseAuth';
import './CommandCenterView.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const reviewStatuses = new Set(['partial', 'failed', 'needs_review']);
const activeStatuses = new Set(['queued', 'scheduled', 'sending']);

function dateLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

function displayCount(value) {
  return value == null ? '—' : value.toLocaleString();
}

function nextAction(counts, sources) {
  if (sources.forms !== 'ready' && sources.campaigns !== 'ready') return {
    label: 'Connection check', title: 'Your data is temporarily unavailable',
    detail: 'Refresh this page to reconnect your workspace and campaigns.',
    action: 'Retry connection', tab: null,
  };
  if (sources.campaigns === 'ready' && counts.campaignsToReview > 0) return {
    label: 'Delivery needs attention', title: 'Review campaign results',
    detail: `${counts.campaignsToReview} campaign${counts.campaignsToReview === 1 ? '' : 's'} ${counts.campaignsToReview === 1 ? 'needs' : 'need'} a decision before any retry.`,
    action: 'Open Sent', tab: 'Sent',
  };
  if (sources.forms === 'ready' && counts.candidatesToReview > 0) return {
    label: 'Candidate follow-up', title: 'Review candidate contact',
    detail: `${counts.candidatesToReview} candidate${counts.candidatesToReview === 1 ? '' : 's'} ${counts.candidatesToReview === 1 ? 'needs' : 'need'} contact information checked.`,
    action: 'Open Sourcing', tab: 'Sourcing',
  };
  if (sources.forms !== 'ready' || sources.campaigns !== 'ready') return {
    label: 'Connection check', title: 'Some workflow data is unavailable',
    detail: 'Refresh to reconnect before deciding what needs attention.',
    action: 'Retry connection', tab: null,
  };
  if (counts.activeForms === 0) return {
    label: 'Start the workflow', title: 'Publish your first form',
    detail: 'Create an application link to begin collecting responses.',
    action: 'Open forms', tab: 'Drafts',
  };
  if (counts.queuedCampaigns > 0) return {
    label: 'Delivery in progress', title: 'Track queued email',
    detail: `${counts.queuedCampaigns} campaign${counts.queuedCampaigns === 1 ? '' : 's'} waiting for the email worker.`,
    action: 'View campaigns', tab: 'Email Automation',
  };
  return {
    label: 'Your workspace', title: 'Keep your workflow moving',
    detail: 'Open your candidate workspace to review the latest applications.',
    action: 'Open Sourcing', tab: 'Sourcing',
  };
}

function StatusBadge({ label, state, stale }) {
  const ready = state === 'ready';
  const status = ready ? 'ready' : state === 'starting' ? 'starting' : 'unavailable';
  return <span className={`cc-health-badge ${stale ? 'is-stale' : ready ? 'is-ready' : 'is-unavailable'}`}>
    {ready ? <CheckCircle2 size={14} /> : state === 'starting' ? <Clock3 size={14} /> : <AlertCircle size={14} />}
    <span>{label}</span><strong>{stale ? `Previously ${status}` : status}</strong>
  </span>;
}

function SummaryCard({ icon: Icon, label, value, detail, tab, onNavigate, tone = '' }) {
  return <button type="button" className={`cc-summary-card ${tone}`} onClick={() => onNavigate(tab)}>
    <span className="cc-summary-top"><Icon size={17} aria-hidden="true" /><ArrowUpRight size={16} aria-hidden="true" /></span>
    <strong>{displayCount(value)}</strong><span className="cc-summary-label">{label}</span>
    <small>{detail}</small>
  </button>;
}

function QueueRow({ title, detail, badge, tab, onNavigate }) {
  return <button type="button" className="cc-queue-row" onClick={() => onNavigate(tab)}>
    <span className="cc-queue-copy"><strong>{title}</strong><small>{detail}</small></span>
    {badge && <span className="cc-row-badge">{badge}</span>}
    <ArrowRight size={16} aria-hidden="true" />
  </button>;
}

export default function CommandCenterView({ onNavigate }) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestRef = useRef(null);

  const load = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError('');
    try {
      const token = await getAuthToken();
      if (controller.signal.aborted) return;
      if (!token) throw new Error('Sign in to view your workflow.');
      const response = await fetch(`${API_BASE_URL}/api/command-center`, {
        headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
      });
      if (!response.ok) throw new Error('Could not load the workflow. Try refreshing.');
      const data = await response.json();
      if (!controller.signal.aborted) setSnapshot(data);
    } catch (cause) {
      if (!controller.signal.aborted && cause.name !== 'AbortError') {
        setError(cause instanceof TypeError
          ? 'Could not reach the workflow service. Check your connection and try again.'
          : cause.message || 'Could not load the workflow.');
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => load());
    return () => requestRef.current?.abort();
  }, [load]);

  const go = tab => onNavigate?.(tab);
  const counts = snapshot?.counts || {};
  const queues = snapshot?.queues || {};
  const sources = snapshot?.sources || {};
  const action = nextAction(counts, sources);
  const reviewCampaigns = (queues.campaigns || []).filter(item => reviewStatuses.has(item.status));
  const activeCampaigns = (queues.campaigns || []).filter(item => activeStatuses.has(item.status));
  const pendingCampaigns = counts.queuedCampaigns == null || counts.scheduledCampaigns == null
    ? null : counts.queuedCampaigns + counts.scheduledCampaigns;
  const workflow = [
    { number: '01', title: 'Publish a form', detail: 'Create a link', value: counts.activeForms, unit: 'active', icon: FileText, tab: 'Drafts' },
    { number: '02', title: 'Review candidates', detail: 'Check applications', value: counts.candidatesToReview, unit: 'need contact review', icon: Users, tab: 'Sourcing' },
    { number: '03', title: 'Send an email', detail: 'Map and preview', value: pendingCampaigns, unit: 'queued or scheduled', icon: Mail, tab: 'Email Automation' },
    { number: '04', title: 'Track results', detail: 'Resolve failures', value: counts.campaignsToReview, unit: 'need review', icon: Send, tab: 'Sent' },
  ];

  return <div className="cc-page">
    <header className="cc-page-header">
      <div><span className="cc-overline">LEDDGER / WORKSPACE</span><h1>Command Center</h1>
        <p>Applications, candidates, and outreach in one clear flow.</p></div>
      <button type="button" className="cc-refresh" onClick={load} disabled={loading}>
        <RefreshCw size={16} className={loading ? 'is-spinning' : ''} aria-hidden="true" />
        {loading ? 'Updating…' : 'Refresh'}
      </button>
    </header>

    {error && <div className="cc-error" role="alert"><AlertCircle size={18} aria-hidden="true" />
      <span>{error}</span><button type="button" onClick={load}>Try again</button></div>}
    {!snapshot && loading && <div className="cc-loading" role="status">Loading your workspace…</div>}

    {snapshot && <>
      {(sources.forms !== 'ready' || sources.campaigns !== 'ready' || sources.worker !== 'ready') &&
        <div className="cc-service-notice" role="status"><AlertCircle size={16} aria-hidden="true" />
          Some connected services are starting or unavailable. Unknown counts are shown as —.
        </div>}
      <section className="cc-hero" aria-labelledby="cc-next-title">
        <div className="cc-hero-main">
          <span className="cc-hero-kicker"><Activity size={14} aria-hidden="true" /> NEXT ACTION</span>
          <p className="cc-hero-label">{action.label}</p>
          <h2 id="cc-next-title">{action.title}</h2>
          <p className="cc-hero-detail">{action.detail}</p>
          <button type="button" className="cc-primary-action" onClick={() => action.tab ? go(action.tab) : load()}>
            {action.action}<ArrowUpRight size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="cc-hero-aside">
          <span className="cc-aside-heading">AT A GLANCE</span>
          <div><strong>{displayCount(counts.submissions)}</strong><span>applications received</span></div>
          <div><strong>{displayCount(counts.candidates)}</strong><span>distinct candidates</span></div>
          <p>Student applications stay in their candidate history.</p>
        </div>
      </section>

      <section className="cc-section" aria-labelledby="cc-workflow-title">
        <div className="cc-section-heading"><div><span className="cc-overline">HOW WORK MOVES</span>
          <h2 id="cc-workflow-title">The connected workflow</h2></div>
          <span className="cc-heading-note">Select a step to continue <ArrowRight size={15} /></span></div>
        <div className="cc-workflow">
          {workflow.map(step => <button type="button" key={step.number} className="cc-workflow-step" onClick={() => go(step.tab)}>
            <span className="cc-workflow-top"><span>{step.number}</span><step.icon size={19} aria-hidden="true" /></span>
            <strong>{step.title}</strong><span className="cc-workflow-detail">{step.detail}</span>
            <span className="cc-workflow-count"><b>{displayCount(step.value)}</b> {step.unit}</span>
          </button>)}
        </div>
      </section>

      <section className="cc-section" aria-labelledby="cc-overview-title">
        <div className="cc-section-heading"><div><span className="cc-overline">LIVE WORKSPACE</span>
          <h2 id="cc-overview-title">Where things stand</h2></div></div>
        <div className="cc-summary-grid">
          <SummaryCard icon={FileText} label="Active forms" value={counts.activeForms} detail="Published application links" tab="Active Links" onNavigate={go} />
          <SummaryCard icon={Users} label="Contact review" value={counts.candidatesToReview} detail="Candidates needing a contact check" tab="Sourcing" onNavigate={go} tone={counts.candidatesToReview > 0 ? 'has-attention' : ''} />
          <SummaryCard icon={Clock3} label="Scheduled email" value={counts.scheduledCampaigns} detail="Campaigns waiting to send" tab="Schedule" onNavigate={go} />
          <SummaryCard icon={AlertCircle} label="Delivery review" value={counts.campaignsToReview} detail="Partial or failed campaigns" tab="Sent" onNavigate={go} tone={counts.campaignsToReview > 0 ? 'has-attention' : ''} />
        </div>
      </section>

      <section className="cc-lower-grid" aria-label="Review work and recent activity">
        <div className="cc-panel cc-attention-panel">
          <div className="cc-panel-heading"><div><span className="cc-overline">REVIEW QUEUE</span><h2>Needs attention</h2></div>
            <span className="cc-panel-count">{displayCount(counts.candidatesToReview == null || counts.campaignsToReview == null
              ? null : counts.candidatesToReview + counts.campaignsToReview)}</span></div>
          {sources.forms !== 'ready' && <p className="cc-source-note">Candidate data is unavailable. Refresh to check again.</p>}
          {sources.forms === 'ready' && (queues.candidates || []).map(item =>
            <QueueRow key={item.id} title={item.name || 'Unnamed candidate'} detail={item.email || 'Contact information needed'}
              badge="Contact" tab="Sourcing" onNavigate={go} />)}
          {sources.forms === 'ready' && counts.candidatesToReview > (queues.candidates || []).length &&
            <button type="button" className="cc-queue-more" onClick={() => go('Sourcing')}>View all candidates to review <ArrowRight size={15} /></button>}
          {sources.campaigns !== 'ready' && <p className="cc-source-note">Campaign data is unavailable. Refresh to check again.</p>}
          {sources.campaigns === 'ready' && reviewCampaigns.map(item =>
            <QueueRow key={item.id} title={item.name || 'Untitled campaign'}
              detail={`${displayCount(item.sentCount)} sent · ${displayCount(item.failedCount)} failed`}
              badge={item.status.replaceAll('_', ' ')} tab="Sent" onNavigate={go} />)}
          {sources.campaigns === 'ready' && counts.campaignsToReview > reviewCampaigns.length &&
            <button type="button" className="cc-queue-more" onClick={() => go('Sent')}>View all delivery issues <ArrowRight size={15} /></button>}
          {sources.forms === 'ready' && sources.campaigns === 'ready' &&
            counts.candidatesToReview === 0 && counts.campaignsToReview === 0 &&
            <p className="cc-empty"><CheckCircle2 size={18} /> Nothing needs review right now.</p>}
        </div>

        <div className="cc-panel">
          <div className="cc-panel-heading"><div><span className="cc-overline">LATEST ACTIVITY</span><h2>Recent movement</h2></div></div>
          {sources.forms !== 'ready' && <p className="cc-source-note">Recent applications are unavailable.</p>}
          {sources.forms === 'ready' && (queues.applications || []).slice(0, 3).map(item =>
            <QueueRow key={item.id} title={item.title || 'Application received'} detail={dateLabel(item.submittedAt)}
              tab="Sourcing" onNavigate={go} />)}
          {sources.campaigns === 'ready' && activeCampaigns.slice(0, 2).map(item =>
            <QueueRow key={item.id} title={item.name || 'Untitled campaign'}
              detail={item.status.replaceAll('_', ' ')} tab={item.status === 'scheduled' ? 'Schedule' : 'Email Automation'} onNavigate={go} />)}
          {sources.forms === 'ready' && sources.campaigns === 'ready' &&
            !(queues.applications || []).length && !activeCampaigns.length &&
            <p className="cc-empty">New applications and campaigns will appear here.</p>}
        </div>
      </section>

      <section className="cc-toolbox" aria-label="Workspace shortcuts">
        <div><span className="cc-overline">QUICK ACCESS</span><h2>Your tools</h2></div>
        <div className="cc-tool-links">
          <button type="button" onClick={() => go('Student Template')}><FileText size={16} /> Create a form <ArrowRight size={14} /></button>
          <button type="button" onClick={() => go('Files')}><FolderOpen size={16} /> Recipient files <ArrowRight size={14} /></button>
          <button type="button" onClick={() => go('Template Analytics')}><Activity size={16} /> Form analytics <ArrowRight size={14} /></button>
          <button type="button" onClick={() => go('SettingsEmail')}><Settings2 size={16} /> Email senders <ArrowRight size={14} /></button>
        </div>
      </section>

      <footer className="cc-footer">
        <div className="cc-health" aria-label="Service health">
          <StatusBadge label="Workspace data" state={sources.forms} stale={!!error} />
          <StatusBadge label="Campaigns & files" state={sources.campaigns} stale={!!error} />
          <StatusBadge label="Email worker" state={sources.worker} stale={!!error} />
        </div>
        <time dateTime={snapshot.generatedAt}>Updated {dateLabel(snapshot.generatedAt)}</time>
      </footer>
    </>}
  </div>;
}
