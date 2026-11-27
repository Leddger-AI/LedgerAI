const SubCommandCenter = require('../core/SubCommandCenter');
const Spreadsheet = require('../models/Spreadsheet');
const AnalyticsReport = require('../models/AnalyticsReport');
const GoogleDriveToken = require('../models/GoogleDriveToken');

class AnalyticsExportCommand extends SubCommandCenter {
  constructor() {
    super({
      name: 'AnalyticsExport',
      description: 'FortuneSheet workbooks, template analytics, recruiting funnel, PDF/CSV/XLSX exports, and Google Drive',
      prefixes: ['/api/spreadsheets', '/api/analytics', '/api/export', '/api/google-drive', '/api/analysis'],
    });
  }

  async runResearch(ownerUid) {
    const [sheetsCount, reportsCount, driveConnected] = await Promise.all([
      Spreadsheet.countDocuments({ ownerUid }).catch(() => 0),
      AnalyticsReport.countDocuments({ ownerUid, status: 'active' }).catch(() => 0),
      GoogleDriveToken.exists({ ownerUid }).then(Boolean).catch(() => false),
    ]);

    return {
      domain: this.name,
      status: 'healthy',
      spreadsheetsCount: sheetsCount,
      spreadsheetQuotaRemaining: Math.max(0, 20 - sheetsCount),
      activeScheduledReports: reportsCount,
      googleDriveConnected: driveConnected,
    };
  }
}

module.exports = AnalyticsExportCommand;
