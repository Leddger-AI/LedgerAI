const TemplateData = require('../models/TemplateData');
const TemplateSubmission = require('../models/TemplateSubmission');

/**
 * Get overview KPIs across all user templates.
 * Returns: totalTemplates, activeLinks, totalSubmissions, avgFieldsPerTemplate
 */
async function getOverviewStats(ownerUid) {
  const templates = await TemplateData.find({ ownerUid }).lean();
  const totalTemplates = templates.length;
  const activeLinks = templates.filter(t => t.status === 'active').length;

  const submissionCounts = await TemplateSubmission.aggregate([
    { $match: { ownerUid } },
    { $group: { _id: '$draftId', count: { $sum: 1 } } },
  ]);
  const totalSubmissions = submissionCounts.reduce((sum, s) => sum + s.count, 0);

  const fieldCounts = templates.map(t => {
    const config = t.config || {};
    const toggles = config.toggles || {};
    const enabledFields = Object.values(toggles).filter(Boolean).length;
    if (enabledFields === 0) return 0;
    return enabledFields;
  });
  const avgFieldsPerTemplate = fieldCounts.length > 0
    ? Math.round((fieldCounts.reduce((a, b) => a + b, 0) / fieldCounts.length))
    : 0;

  return {
    totalTemplates,
    activeLinks,
    totalSubmissions,
    avgFieldsPerTemplate,
  };
}

/**
 * List all templates with submission counts.
 */
async function getTemplatesWithStats(ownerUid) {
  const templates = await TemplateData.find({ ownerUid })
    .sort({ createdAt: -1 })
    .lean();

  const counts = await TemplateSubmission.aggregate([
    { $match: { ownerUid } },
    { $group: { _id: '$draftId', count: { $sum: 1 }, lastSubmission: { $max: '$submittedAt' } } },
  ]);
  const countMap = {};
  counts.forEach(c => { countMap[c._id] = c; });

  return templates.map(t => ({
    draftId: t.draftId,
    title: t.title,
    templateType: t.templateType,
    status: t.status,
    source: t.source,
    createdAt: t.createdAt,
    expiresAt: t.expiresAt,
    submissionCount: countMap[t.draftId]?.count || 0,
    lastSubmissionAt: countMap[t.draftId]?.lastSubmission || null,
  }));
}

/**
 * Get detailed analytics for a specific template.
 */
async function getTemplateDetail(ownerUid, draftId) {
  const template = await TemplateData.findOne({ ownerUid, draftId }).lean();
  if (!template) return null;

  const submissions = await TemplateSubmission.find({ draftId, ownerUid })
    .sort({ submittedAt: -1 })
    .lean();

  const config = template.config || {};
  const toggles = config.toggles || {};
  const enabledFields = Object.keys(toggles).filter(k => toggles[k]);

  const fieldStats = {};
  enabledFields.forEach(field => {
    const values = submissions
      .map(s => s.submittedData?.[field])
      .filter(v => v !== undefined && v !== null && v !== '');
    fieldStats[field] = {
      totalFilled: values.length,
      completionRate: submissions.length > 0 ? Math.round((values.length / submissions.length) * 100) : 0,
    };
    const numericValues = values.map(v => Number(v)).filter(n => !isNaN(n));
    if (numericValues.length > 0) {
      fieldStats[field].avg = Math.round((numericValues.reduce((a, b) => a + b, 0) / numericValues.length) * 10) / 10;
      fieldStats[field].min = Math.min(...numericValues);
      fieldStats[field].max = Math.max(...numericValues);
      fieldStats[field].distribution = {};
      [1, 2, 3, 4, 5].forEach(rating => {
        fieldStats[field].distribution[rating] = numericValues.filter(v => v === rating).length;
      });
    }
  });

  return {
    draftId: template.draftId,
    title: template.title,
    templateType: template.templateType,
    status: template.status,
    config: template.config,
    createdAt: template.createdAt,
    expiresAt: template.expiresAt,
    totalSubmissions: submissions.length,
    enabledFields,
    fieldStats,
  };
}

/**
 * Get paginated raw submissions for a template.
 */
async function getTemplateSubmissions(ownerUid, draftId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [submissions, total] = await Promise.all([
    TemplateSubmission.find({ draftId, ownerUid })
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    TemplateSubmission.countDocuments({ draftId, ownerUid }),
  ]);
  return {
    submissions,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get submission trends over time.
 * Returns daily counts for the last N days.
 */
async function getSubmissionTrends(ownerUid, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const trends = await TemplateSubmission.aggregate([
    { $match: { ownerUid, submittedAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          year: { $year: '$submittedAt' },
          month: { $month: '$submittedAt' },
          day: { $dayOfMonth: '$submittedAt' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
  ]);

  const trendMap = {};
  trends.forEach(t => {
    const date = `${t._id.year}-${String(t._id.month).padStart(2, '0')}-${String(t._id.day).padStart(2, '0')}`;
    trendMap[date] = t.count;
  });

  const result = [];
  for (let d = new Date(startDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    result.push({
      date: dateKey,
      count: trendMap[dateKey] || 0,
    });
  }
  return result;
}

/**
 * Get template type distribution for donut chart.
 */
async function getTemplateTypeDistribution(ownerUid) {
  const distribution = await TemplateData.aggregate([
    { $match: { ownerUid } },
    { $group: { _id: '$templateType', count: { $sum: 1 } } },
  ]);
  return distribution.map(d => ({
    type: d._id || 'unknown',
    count: d.count,
  }));
}

module.exports = {
  getOverviewStats,
  getTemplatesWithStats,
  getTemplateDetail,
  getTemplateSubmissions,
  getSubmissionTrends,
  getTemplateTypeDistribution,
};
