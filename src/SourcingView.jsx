import React, { useState } from 'react';
import { UserSearch, Plus, Copy, Check, ExternalLink, GitBranch, FileText, Users, Link2, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const initialTemplates = [
  {
    id: 'tpl-fe-01',
    name: 'Senior Frontend Engineer',
    code: 'FE-SR-01',
    fields: ['Resume', 'GitHub', 'LinkedIn', 'Private Repo Access'],
    submissions: 24,
    status: 'Active',
    link: 'ledgerai.app/apply/fe-sr-01'
  },
  {
    id: 'tpl-be-02',
    name: 'Backend / Rust Engineer',
    code: 'BE-RS-02',
    fields: ['Resume', 'GitHub', 'Portfolio'],
    submissions: 11,
    status: 'Active',
    link: 'ledgerai.app/apply/be-rs-02'
  },
  {
    id: 'tpl-intern-03',
    name: 'Summer Internship 2026',
    code: 'INT-26-03',
    fields: ['Resume', 'LinkedIn'],
    submissions: 58,
    status: 'Draft',
    link: 'ledgerai.app/apply/int-26-03'
  }
];

const talentPool = [
  { id: 1, name: 'Ava Thompson', role: 'Senior Frontend Engineer', github: 'avat-dev', linkedin: true, score: 94, applied: '2 days ago' },
  { id: 2, name: 'Marcus Lee', role: 'Backend / Rust Engineer', github: 'mlee-rs', linkedin: false, score: 88, applied: '4 days ago' },
  { id: 3, name: 'Priya Nair', role: 'Senior Frontend Engineer', github: 'priyacodes', linkedin: true, score: 91, applied: '1 week ago' },
  { id: 4, name: 'Daniel Osei', role: 'Summer Internship 2026', github: 'dosei', linkedin: true, score: 79, applied: '1 week ago' }
];

export default function SourcingView() {
  const navigate = useNavigate();
  const [templates] = useState(initialTemplates);
  const [copiedId, setCopiedId] = useState(null);

  const handleCopyLink = (tpl) => {
    navigator.clipboard?.writeText(`https://${tpl.link}`);
    setCopiedId(tpl.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const totalSubmissions = templates.reduce((acc, t) => acc + t.submissions, 0);
  const activeCount = templates.filter(t => t.status === 'Active').length;

  return (
    <div className="sourcing-container">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <UserSearch size={20} style={{ color: 'var(--color-cyan)' }} />
            Sourcing & Application Templates
          </h2>
          <p className="section-subtitle">Build shareable candidate application forms and manage your incoming talent pool</p>
        </div>
        <button
          className="table-action-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: 'rgba(20, 20, 20, 0.06)', borderColor: 'var(--border-color)' }}
          onClick={() => navigate('/recruiter')}
        >
          <Plus size={16} />
          <span>New Template</span>
        </button>
      </div>

      {/* KPI stats */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Active Templates</span>
            <div className="kpi-icon-wrapper cyan"><FileText size={16} /></div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{activeCount} Live</span>
            <span className="kpi-trend positive">of {templates.length} total</span>
          </div>
        </div>
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Submissions</span>
            <div className="kpi-icon-wrapper purple"><Users size={16} /></div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{totalSubmissions} Candidates</span>
            <span className="kpi-trend positive">Across all templates</span>
          </div>
        </div>
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Talent Pool Size</span>
            <div className="kpi-icon-wrapper cyan"><UserSearch size={16} /></div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{talentPool.length} Profiles</span>
            <span className="kpi-trend positive">Ready to review</span>
          </div>
        </div>
      </div>

      {/* Template Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {templates.map(tpl => (
          <div className="glass-panel" key={tpl.id} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>{tpl.name}</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Code: {tpl.code}</span>
              </div>
              <span style={{
                fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: '600',
                backgroundColor: tpl.status === 'Active' ? 'var(--color-success-glow)' : 'rgba(20,20,20,0.06)',
                color: tpl.status === 'Active' ? 'var(--color-success)' : 'var(--text-muted)'
              }}>
                {tpl.status}
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {tpl.fields.map(f => (
                <span key={f} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '12px', backgroundColor: 'rgba(20,20,20,0.05)', color: 'var(--text-secondary)' }}>
                  {f}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{tpl.submissions}</strong> submissions
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleCopyLink(tpl)}
                  title="Copy shareable link"
                  style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-secondary)' }}
                >
                  {copiedId === tpl.id ? <Check size={12} style={{ color: 'var(--color-success)' }} /> : <Copy size={12} />}
                  {copiedId === tpl.id ? 'Copied' : 'Copy Link'}
                </button>
                <button
                  onClick={() => navigate('/recruiter')}
                  title="Edit template"
                  style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}
                >
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Talent Pool Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Users size={16} style={{ color: 'var(--color-cyan)' }} />
          Talent Pool
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="meetings-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Candidate</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Applied For</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>GitHub</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>LinkedIn</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>AI Score</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Applied</th>
              </tr>
            </thead>
            <tbody>
              {talentPool.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                  <td style={{ padding: '14px 16px', fontWeight: '600', color: 'var(--text-primary)' }}>{c.name}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{c.role}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <GitBranch size={12} /> {c.github}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {c.linkedin ? (
                      <Link2 size={14} style={{ color: 'var(--color-cyan)' }} />
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontWeight: '700', color: c.score >= 90 ? 'var(--color-success)' : c.score >= 80 ? 'var(--color-warning)' : 'var(--text-primary)' }}>
                      {c.score}%
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{c.applied}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
