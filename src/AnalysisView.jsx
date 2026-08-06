import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, Users, Target, Clock } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';

const funnelData = [
  { stage: 'Sourced', count: 180 },
  { stage: 'Applied', count: 132 },
  { stage: 'Screened', count: 74 },
  { stage: 'Interviewed', count: 38 },
  { stage: 'Offered', count: 12 },
  { stage: 'Hired', count: 8 }
];

const sourceQuality = [
  { source: 'GitHub', hires: 4, quality: 92 },
  { source: 'LinkedIn', hires: 2, quality: 78 },
  { source: 'Referral', hires: 1, quality: 95 },
  { source: 'Job Board', hires: 1, quality: 61 }
];

const timeToHireTrend = [
  { month: 'Jan', days: 34 },
  { month: 'Feb', days: 31 },
  { month: 'Mar', days: 29 },
  { month: 'Apr', days: 26 },
  { month: 'May', days: 24 },
  { month: 'Jun', days: 22 }
];

const COLORS = ['#16A34A', '#141414', '#F97316', '#4A4A4A'];

export default function AnalysisView({ meetings }) {
  const conversionRate = Math.round((funnelData[funnelData.length - 1].count / funnelData[0].count) * 100);

  return (
    <div className="analysis-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <BarChart3 size={20} style={{ color: 'var(--color-cyan)' }} />
            Recruiting Analysis
          </h2>
          <p className="section-subtitle">Pipeline conversion, source quality, and time-to-hire trends across your recruiting funnel</p>
        </div>
      </div>

      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Sourced to Hire</span>
            <div className="kpi-icon-wrapper cyan"><Target size={16} /></div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{conversionRate}%</span>
            <span className="kpi-trend positive"><TrendingUp size={12} /> Conversion rate</span>
          </div>
        </div>
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Avg. Time to Hire</span>
            <div className="kpi-icon-wrapper purple"><Clock size={16} /></div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">22 Days</span>
            <span className="kpi-trend positive">-12 days YoY</span>
          </div>
        </div>
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Active Pipeline</span>
            <div className="kpi-icon-wrapper cyan"><Users size={16} /></div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{funnelData[3].count} Candidates</span>
            <span className="kpi-trend positive">In interview stage</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', marginBottom: '24px' }}>
        {/* Funnel chart */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>Hiring Funnel</h3>
          <div style={{ height: '260px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,20,20,0.05)" horizontal={false} />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={11} />
                <YAxis type="category" dataKey="stage" stroke="var(--text-muted)" fontSize={11} width={90} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="var(--color-cyan)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Source quality */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>Source Quality</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {sourceQuality.map((s, idx) => (
              <div key={s.source}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{s.source}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{s.hires} hires &middot; {s.quality}% quality</span>
                </div>
                <div style={{ height: '6px', width: '100%', backgroundColor: 'rgba(20,20,20,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${s.quality}%`, backgroundColor: COLORS[idx % COLORS.length], borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Time to hire trend */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>Time-to-Hire Trend</h3>
        <div style={{ height: '220px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeToHireTrend}>
              <defs>
                <linearGradient id="analysisGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-cyan)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--color-cyan)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,20,20,0.05)" />
              <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} />
              <YAxis stroke="var(--text-muted)" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="days" name="Days to Hire" stroke="var(--color-cyan)" fillOpacity={1} fill="url(#analysisGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
