import { useState, useMemo, lazy, Suspense, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Calendar,
  FileText,
  GraduationCap,
  Settings,
  AlertTriangle,
  Clock,
  Brain,
  Sparkles,
  AlertCircle,
  TrendingUp,
  X,
  Send,
  BarChart3,
  UserSearch,
  Video,
  Download,
  FileSpreadsheet,
  Table2,
  Mail,
  File,
  ChevronUp,
  FolderOpen,
  User,
  Building2,
  Shield,
  Plug,
  Palette,
  Lock,
  Scale,
  Timer,
  Wallet
} from 'lucide-react';
import './App.css';
import { loginWithGoogleAndCalendar, loginWithGitHub, onAuthChange, signOut as supabaseSignOut, getCurrentSession, getAuthToken } from './supabaseAuth';
import Navbar from './Navbar.jsx';
import ProjectsView from './ProjectsView.jsx';
import TeamsView from './TeamsView.jsx';
import CalendarView from './CalendarView.jsx';
import AlertsView from './AlertsView.jsx';
import SettingsView from './SettingsView.jsx';
import FilesView from './FilesView.jsx';
import MeetView from './MeetView.jsx';
import ExportView from './ExportView.jsx';
// Heavy route views load lazily so the initial chunk stays small
const LandingPage = lazy(() => import('./LandingPage.jsx'));
const KnowledgeBase = lazy(() => import('./KnowledgeBase.jsx'));
const ReportsView = lazy(() => import('./ReportsView.jsx'));
const SourcingView = lazy(() => import('./SourcingView.jsx'));
const BulkCampaignView = lazy(() => import('./BulkCampaignView.jsx'));
const RosterStudioView = lazy(() => import('./RosterStudioView.jsx'));
const EmailAutomationView = lazy(() => import('./EmailAutomationView.jsx'));
const AnalysisView = lazy(() => import('./AnalysisView.jsx'));
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import AttributionQueue from './pages/AttributionQueue.jsx';
import LiveTicker from './pages/LiveTicker.jsx';
import Budgets from './pages/Budgets.jsx';
import OverviewDashboard from './pages/OverviewDashboard.jsx';
import DashboardHome from './pages/DashboardHome.jsx';
import PreviewStudio from './pages/PreviewStudio.jsx';
import StudentTemplateBuilder from './pages/StudentTemplateBuilder.jsx';
import EmployeeTemplateBuilder from './pages/EmployeeTemplateBuilder.jsx';
import TeamTemplateBuilder from './pages/TeamTemplateBuilder.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import WelcomeLoader from './components/WelcomeLoader.jsx';
import SiteIntro from './components/SiteIntro.jsx';
import LoginDashboard from './pages/LoginDashboard.jsx';
import GitHubAuthRedirect from './pages/GitHubAuthRedirect.jsx';
import ActiveLinksView from './pages/ActiveLinksView.jsx';
import EmailBodyEditor from './pages/EmailBodyEditor.jsx';
const SentView = lazy(() => import('./pages/SentView.jsx'));
const ScheduleView = lazy(() => import('./pages/ScheduleView.jsx'));
const ScheduledFormsView = lazy(() => import('./pages/ScheduledFormsView.jsx'));

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function normalizeUser(rawUser) {
  if (!rawUser) return null;
  const meta = rawUser.user_metadata || {};
  return {
    ...rawUser,
    photoURL: meta.avatar_url || meta.picture || meta.profile_image_url || null,
    displayName: meta.full_name || meta.name || meta.user_name || rawUser.email || 'User',
    email: rawUser.email || meta.email || '',
  };
}

// Lazy loaded page components to resolve startup slow-loading (buffering) warnings
const RecruiterDashboard = lazy(() => import('./pages/RecruiterDashboard.jsx'));
const StudentPortal = lazy(() => import('./pages/StudentPortal.jsx'));
const AnalyticsEngine = lazy(() => import('./pages/AnalyticsEngine.jsx'));
const Welcome = lazy(() => import('./pages/Welcome.jsx'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy.jsx'));
const TermsOfService = lazy(() => import('./pages/TermsOfService.jsx'));
const PublicFormView = lazy(() => import('./pages/PublicFormView.jsx'));
const DraftsView = lazy(() => import('./pages/DraftsView.jsx'));


export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const PATH_TAB_MAP = {
    '/dashboard': 'Home',
    '/dashboard/command-center': 'Command Center',
    '/dashboard/templates/student': 'Student Template',
    '/dashboard/templates/employee': 'Employee Template',
    '/dashboard/templates/team': 'Team Template',
    '/dashboard/projects': 'Projects',
    '/dashboard/teams': 'Teams',
    '/dashboard/calendar': 'Calendar',
    '/dashboard/reports': 'Reports',
    '/dashboard/sourcing': 'Sourcing',
    '/dashboard/bulk-campaign': 'Bulk Campaign',
    '/dashboard/roster-studio': 'Roster Studio',
    '/dashboard/files': 'Files',
    '/dashboard/meet': 'Meet',
    '/dashboard/export': 'Export',
    '/dashboard/email-automation': 'Email Automation',
    '/dashboard/sent': 'Sent',
    '/dashboard/schedule': 'Schedule',
    '/dashboard/analysis': 'Analysis',
    '/dashboard/template-analytics': 'Template Analytics',
    '/dashboard/attribution': 'Attribution',
    '/dashboard/live-ticker': 'Live Ticker',
    '/dashboard/budgets': 'Budgets',
    '/dashboard/alerts': 'Alerts',
    '/dashboard/settings/profile': 'SettingsProfile',
    '/dashboard/settings/departments': 'SettingsDepartments',
    '/dashboard/settings/email': 'SettingsEmail',
    '/dashboard/settings/ai': 'SettingsAI',
    '/dashboard/settings/integrations': 'SettingsIntegrations',
    '/dashboard/settings/appearance': 'SettingsAppearance',
    '/dashboard/settings/security': 'SettingsSecurity',
    '/dashboard/knowledge-base': 'Knowledge Base',
    '/dashboard/templates/drafts': 'Drafts',
    '/dashboard/templates/active': 'Active Links',
    '/dashboard/templates/scheduled': 'Scheduled Forms',
    '/dashboard/templates/studio': 'Preview Studio',
    '/dashboard/templates/email-body': 'Email Body'
  };

  const TAB_PATH_MAP = Object.fromEntries(
    Object.entries(PATH_TAB_MAP).map(([path, tab]) => [tab, path])
  );

  const activeTab = PATH_TAB_MAP[location.pathname] || 'Home';

  const calculatePrimaryNav = (tab) => {
    if (['Home', 'Command Center', 'Alerts', 'Attribution', 'Live Ticker', 'Budgets'].includes(tab)) return 'Home';
    if (['Student Template', 'Employee Template', 'Team Template', 'Drafts', 'Active Links', 'Scheduled Forms', 'Preview Studio'].includes(tab)) return 'Templates';
    if (['Projects', 'Teams', 'Sourcing', 'Calendar', 'Meet', 'Bulk Campaign'].includes(tab)) return 'Workspace';
    if (['Analysis', 'Template Analytics', 'Reports', 'Export'].includes(tab)) return 'Analytics';
    if (['Knowledge Base'].includes(tab)) return 'Intelligence';
    if (['SettingsProfile', 'SettingsDepartments', 'SettingsEmail', 'SettingsAI', 'SettingsIntegrations', 'SettingsAppearance', 'SettingsSecurity'].includes(tab)) return 'Settings';
    if (['Email Automation', 'Email Body', 'Roster Studio', 'Sent', 'Schedule', 'Files'].includes(tab)) return 'Inbox';
    return 'Home'; 
  };
  
  const activePrimaryNav = calculatePrimaryNav(activeTab);

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
      { id: 'Home', label: 'Home', icon: LayoutDashboard },
      { id: 'Command Center', label: 'Command Center', icon: BarChart3 },
      { id: 'Attribution', label: 'Attribution Queue', icon: Scale },
      { id: 'Live Ticker', label: 'Live Ticker', icon: Timer },
      { id: 'Budgets', label: 'Budgets', icon: Wallet },
      { id: 'Alerts', label: 'Alerts', icon: AlertTriangle }
    ],
    Inbox: [
      { id: 'Email Automation', label: 'Email', icon: Mail, count: 46 },
      { id: 'Email Body', label: 'Body', icon: FileText },
      { id: 'Roster Studio', label: 'Roster Studio', icon: Table2 },
      { id: 'divider2', isDivider: true },
      { id: 'Sent', label: 'Sent', icon: Send },
      { id: 'Schedule', label: 'Schedule', icon: Clock },
      { id: 'Files', label: 'Files', icon: FolderOpen }
    ],
    Workspace: [
      { id: 'Projects', label: 'Projects', icon: Briefcase },
      { id: 'Teams', label: 'Teams', icon: Users },
      { id: 'Sourcing', label: 'Sourcing', icon: UserSearch },
      { id: 'Calendar', label: 'Calendar', icon: Calendar },
      { id: 'Meet', label: 'Meet', icon: Video },
      { id: 'Bulk Campaign', label: 'Bulk Campaign', icon: FileSpreadsheet }
    ],
    Templates: [
      { id: 'Student Template', label: 'Student', icon: GraduationCap },
      { id: 'Employee Template', label: 'Employee', icon: Briefcase },
      { id: 'Team Template', label: 'Team', icon: Users },
      { id: 'dividerTemplates1', isDivider: true },
      { id: 'Drafts', label: 'Drafts', icon: File },
      { id: 'Active Links', label: 'Active', icon: Send },
      { id: 'Scheduled Forms', label: 'Schedule', icon: Clock },
      { id: 'Preview Studio', label: 'Preview Studio', icon: Sparkles }
    ],
    Analytics: [
      { id: 'Template Analytics', label: 'Template Analytics', icon: BarChart3 },
      { id: 'Analysis', label: 'Recruiting Analysis', icon: TrendingUp },
      { id: 'Reports', label: 'Reports', icon: FileText },
      { id: 'Export', label: 'Export', icon: Download }
    ],
    Intelligence: [
      { id: 'Knowledge Base', label: 'Knowledge Base', icon: Sparkles }
    ],
    Settings: [
      { id: 'SettingsProfile', label: 'Profile & Account', icon: User },
      { id: 'SettingsDepartments', label: 'Departments', icon: Building2 },
      { id: 'SettingsEmail', label: 'Email Configuration', icon: Mail },
      { id: 'SettingsAI', label: 'AI & GenAI Keys', icon: Shield },
      { id: 'SettingsIntegrations', label: 'Integrations', icon: Plug },
      { id: 'divider_settings', isDivider: true },
      { id: 'SettingsAppearance', label: 'Appearance', icon: Palette },
      { id: 'SettingsSecurity', label: 'Account & Security', icon: Lock }
    ]
  };

  const [datePreset] = useState('This Month');

  // Interactive Modal State
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [modalProject, setModalProject] = useState('');

  // Authentication & API state
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [, setTokens] = useState(null);
  // Starts false: the fullscreen WelcomeLoader may ONLY appear via an
  // explicit login (startLoading(true)). Reloads/restores stay silent.
  const [loading, setLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [authErrorModal, setAuthErrorModal] = useState(null);
  
  // Minimum loading display time (5 seconds) for welcome animation — login only
  const MIN_LOADING_MS = 5000;
  const MAX_LOADING_MS = 15000;
  const LOGIN_ANIM_KEY = 'led_login_anim_done';
  const loadingStartRef = useRef(Date.now());
  const hasShownLoginLoaderRef = useRef(
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem(LOGIN_ANIM_KEY) === '1'
  );
  const expectFreshLoginRef = useRef(false);
  const lastSignedInUidRef = useRef(null);
  const stopTimeoutRef = useRef(null);
  const failsafeRef = useRef(null);

  const clearLoginAnimFlag = useCallback(() => {
    hasShownLoginLoaderRef.current = false;
    try { sessionStorage.removeItem(LOGIN_ANIM_KEY); } catch (_) { /* ignore */ }
  }, []);
  
  const startLoading = useCallback((force = false) => {
    // Only show fullscreen welcome animation on actual login, once per tab session.
    // Persisted in sessionStorage so Vite HMR remounts / tab restores can't retrigger it.
    // Route changes / refetches must not retrigger it.
    if (!force && hasShownLoginLoaderRef.current) return;
    hasShownLoginLoaderRef.current = true;
    try { sessionStorage.setItem(LOGIN_ANIM_KEY, '1'); } catch (_) { /* ignore */ }
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    if (failsafeRef.current) {
      clearTimeout(failsafeRef.current);
      failsafeRef.current = null;
    }
    loadingStartRef.current = Date.now();
    setLoading(true);
    // Failsafe: never hang on fullscreen loader (e.g. fetch hangs, lottie CDN down)
    failsafeRef.current = setTimeout(() => {
      failsafeRef.current = null;
      setLoading(false);
    }, MAX_LOADING_MS);
  }, []);
  
  const stopLoading = useCallback(() => {
    const elapsed = Date.now() - loadingStartRef.current;
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    const finish = () => {
      stopTimeoutRef.current = null;
      if (failsafeRef.current) {
        clearTimeout(failsafeRef.current);
        failsafeRef.current = null;
      }
      setLoading(false);
    };
    if (elapsed < MIN_LOADING_MS) {
      stopTimeoutRef.current = setTimeout(finish, MIN_LOADING_MS - elapsed);
    } else {
      finish();
    }
  }, []);
  
  // Custom interactive data stats
  const [meetings, setMeetings] = useState([]);
  const [alerts, setAlerts] = useState([]);

  // Single cleanup path for sign-out (listener + manual logout share it so
  // no modal, banner, or per-user state leaks to the next session).
  // (Declared before the auth listener effect that uses it.)
  const resetAuthState = useCallback(() => {
    setLoading(false);
    setUser(null);
    setTokens(null);
    setMeetings([]);
    setAlerts([]);
    setSelectedMeeting(null);
    setModalProject('');
    setApiError(null);
    setAuthErrorModal(null);
    localStorage.removeItem('authUser');
  }, []);

  // Auth persistence listener (Supabase)
  useEffect(() => {
    // Check existing session on mount — silent refresh, no fullscreen animation
    getCurrentSession().then(async (session) => {
      if (session) {
        setUser(normalizeUser(session.user));
        setTokens({
          accessToken: session.accessToken
        });
        await fetchMeetings(session.accessToken);
        await fetchAlerts(session.accessToken);
        await mergeProfileAvatar(session.accessToken);
        setLoading(false);
        setAuthReady(true);
      }
      // If no session, don't set authReady yet — wait for onAuthChange
      // to fire (handles OAuth redirect where session isn't available immediately)
    });

    // Subscribe to auth state changes
    const subscription = onAuthChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        clearLoginAnimFlag();
        lastSignedInUidRef.current = null;
        expectFreshLoginRef.current = false;
        if (stopTimeoutRef.current) {
          clearTimeout(stopTimeoutRef.current);
          stopTimeoutRef.current = null;
        }
        resetAuthState();
        setAuthReady(true);
        return;
      }

      // Supabase re-emits SIGNED_IN on tab/window focus when it recovers the
      // stored session — that is NOT a fresh login. Only animate when:
      // (a) explicit login gesture set expectFreshLoginRef, or
      // (b) OAuth redirect just landed (URL hash has tokens), or
      // (c) a DIFFERENT user signed in.
      if (event === 'SIGNED_IN' && session?.user) {
        const uid = session.user.id || session.user.email;
        const isOAuthRedirect = typeof window !== 'undefined' &&
          (window.location.hash.includes('access_token') || window.location.hash.includes('code='));
        const isFresh = expectFreshLoginRef.current || isOAuthRedirect ||
          lastSignedInUidRef.current === null || lastSignedInUidRef.current !== uid;
        expectFreshLoginRef.current = false;
        lastSignedInUidRef.current = uid;
        // Clean OAuth hash so a later tab switch can't look like a fresh redirect
        if (isOAuthRedirect && typeof window !== 'undefined' && window.history?.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        }
        setUser(normalizeUser(session.user));
        setTokens({
          accessToken: session.access_token
        });
        if (isFresh) {
          startLoading(true);
          await fetchMeetings(session.access_token);
          await fetchAlerts(session.access_token);
          await mergeProfileAvatar(session.access_token);
          stopLoading();
        } else {
          await fetchMeetings(session.access_token);
          await fetchAlerts(session.access_token);
          await mergeProfileAvatar(session.access_token);
          setLoading(false);
        }
        setAuthReady(true);
        return;
      }

      // For TOKEN_REFRESHED: silently update tokens without loading animation
      if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(normalizeUser(session.user));
        setTokens({
          accessToken: session.access_token
        });
        setAuthReady(true);
        return;
      }

      // For INITIAL_SESSION and other events with no session
      if (!session) {
        setLoading(false);
        const localUser = localStorage.getItem('authUser');
        if (localUser && localUser.includes("Demo Mode")) {
          try {
            setUser(JSON.parse(localUser));
          } catch {
            localStorage.removeItem('authUser');
          }
        }
        setAuthReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- AUTHENTICATION & SYNC HANDLERS ---
  // NOTE: email/password login lives in supabaseAuth.loginWithEmail but has
  // no UI wired (LoginDashboard is Google/GitHub only), so no handler here.
  const handleLogin = async () => {
    expectFreshLoginRef.current = true;
    startLoading(true);
    setApiError(null);
    setAuthErrorModal(null);
    try {
      // Supabase OAuth redirects — this call returns after redirect
      // The actual session is picked up by onAuthChange listener
      await loginWithGoogleAndCalendar();
      // After redirect, session will be set by the auth state change listener
      return true;
    } catch (err) {
      console.error("Login Error:", err);
      if (err.message?.includes('popup') || err.message?.includes('cancelled')) {
        return false;
      } else if (err.message?.includes('provider') || err.message?.includes('not enabled')) {
        setAuthErrorModal({
          type: 'operation-not-allowed',
          message: 'Google Sign-In is not enabled in your Supabase project.',
          detail: err.message
        });
      } else {
        setApiError("Authentication failed: " + err.message);
      }
      return false;
    } finally {
      stopLoading();
    }
  };

  const handleGitHubLogin = async () => {
    expectFreshLoginRef.current = true;
    startLoading(true);
    setApiError(null);
    setAuthErrorModal(null);
    try {
      await loginWithGitHub();
      return true;
    } catch (err) {
      console.error("GitHub Login Error:", err);
      if (err.message?.includes('popup') || err.message?.includes('cancelled')) {
        return false;
      } else if (err.message?.includes('provider') || err.message?.includes('not enabled')) {
        setAuthErrorModal({
          type: 'operation-not-allowed',
          message: 'GitHub Sign-In is not enabled in your Supabase project.',
          detail: err.message
        });
      } else {
        setApiError("Authentication failed: " + err.message);
      }
      return false;
    } finally {
      stopLoading();
    }
  };

  // Merge Supabase profiles.avatar_url (Cloudinary) into session user.
  // Auth metadata alone never carries the uploaded avatar, so without this
  // the header falls back to dicebear after every refresh.
  const mergeProfileAvatar = useCallback(async (accessToken) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      if (data && data.avatar_url) {
        setUser((prev) => (prev ? { ...prev, photoURL: data.avatar_url } : prev));
      }
    } catch (_) { /* avatar is optional — never break auth */ }
  }, []);

  const handleAvatarChange = useCallback((url) => {
    setUser((prev) => (prev ? { ...prev, photoURL: url || null } : prev));
  }, []);

  const enterDemoMode = () => {
    const demoUser = {
      displayName: "Sarah Jenkins (Demo Mode)",
      photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80",
      email: "demo@ledgerai.co"
    };
    setUser(demoUser);
    setTokens({
      accessToken: "demo-access-token"
    });
    localStorage.setItem('authUser', JSON.stringify(demoUser));
    setMeetings([]);
    setAlerts([]);
    setAuthErrorModal(null);
  };

  const handleLogout = async () => {
    try { await supabaseSignOut(); } catch (e) { console.warn('Supabase signOut error:', e); }
    clearLoginAnimFlag();
    resetAuthState();
    navigate('/');
  };

  const isDemoToken = (t) => t === 'demo-access-token';

  const fetchMeetings = async (accessToken) => {
    if (isDemoToken(accessToken)) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/meetings`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      // Dead session (expired/revoked token): don't linger logged-in on
      // empty data — sign out so the login screen explains itself.
      if (response.status === 401) {
        handleLogout();
        return;
      }
      if (response.ok) {
        const data = await response.json();
        if (data.meetings && data.meetings.length > 0) {
          const mapped = data.meetings.map((m, idx) => ({
            id: m.id || idx,
            start_time: m.start_time || null,
            title: m.title,
            duration: m.duration_minutes ? `${Math.floor(m.duration_minutes / 60)}h ${m.duration_minutes % 60}m` : '1h 0m',
            attendeeCount: Array.isArray(m.attendees) ? m.attendees.length : 0,
            cost: m.cost || 0,
            project: m.ai_project || 'Internal Operations',
            confidence: m.ai_confidence || 0,
            status: m.requires_human_review ? 'needs_review' : 'approved',
            time: m.start_time ? new Date(m.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'All-day'
          }));
          setMeetings(mapped);
        }
      }
    } catch {
      console.warn('Failed to fetch meetings from Supabase, using mock data.');
    }
  };

  const fetchAlerts = async (accessToken) => {
    if (isDemoToken(accessToken)) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/alerts`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (response.status === 401) {
        handleLogout();
        return;
      }
      if (response.ok) {
        const data = await response.json();
        if (data.alerts && data.alerts.length > 0) {
          const mapped = data.alerts.map((a) => ({
            id: a.id,
            type: a.type,
            title: a.title,
            desc: a.description,
            resolved: a.resolved
          }));
          setAlerts(mapped);
        }
      }
    } catch {
      console.warn('Failed to fetch alerts from Supabase, using mock data.');
    }
  };

  // --- DYNAMIC DATA PRESETS BASED ON DATE ---
  const dynamicData = useMemo(() => {
    // Calculate stats directly from our state meetings.
    // accuracy is null (rendered as "—") when there are no meetings — never
    // a fake placeholder. costOverTime buckets real meeting costs by date.
    const totalCost = Math.round(meetings.reduce((acc, m) => acc + m.cost, 0));
    const accuracy = meetings.length > 0
      ? Math.round(meetings.reduce((acc, m) => acc + m.confidence, 0) / meetings.length)
      : null;
    const anomalies = meetings.filter(m => m.status === 'needs_review' || m.confidence < 60).length;

    // Parse unattributed hours (unassigned or operations with low confidence)
    const unattributedMinutes = meetings
      .filter(m => m.project === 'Unassigned' || m.project === 'Internal Operations')
      .reduce((acc, m) => {
        // parse duration like "2h 30m" or "45m"
        const dur = m.duration || '';
        const hoursMatch = dur.match(/(\d+)h/);
        const minsMatch = dur.match(/(\d+)m/);
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

    // Real trend: bucket meeting costs by start_time. Meetings without a
    // parseable date are skipped; no data at all yields an empty array so
    // charts render their empty state instead of a fabricated curve.
    const dated = meetings
      .map(m => ({ cost: Number(m.cost) || 0, t: m.start_time ? new Date(m.start_time).getTime() : NaN }))
      .filter(d => !Number.isNaN(d.t));
    const dayLabel = (t) => new Date(t).toLocaleDateString('en-US', { weekday: 'short' });
    let costOverTime = [];
    if (dated.length > 0) {
      if (datePreset === 'Last 7 Days') {
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          d.setDate(d.getDate() - (6 - i));
          return d.getTime();
        });
        costOverTime = days.map(dayStart => ({
          date: dayLabel(dayStart),
          cost: Math.round(dated.filter(d => d.t >= dayStart && d.t < dayStart + 86400000).reduce((a, d) => a + d.cost, 0)),
        }));
      } else if (datePreset === 'Last 30 Days') {
        const now = Date.now();
        costOverTime = [0, 1, 2, 3].map(w => {
          const from = now - (4 - w) * 7 * 86400000;
          const to = from + 7 * 86400000;
          return {
            date: `Wk ${w + 1}`,
            cost: Math.round(dated.filter(d => d.t >= from && d.t < to).reduce((a, d) => a + d.cost, 0)),
          };
        });
      } else {
        const nowD = new Date();
        const monthStart = new Date(nowD.getFullYear(), nowD.getMonth(), 1).getTime();
        const monthEnd = new Date(nowD.getFullYear(), nowD.getMonth() + 1, 0, 23, 59, 59).getTime();
        const inMonth = dated.filter(d => d.t >= monthStart && d.t <= monthEnd);
        costOverTime = [0, 1, 2, 3, 4].map(w => {
          const from = monthStart + w * 7 * 86400000;
          const to = Math.min(from + 7 * 86400000 - 1, monthEnd);
          if (from > monthEnd) return null;
          return {
            date: `Wk ${w + 1}`,
            cost: Math.round(inMonth.filter(d => d.t >= from && d.t <= to).reduce((a, d) => a + d.cost, 0)),
          };
        }).filter(Boolean);
      }
    }

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

  // --- ACTIONS (persisted to the backend, then mirrored locally) ---
  const persistAttribution = async (meetingId, project, reason) => {
    try {
      const token = await getAuthToken();
      if (!token || isDemoToken(token)) return false;
      const res = await fetch(`${API_BASE_URL}/api/meetings/${meetingId}/attribution`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ aiProject: project, overrideReason: reason || null }),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const markMeetingApproved = (id, project) => {
    setMeetings(prev =>
      prev.map(m =>
        m.id === id
          ? { ...m, ...(project ? { project } : {}), status: 'approved', confidence: 100 }
          : m
      )
    );
  };

  const handleResolveAlert = async (id) => {
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, resolved: true } : a)));
    try {
      const token = await getAuthToken();
      if (!token || isDemoToken(token)) return;
      await fetch(`${API_BASE_URL}/api/alerts/${id}/resolve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* optimistic update already applied */ }
  };

  const saveEditModal = () => {
    if (selectedMeeting) {
      const id = selectedMeeting.id;
      markMeetingApproved(id, modalProject);
      persistAttribution(id, modalProject, 'manual reattribution');
      setSelectedMeeting(null);
    }
  };

  const [defaultRate, setDefaultRate] = useState(75);
  const [confidenceThreshold, setConfidenceThreshold] = useState(60);

  const handleUpdateMeetingProject = (meetingId, project) => {
    markMeetingApproved(meetingId, project);
    persistAttribution(meetingId, project, 'updated from projects view');
  };

  const handleAddMeeting = (newMeeting) => {
    setMeetings(prev => [newMeeting, ...prev]);
  };

  const handleUpdateSettings = (settings) => {
    if (settings.defaultRate !== undefined) setDefaultRate(settings.defaultRate);
    if (settings.confidenceThreshold !== undefined) setConfidenceThreshold(settings.confidenceThreshold);
  };

  const handleResetData = () => {
    setMeetings([]);
    setAlerts([]);
  };

  const handleToggleDemo = () => {
    if (user && user.displayName.includes("Demo Mode")) {
      setUser(null);
      setTokens(null);
    } else {
      enterDemoMode();
    }
  };

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
            src={user?.photoURL || "https://api.dicebear.com/7.x/initials/svg?seed=" + encodeURIComponent(user?.displayName || user?.email || "U")} 
            alt="Profile" 
            className="mini-avatar"
            title={`${user?.displayName || user?.email || "User"}`}
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
                  const firstSubItemWithPath = SECONDARY_NAVS[nav.id].find(sub => !sub.isDivider && !sub.isHeader && TAB_PATH_MAP[sub.id]);
                  if (firstSubItemWithPath) {
                    navigate(TAB_PATH_MAP[firstSubItemWithPath.id]);
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
          {activeTab === 'Home' ? (
            <DashboardHome
              user={user}
              meetings={meetings}
              dynamicData={dynamicData}
              projectSpendsSum={projectSpendsSum}
              alertsCount={activeAlertsCount}
              onNavigate={handleNavClick}
            />
          ) : activeTab === 'Command Center' ? (
            <OverviewDashboard
              dynamicData={dynamicData}
              projectSpendsSum={projectSpendsSum}
              meetings={meetings}
              onNavigate={handleNavClick}
            />
          ) : activeTab === 'Knowledge Base' ? (
            <KnowledgeBase />
          ) : activeTab === 'Student Template' ? (
            <StudentTemplateBuilder />
          ) : activeTab === 'Employee Template' ? (
            <EmployeeTemplateBuilder />
          ) : activeTab === 'Team Template' ? (
            <TeamTemplateBuilder />
          ) : activeTab === 'Email Body' ? (
            <EmailBodyEditor />
          ) : activeTab === 'Drafts' ? (
            <DraftsView />
          ) : activeTab === 'Active Links' ? (
            <ActiveLinksView />
          ) : activeTab === 'Scheduled Forms' ? (
            <ScheduledFormsView />
          ) : activeTab === 'Preview Studio' ? (
            <PreviewStudio />
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
          ) : activeTab === 'Bulk Campaign' ? (
            <BulkCampaignView />
          ) : activeTab === 'Roster Studio' ? (
            <RosterStudioView />
          ) : activeTab === 'Files' ? (
            <FilesView />
          ) : activeTab === 'Meet' ? (
            <MeetView meetings={meetings} onNavigate={handleNavClick} />
          ) : activeTab === 'Export' ? (
            <ExportView meetings={meetings} />
          ) : activeTab === 'Email Automation' ? (
            <EmailAutomationView />
          ) : activeTab === 'Sent' ? (
            <SentView />
          ) : activeTab === 'Schedule' ? (
            <ScheduleView />
          ) : activeTab === 'Template Analytics' ? (
            <AnalyticsPage user={user} />
          ) : activeTab === 'Analysis' ? (
            <AnalysisView meetings={meetings} />
          ) : activeTab === 'Alerts' ? (
            <AlertsView alerts={alerts} onResolveAlert={handleResolveAlert} />
          ) : activeTab === 'Attribution' ? (
            <AttributionQueue />
          ) : activeTab === 'Live Ticker' ? (
            <LiveTicker />
          ) : activeTab === 'Budgets' ? (
            <Budgets />
          ) : activeTab === 'SettingsProfile' ? (
            <SettingsView section="profile" user={user} defaultRate={defaultRate} confidenceThreshold={confidenceThreshold} onUpdateSettings={handleUpdateSettings} onResetData={handleResetData} onToggleDemo={handleToggleDemo} demoActive={!!(user && user.displayName && user.displayName.includes("Demo Mode"))} onLogout={handleLogout} onAvatarChange={handleAvatarChange} />
          ) : activeTab === 'SettingsDepartments' ? (
            <SettingsView section="departments" user={user} defaultRate={defaultRate} confidenceThreshold={confidenceThreshold} onUpdateSettings={handleUpdateSettings} onResetData={handleResetData} onToggleDemo={handleToggleDemo} demoActive={!!(user && user.displayName && user.displayName.includes("Demo Mode"))} onLogout={handleLogout} />
          ) : activeTab === 'SettingsEmail' ? (
            <SettingsView section="email" user={user} defaultRate={defaultRate} confidenceThreshold={confidenceThreshold} onUpdateSettings={handleUpdateSettings} onResetData={handleResetData} onToggleDemo={handleToggleDemo} demoActive={!!(user && user.displayName && user.displayName.includes("Demo Mode"))} onLogout={handleLogout} />
          ) : activeTab === 'SettingsAI' ? (
            <SettingsView section="ai" user={user} defaultRate={defaultRate} confidenceThreshold={confidenceThreshold} onUpdateSettings={handleUpdateSettings} onResetData={handleResetData} onToggleDemo={handleToggleDemo} demoActive={!!(user && user.displayName && user.displayName.includes("Demo Mode"))} onLogout={handleLogout} />
          ) : activeTab === 'SettingsIntegrations' ? (
            <SettingsView section="integrations" user={user} defaultRate={defaultRate} confidenceThreshold={confidenceThreshold} onUpdateSettings={handleUpdateSettings} onResetData={handleResetData} onToggleDemo={handleToggleDemo} demoActive={!!(user && user.displayName && user.displayName.includes("Demo Mode"))} onLogout={handleLogout} />
          ) : activeTab === 'SettingsAppearance' ? (
            <SettingsView section="appearance" user={user} defaultRate={defaultRate} confidenceThreshold={confidenceThreshold} onUpdateSettings={handleUpdateSettings} onResetData={handleResetData} onToggleDemo={handleToggleDemo} demoActive={!!(user && user.displayName && user.displayName.includes("Demo Mode"))} onLogout={handleLogout} />
          ) : activeTab === 'SettingsSecurity' ? (
            <SettingsView section="security" user={user} defaultRate={defaultRate} confidenceThreshold={confidenceThreshold} onUpdateSettings={handleUpdateSettings} onResetData={handleResetData} onToggleDemo={handleToggleDemo} demoActive={!!(user && user.displayName && user.displayName.includes("Demo Mode"))} onLogout={handleLogout} />
          ) : (
            // Simple mockup tabs for navigation
            <div style={{ textAlign: 'center', padding: '80px 20px' }} className="glass-panel">
              <Sparkles size={48} style={{ color: 'var(--color-cyan)', marginBottom: '16px', filter: 'drop-shadow(0 0 8px var(--color-cyan-glow))' }} />
              <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '8px' }}>{activeTab} Workspace</h2>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 24px auto', fontSize: '14px' }}>
                This dashboard section is mock-configured. Click back to "Home" in the sidebar to view live analytics.
              </p>
              <button
                className="table-action-btn"
                style={{ padding: '8px 20px', fontSize: '13px' }}
                onClick={() => handleNavClick('Home')}
              >
                Return to Home
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
                Supabase returned an <code>auth/operation-not-allowed</code> error.
              </p>
              <p style={{ color: 'var(--text-secondary)' }}>
                This means Google Sign-In is not enabled as a sign-in provider in your Supabase project.
              </p>

              <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.05)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(244, 63, 94, 0.15)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>How to resolve this in Supabase:</span>
                <ol style={{ margin: '0', paddingLeft: '20px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li>Go to your <strong>Supabase Dashboard</strong>.</li>
                  <li>Click on <strong>Authentication</strong> in the left sidebar.</li>
                  <li>Navigate to the <strong>Providers</strong> tab.</li>
                  <li>Find <strong>Google</strong> and toggle it to <strong>Enable</strong>.</li>
                </ol>
              </div>

              <p style={{ color: 'var(--text-muted)' }}>
                To proceed without configuring Supabase right now, you can enter **Sandbox Demo Mode** to explore the complete dashboard and Recharts integrations.
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
      {showIntro && <SiteIntro onDone={() => setShowIntro(false)} />}
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
            user && authReady ? <Navigate to="/dashboard" replace /> :
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
            <Route path="/login" element={
              user && authReady ? <Navigate to="/dashboard" replace /> :
              <LoginDashboard 
                onGoogleLogin={async () => {
                  const success = await handleLogin();
                  if (success) {
                    navigate('/dashboard');
                  }
                }} 
                loading={loading} 
              />
            } />
            <Route path="/auth/github" element={
              <GitHubAuthRedirect 
                onCompleteLogin={async () => {
                  const success = await handleGitHubLogin();
                  if (success) {
                    navigate('/dashboard');
                  }
                }} 
                loading={loading} 
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
              {loading && !showIntro && !apiError ? (
                <WelcomeLoader subtitle="Syncing your calendar and workspace data..." />
              ) : (
                dashboardUI
              )}
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}










