import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity, AlertCircle, ArrowRight, ArrowUpRight, Bell, CheckCircle2,
  Clock3, FileText, Mail, RefreshCw, Send, Timer, Users, Wallet,
} from 'lucide-react';
import { getAuthToken } from '../supabaseAuth';
import { getFirstName } from '../utils/greeting';
import './DashboardHome.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const previewData = import.meta.env.DEV && import.meta.env.VITE_LOCAL_EMAIL_TEST === 'true';
const reviewStatuses = new Set(['partial', 'failed', 'needs_review']);
const activeStatuses = new Set(['queued', 'scheduled', 'sending']);

function count(value) {
  return value == null ? '—' : Number(value).toLocaleString();
}

function dateLabel(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function chooseAction(counts, sources) {
  if (sources.campaigns === 'ready' && counts.campaignsToReview > 0) return {
    eyebrow: 'DELIVERY REVIEW', title: 'A campaign needs your decision',
    detail: `${count(counts.campaignsToReview)} campaign${counts.campaignsToReview === 1 ? '' : 's'} with delivery issues to review.`,
    label: 'Review results', route: 'Sent',
  };
  if (sources.forms === 'ready' && counts.candidatesToReview > 0) return {
    eyebrow: 'CANDIDATE REVIEW', title: 'Check candidate contact details',
    detail: `${count(counts.candidatesToReview)} candidate${counts.candidatesToReview === 1 ? '' : 's'} waiting for a contact check.`,
    label: 'Open Sourcing', route: 'Sourcing',
  };
  if (sources.forms !== 'ready' || sources.campaigns !== 'ready') return {
    eyebrow: 'CONNECTION CHECK', title: 'Some workspace data is unavailable',
    detail: 'Refresh to reconnect before deciding what needs attention.',
    label: 'Retry connection', route: null,
  };
  if (counts.activeForms === 0) return {
    eyebrow: 'START HERE', title: 'Publish an application form',
    detail: 'Create a form and share its link to start collecting responses.',
    label: 'Open forms', route: 'Drafts',
  };
  if (counts.queuedCampaigns > 0) return {
    eyebrow: 'EMAIL DELIVERY', title: 'Track your queued campaign',
    detail: `${count(counts.queuedCampaigns)} campaign${counts.queuedCampaigns === 1 ? '' : 's'} waiting for delivery.`,
    label: 'View campaigns', route: 'Email Automation',
  };
  return {
    eyebrow: 'WORKSPACE READY', title: 'Keep the workflow moving',
    detail: 'Review the latest form responses and candidate history.',
    label: 'Open Sourcing', route: 'Sourcing',
  };
}

export default function DashboardHome({ user, onNavigate }) {
  const [snapshot, setSnapshot] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [workflowState, setWorkflowState] = useState('loading');
  const [meetingState, setMeetingState] = useState('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [today] = useState(() => new Date());
  const requestRef = useRef(null);
  const go = tab => onNavigate?.(tab);

  const refresh = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setRefreshing(true);
    try {
      const token = await getAuthToken();
      if (controller.signal.aborted) return;
      if (!token) throw new Error('Sign in to load your workspace.');
      const headers = { Authorization: `Bearer ${token}` };
      const [workflowResult, meetingResult] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/api/command-center`, { headers, signal: controller.signal }).then(async response => {
          if (!response.ok) throw new Error('Workflow unavailable');
          const data = await response.json();
          if (!data || !data.counts || !data.sources || !data.queues) throw new Error('Workflow response incomplete');
          return data;
        }),
        fetch(`${API_BASE_URL}/api/meetings`, { headers, signal: controller.signal }).then(async response => {
          if (!response.ok) throw new Error('Meetings unavailable');
          const data = await response.json();
          if (!Array.isArray(data.meetings)) throw new Error('Meetings response incomplete');
          return data.meetings;
        }),
      ]);
      if (controller.signal.aborted) return;
      if (workflowResult.status === 'fulfilled') {
        setSnapshot(workflowResult.value);
        setWorkflowState('ready');
      } else setWorkflowState('unavailable');
      if (meetingResult.status === 'fulfilled') {
        setMeetings(meetingResult.value);
        setMeetingState('ready');
      } else setMeetingState('unavailable');
    } catch {
      if (!controller.signal.aborted) {
        setWorkflowState('unavailable');
        setMeetingState('unavailable');
      }
    } finally {
      if (!controller.signal.aborted) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(refresh);
    return () => requestRef.current?.abort();
  }, [refresh]);

  const first = getFirstName(user);
  const counts = snapshot?.counts || {};
  const sources = workflowState === 'ready' ? snapshot.sources : {};
  const sourceUnavailable = workflowState === 'ready' && (sources.forms !== 'ready' || sources.campaigns !== 'ready');
  const queues = snapshot?.queues || {};
  const action = workflowState === 'loading' ? {
    eyebrow: 'CONNECTING WORKSPACE', title: 'Loading your next step',
    detail: 'Checking form, candidate, and campaign activity.',
    label: 'Loading…', route: null,
  } : chooseAction(counts, sources);
  const stale = workflowState === 'unavailable' && !!snapshot;
  const meetingStale = meetingState === 'unavailable' && !!meetings.length;
  const totalCost = meetingState === 'ready' ? meetings.reduce((sum, meeting) => sum + (Number(meeting.cost) || 0), 0) : null;
  const reviewMeetings = meetingState === 'ready' ? meetings.filter(meeting => meeting.requires_human_review).length : null;
  const campaigns = (queues.campaigns || []).filter(item => activeStatuses.has(item.status) || reviewStatuses.has(item.status)).slice(0, 3);
  const responses = (queues.applications || []).slice(0, 3);
  const metricCards = [
    { label: 'Form responses', value: counts.submissions, detail: 'All published form types', icon: FileText, route: 'Sourcing', tone: 'coral' },
    { label: 'Candidates', value: counts.candidates, detail: 'Distinct people in your workspace', icon: Users, route: 'Sourcing', tone: 'sage' },
    { label: 'Contact review', value: counts.candidatesToReview, detail: 'Candidates needing a contact check', icon: AlertCircle, route: 'Sourcing', tone: 'amber' },
    { label: 'Delivery review', value: counts.campaignsToReview, detail: 'Campaigns with issues to inspect', icon: Send, route: 'Sent', tone: 'blue' },
  ];
  const steps = [
    { number: '01', title: 'Publish a form', value: counts.activeForms, unit: 'active links', route: 'Drafts', icon: FileText },
    { number: '02', title: 'Review people', value: counts.candidatesToReview, unit: 'contact checks', route: 'Sourcing', icon: Users },
    { number: '03', title: 'Prepare outreach', value: counts.queuedCampaigns == null || counts.scheduledCampaigns == null ? null : counts.queuedCampaigns + counts.scheduledCampaigns, unit: 'queued or scheduled', route: 'Email Automation', icon: Mail },
    { number: '04', title: 'Track delivery', value: counts.campaignsToReview, unit: 'need review', route: 'Sent', icon: Activity },
  ];

  return <div className="hd-page">
    <header className="hd-header">
      <div><span className="hd-eyebrow">LEDDGER / YOUR WORKSPACE</span>
        <h1>Good to see you, {first}.</h1>
        <p>{today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} · Your work, in one place.</p></div>
      <div className="hd-header-actions">
        {previewData && <span className="hd-preview">Local preview data</span>}
        <button type="button" className="hd-icon-action" onClick={() => go('Alerts')} aria-label="Open alerts"><Bell size={18} /></button>
        <button type="button" className="hd-refresh" onClick={refresh} disabled={refreshing}><RefreshCw size={16} />{refreshing ? 'Updating…' : 'Refresh'}</button>
      </div>
    </header>

    {(workflowState === 'unavailable' || meetingState === 'unavailable' || sourceUnavailable) &&
      <div className="hd-notice" role="status"><AlertCircle size={17} />
        <span>{stale || meetingStale ? 'Some figures are from the last successful refresh. ' : ''}Unavailable values are shown as —. Refresh to try again.</span>
      </div>}

    <section className="hd-hero" aria-labelledby="hd-next-title">
      <div className="hd-hero-copy"><span className="hd-eyebrow">{action.eyebrow}</span>
        <h2 id="hd-next-title">{action.title}</h2><p>{action.detail}</p>
        <button type="button" className="hd-primary" disabled={workflowState === 'loading' || refreshing} onClick={() => action.route ? go(action.route) : refresh()}>{action.label}<ArrowUpRight size={18} /></button>
      </div>
      <div className="hd-hero-aside"><span className="hd-eyebrow">WORKFLOW AT A GLANCE</span>
        <strong>{workflowState === 'ready' ? count(counts.activeForms) : '—'} <small>active forms</small></strong>
        <strong>{workflowState === 'ready' ? count(counts.scheduledCampaigns) : '—'} <small>scheduled campaigns</small></strong>
        <span className="hd-hero-foot">Every step opens its connected workspace.</span>
      </div>
    </section>

    <section className="hd-section" aria-labelledby="hd-overview-title">
      <div className="hd-section-head"><div><span className="hd-eyebrow">LIVE SNAPSHOT</span><h2 id="hd-overview-title">Where things stand</h2></div>
        <span className="hd-section-note">{workflowState === 'ready' ? 'From your saved workspace' : workflowState === 'loading' ? 'Loading workspace…' : 'Connection unavailable'}</span></div>
      <div className="hd-metrics">{metricCards.map(metric => <button type="button" className={`hd-metric hd-${metric.tone}`} key={metric.label} onClick={() => go(metric.route)}>
        <span className="hd-metric-top"><metric.icon size={18} /><ArrowUpRight size={16} /></span>
        <strong>{workflowState === 'ready' ? count(metric.value) : '—'}</strong><span>{metric.label}</span><small>{metric.detail}</small>
      </button>)}</div>
    </section>

    <section className="hd-section" aria-labelledby="hd-flow-title">
      <div className="hd-section-head"><div><span className="hd-eyebrow">CONNECTED WORK</span><h2 id="hd-flow-title">Move through the workflow</h2></div></div>
      <div className="hd-steps">{steps.map(step => <button type="button" className="hd-step" key={step.number} onClick={() => go(step.route)}>
        <span className="hd-step-index">{step.number}</span><step.icon size={19} /><strong>{step.title}</strong>
        <span className="hd-step-count">{workflowState === 'ready' ? count(step.value) : '—'} <small>{step.unit}</small></span><ArrowRight size={17} className="hd-step-arrow" />
      </button>)}</div>
    </section>

    <div className="hd-lower">
      <section className="hd-list-card" aria-labelledby="hd-responses-title"><div className="hd-list-head"><div><span className="hd-eyebrow">LATEST ACTIVITY</span><h2 id="hd-responses-title">Form responses</h2></div><button type="button" onClick={() => go('Sourcing')}>View all <ArrowRight size={15} /></button></div>
        {workflowState !== 'ready' || sources.forms !== 'ready' ? <p className="hd-list-empty">Responses are unavailable right now.</p>
          : responses.length === 0 ? <p className="hd-list-empty">No responses yet. <button type="button" onClick={() => go('Drafts')}>Publish a form</button></p>
            : responses.map(item => <button type="button" className="hd-list-row" key={item.id} onClick={() => go('Sourcing')}><span className="hd-row-icon"><FileText size={16} /></span><span><strong>{item.title || 'Form response'}</strong><small>{dateLabel(item.submittedAt)}</small></span><ArrowRight size={16} /></button>)}
      </section>
      <section className="hd-list-card" aria-labelledby="hd-campaigns-title"><div className="hd-list-head"><div><span className="hd-eyebrow">OUTREACH</span><h2 id="hd-campaigns-title">Campaign activity</h2></div><button type="button" onClick={() => go('Email Automation')}>Open email <ArrowRight size={15} /></button></div>
        {workflowState !== 'ready' || sources.campaigns !== 'ready' ? <p className="hd-list-empty">Campaigns are unavailable right now.</p>
          : campaigns.length === 0 ? <p className="hd-list-empty">No active campaigns. <button type="button" onClick={() => go('Email Automation')}>Prepare an email</button></p>
            : campaigns.map(item => <button type="button" className="hd-list-row" key={item.id} onClick={() => go(item.status === 'scheduled' ? 'Schedule' : reviewStatuses.has(item.status) ? 'Sent' : 'Email Automation')}><span className="hd-row-icon"><Mail size={16} /></span><span><strong>{item.name || 'Untitled campaign'}</strong><small>{item.status.replaceAll('_', ' ')}</small></span><ArrowRight size={16} /></button>)}
      </section>
    </div>

    <section className="hd-meeting-strip" aria-label="Meeting cost"><div className="hd-meeting-icon"><Wallet size={20} /></div>
      <div><span className="hd-eyebrow">MEETING COST</span><strong>{totalCost === null ? '—' : `$${totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}</strong><small>{meetingState === 'ready' ? `${count(meetings.length)} saved meetings · ${count(reviewMeetings)} need attribution review` : 'Meeting data unavailable'}</small></div>
      <div className="hd-meeting-actions"><button type="button" onClick={() => go('Meet')}>Meeting log <ArrowRight size={15} /></button><button type="button" onClick={() => go('Live Ticker')}><Timer size={15} /> Record meeting</button></div>
    </section>
    <footer className="hd-footer"><span>{workflowState === 'ready' && sources.forms === 'ready' && sources.campaigns === 'ready' ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}{workflowState === 'ready' && sources.forms === 'ready' && sources.campaigns === 'ready' ? 'Workflow connected' : 'Connection needs a check'}</span>
      <button type="button" onClick={() => go('Command Center')}>Open Command Center <ArrowRight size={15} /></button></footer>
  </div>;
}
