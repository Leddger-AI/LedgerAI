import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Loader2, AlertCircle, FileText, Users, Clock,
  BarChart3, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell,
} from 'recharts';
import { getAuthToken } from '../supabaseAuth';
import './AnalyticsPage.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const RATING_COLORS = ['#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E'];

export default function TemplateDetailAnalytics({ draftId, onBack }) {
  const [detail, setDetail] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [submissionsPage, setSubmissionsPage] = useState(1);
  const [submissionsTotal, setSubmissionsTotal] = useState(0);
  const [submissionsTotalPages, setSubmissionsTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDetail = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/analytics/templates/${draftId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch template detail');
      const data = await res.json();
      setDetail(data);
    } catch (err) {
      setError(err.message);
    }
  }, [draftId]);

  const fetchSubmissions = useCallback(async (page) => {
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch(
        `${API_BASE_URL}/api/analytics/templates/${draftId}/submissions?page=${page}&limit=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed to fetch submissions');
      const data = await res.json();
      setSubmissions(data.submissions || []);
      setSubmissionsPage(data.page);
      setSubmissionsTotal(data.total);
      setSubmissionsTotalPages(data.totalPages);
    } catch (err) {
      console.error('Submissions fetch error:', err);
    }
  }, [draftId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchDetail(), fetchSubmissions(1)]);
      setLoading(false);
    })();
  }, [fetchDetail, fetchSubmissions]);

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="analytics-loading">
          <Loader2 size={24} className="spin" />
          <span>Loading template analytics...</span>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="analytics-page">
        <button className="analytics-back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Overview
        </button>
        <div className="analytics-error-banner">
          <AlertCircle size={16} />
          {error || 'Template not found'}
        </div>
      </div>
    );
  }

  const ratingFields = detail.enabledFields.filter(field => {
    const stats = detail.fieldStats?.[field];
    return stats && stats.distribution;
  });

  const completionData = detail.enabledFields.map(field => ({
    field: field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
    rate: detail.fieldStats?.[field]?.completionRate || 0,
  }));

  const allSubmissionKeys = submissions.length > 0
    ? Object.keys(submissions[0].submittedData || {})
    : [];

  return (
    <div className="analytics-page">
      {/* Back button + header */}
      <button className="analytics-back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> Back to Overview
      </button>

      <div className="analytics-detail-header">
        <div>
          <h2 className="section-title">
            <FileText size={20} style={{ color: 'var(--color-cyan)' }} />
            {detail.title}
          </h2>
          <div className="analytics-detail-meta">
            <span className={`analytics-type-badge ${detail.templateType}`}>
              {detail.templateType}
            </span>
            <span className={`analytics-status-badge ${detail.status}`}>
              {detail.status}
            </span>
            <span className="analytics-detail-meta-item">
              <Users size={14} /> {detail.totalSubmissions} submissions
            </span>
            <span className="analytics-detail-meta-item">
              <Clock size={14} /> Created {new Date(detail.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards for field stats */}
      <div className="analytics-kpi-grid">
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Submissions</span>
            <div className="kpi-icon-wrapper cyan"><Users size={16} /></div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{detail.totalSubmissions}</span>
          </div>
        </div>
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Enabled Fields</span>
            <div className="kpi-icon-wrapper purple"><BarChart3 size={16} /></div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{detail.enabledFields.length}</span>
          </div>
        </div>
        {ratingFields.slice(0, 2).map(field => {
          const stats = detail.fieldStats[field];
          return (
            <div className="glass-panel kpi-card" key={field}>
              <div className="kpi-header">
                <span className="kpi-title">
                  Avg {field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                </span>
                <div className="kpi-icon-wrapper green"><BarChart3 size={16} /></div>
              </div>
              <div className="kpi-body">
                <span className="kpi-value">{stats.avg?.toFixed(1) || '—'}</span>
                <span className="kpi-trend">out of 5</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Field Completion Rate Chart */}
      {completionData.length > 0 && (
        <div className="glass-panel analytics-chart-panel" style={{ marginBottom: '20px' }}>
          <h3 className="analytics-chart-title">
            <BarChart3 size={16} />
            Field Completion Rates
          </h3>
          <div style={{ height: '240px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={completionData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="var(--text-muted, #888)" fontSize={11} unit="%" />
                <YAxis
                  type="category"
                  dataKey="field"
                  stroke="var(--text-muted, #888)"
                  fontSize={11}
                  width={120}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card, #1a1d1d)',
                    borderColor: 'var(--border-color, #333)',
                    color: 'var(--text-primary, #fff)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="rate" name="Completion %" radius={[0, 4, 4, 0]}>
                  {completionData.map((_, i) => (
                    <Cell key={`bar-${i}`} fill={RATING_COLORS[i % RATING_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Rating Distribution Charts */}
      {ratingFields.length > 0 && (
        <div className="analytics-rating-charts">
          {ratingFields.map(field => {
            const stats = detail.fieldStats[field];
            const distData = Object.entries(stats.distribution).map(([rating, count]) => ({
              rating: `${rating}★`,
              count,
            }));
            return (
              <div className="glass-panel analytics-chart-panel" key={field}>
                <h3 className="analytics-chart-title">
                  <BarChart3 size={16} />
                  {field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())} Distribution
                </h3>
                <div style={{ height: '200px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                      <XAxis dataKey="rating" stroke="var(--text-muted, #888)" fontSize={11} />
                      <YAxis stroke="var(--text-muted, #888)" fontSize={11} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--bg-card, #1a1d1d)',
                          borderColor: 'var(--border-color, #333)',
                          color: 'var(--text-primary, #fff)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="count" name="Responses" radius={[4, 4, 0, 0]}>
                        {distData.map((_, i) => (
                          <Cell key={`r-${i}`} fill={RATING_COLORS[i % RATING_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="analytics-rating-summary">
                  <span>Avg: <strong>{stats.avg?.toFixed(1)}</strong></span>
                  <span>Min: <strong>{stats.min}</strong></span>
                  <span>Max: <strong>{stats.max}</strong></span>
                  <span>Filled: <strong>{stats.totalFilled}/{detail.totalSubmissions}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Raw Submissions Table */}
      <div className="glass-panel analytics-table-panel">
        <h3 className="analytics-chart-title">
          <FileText size={16} />
          Raw Submissions ({submissionsTotal})
        </h3>
        {submissions.length === 0 ? (
          <div className="analytics-empty-table">
            <FileText size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
            <p>No submissions yet for this template.</p>
          </div>
        ) : (
          <>
            <div className="analytics-table-wrapper">
              <table className="analytics-table">
                <thead>
                  <tr>
                    {allSubmissionKeys.map(key => (
                      <th key={key}>
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                      </th>
                    ))}
                    <th>Submitted At</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr key={s.submissionId}>
                      {allSubmissionKeys.map(key => (
                        <td key={key}>
                          {String(s.submittedData?.[key] ?? '—').slice(0, 50)}
                        </td>
                      ))}
                      <td>{new Date(s.submittedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {submissionsTotalPages > 1 && (
              <div className="analytics-pagination">
                <button
                  onClick={() => fetchSubmissions(submissionsPage - 1)}
                  disabled={submissionsPage === 1}
                  className="analytics-page-btn"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="analytics-page-info">
                  Page {submissionsPage} of {submissionsTotalPages}
                </span>
                <button
                  onClick={() => fetchSubmissions(submissionsPage + 1)}
                  disabled={submissionsPage === submissionsTotalPages}
                  className="analytics-page-btn"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
