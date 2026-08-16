const TemplateData = require('../models/TemplateData');
const TemplateSubmission = require('../models/TemplateSubmission');
const {
  getOverviewStats,
  getTemplatesWithStats,
  getTemplateDetail,
  getTemplateSubmissions,
  getSubmissionTrends,
  getTemplateTypeDistribution,
} = require('./analyticsUtils');

// Caps how many submission rows a single export loads into memory at once
// (issue #40). getTemplateSubmissions' `total` (a countDocuments, independent
// of this limit) is used to detect and report truncation.
const MAX_EXPORT_SUBMISSIONS = 5000;

function truncationNote(total) {
  return total > MAX_EXPORT_SUBMISSIONS
    ? `Export truncated to the ${MAX_EXPORT_SUBMISSIONS} most recent submissions (${total} total). Use the app's paginated view to see the rest.`
    : null;
}

function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function arrayToCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const headerLine = headers.map(escapeCSV).join(',');
  const dataLines = rows.map(row =>
    headers.map(h => escapeCSV(row[h])).join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}

async function exportOverviewCSV(ownerUid) {
  const stats = await getOverviewStats(ownerUid);
  const templates = await getTemplatesWithStats(ownerUid);
  const trends = await getSubmissionTrends(ownerUid, 30);
  const typeDist = await getTemplateTypeDistribution(ownerUid);

  const sections = [];

  sections.push('# Overview KPIs');
  sections.push(arrayToCSV([{
    TotalTemplates: stats.totalTemplates,
    ActiveLinks: stats.activeLinks,
    TotalSubmissions: stats.totalSubmissions,
    AvgFieldsPerTemplate: stats.avgFieldsPerTemplate,
  }]));

  sections.push('\n# Templates');
  sections.push(arrayToCSV(templates));

  sections.push('\n# Submission Trends (Last 30 Days)');
  sections.push(arrayToCSV(trends));

  sections.push('\n# Template Type Distribution');
  sections.push(arrayToCSV(typeDist));

  return sections.join('\n');
}

async function exportOverviewJSON(ownerUid) {
  const [stats, templates, trends, typeDist] = await Promise.all([
    getOverviewStats(ownerUid),
    getTemplatesWithStats(ownerUid),
    getSubmissionTrends(ownerUid, 30),
    getTemplateTypeDistribution(ownerUid),
  ]);

  return JSON.stringify({
    generatedAt: new Date().toISOString(),
    overview: stats,
    templates,
    trends,
    typeDistribution: typeDist,
  }, null, 2);
}

async function exportTemplateDetailCSV(ownerUid, draftId) {
  const detail = await getTemplateDetail(ownerUid, draftId);
  if (!detail) return null;

  const submissions = await getTemplateSubmissions(ownerUid, draftId, 1, MAX_EXPORT_SUBMISSIONS);
  const sections = [];

  sections.push('# Template Info');
  sections.push(arrayToCSV([{
    Title: detail.title,
    Type: detail.templateType,
    Status: detail.status,
    TotalSubmissions: detail.totalSubmissions,
    EnabledFields: detail.enabledFields.join('; '),
    CreatedAt: detail.createdAt,
    ExpiresAt: detail.expiresAt || 'N/A',
  }]));

  sections.push('\n# Field Statistics');
  const fieldRows = detail.enabledFields.map(field => ({
    Field: field,
    Filled: detail.fieldStats[field]?.totalFilled || 0,
    CompletionRate: `${detail.fieldStats[field]?.completionRate || 0}%`,
    Average: detail.fieldStats[field]?.avg || 'N/A',
    Min: detail.fieldStats[field]?.min || 'N/A',
    Max: detail.fieldStats[field]?.max || 'N/A',
  }));
  sections.push(arrayToCSV(fieldRows));

  sections.push('\n# Raw Submissions');
  if (submissions.submissions.length > 0) {
    const flatSubs = submissions.submissions.map(s => {
      const row = { SubmissionId: s.submissionId, SubmittedAt: s.submittedAt };
      const data = s.submittedData || {};
      Object.keys(data).forEach(key => { row[key] = data[key]; });
      return row;
    });
    sections.push(arrayToCSV(flatSubs));
    const note = truncationNote(submissions.total);
    if (note) sections.push(`\n# Note: ${note}`);
  } else {
    sections.push('No submissions');
  }

  return sections.join('\n');
}

async function exportTemplateDetailJSON(ownerUid, draftId) {
  const detail = await getTemplateDetail(ownerUid, draftId);
  if (!detail) return null;

  const submissions = await getTemplateSubmissions(ownerUid, draftId, 1, MAX_EXPORT_SUBMISSIONS);

  return JSON.stringify({
    generatedAt: new Date().toISOString(),
    template: {
      draftId: detail.draftId,
      title: detail.title,
      templateType: detail.templateType,
      status: detail.status,
      createdAt: detail.createdAt,
      expiresAt: detail.expiresAt,
      totalSubmissions: detail.totalSubmissions,
      enabledFields: detail.enabledFields,
      fieldStats: detail.fieldStats,
    },
    submissions: submissions.submissions,
    truncated: submissions.total > MAX_EXPORT_SUBMISSIONS,
    totalAvailable: submissions.total,
  }, null, 2);
}

async function exportAllSubmissionsCSV(ownerUid, draftId) {
  const result = await getTemplateSubmissions(ownerUid, draftId, 1, MAX_EXPORT_SUBMISSIONS);
  if (result.submissions.length === 0) return 'No submissions found';

  const flatSubs = result.submissions.map(s => {
    const row = { SubmissionId: s.submissionId, SubmittedAt: s.submittedAt };
    const data = s.submittedData || {};
    Object.keys(data).forEach(key => { row[key] = data[key]; });
    return row;
  });

  let csv = arrayToCSV(flatSubs);
  const note = truncationNote(result.total);
  if (note) csv += `\n\n# Note: ${note}`;
  return csv;
}

module.exports = {
  exportOverviewCSV,
  exportOverviewJSON,
  exportTemplateDetailCSV,
  exportTemplateDetailJSON,
  exportAllSubmissionsCSV,
  arrayToCSV,
  escapeCSV,
  MAX_EXPORT_SUBMISSIONS,
};
