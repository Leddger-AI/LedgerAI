import React from 'react';
import { Table2 } from 'lucide-react';
import LedgerSpreadsheet from './LedgerSpreadsheet.jsx';
import './RosterStudioView.css';

export default function RosterStudioView() {
  return (
    <div className="roster-studio-container">
      <div className="roster-studio-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
          <Table2 size={20} style={{ color: '#0F172A' }} />
          Roster Studio
        </h2>
        <p style={{ color: '#64748B', fontSize: '13.5px', margin: '6px 0 0 0' }}>
          A native Excel-like workspace to build or import your candidate roster before launching outreach
        </p>
      </div>

      <LedgerSpreadsheet />
    </div>
  );
}
