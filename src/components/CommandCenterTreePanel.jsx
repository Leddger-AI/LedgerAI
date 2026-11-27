import { useState, useEffect, useCallback } from 'react';
import { Network, RefreshCw, Sparkles, Activity } from 'lucide-react';
import commandCenter from '../services/CommandCenter';
import { getAuthToken } from '../supabaseAuth';

const DEFAULT_SUBCENTERS = [
  { name: 'AuthGovernance', description: 'Profiles, OTP gates, Cloudinary, Keep-Alive', prefixes: ['/api/user', '/api/cloudinary', '/api/keep-alive'], stats: { totalRequests: 0, completed: 0, failed: 0, avgLatencyMs: 0 } },
  { name: 'CostIntelligence', description: 'Meetings, Gemini AI, Projects, Teams, Budgets, Alerts', prefixes: ['/api/meetings', '/api/projects', '/api/budgets'], stats: { totalRequests: 0, completed: 0, failed: 0, avgLatencyMs: 0 } },
  { name: 'FormsSourcing', description: 'Drafts, Public Forms, Candidates, Jitsi Meet + ICS', prefixes: ['/api/drafts', '/api/forms', '/api/candidates', '/api/interviews'], stats: { totalRequests: 0, completed: 0, failed: 0, avgLatencyMs: 0 } },
  { name: 'EmailCampaigns', description: 'Email Drafts, SMTP/OAuth2, Agenda Scheduler', prefixes: ['/api/email'], stats: { totalRequests: 0, completed: 0, failed: 0, avgLatencyMs: 0 } },
  { name: 'AnalyticsExport', description: 'Spreadsheets, Analytics, CSV/XLSX/PDF, Drive', prefixes: ['/api/spreadsheets', '/api/analytics', '/api/export'], stats: { totalRequests: 0, completed: 0, failed: 0, avgLatencyMs: 0 } },
  { name: 'KnowledgeResearch', description: 'KB Ingestion, Gemini RAG Q&A, Octokit OSS', prefixes: ['/api/kb', '/api/collaborators'], stats: { totalRequests: 0, completed: 0, failed: 0, avgLatencyMs: 0 } },
];

export default function CommandCenterTreePanel() {
  const [overview, setOverview] = useState(null);
  const [research, setResearch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [researching, setResearching] = useState(false);
  const [clientTasks, setClientTasks] = useState([]);

  useEffect(() => commandCenter.subscribe(setClientTasks), []);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await commandCenter.getOverview();
      if (res.ok) {
        setOverview(await res.json());
      }
    } catch { /* demo mode */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  const handleResearch = async () => {
    setResearching(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        setResearch({
          orchestrator: 'MainCommandCenter (Demo)',
          domains: DEFAULT_SUBCENTERS.map((s) => ({ domain: s.name, status: 'healthy', mode: 'demo' })),
        });
        return;
      }
      const res = await commandCenter.runMultiDomainResearch();
      if (res.ok) {
        setResearch(await res.json());
        loadOverview();
      }
    } finally {
      setResearching(false);
    }
  };

  const subCenters = overview?.subCenters || DEFAULT_SUBCENTERS;
  const recentTasks = overview?.recentTasks?.length ? overview.recentTasks : clientTasks.slice(0, 8);

  return (
    <div className="glass-panel" style={{ padding: '22px', marginTop: '24px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Network size={17} style={{ color: 'var(--color-cyan)' }} />
            Main Command Center &rarr; Sub-Command Tree
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Every request routes through the Main Command Center to its domain Sub-Command Center with live task tracking.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="table-action-btn" onClick={loadOverview} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', fontSize: '12px' }}>
            <RefreshCw size={13} /> {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button type="button" className="table-action-btn" onClick={handleResearch} disabled={researching} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', fontSize: '12px', backgroundColor: 'var(--color-cyan-glow)', borderColor: 'transparent' }}>
            <Sparkles size={13} /> {researching ? 'Researching...' : 'Run Multi-Domain Research'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        {subCenters.map((sub) => (
          <div key={sub.name} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(20,20,20,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{sub.name}</strong>
              <span style={{ fontSize: '11px', color: 'var(--color-cyan)', fontWeight: 600 }}>
                {sub.stats?.totalRequests ?? 0} reqs
              </span>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>{sub.description}</div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
              Avg: {sub.stats?.avgLatencyMs ?? 0}ms &middot; {sub.prefixes?.slice(0, 3).join(', ')}
            </div>
          </div>
        ))}
      </div>

      {research?.domains && (
        <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(0,240,255,0.2)', backgroundColor: 'rgba(0,240,255,0.04)', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>
            Parallel Multi-Domain Research Report ({research.orchestrator})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', fontSize: '11.5px' }}>
            {research.domains.map((d) => (
              <div key={d.domain} style={{ padding: '8px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.5)', border: '1px solid var(--border-color)' }}>
                <strong>{d.domain}</strong>: <span style={{ color: d.status === 'healthy' ? '#059669' : '#d97706' }}>{d.status}</span>
                <div style={{ color: 'var(--text-muted)', marginTop: '2px', wordBreak: 'break-word' }}>
                  {Object.entries(d).filter(([k]) => k !== 'domain' && k !== 'status').map(([k, v]) => `${k}=${v}`).join(' · ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentTasks.length > 0 && (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={13} style={{ color: 'var(--color-cyan)' }} /> Recent Tracked Requests
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '6px 8px' }}>Task ID</th>
                  <th style={{ padding: '6px 8px' }}>Sub-Command</th>
                  <th style={{ padding: '6px 8px' }}>Request</th>
                  <th style={{ padding: '6px 8px' }}>Status</th>
                  <th style={{ padding: '6px 8px' }}>Latency</th>
                </tr>
              </thead>
              <tbody>
                {recentTasks.slice(0, 6).map((t) => (
                  <tr key={t.taskId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{t.taskId}</td>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{t.domain}</td>
                    <td style={{ padding: '6px 8px' }}>{t.method} {t.path}</td>
                    <td style={{ padding: '6px 8px' }}>{t.status} ({t.statusCode ?? '...'})</td>
                    <td style={{ padding: '6px 8px' }}>{t.durationMs != null ? `${t.durationMs}ms` : '...'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
