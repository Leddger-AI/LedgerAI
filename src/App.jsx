import { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Calendar,
  FileText,
  Bell,
  Settings,
  AlertTriangle,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  Clock,
  Brain,
  CheckCircle2,
  Edit2,
  Sparkles,
  AlertCircle,
  TrendingUp,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import './App.css';

// Pre-defined avatars from public sources
const avatars = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&h=100&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&h=100&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&h=100&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=100&h=100&q=80'
];

export default function App() {
  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState('This Month');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Interactive Modal State
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [modalProject, setModalProject] = useState('');
  
  // Custom interactive data stats
  const [meetings, setMeetings] = useState([
    {
      id: 1,
      title: 'Q3 Product Planning & Roadmap',
      duration: '2h 30m',
      attendeeCount: 5,
      cost: 2850,
      project: 'Project Phoenix',
      confidence: 94,
      status: 'needs_review',
      time: '10:30 AM'
    },
    {
      id: 2,
      title: 'Client ABC Sync & Deliverables',
      duration: '1h 15m',
      attendeeCount: 3,
      cost: 1200,
      project: 'Client ABC Onboarding',
      confidence: 87,
      status: 'approved',
      time: 'Yesterday'
    },
    {
      id: 3,
      title: 'Weekly Alignment & HR Catchup',
      duration: '45m',
      attendeeCount: 6,
      cost: 950,
      project: 'Unassigned',
      confidence: 42,
      status: 'needs_review',
      time: 'Yesterday'
    },
    {
      id: 4,
      title: 'Marketing Campaign Kickoff',
      duration: '1h 30m',
      attendeeCount: 4,
      cost: 1650,
      project: 'Q4 Marketing Strategy',
      confidence: 78,
      status: 'approved',
      time: '2 days ago'
    },
    {
      id: 5,
      title: 'Phoenix Tech Architecture Review',
      duration: '2h 00m',
      attendeeCount: 3,
      cost: 3100,
      project: 'Project Phoenix',
      confidence: 96,
      status: 'approved',
      time: '3 days ago'
    },
    {
      id: 6,
      title: 'Internal Budget Sync & Forecast',
      duration: '1h 00m',
      attendeeCount: 4,
      cost: 1100,
      project: 'Q4 Marketing Strategy',
      confidence: 61,
      status: 'needs_review',
      time: '4 days ago'
    }
  ]);

  const [alerts, setAlerts] = useState([
    {
      id: 1,
      type: 'danger',
      title: 'Phoenix Cost Overrun Risk',
      desc: 'Project Phoenix meeting costs have exceeded Q2 threshold by 14%. Immediate review recommended.',
      resolved: false
    },
    {
      id: 2,
      type: 'warning',
      title: 'Low AI Attribution Confidence',
      desc: '"Weekly Alignment & HR Catchup" has low AI matching confidence (42%). Needs manual tagging.',
      resolved: false
    },
    {
      id: 3,
      type: 'info',
      title: 'Unassigned Hours Detected',
      desc: '18.5 hours of calendar activity from last week remain unattributed to any active project code.',
      resolved: false
    }
  ]);

  // --- DYNAMIC DATA PRESETS BASED ON DATE ---
  const dynamicData = useMemo(() => {
    switch (datePreset) {
      case 'Last 7 Days':
        return {
          totalCost: 14240,
          accuracy: 94,
          anomalies: 2,
          unattributedHours: 5.2,
          costOverTime: [
            { date: 'Mon', cost: 1800 },
            { date: 'Tue', cost: 2100 },
            { date: 'Wed', cost: 2400 },
            { date: 'Thu', cost: 1950 },
            { date: 'Fri', cost: 3100 },
            { date: 'Sat', cost: 1200 },
            { date: 'Sun', cost: 1690 }
          ],
          expenditureByProject: [
            { name: 'Phoenix', cost: 7800 },
            { name: 'Client ABC', cost: 4100 },
            { name: 'Q4 Mktg', cost: 2340 }
          ]
        };
      case 'Last 30 Days':
        return {
          totalCost: 52400,
          accuracy: 91,
          anomalies: 8,
          unattributedHours: 24.8,
          costOverTime: [
            { date: 'Wk 1', cost: 11400 },
            { date: 'Wk 2', cost: 13200 },
            { date: 'Wk 3', cost: 14800 },
            { date: 'Wk 4', cost: 13000 }
          ],
          expenditureByProject: [
            { name: 'Phoenix', cost: 28400 },
            { name: 'Client ABC', cost: 14300 },
            { name: 'Q4 Mktg', cost: 9700 }
          ]
        };
      case 'This Month':
      default:
        return {
          totalCost: 45820,
          accuracy: 92,
          anomalies: 7,
          unattributedHours: 18.5,
          costOverTime: [
            { date: 'May 01', cost: 8200 },
            { date: 'May 08', cost: 9400 },
            { date: 'May 15', cost: 11100 },
            { date: 'May 22', cost: 10200 },
            { date: 'May 29', cost: 12500 },
            { date: 'Jun 05', cost: 13420 },
            { date: 'Jun 12', cost: 14820 }
          ],
          expenditureByProject: [
            { name: 'Project Phoenix', cost: 24500 },
            { name: 'Client ABC Onboarding', cost: 12400 },
            { name: 'Q4 Marketing Strategy', cost: 8920 }
          ]
        };
    }
  }, [datePreset]);

  // Total project spend percentages for top project spends side list
  const projectSpendsSum = useMemo(() => {
    const total = dynamicData.expenditureByProject.reduce((acc, curr) => acc + curr.cost, 0);
    return dynamicData.expenditureByProject.map((item, idx) => ({
      ...item,
      percentage: Math.round((item.cost / (total || 1)) * 100),
      colorClass: idx % 2 === 0 ? 'cyan' : 'purple'
    })).sort((a, b) => b.cost - a.cost);
  }, [dynamicData]);

  // --- ACTIONS ---
  const handleApprove = (id) => {
    setMeetings(prev =>
      prev.map(m => (m.id === id ? { ...m, status: 'approved', confidence: 100 } : m))
    );
  };

  const handleResolveAlert = (id) => {
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, resolved: true } : a)));
  };

  const openEditModal = (meeting) => {
    setSelectedMeeting(meeting);
    setModalProject(meeting.project === 'Unassigned' ? 'Project Phoenix' : meeting.project);
  };

  const saveEditModal = () => {
    if (selectedMeeting) {
      setMeetings(prev =>
        prev.map(m =>
          m.id === selectedMeeting.id
            ? { ...m, project: modalProject, status: 'approved', confidence: 100 }
            : m
        )
      );
      setSelectedMeeting(null);
    }
  };

  // Filter meetings by search query
  const filteredMeetings = useMemo(() => {
    return meetings.filter(m =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.project.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [meetings, searchQuery]);

  // Count active alerts
  const activeAlertsCount = useMemo(() => {
    return alerts.filter(a => !a.resolved).length;
  }, [alerts]);

  // Navigation click handler
  const handleNavClick = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="app-container">
      {/* --- SIDEBAR --- */}
      <aside className="sidebar">
        <div className="logo-container">
          <h1 className="logo-text">
            <Brain size={20} style={{ color: 'var(--color-cyan)', filter: 'drop-shadow(0 0 5px var(--color-cyan-glow))' }} />
            HR COST INTELLIGENCE
          </h1>
        </div>
        
        <nav className="sidebar-menu">
          <div 
            className={`menu-item ${activeTab === 'Dashboard' ? 'active' : ''}`}
            onClick={() => handleNavClick('Dashboard')}
          >
            <LayoutDashboard />
            <span>Dashboard</span>
          </div>
          <div 
            className={`menu-item ${activeTab === 'Projects' ? 'active' : ''}`}
            onClick={() => handleNavClick('Projects')}
          >
            <Briefcase />
            <span>Projects</span>
          </div>
          <div 
            className={`menu-item ${activeTab === 'Teams' ? 'active' : ''}`}
            onClick={() => handleNavClick('Teams')}
          >
            <Users />
            <span>Teams</span>
          </div>
          <div 
            className={`menu-item ${activeTab === 'Calendar' ? 'active' : ''}`}
            onClick={() => handleNavClick('Calendar')}
          >
            <Calendar />
            <span>Calendar</span>
          </div>
          <div 
            className={`menu-item ${activeTab === 'Reports' ? 'active' : ''}`}
            onClick={() => handleNavClick('Reports')}
          >
            <FileText />
            <span>Reports</span>
          </div>
          <div 
            className={`menu-item ${activeTab === 'Alerts' ? 'active' : ''}`}
            onClick={() => handleNavClick('Alerts')}
            style={{ position: 'relative' }}
          >
            <AlertTriangle />
            <span>Alerts</span>
            {activeAlertsCount > 0 && (
              <span className="pulse-danger-dot" style={{ position: 'absolute', right: '16px', top: '18px' }} />
            )}
          </div>
          <div 
            className={`menu-item ${activeTab === 'Settings' ? 'active' : ''}`}
            onClick={() => handleNavClick('Settings')}
          >
            <Settings />
            <span>Settings</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div>HR Cost Intelligence Engine v1.4</div>
          <div>Powered by AI Attribution</div>
        </div>
      </aside>

      {/* --- MAIN WORKSPACE --- */}
      <div className="main-content">
        
        {/* --- TOPBAR --- */}
        <header className="top-header">
          {/* Search bar filtering table */}
          <div className="search-bar-container">
            <Search className="search-icon-inside" />
            <input 
              type="text" 
              placeholder="Search meetings or projects..." 
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="search-shortcut">⌘ K</span>
          </div>

          <div className="header-right">
            {/* Live date selector dropdown */}
            <div style={{ position: 'relative' }}>
              <div className="date-selector" onClick={() => setShowDatePicker(!showDatePicker)}>
                <Calendar />
                <span>{datePreset}</span>
                <ChevronDown size={14} />
              </div>
              {showDatePicker && (
                <div className="glass-panel" style={{
                  position: 'absolute',
                  top: '46px',
                  right: '0',
                  width: '180px',
                  zIndex: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '8px',
                  gap: '4px'
                }}>
                  {['Last 7 Days', 'Last 30 Days', 'This Month'].map(preset => (
                    <div 
                      key={preset} 
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        fontSize: '13px',
                        backgroundColor: datePreset === preset ? 'rgba(0, 240, 255, 0.08)' : 'transparent',
                        color: datePreset === preset ? 'var(--color-cyan)' : 'var(--text-secondary)',
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = datePreset === preset ? 'rgba(0, 240, 255, 0.08)' : 'transparent'}
                      onClick={() => {
                        setDatePreset(preset);
                        setShowDatePicker(false);
                      }}
                    >
                      {preset}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications with counter */}
            <button className="icon-btn">
              <Bell size={18} />
              {activeAlertsCount > 0 && <span className="notification-badge" />}
            </button>

            {/* User Profile */}
            <div className="user-profile-widget">
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80" 
                alt="Profile" 
                className="avatar"
              />
              <div className="user-info">
                <span className="user-name">Sarah Jenkins</span>
                <span className="user-role">HR Operations VP</span>
              </div>
            </div>
          </div>
        </header>

        {/* --- VIEWPORT --- */}
        <main className="dashboard-viewport">
          
          {/* Main Dashboard Panel */}
          {activeTab === 'Dashboard' ? (
            <>
              {/* Header Title */}
              <div className="section-header">
                <div>
                  <h2 className="section-title">
                    <Sparkles size={20} style={{ color: 'var(--color-cyan)' }} />
                    HR Cost Intelligence Dashboard
                  </h2>
                  <p className="section-subtitle">Real-time AI attributions and calendar cost analysis</p>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>
                  Last synced: <span style={{ color: 'var(--color-cyan)', fontWeight: '600' }}>Just now</span>
                </div>
              </div>

              {/* --- KPI METRIC CARDS --- */}
              <div className="kpi-grid">
                
                {/* 1. Total Meeting Cost */}
                <div className="glass-panel kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-title">Total Meeting Cost</span>
                    <div className="kpi-icon-wrapper cyan">
                      <Clock size={16} />
                    </div>
                  </div>
                  <div className="kpi-body">
                    <span className="kpi-value">${dynamicData.totalCost.toLocaleString()}</span>
                    <span className="kpi-trend positive">
                      <ArrowUpRight size={12} />
                      12.4%
                    </span>
                  </div>
                  {/* Inline Sparkline SVG */}
                  <div className="kpi-sparkline">
                    <svg className="sparkline-svg" viewBox="0 0 100 30" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="cyanSparklineGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-cyan)" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="var(--color-cyan)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,25 Q15,10 30,22 T60,5 T80,18 T100,8 L100,30 L0,30 Z"
                        fill="url(#cyanSparklineGrad)"
                      />
                      <path
                        d="M0,25 Q15,10 30,22 T60,5 T80,18 T100,8"
                        fill="none"
                        stroke="var(--color-cyan)"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>
                </div>

                {/* 2. AI Attribution Accuracy */}
                <div className="glass-panel kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-title">AI Attribution Accuracy</span>
                    <div className="kpi-icon-wrapper purple">
                      <Brain size={16} />
                    </div>
                  </div>
                  <div className="kpi-body">
                    <span className="kpi-value">{dynamicData.accuracy}%</span>
                    <span className="kpi-trend positive">
                      <ArrowUpRight size={12} />
                      +0.8%
                    </span>
                  </div>
                  {/* Gauge/Progress Arc */}
                  <div style={{ position: 'absolute', right: '16px', bottom: '16px', width: '38px', height: '38px' }}>
                    <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                      <path
                        className="circle-bg"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="3.5"
                      />
                      <path
                        className="circle"
                        strokeDasharray={`${dynamicData.accuracy}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="var(--color-purple)"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        style={{ filter: 'drop-shadow(0 0 3px var(--color-purple))' }}
                      />
                    </svg>
                    <div style={{
                      position: 'absolute',
                      top: '0',
                      left: '0',
                      right: '0',
                      bottom: '0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9px',
                      fontWeight: '700',
                      color: 'var(--color-purple)'
                    }}>
                      GOAL
                    </div>
                  </div>
                </div>

                {/* 3. Anomalies Detected */}
                <div className="glass-panel kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-title">Anomalies Detected</span>
                    <div className="kpi-icon-wrapper" style={{ color: 'var(--color-pink)' }}>
                      <AlertTriangle size={16} />
                    </div>
                  </div>
                  <div className="kpi-body">
                    <span className="kpi-value">{dynamicData.anomalies}</span>
                    <span className="kpi-trend negative" style={{ color: 'var(--color-pink)', backgroundColor: 'rgba(244, 63, 94, 0.1)' }}>
                      <ArrowUpRight size={12} />
                      +2
                    </span>
                  </div>
                  <div style={{ position: 'absolute', right: '20px', bottom: '20px' }}>
                    <div className="pulse-danger-dot" style={{ width: '12px', height: '12px' }} />
                  </div>
                </div>

                {/* 4. Unattributed Hours */}
                <div className="glass-panel kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-title">Unattributed Hours</span>
                    <div className="kpi-icon-wrapper" style={{ color: 'var(--color-warning)' }}>
                      <Clock size={16} />
                    </div>
                  </div>
                  <div className="kpi-body">
                    <span className="kpi-value">{dynamicData.unattributedHours}h</span>
                    <span className="kpi-trend warning">
                      <ArrowDownRight size={12} />
                      -4.2h
                    </span>
                  </div>
                  <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', height: '4px', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${Math.min(100, (dynamicData.unattributedHours / 30) * 100)}%`, 
                        backgroundColor: 'var(--color-warning)',
                        boxShadow: '0 0 6px var(--color-warning)'
                      }} 
                    />
                  </div>
                </div>
              </div>

              {/* --- MAIN DATA VISUALIZATION AREA --- */}
              <div className="charts-main-grid">
                
                {/* Real-time HR Expenditure by Project (Grouped Bar Chart) */}
                <div className="glass-panel chart-card">
                  <div className="chart-card-header">
                    <div>
                      <h3 className="chart-card-title">Real-time HR Expenditure by Project</h3>
                      <span className="chart-card-subtitle">Cost breakdown of active initiatives</span>
                    </div>
                  </div>
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={dynamicData.expenditureByProject}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="barGradientCyan" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#00f0ff" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.2} />
                          </linearGradient>
                          <linearGradient id="barGradientPurple" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#b55fe6" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#a855f7" stopOpacity={0.2} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          stroke="var(--text-muted)" 
                          fontSize={11} 
                          tickLine={false} 
                          axisLine={false} 
                        />
                        <YAxis 
                          stroke="var(--text-muted)" 
                          fontSize={11} 
                          tickLine={false} 
                          axisLine={false}
                          tickFormatter={(value) => `$${value / 1000}k`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--bg-card)',
                            borderColor: 'var(--border-color)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            fontSize: '12px'
                          }}
                          formatter={(value) => [`$${value.toLocaleString()}`, 'Meeting Cost']}
                        />
                        <Bar dataKey="cost" radius={[4, 4, 0, 0]} maxBarSize={45}>
                          {dynamicData.expenditureByProject.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={index % 2 === 0 ? 'url(#barGradientCyan)' : 'url(#barGradientPurple)'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Project Spends list */}
                <div className="glass-panel chart-card">
                  <div className="chart-card-header">
                    <div>
                      <h3 className="chart-card-title">Top Project Spends</h3>
                      <span className="chart-card-subtitle">Highest cost initiatives ranked</span>
                    </div>
                  </div>
                  <div className="top-spends-list">
                    {projectSpendsSum.map((project) => (
                      <div className="spend-item" key={project.name}>
                        <div className="spend-info">
                          <span className="spend-name">{project.name}</span>
                          <span className="spend-amount">${project.cost.toLocaleString()}</span>
                        </div>
                        <div className="spend-bar-bg">
                          <div 
                            className={`spend-bar-fill ${project.colorClass}`} 
                            style={{ width: `${project.percentage}%` }}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '10px', color: 'var(--text-muted)' }}>
                          {project.percentage}% of overall spend
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Meeting Cost Over Time Line Chart */}
              <div className="glass-panel full-width-chart-card">
                <div className="chart-card-header">
                  <div>
                    <h3 className="chart-card-title">Meeting Cost Over Time</h3>
                    <span className="chart-card-subtitle">Expenditure trends across current date range</span>
                  </div>
                  <div className="date-selector" style={{ padding: '4px 10px', fontSize: '11px' }}>
                    <TrendingUp size={12} />
                    <span>Cost Growth Tracking</span>
                  </div>
                </div>
                <div className="chart-wrapper" style={{ minHeight: '220px' }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart
                      data={dynamicData.costOverTime}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-cyan)" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="var(--color-cyan)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="areaColorPurple" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-purple)" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="var(--color-purple)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="var(--text-muted)" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis 
                        stroke="var(--text-muted)" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--bg-card)',
                          borderColor: 'var(--border-color)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          fontSize: '12px'
                        }}
                        formatter={(value) => [`$${value.toLocaleString()}`, 'Total Cost']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="cost" 
                        stroke="var(--color-cyan)" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#areaColor)"
                        style={{ filter: 'drop-shadow(0 0 4px var(--color-cyan-glow))' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* --- LOWER GRID: Activity & Alerts --- */}
              <div className="lower-sections-grid">
                
                {/* Recent Calendar Activity & AI Attribution Table */}
                <div className="glass-panel table-card">
                  <div className="chart-card-header">
                    <div>
                      <h3 className="chart-card-title">Recent Calendar Activity & AI Attribution</h3>
                      <span className="chart-card-subtitle">Recent calendar synced meetings with auto-attribution</span>
                    </div>
                  </div>
                  
                  <div className="table-container">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Meeting Title</th>
                          <th>Attendees</th>
                          <th>Est. Cost</th>
                          <th>AI Attribution</th>
                          <th>Confidence</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMeetings.length > 0 ? (
                          filteredMeetings.map((meeting) => (
                            <tr key={meeting.id}>
                              <td>
                                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{meeting.title}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                  <Clock size={12} /> {meeting.duration} • {meeting.time}
                                </div>
                              </td>
                              <td>
                                <div className="avatar-group">
                                  {Array.from({ length: Math.min(meeting.attendeeCount, 4) }).map((_, i) => (
                                    <img 
                                      key={i} 
                                      src={avatars[(meeting.id + i) % avatars.length]} 
                                      alt="Attendee" 
                                      className="avatar-group-item"
                                    />
                                  ))}
                                  {meeting.attendeeCount > 4 && (
                                    <div className="avatar-group-more">+{meeting.attendeeCount - 4}</div>
                                  )}
                                </div>
                              </td>
                              <td style={{ fontFamily: 'var(--font-display)', fontWeight: '600' }}>
                                ${meeting.cost.toLocaleString()}
                              </td>
                              <td>
                                <span className="project-badge">
                                  {meeting.project}
                                </span>
                              </td>
                              <td>
                                <span className={`confidence-badge ${
                                  meeting.confidence >= 85 ? 'high' : meeting.confidence >= 60 ? 'medium' : 'low'
                                }`}>
                                  {meeting.confidence}%
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                  {meeting.status === 'approved' ? (
                                    <span className="confidence-badge high" style={{ border: 'none' }}>
                                      <CheckCircle2 size={13} style={{ marginRight: '4px' }} />
                                      Attributed
                                    </span>
                                  ) : (
                                    <>
                                      <button 
                                        className="table-action-btn"
                                        onClick={() => handleApprove(meeting.id)}
                                        style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.2)', color: 'var(--color-success)' }}
                                      >
                                        Approve
                                      </button>
                                      <button 
                                        className="table-action-btn"
                                        onClick={() => openEditModal(meeting)}
                                      >
                                        <Edit2 size={12} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                              No meetings found matching your search.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Alerts & Recommendations feed */}
                <div className="glass-panel table-card">
                  <div className="chart-card-header">
                    <div>
                      <h3 className="chart-card-title">Alerts & Recommendations</h3>
                      <span className="chart-card-subtitle">Flagged anomalies and budget warnings</span>
                    </div>
                    {activeAlertsCount > 0 && (
                      <span className="confidence-badge low" style={{ padding: '2px 8px' }}>
                        {activeAlertsCount} Action Required
                      </span>
                    )}
                  </div>

                  <div className="alerts-feed">
                    {alerts.filter(a => !a.resolved).length > 0 ? (
                      alerts.filter(a => !a.resolved).map((alert) => (
                        <div className={`glass-panel alert-item ${alert.type}`} key={alert.id}>
                          <div className={`alert-icon-wrapper ${alert.type}`}>
                            {alert.type === 'danger' && <AlertTriangle size={18} />}
                            {alert.type === 'warning' && <AlertCircle size={18} />}
                            {alert.type === 'info' && <Sparkles size={18} />}
                          </div>
                          <div className="alert-content">
                            <h4 className="alert-title">{alert.title}</h4>
                            <p className="alert-desc">{alert.desc}</p>
                            <div className="alert-actions">
                              <button 
                                className="alert-btn primary"
                                onClick={() => handleResolveAlert(alert.id)}
                              >
                                {alert.type === 'warning' ? 'Resolve Tagging' : 'Review & Dismiss'}
                              </button>
                              <button className="alert-btn secondary">Mute</button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-alerts">
                        <CheckCircle2 size={32} style={{ color: 'var(--color-success)', marginBottom: '8px' }} />
                        <div>All anomalies resolved. No budget overruns detected.</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            // Simple mockup tabs for navigation
            <div style={{ textAlign: 'center', padding: '80px 20px' }} className="glass-panel">
              <Sparkles size={48} style={{ color: 'var(--color-cyan)', marginBottom: '16px', filter: 'drop-shadow(0 0 8px var(--color-cyan-glow))' }} />
              <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '8px' }}>{activeTab} Workspace</h2>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 24px auto', fontSize: '14px' }}>
                This dashboard section is mock-configured. Click back to the "Dashboard" in the sidebar to view live analytics.
              </p>
              <button 
                className="table-action-btn"
                style={{ padding: '8px 20px', fontSize: '13px' }}
                onClick={() => setActiveTab('Dashboard')}
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </main>
      </div>

      {/* --- EDIT ATTRIBUTION MODAL --- */}
      {selectedMeeting && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Manual Tag Reattribution</h3>
              <X className="modal-close-btn" size={18} onClick={() => setSelectedMeeting(null)} />
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Reassign meeting <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>"{selectedMeeting.title}"</span> to another cost code.
            </div>

            <div className="form-group">
              <label className="form-label">Select Project Code</label>
              <select 
                className="form-select"
                value={modalProject}
                onChange={(e) => setModalProject(e.target.value)}
              >
                <option value="Project Phoenix">Project Phoenix (Code: PHX-408)</option>
                <option value="Client ABC Onboarding">Client ABC Onboarding (Code: ABC-ONB)</option>
                <option value="Q4 Marketing Strategy">Q4 Marketing Strategy (Code: MKT-Q4)</option>
                <option value="Corporate Operations">Corporate Operations (Code: CORP-OPS)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-muted)' }}>
              <Brain size={14} style={{ color: 'var(--color-cyan)', flexShrink: 0 }} />
              <span>Attributing this meeting will feed the reinforcement model to improve future predictions.</span>
            </div>

            <div className="modal-footer">
              <button 
                className="alert-btn secondary"
                onClick={() => setSelectedMeeting(null)}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button 
                className="alert-btn primary"
                onClick={saveEditModal}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Save Attribution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
