import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, TrendingUp, Users, FileText, RefreshCw, ChevronDown,
  Loader2, AlertCircle, ArrowLeft, Clock, CheckCircle2, Eye, Download,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { getAuthToken } from '../supabaseAuth';
import TemplateDetailAnalytics from './TemplateDetailAnalytics';
import './AnalyticsPage.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PIE_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#6366F1'];

export default function AnalyticsPage({ user }) {
  const [overview, setOverview] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [trends, setTrends] = useState([]);
  const [typeDistribution, setTypeDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [selectedDraftId, setSelectedDraftId] = useState(null);
  const [dateRange, setDateRange] = useState(30);

  const fetchOverview = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/analytics/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch overview');
      const data = await res.json();
      setOverview(data);
    } catch (err) {
      console.error('Overview fetch error:', err);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/analytics/templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (err) {
      console.error('Templates fetch error:', err);
    }
  }, []);

  const fetchTrends = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/analytics/trends?days=${dateRange}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch trends');
      const data = await res.json();
      setTrends(data.trends || []);
      setTypeDistribution(data.typeDistribution || []);
    } catch (err) {
      console.error('Trends fetch error:', err);
    }
  }, [dateRange]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchOverview(), fetchTemplates(), fetchTrends()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchOverview, fetchTemplates, fetchTrends]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/analytics/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Sync failed');
      const data = await res.json();
      setSyncResult({ type: 'success', message: `Synced ${data.templatesSynced} templates and ${data.submissionsSynced} submissions.` });
      fetchAll();
    } catch (err) {
      setSyncResult({ type: 'error', message: err.message });
    } finally {
      setSyncing(false);
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/analytics/export/overview.${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-overview-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  if (selectedDraftId) {
    return (
      <TemplateDetailAnalytics
        draftId={selectedDraftId}
        onBack={() => setSelectedDraftId(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="analytics-loading">
          <Loader2 size={24} className="spin" />
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      {/* Header */}
      <div className="analytics-header">
        <div>
          <h2 className="section-title">
            <BarChart3 size={20} style={{ color: 'var(--color-cyan)' }} />
            Template Analytics
          </h2>
          <p className="section-subtitle">
            Submission trends, field analysis, and template performance across your forms
          </p>
        </div>
        <div className="analytics-header-actions">
          <select
            className="analytics-date-select"
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            className="analytics-sync-btn"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
            {syncing ? 'Syncing...' : 'Sync Data'}
          </button>
          <div className="analytics-export-group">
            <button
              className="analytics-export-btn"
              onClick={() => handleExport('csv')}
              disabled={exporting}
            >
              {exporting ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
              CSV
            </button>
            <button
              className="analytics-export-btn"
              onClick={() => handleExport('json')}
              disabled={exporting}
            >
              {exporting ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
              JSON
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="analytics-error-banner">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {syncResult && (
        <div className={`analytics-sync-banner ${syncResult.type}`}>
          {syncResult.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {syncResult.message}
        </div>
      )}

      {/* KPI Cards */}
      <div className="analytics-kpi-grid">
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Templates</span>
            <div className="kpi-icon-wrapper cyan"><FileText size={16} /></div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{overview?.totalTemplates ?? 0}</span>
          </div>
        </div>
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Active Links</span>
            <div className="kpi-icon-wrapper green"><CheckCircle2 size={16} /></div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{overview?.activeLinks ?? 0}</span>
          </div>
        </div>
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Submissions</span>
            <div className="kpi-icon-wrapper purple"><Users size={16} /></div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{overview?.totalSubmissions ?? 0}</span>
          </div>
        </div>
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Avg Fields/Template</span>
            <div className="kpi-icon-wrapper orange"><BarChart3 size={16} /></div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{overview?.avgFieldsPerTemplate ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="analytics-charts-row">
        {/* Trends Area Chart */}
        <div className="glass-panel analytics-chart-panel">
          <h3 className="analytics-chart-title">
            <TrendingUp size={16} />
            Submission Trends
          </h3>
          <div style={{ height: '260px', width: '100%' }}>
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                  <XAxis
                    dataKey="date"
                    stroke="var(--text-muted, #888)"
                    fontSize={10}
                    tickFormatter={(d) => d.slice(5)}
                  />
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
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Submissions"
                    stroke="#3B82F6"
                    fillOpacity={1}
                    fill="url(#trendGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="analytics-empty-chart">No submissions in this period</div>
            )}
          </div>
        </div>

        {/* Type Distribution Donut */}
        <div className="glass-panel analytics-chart-panel">
          <h3 className="analytics-chart-title">
            <BarChart3 size={16} />
            Template Types
          </h3>
          <div style={{ height: '260px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {typeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeDistribution}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {typeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-card, #1a1d1d)',
                      borderColor: 'var(--border-color, #333)',
                      color: 'var(--text-primary, #fff)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="analytics-empty-chart">No templates yet</div>
            )}
          </div>
          {typeDistribution.length > 0 && (
            <div className="analytics-legend">
              {typeDistribution.map((t, i) => (
                <span key={t.type} className="analytics-legend-item">
                  <span className="analytics-legend-dot" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {t.type} ({t.count})
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Templates Table */}
      <div className="glass-panel analytics-table-panel">
        <h3 className="analytics-chart-title">
          <FileText size={16} />
          Templates Overview
        </h3>
        {templates.length === 0 ? (
          <div className="analytics-empty-table">
            <FileText size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
            <p>No templates found. Create a template and collect submissions to see analytics.</p>
          </div>
        ) : (
          <div className="analytics-table-wrapper">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Submissions</th>
                  <th>Last Submission</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.draftId}>
                    <td className="analytics-table-title">{t.title}</td>
                    <td>
                      <span className={`analytics-type-badge ${t.templateType}`}>
                        {t.templateType}
                      </span>
                    </td>
                    <td>
                      <span className={`analytics-status-badge ${t.status}`}>
                        {t.status}
                      </span>
                    </td>
                    <td>{t.submissionCount}</td>
                    <td>
                      {t.lastSubmissionAt
                        ? new Date(t.lastSubmissionAt).toLocaleDateString()
                        : '—'}
                    </td>
                    <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="analytics-view-btn"
                        onClick={() => setSelectedDraftId(t.draftId)}
                        disabled={t.submissionCount === 0}
                      >
                        <Eye size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
