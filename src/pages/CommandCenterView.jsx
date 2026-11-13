import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, RefreshCw, AlertCircle, CheckCircle2, Clock3 } from 'lucide-react';
import { getAuthToken } from '../supabaseAuth';
import './CommandCenterView.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const steps = [
  { title: 'Build a form', detail: 'Create and publish an application.', tab: 'Drafts' },
  { title: 'Review candidates', detail: 'See submissions and move candidates forward.', tab: 'Sourcing' },
  { title: 'Prepare an email', detail: 'Choose recipients, preview, then queue.', tab: 'Email Automation' },
  { title: 'Track delivery', detail: 'Review progress and retry selected failures.', tab: 'Sent' },
];

function dateLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

function Metric({ label, value, onClick }) {
  return <button type="button" className="cc-metric" onClick={onClick}>
    <span>{label}</span><strong>{value == null ? '—' : value}</strong><ArrowRight size={16} aria-hidden="true" />
  </button>;
}

export default function CommandCenterView({ onNavigate }) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Sign in to view your workflow.');
      const response = await fetch(`${API_BASE_URL}/api/command-center`, {
        headers: { Authorization: `Bearer ${token}` }, signal,
      });
      if (!response.ok) throw new Error('Could not load the workflow. Try refreshing.');
      setSnapshot(await response.json());
    } catch (cause) {
      if (!signal?.aborted && cause.name !== 'AbortError') {
        setError(cause instanceof TypeError
          ? 'Could not reach the workflow service. Check your connection and try again.'
          : cause.message || 'Could not load the workflow.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve().then(() => {
      if (!controller.signal.aborted) load(controller.signal);
    });
    return () => controller.abort();
  }, [load]);
  const go = tab => onNavigate?.(tab);
  const counts = snapshot?.counts || {};
  const queues = snapshot?.queues || {};
  const sources = snapshot?.sources || {};
  return <main className="cc-page">
    <header className="cc-header">
      <div><span className="cc-eyebrow">WORKFLOW / LIVE DATA</span><h1>Command Center</h1>
        <p>Follow an application from its form to candidate review and email delivery.</p></div>
      <button type="button" className="cc-refresh" onClick={() => load()} disabled={loading}>
        <RefreshCw size={16} aria-hidden="true" /> {loading ? 'Loading…' : 'Refresh'}
      </button>
    </header>

    {error && <div className="cc-error" role="alert"><AlertCircle size={18} />{error}</div>}
    {snapshot && <>
      <div className="cc-sources" aria-label="Connected services">
        {[['Workspace data', sources.forms], ['Campaigns & files', sources.campaigns], ['Email worker', sources.worker]].map(([label, state]) =>
          <span key={label} className={`cc-source ${state === 'ready' ? 'is-ready' : ''}`}>
            {state === 'ready' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            {label}: {state === 'ready' ? 'ready' : state === 'starting' ? 'starting' : 'unavailable'}
          </span>)}
        <time dateTime={snapshot.generatedAt}>Updated {dateLabel(snapshot.generatedAt)}</time>
      </div>
      <section className="cc-section" aria-labelledby="cc-flow-title">
        <div className="cc-section-head"><div><span className="cc-eyebrow">YOUR PATH</span><h2 id="cc-flow-title">One connected workflow</h2></div></div>
        <div className="cc-steps">{steps.map((step, index) => <button key={step.title} type="button" onClick={() => go(step.tab)} className="cc-step">
          <span className="cc-step-number">0{index + 1}</span><strong>{step.title}</strong><span>{step.detail}</span><ArrowRight size={18} aria-hidden="true" />
        </button>)}</div>
      </section>
      <section className="cc-section" aria-labelledby="cc-overview-title">
        <div className="cc-section-head"><div><span className="cc-eyebrow">CURRENT WORK</span><h2 id="cc-overview-title">Overview</h2></div></div>
        <div className="cc-metrics">
          <Metric label="Active forms" value={counts.activeForms} onClick={() => go('Active Links')} />
          <Metric label="Submissions" value={counts.submissions} onClick={() => go('Sourcing')} />
          <Metric label="Candidates" value={counts.candidates} onClick={() => go('Sourcing')} />
          <Metric label="Need contact review" value={counts.candidatesToReview} onClick={() => go('Sourcing')} />
          <Metric label="Queued emails" value={counts.queuedCampaigns} onClick={() => go('Sent')} />
          <Metric label="Scheduled emails" value={counts.scheduledCampaigns} onClick={() => go('Schedule')} />
          <Metric label="Delivery review" value={counts.campaignsToReview} onClick={() => go('Sent')} />
          <Metric label="Saved recipient files" value={counts.files} onClick={() => go('Files')} />
          <Metric label="Upcoming meetings" value={counts.upcomingMeetings} onClick={() => go('Calendar')} />
          <Metric label="Open alerts" value={counts.openAlerts} onClick={() => go('Alerts')} />
        </div>
      </section>
      <section className="cc-section" aria-label="More workspace tools">
        <div className="cc-section-head"><div><span className="cc-eyebrow">WORKSPACE</span><h2>Manage your tools</h2></div></div>
        <div className="cc-tools">
          <button onClick={() => go('Student Template')}>Create an application form <ArrowRight size={16} /></button>
          <button onClick={() => go('Files')}>Manage recipient files <ArrowRight size={16} /></button>
          <button onClick={() => go('Template Analytics')}>Review form analytics <ArrowRight size={16} /></button>
          <button onClick={() => go('SettingsEmail')}>Manage email senders <ArrowRight size={16} /></button>
        </div>
      </section>
      <section className="cc-queues" aria-label="Review queues">
        <div className="cc-panel"><div className="cc-panel-head"><h2>Recent applications</h2><button onClick={() => go('Sourcing')}>Open Sourcing <ArrowRight size={15} /></button></div>
          {(queues.applications || []).length ? queues.applications.map(item => <button className="cc-row" key={item.id} onClick={() => go('Sourcing')}><span><strong>{item.title || 'Application'}</strong><small>{dateLabel(item.submittedAt)}</small></span><ArrowRight size={16} /></button>) : <p className="cc-empty">No recent applications.</p>}</div>
        <div className="cc-panel"><div className="cc-panel-head"><h2>Candidates to review</h2><button onClick={() => go('Sourcing')}>Open Sourcing <ArrowRight size={15} /></button></div>
          {(queues.candidates || []).length ? queues.candidates.map(item => <button className="cc-row" key={item.id} onClick={() => go('Sourcing')}><span><strong>{item.name || 'Unnamed candidate'}</strong><small>{item.email || 'Contact information needed'}</small></span><ArrowRight size={16} /></button>) : <p className="cc-empty">No candidates need contact review.</p>}</div>
        <div className="cc-panel"><div className="cc-panel-head"><h2>Email delivery</h2><button onClick={() => go('Sent')}>Open Sent <ArrowRight size={15} /></button></div>
          {(queues.campaigns || []).length ? queues.campaigns.map(item => <button className="cc-row" key={item.id} onClick={() => go(item.status === 'scheduled' ? 'Schedule' : 'Sent')}><span><strong>{item.name}</strong><small>{item.status.replace('_', ' ')} · {item.sentCount} sent · {item.failedCount} failed</small></span>{item.status === 'scheduled' ? <Clock3 size={16} /> : <ArrowRight size={16} />}</button>) : <p className="cc-empty">No active or review campaigns.</p>}</div>
      </section>
    </>}
  </main>;
}
