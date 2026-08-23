import React, { useState } from 'react';
import { Video, Calendar, Clock, Users, Copy, Check, PlusCircle, Link2 } from 'lucide-react';

const upcomingMeets = [
  { id: 1, candidate: 'Ava Thompson', role: 'Senior Frontend Engineer', time: 'Today, 3:00 PM', duration: '45m', type: 'Technical Interview', link: 'meet.ledgerai.app/ava-thompson-fe' },
  { id: 2, candidate: 'Marcus Lee', role: 'Backend / Rust Engineer', time: 'Tomorrow, 11:00 AM', duration: '30m', type: 'Screening Call', link: 'meet.ledgerai.app/marcus-lee-be' },
  { id: 3, candidate: 'Priya Nair', role: 'Senior Frontend Engineer', time: 'Fri, 2:30 PM', duration: '1h', type: 'Panel Interview', link: 'meet.ledgerai.app/priya-nair-fe' }
];

const pastMeets = [
  { id: 4, candidate: 'Daniel Osei', role: 'Summer Internship 2026', time: 'Yesterday', outcome: 'Advanced to next round' },
  { id: 5, candidate: 'Sofia Ramirez', role: 'Backend / Rust Engineer', time: '3 days ago', outcome: 'Not moving forward' }
];

export default function MeetView() {
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = async (m) => {
    try {
      await navigator.clipboard?.writeText(`https://${m.link}`);
      setCopiedId(m.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.warn('Failed to copy meeting link to clipboard:', err);
    }
  };

  return (
    <div className="meet-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Video size={20} style={{ color: 'var(--color-cyan)' }} />
            Candidate Meetings
          </h2>
          <p className="section-subtitle">Schedule and manage interviews with candidates sourced from your application templates</p>
        </div>
        <button
          className="table-action-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: 'rgba(20, 20, 20, 0.06)', borderColor: 'var(--border-color)' }}
        >
          <PlusCircle size={16} />
          <span>Schedule Meeting</span>
        </button>
      </div>

      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Upcoming Meetings</span>
            <div className="kpi-icon-wrapper cyan"><Calendar size={16} /></div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{upcomingMeets.length} Scheduled</span>
            <span className="kpi-trend positive">Next 7 days</span>
          </div>
        </div>
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Interview Hours</span>
            <div className="kpi-icon-wrapper purple"><Clock size={16} /></div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">2.25 hrs</span>
            <span className="kpi-trend positive">This week</span>
          </div>
        </div>
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Candidates Interviewed</span>
            <div className="kpi-icon-wrapper cyan"><Users size={16} /></div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{pastMeets.length} Completed</span>
            <span className="kpi-trend positive">This month</span>
          </div>
        </div>
      </div>

      {/* Upcoming meetings list */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>Upcoming Interviews</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {upcomingMeets.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid var(--border-color)', borderRadius: '10px', backgroundColor: 'rgba(20,20,20,0.02)' }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--text-primary)' }}>{m.candidate}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{m.role} &middot; {m.type}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)' }}>{m.time}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.duration}</div>
                </div>
                <button
                  onClick={() => handleCopy(m)}
                  style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-secondary)' }}
                >
                  {copiedId === m.id ? <Check size={12} style={{ color: 'var(--color-success)' }} /> : <Link2 size={12} />}
                  {copiedId === m.id ? 'Copied' : 'Copy Link'}
                </button>
                <button
                  className="table-action-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', fontSize: '12px', backgroundColor: 'var(--color-success-glow)', borderColor: 'transparent', color: 'var(--color-success)' }}
                >
                  <Video size={13} />
                  Join
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Past meetings */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>Past Interviews</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="meetings-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Candidate</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Role</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>When</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {pastMeets.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                  <td style={{ padding: '14px 16px', fontWeight: '600', color: 'var(--text-primary)' }}>{m.candidate}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{m.role}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{m.time}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      fontSize: '11px', padding: '3px 8px', borderRadius: '4px', fontWeight: '600',
                      backgroundColor: m.outcome.includes('Advanced') ? 'var(--color-success-glow)' : 'var(--color-danger-glow)',
                      color: m.outcome.includes('Advanced') ? 'var(--color-success)' : 'var(--color-danger)'
                    }}>
                      {m.outcome}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
