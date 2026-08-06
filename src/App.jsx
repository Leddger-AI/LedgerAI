import { useState, useMemo, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
  X,
  LogOut,
  RefreshCw,
  Send,
  BarChart3,
  UserSearch,
  Video,
  Download
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
import { loginWithGoogleAndCalendar } from './firebaseAuth';
import LandingPage from './LandingPage.jsx';
import Navbar from './Navbar.jsx';
import KnowledgeBase from './KnowledgeBase.jsx';
import ProjectsView from './ProjectsView.jsx';
import TeamsView from './TeamsView.jsx';
import CalendarView from './CalendarView.jsx';
import ReportsView from './ReportsView.jsx';
import AlertsView from './AlertsView.jsx';
import SettingsView from './SettingsView.jsx';
import SourcingView from './SourcingView.jsx';
import MeetView from './MeetView.jsx';
import ExportView from './ExportView.jsx';
import EmailAutomationView from './EmailAutomationView.jsx';
import AnalysisView from './AnalysisView.jsx';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Lazy loaded page components to resolve startup slow-loading (buffering) warnings
const RecruiterDashboard = lazy(() => import('./pages/RecruiterDashboard.jsx'));
const StudentPortal = lazy(() => import('./pages/StudentPortal.jsx'));
const AnalyticsEngine = lazy(() => import('./pages/AnalyticsEngine.jsx'));
const Welcome = lazy(() => import('./pages/Welcome.jsx'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy.jsx'));
const TermsOfService = lazy(() => import('./pages/TermsOfService.jsx'));


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
  const location = useLocation();
  const [showDashboard, setShowDashboard] = useState(false);
  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState('This Month');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Interactive Modal State
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [modalProject, setModalProject] = useState('');

  // Authentication & API state
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [authErrorModal, setAuthErrorModal] = useState(null);
  
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

  // --- AUTHENTICATION & SYNC HANDLERS ---
  const handleLogin = async () => {
    setLoading(true);
    setApiError(null);
    setAuthErrorModal(null);
    try {
      const data = await loginWithGoogleAndCalendar();
      setUser(data.user);
      setTokens({
        firebaseIdToken: data.firebaseIdToken,
        googleAccessToken: data.googleAccessToken
      });
      await fetchEvents(data.firebaseIdToken, data.googleAccessToken);
      return true;
    } catch (err) {
      console.error("Login Error:", err);
      if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
        setAuthErrorModal({
          type: 'operation-not-allowed',
          message: 'Google Sign-In is not enabled as a sign-in provider in your Firebase project.',
          detail: err.message
        });
      } else {
        setApiError("Authentication failed: " + err.message);
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const enterDemoMode = () => {
    setUser({
      displayName: "Sarah Jenkins (Demo Mode)",
      photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80",
      email: "demo@ledgerai.co"
    });
    setTokens({
      firebaseIdToken: "demo-firebase-id-token",
      googleAccessToken: "demo-google-access-token"
    });
    // Reset to mock data
    setMeetings([
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
    setAuthErrorModal(null);
    if (typeof setShowDashboard === 'function') {
      setShowDashboard(true);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setTokens(null);
    setApiError(null);
    setShowDashboard(false);
    // Reset to mock data
    setMeetings([
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
  };

  const fetchEvents = async (firebaseToken, googleToken) => {
    setLoading(true);
    setApiError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/calendar/events?google_token=${googleToken}`, {
        headers: {
          'Authorization': `Bearer ${firebaseToken}`
        }
      });
      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }
      const data = await response.json();
      if (data.status === 'success' && data.events) {
        const mapped = data.events.map((evt, idx) => {
          const hours = Math.floor(evt.durationMinutes / 60);
          const mins = evt.durationMinutes % 60;
          const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
          
          return {
            id: evt.eventId || idx,
            title: evt.title,
            duration: durationStr,
            attendeeCount: evt.attendees.length,
            cost: evt.cost || 0,
            project: evt.aiProject || 'Internal Operations',
            confidence: evt.aiConfidence || 0,
            status: evt.requiresHumanReview ? 'needs_review' : 'approved',
            time: evt.startTime ? new Date(evt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'All-day'
          };
        });
        setMeetings(mapped);
      }
    } catch (err) {
      console.error(err);
      setApiError("Failed to sync calendar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncClick = async () => {
    if (tokens) {
      await fetchEvents(tokens.firebaseIdToken, tokens.googleAccessToken);
    } else {
      await handleLogin();
    }
  };

  // --- DYNAMIC DATA PRESETS BASED ON DATE ---
  const dynamicData = useMemo(() => {
    // Calculate stats directly from our state meetings
    const totalCost = Math.round(meetings.reduce((acc, m) => acc + m.cost, 0));
    const accuracy = meetings.length > 0 
      ? Math.round(meetings.reduce((acc, m) => acc + m.confidence, 0) / meetings.length)
      : 92;
    const anomalies = meetings.filter(m => m.status === 'needs_review' || m.confidence < 60).length;
    
    // Parse unattributed hours (unassigned or operations with low confidence)
    const unattributedMinutes = meetings
      .filter(m => m.project === 'Unassigned' || m.project === 'Internal Operations')
      .reduce((acc, m) => {
        // parse duration like "2h 30m" or "45m"
        const hoursMatch = m.duration.match(/(\d+)h/);
        const minsMatch = m.duration.match(/(\d+)m/);
        const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
        const mins = minsMatch ? parseInt(minsMatch[1]) : 0;
        return acc + (hours * 60 + mins);
      }, 0);
    const unattributedHours = Math.round((unattributedMinutes / 60) * 10) / 10;

    // Group costs by project
    const projectCostMap = {};
    meetings.forEach(m => {
      const proj = m.project || 'Unassigned';
      projectCostMap[proj] = (projectCostMap[proj] || 0) + m.cost;
    });
    const expenditureByProject = Object.keys(projectCostMap).map(name => ({
      name,
      cost: Math.round(projectCostMap[name])
    }));

    // Mock trend line showing cost distribution over time based on the active dataset's total cost
    const costOverTime = datePreset === 'Last 7 Days' ? [
      { date: 'Mon', cost: Math.round(totalCost * 0.12) },
      { date: 'Tue', cost: Math.round(totalCost * 0.15) },
      { date: 'Wed', cost: Math.round(totalCost * 0.17) },
      { date: 'Thu', cost: Math.round(totalCost * 0.14) },
      { date: 'Fri', cost: Math.round(totalCost * 0.22) },
      { date: 'Sat', cost: Math.round(totalCost * 0.08) },
      { date: 'Sun', cost: Math.round(totalCost * 0.12) }
    ] : datePreset === 'Last 30 Days' ? [
      { date: 'Wk 1', cost: Math.round(totalCost * 0.22) },
      { date: 'Wk 2', cost: Math.round(totalCost * 0.25) },
      { date: 'Wk 3', cost: Math.round(totalCost * 0.28) },
      { date: 'Wk 4', cost: Math.round(totalCost * 0.25) }
    ] : [
      { date: 'May 01', cost: Math.round(totalCost * 0.18) },
      { date: 'May 08', cost: Math.round(totalCost * 0.21) },
      { date: 'May 15', cost: Math.round(totalCost * 0.24) },
      { date: 'May 22', cost: Math.round(totalCost * 0.22) },
      { date: 'May 29', cost: Math.round(totalCost * 0.27) },
      { date: 'Jun 05', cost: Math.round(totalCost * 0.29) },
      { date: 'Jun 12', cost: Math.round(totalCost * 0.32) }
    ];

    return {
      totalCost,
      accuracy,
      anomalies,
      unattributedHours,
      costOverTime,
      expenditureByProject
    };
  }, [meetings, datePreset]);

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

  const [defaultRate, setDefaultRate] = useState(75);
  const [confidenceThreshold, setConfidenceThreshold] = useState(60);

  const handleUpdateMeetingProject = (meetingId, project) => {
    setMeetings(prev =>
      prev.map(m =>
        m.id === meetingId
          ? { ...m, project, status: 'approved', confidence: 100 }
          : m
      )
    );
  };

  const handleAddMeeting = (newMeeting) => {
    setMeetings(prev => [newMeeting, ...prev]);
  };

  const handleUpdateSettings = (settings) => {
    if (settings.defaultRate !== undefined) setDefaultRate(settings.defaultRate);
    if (settings.confidenceThreshold !== undefined) setConfidenceThreshold(settings.confidenceThreshold);
  };

  const handleResetData = () => {
    setMeetings([
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
    setAlerts([
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
  };

  const handleToggleDemo = () => {
    if (user && user.displayName.includes("Demo Mode")) {
      setUser(null);
      setTokens(null);
    } else {
      enterDemoMode();
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

  if (!showDashboard) {
    const handleStartDashboard = async () => {
      if (user) {
        setShowDashboard(true);
      } else {
        const success = await handleLogin();
        if (success) {
          setShowDashboard(true);
        }
      }
    };

    return (
      <>
        {location.pathname !== '/welcome' && (
          <Navbar onStartDashboard={handleStartDashboard} loading={loading} />
        )}
        <Suspense fallback={
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '80vh',
            color: 'var(--color-cyan)',
            fontFamily: 'var(--font-display)',
            fontSize: '18px'
          }}>
            <div className="animate-spin" style={{
              marginRight: '12px',
              width: '24px',
              height: '24px',
              border: '3px solid rgba(215, 254, 250, 0.1)',
              borderTopColor: 'var(--color-cyan)',
              borderRadius: '50%'
            }} />
            Loading LedgerAI Portal...
          </div>
        }>
          <Routes>
            <Route path="/" element={
              <LandingPage 
                onStartDashboard={handleStartDashboard}
                loading={loading}
                apiError={apiError}
                onClearError={() => setApiError(null)}
              />
            } />
            <Route path="/security" element={
              <LandingPage 
                onStartDashboard={handleStartDashboard}
                loading={loading}
                apiError={apiError}
                onClearError={() => setApiError(null)}
              />
            } />
            <Route path="/welcome" element={<Welcome onStartDashboard={handleStartDashboard} />} />
            <Route path="/recruiter-flow" element={<RecruiterDashboard />} />
            <Route path="/recruiter" element={<RecruiterDashboard />} />
            <Route path="/candidate-flow" element={<StudentPortal />} />
            <Route path="/analytics" element={<AnalyticsEngine />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </>
    );
  }

  return (
    <div className="app-container">
      {/* --- SIDEBAR --- */}
      <aside className="sidebar">
        <div className="logo-container">
          <h1 className="logo-text">
            LEDDGER
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
            className={`menu-item ${activeTab === 'Email Automation' ? 'active' : ''}`}
            onClick={() => handleNavClick('Email Automation')}
            title="Email Automation"
          >
            <Send />
            <span>Email Automation</span>
          </div>
          <div
            className={`menu-item ${activeTab === 'Analysis' ? 'active' : ''}`}
            onClick={() => handleNavClick('Analysis')}
            title="Analysis"
          >
            <BarChart3 />
            <span>Analysis</span>
          </div>
          <div
            className={`menu-item ${activeTab === 'Sourcing' ? 'active' : ''}`}
            onClick={() => handleNavClick('Sourcing')}
            title="Sourcing"
          >
            <UserSearch />
            <span>Sourcing</span>
          </div>
          <div
            className={`menu-item ${activeTab === 'Meet' ? 'active' : ''}`}
            onClick={() => handleNavClick('Meet')}
            title="Meet"
          >
            <Video />
            <span>Meet</span>
          </div>
          <div
            className={`menu-item ${activeTab === 'Export' ? 'active' : ''}`}
            onClick={() => handleNavClick('Export')}
            title="Export"
          >
            <Download />
            <span>Export</span>
          </div>
          <div
            className={`menu-item ${activeTab === 'Knowledge Base' ? 'active' : ''}`}
            onClick={() => handleNavClick('Knowledge Base')}
          >
            <Sparkles size={20} />
            <span>Knowledge Base</span>
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

        {/* User Profile in Sidebar */}
        <div className="sidebar-profile-widget" style={{ padding: '20px 0', borderTop: '1px solid var(--border-color)', width: '100%', display: 'flex', justifyContent: 'center' }}>
          <img 
            src={user?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80"} 
            alt="Profile" 
            style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              objectFit: 'cover', 
              border: '2px solid rgba(20,20,20,0.1)',
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
              cursor: 'pointer'
            }} 
            title={`${user?.displayName || "Sarah Jenkins"} (${user ? "Authenticated VP" : "HR Operations VP"})`}
          />
        </div>
      </aside>

      {/* --- MAIN WORKSPACE --- */}
      <div className="main-content">

        {/* --- VIEWPORT --- */}
        <main className="dashboard-viewport">
          {apiError && (
            <div className="glass-panel alert-item danger" style={{ marginBottom: '20px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div className="alert-icon-wrapper danger" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', backgroundColor: 'rgba(244, 63, 94, 0.1)', color: 'var(--color-pink)' }}>
                  <AlertCircle size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>Sync Error</h4>
                  <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>{apiError}</p>
                </div>
              </div>
              <X 
                size={16} 
                style={{ cursor: 'pointer', color: 'var(--text-muted)' }} 
                onClick={() => setApiError(null)} 
              />
            </div>
          )}
          
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
                          <stop offset="0%" stopColor="#16A34A" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#16A34A" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,25 Q15,10 30,22 T60,5 T80,18 T100,8 L100,30 L0,30 Z"
                        fill="url(#cyanSparklineGrad)"
                      />
                      <path
                        d="M0,25 Q15,10 30,22 T60,5 T80,18 T100,8"
                        fill="none"
                        stroke="#16A34A"
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
                        stroke="rgba(20,20,20,0.1)"
                        strokeWidth="3.5"
                      />
                      <path
                        className="circle"
                        strokeDasharray={`${dynamicData.accuracy}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#16A34A"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        style={{ filter: 'drop-shadow(0 0 3px #16A34A)' }}
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
                  <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', height: '4px', backgroundColor: 'rgba(20,20,20,0.06)' }}>
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
                            <stop offset="0%" stopColor="#16A34A" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#16A34A" stopOpacity={0.35} />
                          </linearGradient>
                          <linearGradient id="barGradientPurple" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#F97316" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#F97316" stopOpacity={0.35} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,20,20,0.08)" vertical={false} />
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
                          <stop offset="5%" stopColor="#16A34A" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="areaColorPurple" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F97316" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,20,20,0.06)" vertical={false} />
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
                        stroke="#16A34A"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#areaColor)"
                        style={{ filter: 'drop-shadow(0 0 4px var(--chart-green-glow))' }}
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
                                <span className={`confidence-badge ${meeting.confidence >= 85 ? 'high' : meeting.confidence >= 60 ? 'medium' : 'low'
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
          ) : activeTab === 'Knowledge Base' ? (
            <KnowledgeBase />
          ) : activeTab === 'Projects' ? (
            <ProjectsView meetings={meetings} onUpdateMeetingProject={handleUpdateMeetingProject} />
          ) : activeTab === 'Teams' ? (
            <TeamsView />
          ) : activeTab === 'Calendar' ? (
            <CalendarView meetings={meetings} onAddMeeting={handleAddMeeting} />
          ) : activeTab === 'Reports' ? (
            <ReportsView meetings={meetings} />
          ) : activeTab === 'Sourcing' ? (
            <SourcingView />
          ) : activeTab === 'Meet' ? (
            <MeetView meetings={meetings} />
          ) : activeTab === 'Export' ? (
            <ExportView meetings={meetings} />
          ) : activeTab === 'Email Automation' ? (
            <EmailAutomationView />
          ) : activeTab === 'Analysis' ? (
            <AnalysisView meetings={meetings} />
          ) : activeTab === 'Alerts' ? (
            <AlertsView alerts={alerts} onResolveAlert={handleResolveAlert} />
          ) : activeTab === 'Settings' ? (
            <SettingsView 
              defaultRate={defaultRate}
              confidenceThreshold={confidenceThreshold}
              onUpdateSettings={handleUpdateSettings}
              onResetData={handleResetData}
              onToggleDemo={handleToggleDemo}
              demoActive={!!(user && user.displayName.includes("Demo Mode"))}
            />
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

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'rgba(20,20,20,0.04)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-muted)' }}>
              <Brain size={14} style={{ color: '#16A34A', flexShrink: 0 }} />
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

      {/* --- AUTH ERROR / CONFIGURATION MODAL --- */}
      {authErrorModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '500px', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-pink)' }}>
                <AlertCircle size={20} />
                Auth Provider Disabled
              </h3>
              <X className="modal-close-btn" size={18} onClick={() => setAuthErrorModal(null)} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px', lineHeight: '1.5' }}>
              <p style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                Firebase returned an <code>auth/operation-not-allowed</code> error.
              </p>
              <p style={{ color: 'var(--text-secondary)' }}>
                This means Google Sign-In is not enabled as a sign-in provider in your Firebase project.
              </p>

              <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.05)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(244, 63, 94, 0.15)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>How to resolve this in Firebase:</span>
                <ol style={{ margin: '0', paddingLeft: '20px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li>Go to your <strong>Firebase Console</strong>.</li>
                  <li>Click on <strong>Authentication</strong> (in the Build section).</li>
                  <li>Navigate to the <strong>Sign-in method</strong> tab.</li>
                  <li>Click <strong>Add new provider</strong>, select <strong>Google</strong>, and toggle it to <strong>Enable</strong>.</li>
                </ol>
              </div>

              <p style={{ color: 'var(--text-muted)' }}>
                To proceed without configuring Firebase right now, you can enter **Sandbox Demo Mode** to explore the complete dashboard and Recharts integrations.
              </p>
            </div>

            <div className="modal-footer" style={{ marginTop: '10px' }}>
              <button 
                className="alert-btn secondary"
                onClick={() => setAuthErrorModal(null)}
                style={{ padding: '10px 18px', fontSize: '13px' }}
              >
                Close
              </button>
              <button 
                className="alert-btn primary"
                onClick={enterDemoMode}
                style={{ 
                  padding: '10px 18px', 
                  fontSize: '13px', 
                  backgroundColor: 'var(--color-cyan)', 
                  color: '#FFFFFF', 
                  fontWeight: '600',
                  boxShadow: '0 0 10px var(--color-cyan-glow)' 
                }}
              >
                Explore Sandbox Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
