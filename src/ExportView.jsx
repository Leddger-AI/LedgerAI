import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, File, Clock, Check } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getAuthToken } from './supabaseAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const INITIAL_HISTORY = [
  { id: 1, name: 'HR_Cost_Attribution_Report_This_Month.csv', format: 'CSV', size: '48 KB', date: 'Sample' },
];

const formats = [
  { id: 'csv', label: 'CSV', desc: 'Raw tabular data, compatible with Excel & Sheets', icon: FileSpreadsheet, color: 'var(--color-success)' },
  { id: 'xlsx', label: 'XLSX', desc: 'Formatted Excel workbook with multiple sheets', icon: FileSpreadsheet, color: 'var(--color-cyan)' },
  { id: 'pdf', label: 'PDF', desc: 'Print-ready summary report or candidate one-pager', icon: FileText, color: 'var(--color-danger)' },
  { id: 'json', label: 'JSON', desc: 'Structured JSON payload for integrations & pipelines', icon: File, color: 'var(--color-purple)' }
];

const SCOPE_MAP = {
  'Meetings & Cost Ledger': 'meetings',
  'Projects & Budgets': 'projects',
  'Talent Pool / Sourcing': 'candidates',
  'Team Roster': 'team',
};

const scopes = Object.keys(SCOPE_MAP);

export default function ExportView() {
  const [selectedFormat, setSelectedFormat] = useState('csv');
  const [selectedScope, setSelectedScope] = useState(scopes[0]);
  const [exported, setExported] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [history, setHistory] = useState(INITIAL_HISTORY);

  const handleExport = async () => {
    setDownloading(true);
    const scopeKey = SCOPE_MAP[selectedScope] || 'meetings';
    const fileBase = `ledgerai-${scopeKey}-${new Date().toISOString().slice(0, 10)}`;

    try {
      const token = await getAuthToken();
      let blob;
      let filename = `${fileBase}.${selectedFormat}`;

      if (token) {
        if (selectedFormat === 'xlsx') {
          const res = await fetch(`${API_BASE_URL}/api/export?scope=${scopeKey}&format=json`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          const ws = XLSX.utils.json_to_sheet(data.rows?.length ? data.rows : [{ Info: 'No records available' }]);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, scopeKey);
          XLSX.writeFile(wb, filename);
        } else {
          const res = await fetch(`${API_BASE_URL}/api/export?scope=${scopeKey}&format=${selectedFormat}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          blob = await res.blob();
        }
      } else {
        // Demo mode local file download
        const sampleRows = [{ Scope: selectedScope, Mode: 'Demo Preview', ExportedAt: new Date().toISOString() }];
        if (selectedFormat === 'xlsx') {
          const ws = XLSX.utils.json_to_sheet(sampleRows);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, scopeKey);
          XLSX.writeFile(wb, filename);
        } else {
          const text = selectedFormat === 'json'
            ? JSON.stringify(sampleRows, null, 2)
            : 'Scope,Mode,ExportedAt\n"' + selectedScope + '","Demo Preview","' + new Date().toISOString() + '"';
          blob = new Blob([text], { type: selectedFormat === 'json' ? 'application/json' : 'text/csv' });
        }
      }

      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }

      setHistory((prev) => [
        { id: Date.now(), name: filename, format: selectedFormat.toUpperCase(), size: blob ? `${Math.max(1, Math.round(blob.size / 1024))} KB` : 'Workbook', date: 'Just now' },
        ...prev,
      ]);
      setExported(true);
      setTimeout(() => setExported(false), 1800);
    } finally {
      setDownloading(false);
    }
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
          disabled={downloading}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '13px',
            backgroundColor: exported ? 'var(--color-success-glow)' : 'var(--color-cyan-glow)',
            borderColor: 'transparent',
            color: exported ? 'var(--color-success)' : 'var(--text-primary)'
          }}
        >
          {exported ? <Check size={15} /> : <Download size={15} />}
          {downloading ? 'Generating...' : exported ? 'Export Ready' : `Export ${selectedScope} as ${selectedFormat.toUpperCase()}`}
        </button>
      </div>

      {/* Export History */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={16} style={{ color: 'var(--color-cyan)' }} />
          Recent Exports
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {history.map(item => (
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
