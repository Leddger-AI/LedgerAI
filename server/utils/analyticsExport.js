/**
 * Analytics export utilities — pure builders for CSV, JSON, and PDF content.
 *
 * Used by both the Google Drive export endpoints and the local download
 * endpoints so the serialization logic lives in exactly one place.
 *
 * Every builder returns either a String (csv/json) or a Buffer (pdf) so the
 * caller can stream it to the client or upload it to Drive unchanged.
 */
const {
  getOverviewStats,
  getTemplatesWithStats,
  getTemplateDetail,
  getTemplateSubmissions,
  getSubmissionTrends,
  getTemplateTypeDistribution,
} = require('./analyticsUtils');

/** Quote a single CSV cell per RFC 4180. */
function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function rowsToCsv(rows) {
  return rows.map(row => (Array.isArray(row) ? row : [row]).map(csvCell).join(',')).join('\n');
}

/** Sanitize a title into a filesystem-safe slug. */
function slugify(str) {
  return String(str || 'report').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'report';
}

// ---------------------------------------------------------------------------
// Overview exports
// ---------------------------------------------------------------------------

async function buildOverviewExportData(ownerUid) {
  const [overview, templates, trendsData, typeDist] = await Promise.all([
    getOverviewStats(ownerUid),
    getTemplatesWithStats(ownerUid),
    getSubmissionTrends(ownerUid, 30),
    getTemplateTypeDistribution(ownerUid),
  ]);
  return { overview, templates, trends: trendsData, typeDistribution: typeDist };
}

function overviewToCsv(data) {
  const { overview, templates } = data;
  const rows = [
    ['Metric', 'Value'],
    ['Total Templates', overview.totalTemplates],
    ['Active Links', overview.activeLinks],
    ['Total Submissions', overview.totalSubmissions],
    ['Avg Fields/Template', overview.avgFieldsPerTemplate],
    [],
    ['Draft ID', 'Title', 'Type', 'Status', 'Submissions', 'Last Submission'],
    ...templates.map(t => [
      t.draftId,
      t.title,
      t.templateType,
      t.status,
      t.submissionCount,
      t.lastSubmissionAt ? new Date(t.lastSubmissionAt).toISOString() : 'N/A',
    ]),
  ];
  return rowsToCsv(rows);
}

function overviewToJson(data) {
  return JSON.stringify(data, null, 2);
}

function overviewToPdf(data) {
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const buffers = [];
  doc.on('data', b => buffers.push(b));

  const { overview, templates, typeDistribution } = data;

  doc.fontSize(20).fillColor('#0f172a').text('Analytics Overview Report', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#64748b').text(`Generated ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown(1.5);

  // KPI table
  doc.fontSize(14).fillColor('#0f172a').text('Key Metrics');
  doc.moveDown(0.5);
  const kpis = [
    ['Total Templates', overview.totalTemplates],
    ['Active Links', overview.activeLinks],
    ['Total Submissions', overview.totalSubmissions],
    ['Avg Fields/Template', overview.avgFieldsPerTemplate],
  ];
  kpis.forEach(([label, value]) => {
    doc.fontSize(11).fillColor('#334155').text(`${label}: `, { continued: true });
    doc.fillColor('#0f172a').text(String(value));
  });
  doc.moveDown(1);

  // Template type distribution
  if (typeDistribution && typeDistribution.length > 0) {
    doc.fontSize(14).fillColor('#0f172a').text('Template Types');
    doc.moveDown(0.5);
    typeDistribution.forEach(t => {
      doc.fontSize(11).fillColor('#334155').text(`${t.type}: ${t.count}`);
    });
    doc.moveDown(1);
  }

  // Templates table
  doc.fontSize(14).fillColor('#0f172a').text('Templates');
  doc.moveDown(0.5);
  const tableTop = doc.y;
  const colX = [50, 170, 280, 360, 440, 520];
  const headers = ['Title', 'Type', 'Status', 'Subs', 'Last Sub'];
  doc.fontSize(9).fillColor('#64748b');
  headers.forEach((h, i) => doc.text(h, colX[i], tableTop));
  doc.moveTo(50, tableTop + 14).lineTo(555, tableTop + 14).strokeColor('#e2e8f0').stroke();
  let y = tableTop + 22;
  templates.forEach(t => {
    if (y > 780) { doc.addPage(); y = 50; }
    doc.fontSize(9).fillColor('#0f172a');
    doc.text(String(t.title).slice(0, 22), colX[0], y);
    doc.text(t.templateType, colX[1], y);
    doc.text(t.status, colX[2], y);
    doc.text(String(t.submissionCount), colX[3], y);
    doc.text(t.lastSubmissionAt ? new Date(t.lastSubmissionAt).toLocaleDateString() : '—', colX[4], y);
    y += 16;
  });

  doc.end();
  return new Promise(resolve => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
  });
}

async function buildOverviewContent(ownerUid, format) {
  const data = await buildOverviewExportData(ownerUid);
  if (format === 'json') return { content: overviewToJson(data), mimeType: 'application/json', ext: 'json' };
  if (format === 'pdf') return { content: await overviewToPdf(data), mimeType: 'application/pdf', ext: 'pdf' };
  return { content: overviewToCsv(data), mimeType: 'text/csv', ext: 'csv' };
}

// ---------------------------------------------------------------------------
// Per-template exports
// ---------------------------------------------------------------------------

async function buildTemplateExportData(ownerUid, draftId) {
  const detail = await getTemplateDetail(ownerUid, draftId);
  if (!detail) return null;
  const subResult = await getTemplateSubmissions(ownerUid, draftId, 1, 10000);
  return { detail, submissions: subResult.submissions };
}

function templateToCsv(data) {
  const { submissions } = data;
  const allKeys = [...new Set(submissions.flatMap(s => Object.keys(s.submittedData || {})))];
  const headerRow = ['Submission ID', 'Submitted At', ...allKeys];
  const dataRows = submissions.map(s => [
    s.submissionId,
    new Date(s.submittedAt).toISOString(),
    ...allKeys.map(k => s.submittedData?.[k] ?? ''),
  ]);
  return rowsToCsv([headerRow, ...dataRows]);
}

function templateToJson(data) {
  return JSON.stringify(data, null, 2);
}

function templateToPdf(data) {
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const buffers = [];
  doc.on('data', b => buffers.push(b));

  const { detail, submissions } = data;

  doc.fontSize(18).fillColor('#0f172a').text('Template Analytics Report', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor('#0f172a').text(detail.title, { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#64748b').text(`Generated ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown(1.5);

  // Meta
  doc.fontSize(11).fillColor('#334155');
  doc.text(`Type: `, { continued: true }).fillColor('#0f172a').text(detail.templateType);
  doc.fillColor('#334155').text(`Status: `, { continued: true }).fillColor('#0f172a').text(detail.status);
  doc.fillColor('#334155').text(`Total Submissions: `, { continued: true }).fillColor('#0f172a').text(String(detail.totalSubmissions));
  doc.fillColor('#334155').text(`Enabled Fields: `, { continued: true }).fillColor('#0f172a').text(String(detail.enabledFields.length));
  doc.moveDown(1);

  // Field stats
  if (detail.enabledFields.length > 0) {
    doc.fontSize(14).fillColor('#0f172a').text('Field Statistics');
    doc.moveDown(0.5);
    const ftop = doc.y;
    doc.fontSize(9).fillColor('#64748b');
    doc.text('Field', 50, ftop);
    doc.text('Filled', 230, ftop);
    doc.text('Completion %', 300, ftop);
    doc.text('Avg', 400, ftop);
    doc.moveTo(50, ftop + 14).lineTo(545, ftop + 14).strokeColor('#e2e8f0').stroke();
    let y = ftop + 22;
    detail.enabledFields.forEach(field => {
      if (y > 780) { doc.addPage(); y = 50; }
      const stats = detail.fieldStats?.[field] || {};
      doc.fontSize(9).fillColor('#0f172a');
      doc.text(field, 50, y);
      doc.text(String(stats.totalFilled ?? 0), 230, y);
      doc.text(`${stats.completionRate ?? 0}%`, 300, y);
      doc.text(stats.avg != null ? stats.avg.toFixed(1) : '—', 400, y);
      y += 16;
    });
    doc.moveDown(1.5);
  }

  // Submissions table
  doc.fontSize(14).fillColor('#0f172a').text(`Raw Submissions (${submissions.length})`);
  doc.moveDown(0.5);
  if (submissions.length === 0) {
    doc.fontSize(11).fillColor('#64748b').text('No submissions recorded.');
  } else {
    const allKeys = [...new Set(submissions.flatMap(s => Object.keys(s.submittedData || {})))].slice(0, 4);
    const stop = doc.y;
    const xcols = [50, 180, 280, 380, 480];
    doc.fontSize(8).fillColor('#64748b');
    doc.text('Submitted At', xcols[0], stop);
    allKeys.forEach((k, i) => doc.text(k.slice(0, 14), xcols[i + 1], stop));
    doc.moveTo(50, stop + 12).lineTo(545, stop + 12).strokeColor('#e2e8f0').stroke();
    let y = stop + 20;
    submissions.slice(0, 40).forEach(s => {
      if (y > 780) { doc.addPage(); y = 50; }
      doc.fontSize(8).fillColor('#0f172a');
      doc.text(new Date(s.submittedAt).toLocaleString(), xcols[0], y, { width: 120 });
      allKeys.forEach((k, i) => doc.text(String(s.submittedData?.[k] ?? '—').slice(0, 18), xcols[i + 1], y, { width: 95 }));
      y += 14;
    });
    if (submissions.length > 40) {
      doc.moveDown(0.5);
      doc.fontSize(8).fillColor('#94a3b8').text(`... and ${submissions.length - 40} more (see CSV for full data)`);
    }
  }

  doc.end();
  return new Promise(resolve => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
  });
}

async function buildTemplateContent(ownerUid, draftId, format) {
  const data = await buildTemplateExportData(ownerUid, draftId);
  if (!data) return null;
  const baseName = slugify(data.detail.title);
  if (format === 'json') return { content: templateToJson(data), mimeType: 'application/json', ext: 'json', baseName };
  if (format === 'pdf') return { content: await templateToPdf(data), mimeType: 'application/pdf', ext: 'pdf', baseName };
  return { content: templateToCsv(data), mimeType: 'text/csv', ext: 'csv', baseName };
}

module.exports = {
  // overview
  buildOverviewExportData,
  overviewToCsv,
  overviewToJson,
  overviewToPdf,
  buildOverviewContent,
  // template
  buildTemplateExportData,
  templateToCsv,
  templateToJson,
  templateToPdf,
  buildTemplateContent,
  // helpers
  slugify,
  rowsToCsv,
};
