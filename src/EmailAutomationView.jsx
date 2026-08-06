import React, { useState } from 'react';
import { Send, Plus, Mail, Users, TrendingUp, Play, Pause, Edit2, Sparkles } from 'lucide-react';

const campaigns = [
  { id: 1, name: 'FE Engineer Outreach Sequence', type: 'Engage', status: 'Active', steps: 3, recipients: 42, openRate: 61, replyRate: 18 },
  { id: 2, name: 'Backend Talent Nurture', type: 'Nurture', status: 'Active', steps: 4, recipients: 96, openRate: 48, replyRate: 9 },
  { id: 3, name: 'Internship 2026 Reminder', type: 'Engage', status: 'Paused', steps: 2, recipients: 58, openRate: 55, replyRate: 22 }
];

const templates = [
  { id: 1, name: 'Initial Outreach', subject: 'Quick question about your work at {{company}}' },
  { id: 2, name: 'Follow-up #1', subject: 'Following up — {{job_title}} at LedgerAI' },
  { id: 3, name: 'Final Nudge', subject: 'Last call: {{job_title}} role closing soon' }
];

export default function EmailAutomationView() {
  const [activeTab, setActiveTab] = useState('campaigns');

  const totalRecipients = campaigns.reduce((acc, c) => acc + c.recipients, 0);
  const avgOpenRate = Math.round(campaigns.reduce((acc, c) => acc + c.openRate, 0) / campaigns.length);

  return (
    <div className="email-automation-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Send size={20} style={{ color: 'var(--color-cyan)' }} />
            Email Automation
          </h2>
          <p className="section-subtitle">Sequenced outreach campaigns and reusable templates to engage and nurture candidates</p>
        </div>
        <button
          className="table-action-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: 'rgba(20, 20, 20, 0.06)', borderColor: 'var(--border-color)' }}
        >
          <Plus size={16} />
          <span>New Campaign</span>
        </button>
      </div>

      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Active Campaigns</span>
            <div className="kpi-icon-wrapper cyan"><Mail size={16} /></div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{campaigns.filter(c => c.status === 'Active').length} Running</span>
            <span className="kpi-trend positive">of {campaigns.length} total</span>
          </div>
        </div>
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Recipients</span>
            <div className="kpi-icon-wrapper purple"><Users size={16} /></div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{totalRecipients} Prospects</span>
            <span className="kpi-trend positive">Across all campaigns</span>
          </div>
        </div>
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Avg. Open Rate</span>
            <div className="kpi-icon-wrapper cyan"><TrendingUp size={16} /></div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{avgOpenRate}%</span>
            <span className="kpi-trend positive">Healthy engagement</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
        {['campaigns', 'templates'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 16px', fontSize: '13px', fontWeight: '600', textTransform: 'capitalize',
              background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--color-cyan)' : '2px solid transparent'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'campaigns' ? (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="meetings-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Campaign</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Steps</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Recipients</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Open Rate</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Reply Rate</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}></th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                    <td style={{ padding: '14px 16px', fontWeight: '600', color: 'var(--text-primary)' }}>{c.name}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{c.type}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{c.steps} steps</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{c.recipients}</td>
                    <td style={{ padding: '14px 16px', fontWeight: '700', color: 'var(--text-primary)' }}>{c.openRate}%</td>
                    <td style={{ padding: '14px 16px', fontWeight: '700', color: 'var(--text-primary)' }}>{c.replyRate}%</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        fontSize: '11px', padding: '3px 8px', borderRadius: '4px', fontWeight: '600',
                        backgroundColor: c.status === 'Active' ? 'var(--color-success-glow)' : 'rgba(20,20,20,0.06)',
                        color: c.status === 'Active' ? 'var(--color-success)' : 'var(--text-muted)'
                      }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        {c.status === 'Active' ? <Pause size={15} /> : <Play size={15} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {templates.map(t => (
            <div className="glass-panel" key={t.id} style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{t.name}</h4>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <Edit2 size={14} />
                </button>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{t.subject}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <Sparkles size={12} style={{ color: 'var(--color-cyan)' }} />
                Supports merge tokens like {'{{'}candidate_name{'}}'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
