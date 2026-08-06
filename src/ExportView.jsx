import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, FileJson, File, Clock, Check } from 'lucide-react';

const exportHistory = [
  { id: 1, name: 'HR_Cost_Attribution_Report_This_Month.csv', format: 'CSV', size: '48 KB', date: 'Today, 9:12 AM' },
  { id: 2, name: 'Talent_Pool_Export_Q3.xlsx', format: 'XLSX', size: '112 KB', date: 'Yesterday' },
  { id: 3, name: 'Candidate_OnePager_Ava_Thompson.pdf', format: 'PDF', size: '220 KB', date: '3 days ago' }
];

const formats = [
  { id: 'csv', label: 'CSV', desc: 'Raw tabular data, compatible with Excel & Sheets', icon: FileSpreadsheet, color: 'var(--color-success)' },
  { id: 'xlsx', label: 'XLSX', desc: 'Formatted Excel workbook with multiple sheets', icon: FileSpreadsheet, color: 'var(--color-cyan)' },
  { id: 'pdf', label: 'PDF', desc: 'Print-ready summary report or candidate one-pager', icon: FileText, color: 'var(--color-danger)' },
  { id: 'docx', label: 'DOCX', desc: 'Editable Word document for offer letters & summaries', icon: File, color: 'var(--color-purple)' }
];

const scopes = ['Meetings & Cost Ledger', 'Projects & Budgets', 'Talent Pool / Sourcing', 'Team Roster'];

export default function ExportView() {
  const [selectedFormat, setSelectedFormat] = useState('csv');
  const [selectedScope, setSelectedScope] = useState(scopes[0]);
  const [exported, setExported] = useState(false);

  const handleExport = () => {
    setExported(true);
    setTimeout(() => setExported(false), 1800);
  };

  return (
    <div className="export-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Download size={20} style={{ color: 'var(--color-cyan)' }} />
            Export Center
          </h2>
          <p className="section-subtitle">Export ledgers, talent pool data, and candidate reports in your preferred format</p>
        </div>
      </div>

      {/* Export Builder */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>Build an Export</h3>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>Data Scope</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {scopes.map(s => (
              <button
                key={s}
                onClick={() => setSelectedScope(s)}
                style={{
                  padding: '8px 14px', fontSize: '12.5px', borderRadius: '8px', cursor: 'pointer',
                  border: `1px solid ${selectedScope === s ? 'var(--color-cyan)' : 'var(--border-color)'}`,
                  backgroundColor: selectedScope === s ? 'var(--color-cyan-glow)' : 'transparent',
                  color: selectedScope === s ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: selectedScope === s ? '600' : '400'
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>Export Format</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {formats.map(f => {
              const Icon = f.icon;
              const active = selectedFormat === f.id;
              return (
                <div
                  key={f.id}
                  onClick={() => setSelectedFormat(f.id)}
                  style={{
                    padding: '14px', borderRadius: '10px', cursor: 'pointer',
                    border: `1px solid ${active ? f.color : 'var(--border-color)'}`,
                    backgroundColor: active ? 'rgba(20,20,20,0.03)' : 'transparent',
                    display: 'flex', gap: '10px', alignItems: 'flex-start'
                  }}
                >
                  <Icon size={18} style={{ color: f.color, marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{f.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.4' }}>{f.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          className="table-action-btn"
          onClick={handleExport}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '13px',
            backgroundColor: exported ? 'var(--color-success-glow)' : 'var(--color-cyan-glow)',
            borderColor: 'transparent',
            color: exported ? 'var(--color-success)' : 'var(--text-primary)'
          }}
        >
          {exported ? <Check size={15} /> : <Download size={15} />}
          {exported ? 'Export Ready' : `Export ${selectedScope} as ${selectedFormat.toUpperCase()}`}
        </button>
      </div>

      {/* Export History */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={16} style={{ color: 'var(--color-cyan)' }} />
          Recent Exports
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {exportHistory.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileSpreadsheet size={16} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{item.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.size} &middot; {item.date}</div>
                </div>
              </div>
              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', fontWeight: '600', backgroundColor: 'rgba(20,20,20,0.05)', color: 'var(--text-secondary)' }}>
                {item.format}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
