import React, { useState } from 'react';
import { Bell, AlertTriangle, AlertCircle, Sparkles, Check, CheckCircle2, Trash2, X } from 'lucide-react';

export default function AlertsView({ alerts, onResolveAlert }) {
  const [resolvedHistory, setResolvedHistory] = useState([
    {
      id: 99,
      type: 'info',
      title: 'Database Sync Cleared',
      desc: 'Manual sync successfully completed for past 7 days calendar history.',
      resolvedAt: '1 hour ago'
    },
    {
      id: 98,
      type: 'warning',
      title: 'Phoenix Database Budget Resolved',
      desc: 'VP Marcus Vance approved budget allocation adjustment (+ $2,500) for PHX-408 code.',
      resolvedAt: 'Yesterday'
    }
  ]);

  const activeAlerts = alerts.filter(a => !a.resolved);

  const handleResolveClick = (id, alertItem) => {
    // Add to resolved history
    const historyItem = {
      ...alertItem,
      resolvedAt: 'Just now'
    };
    setResolvedHistory([historyItem, ...resolvedHistory]);
    // Call parent resolve handler
    onResolveAlert(id);
  };

  return (
    <div className="alerts-view-container" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
      
      {/* Left Column: Active Alerts Feed */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div className="section-header" style={{ marginBottom: '20px', borderBottom: 'none', paddingBottom: 0 }}>
          <div>
            <h2 className="section-title">
              <Bell size={18} style={{ color: 'var(--color-pink)', marginRight: '6px' }} />
              Active Anomalies & Alerts Feed
            </h2>
            <p className="section-subtitle">Real-time alerts triggered by AI models and budget cost threshold rules</p>
          </div>
          
          <span className="confidence-badge low" style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 'bold' }}>
            {activeAlerts.length} Active Warnings
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeAlerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 10px' }}>
              <CheckCircle2 size={48} style={{ color: 'var(--color-success)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#fff' }}>All Systems Healthy</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                No budget anomalies or low confidence attributions detected.
              </p>
            </div>
          ) : (
            activeAlerts.map((alert) => (
              <div className={`glass-panel alert-item ${alert.type}`} key={alert.id} style={{ display: 'flex', gap: '16px', padding: '20px', position: 'relative' }}>
                <div className={`alert-icon-wrapper ${alert.type}`} style={{
                  width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: alert.type === 'danger' ? 'rgba(244, 63, 94, 0.1)' : 
                                   alert.type === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(0, 240, 255, 0.1)',
                  color: alert.type === 'danger' ? 'var(--color-pink)' : 
                         alert.type === 'warning' ? 'var(--color-warning)' : 'var(--color-cyan)',
                  flexShrink: 0
                }}>
                  {alert.type === 'danger' && <AlertTriangle size={20} />}
                  {alert.type === 'warning' && <AlertCircle size={20} />}
                  {alert.type === 'info' && <Sparkles size={20} />}
                </div>

                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>{alert.title}</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '14px' }}>{alert.desc}</p>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="table-action-btn"
                      style={{
                        padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)', color: 'var(--color-success)'
                      }}
                      onClick={() => handleResolveClick(alert.id, alert)}
                    >
                      <Check size={14} />
                      <span>{alert.type === 'warning' ? 'Resolve Tagging' : 'Review & Resolve'}</span>
                    </button>
                    <button 
                      className="table-action-btn"
                      style={{ padding: '6px 14px', fontSize: '12px', backgroundColor: 'transparent', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                    >
                      Snooze
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Column: Resolved History */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
          Resolution Ledger
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {resolvedHistory.map((item) => (
            <div key={item.id} style={{ padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.01)', position: 'relative' }}>
              <span style={{ position: 'absolute', top: '14px', right: '14px', fontSize: '10px', color: 'var(--text-muted)' }}>
                {item.resolvedAt}
              </span>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  backgroundColor: 'var(--color-success)'
                }} />
                <strong style={{ fontSize: '13px', color: '#fff' }}>{item.title}</strong>
              </div>
              
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
