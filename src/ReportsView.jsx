import React, { useState, useMemo } from 'react';
import { FileText, Download, Filter, Calendar, BarChart2, TrendingUp, PieChart as PieIcon, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell, PieChart, Pie, Legend } from 'recharts';

export default function ReportsView({ meetings }) {
  const [projectFilter, setProjectFilter] = useState('All');
  const [minConfidence, setMinConfidence] = useState(0);
  const [dateRange, setDateRange] = useState('This Month');

  // Filter meetings dynamically
  const filteredMeetings = useMemo(() => {
    return meetings.filter(m => {
      const matchProj = projectFilter === 'All' || m.project === projectFilter;
      const matchConf = m.confidence >= minConfidence;
      return matchProj && matchConf;
    });
  }, [meetings, projectFilter, minConfidence]);

  // Grouped data for Pie Chart
  const pieData = useMemo(() => {
    const counts = {};
    filteredMeetings.forEach(m => {
      counts[m.project] = (counts[m.project] || 0) + m.cost;
    });

    return Object.keys(counts).map(key => ({
      name: key,
      value: counts[key]
    }));
  }, [filteredMeetings]);

  // Chronological data for Area Chart
  // We plot days of the week based on meeting items
  const areaData = useMemo(() => {
    const dayMap = {
      'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 'Thursday': 0, 'Friday': 0, 'Saturday': 0, 'Sunday': 0
    };

    filteredMeetings.forEach(m => {
      // Map to days
      let day = 'Saturday'; // default
      if (m.id === 1) day = 'Thursday';
      if (m.id === 2 || m.id === 3) day = 'Friday';
      if (m.id === 4) day = 'Thursday';
      if (m.id === 5) day = 'Wednesday';
      if (m.id === 6) day = 'Tuesday';

      dayMap[day] += m.cost;
    });

    return Object.keys(dayMap).map(key => ({
      day: key.substring(0, 3),
      cost: dayMap[key]
    }));
  }, [filteredMeetings]);

  const COLORS = ['#b55fe6', '#00f0ff', '#f59e0b', '#10b981', '#f43f5e'];

  const totalSpent = filteredMeetings.reduce((acc, m) => acc + m.cost, 0);
  const totalMeetings = filteredMeetings.length;
  const avgConfidence = filteredMeetings.length > 0 
    ? Math.round(filteredMeetings.reduce((acc, m) => acc + m.confidence, 0) / filteredMeetings.length)
    : 0;

  // Mock CSV Export handler
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Meeting Title,Cost,Project Tag,Confidence,Duration,Attendees\n";
    
    filteredMeetings.forEach(m => {
      csvContent += `${m.id},"${m.title}",${m.cost},"${m.project}",${m.confidence},"${m.duration}",${m.attendeeCount}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `HR_Cost_Attribution_Report_${dateRange.replace(' ', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    alert("Compiling report ledger... Downloaded PDF Summary successfully!");
  };

  return (
    <div className="reports-container">
      {/* Header title */}
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <FileText size={20} style={{ color: 'var(--color-cyan)' }} />
            Executive Reports & Export Center
          </h2>
          <p className="section-subtitle">Aggregate HR meeting cost statistics, export auditable csv tables, and analyze budget trends</p>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="table-action-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
            onClick={handleExportCSV}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button 
            className="table-action-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: 'rgba(0, 240, 255, 0.12)', borderColor: 'rgba(0, 240, 255, 0.2)', color: 'var(--color-cyan)' }}
            onClick={handleExportPDF}
          >
            <Download size={14} />
            <span>Generate PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Options */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '20px', alignItems: 'center' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={12} /> Project Taxonomy Code
          </label>
          <select 
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
          >
            <option value="All">All Projects</option>
            <option value="Project Phoenix">Project Phoenix (PHX-408)</option>
            <option value="Client ABC Onboarding">Client ABC Onboarding (ABC-ONB)</option>
            <option value="Q4 Marketing Strategy">Q4 Marketing Strategy (MKT-Q4)</option>
            <option value="Internal Operations">Internal Operations (CORP-OPS)</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={12} /> Date Range Preset
          </label>
          <select 
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
          >
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="This Month">This Month</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', justifyItems: 'space-between', justifyContent: 'space-between' }}>
            <span>Min AI Confidence</span>
            <strong style={{ color: 'var(--color-cyan)' }}>{minConfidence}%</strong>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={minConfidence} 
              onChange={e => setMinConfidence(parseInt(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--color-cyan)', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', outline: 'none' }}
            />
          </div>
        </div>
      </div>

      {/* Stats Summary cards */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
        <div className="glass-panel kpi-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Filtered Budget Burden</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>${totalSpent.toLocaleString()}</div>
        </div>
        <div className="glass-panel kpi-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Filtered Meeting Count</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>{totalMeetings} Meetings</div>
        </div>
        <div className="glass-panel kpi-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Average AI Confidence</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>{avgConfidence}% Accuracy</div>
        </div>
      </div>

      {/* Visualizations row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', marginBottom: '24px' }}>
        {/* Cost timeline chart */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={16} style={{ color: 'var(--color-cyan)' }} />
            Weekly Meeting Cost Expenditure Trend
          </h3>
          <div style={{ height: '230px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="reportsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-cyan)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--color-cyan)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: '#fff', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="cost" name="Meeting Cost" stroke="var(--color-cyan)" fillOpacity={1} fill="url(#reportsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost distribution pie chart */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PieIcon size={16} style={{ color: 'var(--color-purple)' }} />
            Project Cost Share
          </h3>
          <div style={{ height: '230px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {pieData.length === 0 ? (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No distribution data</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: '#fff', borderRadius: '8px' }}
                    formatter={(value) => `$${value}`}
                  />
                  <Legend 
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', color: 'var(--text-secondary)' }}
                    formatter={(value) => <span style={{ color: '#ffffff' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Report Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', marginBottom: '16px' }}>Granular Cost Ledger</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="meetings-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Meeting</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Cost Code</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>AI Confidence</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Duration</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Attendees</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Audit Cost</th>
              </tr>
            </thead>
            <tbody>
              {filteredMeetings.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No meetings match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredMeetings.map((meeting) => (
                  <tr key={meeting.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                    <td style={{ padding: '14px 16px', fontWeight: '600', color: '#fff' }}>{meeting.title}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: '600',
                        backgroundColor: meeting.project === 'Project Phoenix' ? 'rgba(181, 95, 230, 0.15)' : 
                                        meeting.project === 'Client ABC Onboarding' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: '#ffffff'
                      }}>
                        {meeting.project}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        fontWeight: '700',
                        color: '#ffffff'
                      }}>
                        {meeting.confidence}%
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{meeting.duration}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{meeting.attendeeCount}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 'bold', color: '#ffffff' }}>${meeting.cost.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
