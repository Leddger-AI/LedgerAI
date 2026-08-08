import { useState, useMemo, lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Calendar,
  FileText,
  GraduationCap,
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
  Download,
  ChevronsRight,
  ChevronsLeft,
  Mail,
  MessageCircle,
  Phone,
  Inbox as InboxIcon,
  File,
  Trash2,
  ChevronUp
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
import { auth, loginWithGoogleAndCalendar } from './firebaseAuth';
import { onAuthStateChanged } from 'firebase/auth';
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
import StudentTemplateBuilder from './pages/StudentTemplateBuilder.jsx';
import EmployeeTemplateBuilder from './pages/EmployeeTemplateBuilder.jsx';
import TeamTemplateBuilder from './pages/TeamTemplateBuilder.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Lazy loaded page components to resolve startup slow-loading (buffering) warnings
const RecruiterDashboard = lazy(() => import('./pages/RecruiterDashboard.jsx'));
const StudentPortal = lazy(() => import('./pages/StudentPortal.jsx'));
const AnalyticsEngine = lazy(() => import('./pages/AnalyticsEngine.jsx'));
const Welcome = lazy(() => import('./pages/Welcome.jsx'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy.jsx'));
const TermsOfService = lazy(() => import('./pages/TermsOfService.jsx'));
const PublicFormView = lazy(() => import('./pages/PublicFormView.jsx'));
const DraftsView = lazy(() => import('./pages/DraftsView.jsx'));


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
  const navigate = useNavigate();

  const PATH_TAB_MAP = {
    '/dashboard': 'Dashboard',
    '/dashboard/templates/student': 'Student Template',
    '/dashboard/templates/employee': 'Employee Template',
    '/dashboard/templates/team': 'Team Template',
    '/dashboard/projects': 'Projects',
    '/dashboard/teams': 'Teams',
    '/dashboard/calendar': 'Calendar',
    '/dashboard/reports': 'Reports',
    '/dashboard/sourcing': 'Sourcing',
    '/dashboard/meet': 'Meet',
    '/dashboard/export': 'Export',
    '/dashboard/email-automation': 'Email Automation',
    '/dashboard/analysis': 'Analysis',
    '/dashboard/alerts': 'Alerts',
    '/dashboard/settings': 'Settings',
    '/dashboard/knowledge-base': 'Knowledge Base',
    '/dashboard/templates/drafts': 'Drafts',
    '/dashboard/templates/sent': 'Sent Forms'
  };

  const TAB_PATH_MAP = Object.fromEntries(
    Object.entries(PATH_TAB_MAP).map(([path, tab]) => [tab, path])
  );

  const activeTab = PATH_TAB_MAP[location.pathname] || 'Dashboard';
  
  const calculatePrimaryNav = (tab) => {
    if (['Dashboard', 'Alerts'].includes(tab)) return 'Home';
    if (['Student Template', 'Employee Template', 'Team Template', 'Drafts', 'Sent Forms'].includes(tab)) return 'Templates';
    if (['Projects', 'Teams', 'Sourcing', 'Calendar'].includes(tab)) return 'Workspace';
    if (['Analysis', 'Reports', 'Export'].includes(tab)) return 'Analytics';
    if (['Knowledge Base'].includes(tab)) return 'Intelligence';
    if (['Settings'].includes(tab)) return 'Settings';
    return 'Home'; 
  };
  
  const activePrimaryNav = calculatePrimaryNav(activeTab);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  
  const PRIMARY_NAVS = [
    { id: 'Home', icon: LayoutDashboard },
    { id: 'Inbox', icon: Mail },
    { id: 'Workspace', icon: Briefcase },
    { id: 'Templates', icon: FileText },
    { id: 'Analytics', icon: BarChart3 },
    { id: 'Intelligence', icon: Sparkles },
    { id: 'Settings', icon: Settings }
  ];

  const SECONDARY_NAVS = {
    Home: [
      { id: 'Dashboard', label: 'Overview', icon: LayoutDashboard },
      { id: 'Alerts', label: 'Alerts', icon: AlertTriangle }
    ],
    Inbox: [
      { id: 'Assigned', label: 'Assigned to me', icon: Users, count: 50 },
      { id: 'Unassigned', label: 'Unassigned', icon: FileText, count: 2 },
      { id: 'AllOpen', label: 'All open', icon: CheckCircle2, count: 2 },
      { id: 'divider1', isDivider: true },
      { id: 'Email Automation', label: 'Email', icon: Mail, count: 46 },
      { id: 'Chat', label: 'Chat', icon: MessageCircle, count: 18 },
      { id: 'Calls', label: 'Calls', icon: Phone, count: 12 },
      { id: 'AllClosed', label: 'All Closed', icon: InboxIcon, count: 12 },
      { id: 'divider2', isDivider: true },
      { id: 'Sent', label: 'Sent', icon: Send, count: 12 },
      { id: 'Draft', label: 'Draft', icon: File },
      { id: 'Schedule', label: 'Schedule', icon: Clock },
      { id: 'divider3', isDivider: true },
      { id: 'OthersHeader', isHeader: true, label: 'Others' },
      { id: 'Spam', label: 'Spam', icon: AlertCircle },
      { id: 'Trash', label: 'Trash', icon: Trash2 },
      { id: 'divider4', isDivider: true },
      { id: 'TeamHeader', isHeader: true, label: 'Team inboxes' },
      { id: 'ManageSubscription', label: 'Manage Subscription', icon: Briefcase, count: 1 },
      { id: 'ManageLabels', label: 'Manage Labels', icon: Settings, count: 2 }
    ],
    Workspace: [
      { id: 'Projects', label: 'Projects', icon: Briefcase },
      { id: 'Teams', label: 'Teams', icon: Users },
      { id: 'Sourcing', label: 'Sourcing', icon: UserSearch },
      { id: 'Calendar', label: 'Calendar', icon: Calendar }
    ],
    Templates: [
      { id: 'Student Template', label: 'Student', icon: GraduationCap },
      { id: 'Employee Template', label: 'Employee', icon: Briefcase },
      { id: 'Team Template', label: 'Team', icon: Users },
      { id: 'dividerTemplates', isDivider: true },
      { id: 'Drafts', label: 'Drafts', icon: File },
      { id: 'Sent Forms', label: 'Sent', icon: Send }
    ],
    Analytics: [
      { id: 'Analysis', label: 'Analysis', icon: BarChart3 },
      { id: 'Reports', label: 'Reports', icon: FileText },
      { id: 'Export', label: 'Export', icon: Download }
    ],
    Intelligence: [
      { id: 'Knowledge Base', label: 'Knowledge Base', icon: Sparkles }
    ],
    Settings: [
      { id: 'Settings', label: 'General Settings', icon: Settings }
    ]
  };

  const searchQueryState = useState('');
  const [searchQuery, setSearchQuery] = searchQueryState;
  const [datePreset, setDatePreset] = useState('This Month');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Interactive Modal State
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [modalProject, setModalProject] = useState('');

  // Authentication & API state
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
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

  // Auth persistence listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          
          const googleToken = localStorage.getItem('googleAccessToken');
        try {
          const firebaseToken = await currentUser.getIdToken();
          setTokens({
            firebaseIdToken: firebaseToken,
            googleAccessToken: googleToken
          });
          
          if (googleToken) {
            // Re-fetch events now that we have tokens
            await fetchEvents(firebaseToken, googleToken);
          }
        } catch (e) {
          console.error("Error restoring session:", e);
        }
      } else {
        // Fallback for demo mode survival on refresh
        const localUser = localStorage.getItem('authUser');
        if (localUser && localUser.includes("Demo Mode")) {
          setUser(JSON.parse(localUser));
        }
      }
      // Mark auth as ready after first check completes
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

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
      // Store token in localStorage to survive refreshes
      localStorage.setItem('googleAccessToken', data.googleAccessToken);
      localStorage.setItem('authUser', JSON.stringify({
        displayName: data.user.displayName,
        photoURL: data.user.photoURL,
        email: data.user.email
      }));
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
    const demoUser = {
      displayName: "Sarah Jenkins (Demo Mode)",
      photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80",
      email: "demo@ledgerai.co"
    };
    setUser(demoUser);
    setTokens({
      firebaseIdToken: "demo-firebase-id-token",
      googleAccessToken: "demo-google-access-token"
    });
    localStorage.setItem('authUser', JSON.stringify(demoUser));
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
  };

  const handleLogout = () => {
    auth.signOut();
    setUser(null);
    setTokens(null);
    setApiError(null);
    localStorage.removeItem('googleAccessToken');
    localStorage.removeItem('authUser');
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
    const path = TAB_PATH_MAP[tab];
    if (path) navigate(path);
  };

  const handleStartDashboard = async () => { navigate('/login'); };

  const dashboardUI = (
    <div className="layout-wrapper">
      {/* MINI SIDEBAR (LEVEL 1) */}
      <aside className="mini-sidebar">
        {/* Avatar Area */}
        <div className="mini-sidebar-header">
          <img 
            src={user?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80"} 
            alt="Profile" 
            className="mini-avatar"
            title={`${user?.displayName || "Sarah Jenkins"}`}
          />
        </div>

        {/* Primary Nav Icons */}
        <nav className="mini-sidebar-nav">
          {PRIMARY_NAVS.map((nav) => {
            const Icon = nav.icon;
            const isActive = activePrimaryNav === nav.id;
            return (
              <div
                key={nav.id}
                className={`mini-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  const firstSubItem = SECONDARY_NAVS[nav.id][0];
                  if (firstSubItem) {
                    const path = TAB_PATH_MAP[firstSubItem.id];
                    if (path) navigate(path);
                  }
                }}
                title={nav.id}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                {activeAlertsCount > 0 && nav.id === 'Home' && (
                  <span className="mini-nav-dot" />
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="app-container">
        {/* SECONDARY SIDEBAR (LEVEL 2) */}
        <aside className="secondary-sidebar expanded">
          <div className="secondary-sidebar-header">
            <h2 className="secondary-title">{activePrimaryNav}</h2>
          </div>
          
          <div className="secondary-sidebar-content">
            {/* Navigation Groups */}
            <nav className="secondary-nav-group">
              {SECONDARY_NAVS[activePrimaryNav].map((subItem) => {
                if (subItem.isDivider) {
                  return <hr key={subItem.id} style={{ border: 0, borderTop: '1px solid #F0F0F0', margin: '8px 0' }} />;
                }
                if (subItem.isHeader) {
                  return (
                    <div key={subItem.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px 4px 12px', marginTop: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#141414' }}>{subItem.label}</span>
                      <ChevronUp size={14} style={{ color: '#141414' }} />
                    </div>
                  );
                }

                const SubIcon = subItem.icon;
                const isActive = activeTab === subItem.id;
                
                // Fallback for counts specifically for alerts if missing from mockup data
                let displayCount = subItem.count;
                if (subItem.id === 'Alerts' && activeAlertsCount > 0) {
                  displayCount = activeAlertsCount;
                }

                return (
                  <div
                    key={subItem.id}
                    className={`secondary-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleNavClick(subItem.id)}
                  >
                    <SubIcon size={16} strokeWidth={1.5} style={{ color: isActive ? '#141414' : 'inherit' }} />
                    <span style={{ color: isActive ? '#141414' : 'inherit' }}>{subItem.label}</span>
                    
                    {displayCount !== undefined && (
                      <span className="nav-count-badge" style={{ color: isActive ? '#141414' : 'inherit', marginLeft: 'auto', fontSize: '12px' }}>
                        {displayCount}
                      </span>
                    )}
                  </div>
                );
              })}
            </nav>
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
          ) : activeTab === 'Student Template' ? (
            <StudentTemplateBuilder />
          ) : activeTab === 'Employee Template' ? (
            <EmployeeTemplateBuilder />
          ) : activeTab === 'Team Template' ? (
            <TeamTemplateBuilder />
          ) : activeTab === 'Drafts' ? (
            <DraftsView />
          ) : activeTab === 'Sent Forms' ? (
            <div style={{ padding: '40px', color: '#64748B', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
              <Send size={48} style={{ color: '#CBD5E1' }} />
              <h2>Sent Forms</h2>
              <p>Responses and statuses for your sent forms will appear here.</p>
            </div>
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
    </div>
  );

  return (
    <>
      {location.pathname !== '/welcome' && location.pathname !== '/login' && location.pathname !== '/auth/github' && !location.pathname.startsWith('/dashboard') && (
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
          <Route path="/recruiter-flow" element={<ProtectedRoute user={user} authReady={authReady}><RecruiterDashboard /></ProtectedRoute>} />
          <Route path="/recruiter" element={<ProtectedRoute user={user} authReady={authReady}><RecruiterDashboard /></ProtectedRoute>} />
          <Route path="/candidate-flow" element={<ProtectedRoute user={user} authReady={authReady}><StudentPortal /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute user={user} authReady={authReady}><AnalyticsEngine /></ProtectedRoute>} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/form/:title/:draftId" element={<PublicFormView />} />
          
          <Route path="/dashboard/*" element={
            <ProtectedRoute user={user} authReady={authReady}>
              {dashboardUI}
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

