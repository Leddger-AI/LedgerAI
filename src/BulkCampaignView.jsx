import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import ExcelCampaignGrid from './ExcelCampaignGrid.jsx';

export default function BulkCampaignView() {
  return (
    <div className="bulk-campaign-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <FileSpreadsheet size={20} style={{ color: 'var(--color-cyan)' }} />
            Bulk Campaign
          </h2>
          <p className="section-subtitle">Import or manually build a candidate spreadsheet to launch bulk outreach campaigns</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <ExcelCampaignGrid />
      </div>
    </div>
  );
}
