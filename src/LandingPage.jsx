import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Cpu,
  Database,
  ArrowRight,
  TrendingUp,
  Shield,
  Eye,
  EyeOff,
  MessageSquare,
  Mail,
  CheckCircle,
  HelpCircle,
  Clock,
  DollarSign,
  AlertTriangle,
  Lock,
  RefreshCw,
  Plus
} from 'lucide-react';
import LiveProductTour from './LiveProductTour';
import './LandingPage.css';

// Custom Slack SVG Icon because lucide-react Slack icon export might not exist in this version
const SlackIcon = ({ size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52-2.523 2.528 2.528 0 0 1-2.522-2.523 2.528 2.528 0 0 1 2.522-2.52h2.52v2.52zm1.261 0a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.042a2.528 2.528 0 0 1-2.522 2.52H8.824a2.528 2.528 0 0 1-2.52-2.52v-5.042zM8.824 5.043a2.528 2.528 0 0 1-2.52-2.522 2.528 2.528 0 0 1 2.52-2.52 2.528 2.528 0 0 1 2.522 2.52v2.522h-2.522zm0 1.261a2.528 2.528 0 0 1 2.522 2.52v5.043a2.528 2.528 0 0 1-2.522 2.52H3.781a2.528 2.528 0 0 1-2.52-2.52V8.824a2.528 2.528 0 0 1 2.52-2.52h5.043zm10.134 3.76a2.528 2.528 0 0 1 2.522-2.52 2.528 2.528 0 0 1 2.52 2.52 2.528 2.528 0 0 1-2.52 2.522h-2.522v-2.522zm-1.262 0a2.528 2.528 0 0 1-2.52 2.522H10.13a2.528 2.528 0 0 1-2.52-2.522V5.043a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.52 2.52v5.043zm-3.76 10.134a2.528 2.528 0 0 1 2.52 2.522 2.528 2.528 0 0 1-2.52 2.52 2.528 2.528 0 0 1-2.522-2.52v-2.522h2.522zm0-1.262a2.528 2.528 0 0 1-2.522-2.52v-5.043a2.528 2.528 0 0 1 2.522-2.52h5.043a2.528 2.528 0 0 1 2.52 2.52v5.043h-5.043z" />
  </svg>
);

export default function LandingPage({ onStartDashboard }) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [isMasked, setIsMasked] = useState(true);
  
  // Triage simulator state
  const [triageItems, setTriageItems] = useState([
    { id: 1, title: 'HR Alignment & Q3 Hiring Sync', duration: '1h 15m', confidence: 42, budget: 1450, assigned: false },
    { id: 2, title: 'Engineering Phoenix Standup', duration: '45m', confidence: 78, budget: 920, assigned: false },
    { id: 3, title: 'Ad-hoc Client ABC Call', duration: '1h 00m', confidence: 64, budget: 1100, assigned: false }
  ]);
  const [monitoredHours, setMonitoredHours] = useState(1420);
  const [avgMeetingCost, setAvgMeetingCost] = useState(382);
  const [projectAllocation, setProjectAllocation] = useState({
    phoenix: 45,
    clientABC: 35,
    unassigned: 20
  });

  // Track scroll position for 3D tilted preview card transition and right column parallax
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
      
      const threshold = 350; // Distance in pixels to flatten card completely
      const progress = Math.min(currentScrollY / threshold, 1);
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Quick triage assign action
  const handleAssignItem = (id, budgetAmount) => {
    setTriageItems(prev => prev.map(item => item.id === id ? { ...item, assigned: true } : item));
    
    // Animate statistics in organization overview when an event is assigned
    setMonitoredHours(prev => prev + 2);
    setAvgMeetingCost(prev => Math.round(prev * 0.98));
    setProjectAllocation(prev => {
      const addedPct = 5;
      return {
        ...prev,
        phoenix: prev.phoenix + addedPct,
        unassigned: Math.max(0, prev.unassigned - addedPct)
      };
    });
  };

  // 3D Tilted Card styling math
  const skewX = -12 * (1 - scrollProgress);
  const rotateX = 10 * (1 - scrollProgress);
  const scale = 0.9 + (0.1 * scrollProgress);
  const tiltedStyle = {
    transform: `perspective(1200px) rotateX(${rotateX}deg) skewX(${skewX}deg) scale(${scale})`,
    transformOrigin: 'bottom center',
    transition: 'transform 0.15s ease-out'
  };

  return (
    <div className="lp-wrapper">
      {/* Aurora Ambient Glow Overlays */}
      <div className="lp-aurora-container">
        <div className="lp-glow-1"></div>
        <div className="lp-glow-2"></div>
        <div className="lp-glow-3"></div>
      </div>

      {/* Navigation Navbar */}
      <header className="lp-navbar">
        <div className="lp-logo" onClick={() => onStartDashboard()}>
          <img src="/ledgerai.png" alt="LedgerAI Logo" style={{ height: '32px', width: '32px', borderRadius: '8px', objectFit: 'contain' }} />
          <span>LedgerAI</span>
        </div>
        <nav>
          <ul className="lp-nav-links">
            <li><a href="#home" className="lp-nav-link">Home</a></li>
            <li><a href="#product" className="lp-nav-link">Product</a></li>
            <li><a href="#pricing" className="lp-nav-link">Pricing</a></li>
            <li><a href="#innovation" className="lp-nav-link">Innovation</a></li>
          </ul>
        </nav>
        <div className="lp-nav-right">
          <button className="lp-signin-btn" onClick={() => onStartDashboard()}>Sign In</button>
          <button className="lp-contact-btn" onClick={() => onStartDashboard()}>Get Touch</button>
        </div>
      </header>

      {/* Split Hero & Feature Grid */}
      <main className="lp-grid">
        
        {/* Left Column: Hero & Tilted Preview */}
        <section className="lp-hero-col">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h1 className="lp-hero-title">
              THE LEDGER A.I. PLATFORM: <br />
              <span style={{ color: 'var(--lp-violet)', textShadow: '0 0 30px rgba(139, 92, 246, 0.2)' }}>
                NEXT-GEN HR COST
              </span> <br />
              INTELLIGENCE
            </h1>
            <p className="lp-hero-desc">
              Automatically attribute 100% of calendar events to project costs with AI-powered precision. 
              Monitor resource burn in real-time, eliminate untracked budget leakages, and map 
              configurable salary bands to gain a true picture of human capital utilization.
            </p>
            <div className="lp-hero-ctas">
              <button className="lp-btn-primary" onClick={() => onStartDashboard()}>Get Started</button>
              <button className="lp-btn-secondary" onClick={() => onStartDashboard()}>Book a Demo</button>
            </div>
          </div>

          {/* Tilted Preview Card Container */}
          <div className="lp-preview-container">
            <div className="lp-preview-card" style={tiltedStyle}>
              
              {/* Dashboard Preview Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', fontFamily: 'Outfit, sans-serif' }}>Organization Overview</h3>
                  <p style={{ fontSize: '10px', color: 'var(--lp-text-secondary)' }}>Live attribution cost & hours metrics</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span className="lp-tag lp-tag-active">● Syncing Active</span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="lp-preview-grid">
                <div className="lp-preview-box">
                  <div className="lp-preview-metric-title">Total Monitored Hours</div>
                  <div className="lp-preview-metric-val">
                    {monitoredHours.toLocaleString()}h
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '600' }}>+14.2%</span>
                  </div>
                  <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '12px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '84%', background: 'var(--lp-violet)', boxShadow: '0 0 8px rgba(139, 92, 246, 0.8)' }}></div>
                  </div>
                </div>

                <div className="lp-preview-box">
                  <div className="lp-preview-metric-title">Average Meeting Cost</div>
                  <div className="lp-preview-metric-val">
                    ${avgMeetingCost}/hr
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '600' }}>-3.8%</span>
                  </div>
                  <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '12px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '62%', background: 'var(--lp-indigo)' }}></div>
                  </div>
                </div>
              </div>

              {/* Lower Section: Chart & Table */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '16px', marginTop: '16px' }}>
                {/* SVG Donut Chart */}
                <div className="lp-preview-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '140px' }}>
                  <div className="lp-preview-metric-title" style={{ alignSelf: 'flex-start', marginBottom: '8px' }}>Project Allocation</div>
                  <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                    <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="12" />
                      {/* Phoenix Segment */}
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--lp-violet)" strokeWidth="12" 
                        strokeDasharray="251.2" 
                        strokeDashoffset={251.2 - (251.2 * projectAllocation.phoenix) / 100}
                        style={{ filter: 'drop-shadow(0 0 3px rgba(139, 92, 246, 0.5))' }}
                      />
                      {/* Client ABC Segment */}
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--lp-indigo)" strokeWidth="12" 
                        strokeDasharray="251.2" 
                        strokeDashoffset={251.2 - (251.2 * projectAllocation.clientABC) / 100}
                        transform={`rotate(${(projectAllocation.phoenix / 100) * 360} 50 50)`}
                      />
                    </svg>
                    <div style={{ position: 'absolute', top: '0', left: '0', right: '0', bottom: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyCenter: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '700' }}>
                      <span>AI Active</span>
                      <span style={{ color: 'var(--lp-violet)', fontSize: '10px' }}>92%</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', fontSize: '9px', color: 'var(--lp-text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--lp-violet)' }}></span> Phoenix
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--lp-indigo)' }}></span> Client ABC
                    </span>
                  </div>
                </div>

                {/* Micro Meeting Log */}
                <div className="lp-preview-box" style={{ overflowX: 'auto' }}>
                  <div className="lp-preview-metric-title">Live Meeting Log</div>
                  <table className="lp-preview-table">
                    <thead>
                      <tr>
                        <th>Event</th>
                        <th>Attribution</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: '500' }}>Q3 Strategy Sync</td>
                        <td><span className="lp-tag lp-tag-active">Phoenix</span></td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: '500' }}>Client Alignment</td>
                        <td><span className="lp-tag lp-tag-active">Client ABC</span></td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: '500' }}>Hiring Review</td>
                        <td><span className="lp-tag lp-tag-review">Pending</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Right Column: Workflows, Title, Bento Grid */}
        <section className="lp-features-col">
          
          {/* Automated Tracking Pipeline Widget */}
          <div className="lp-pipeline-card">
            <h3 className="lp-pipeline-title">It takes less than a minute to setup automated tracking.</h3>
            
            <div className="lp-pipeline-flow">
              <div className="lp-pipeline-step">
                <Calendar className="lp-pipeline-icon" size={24} />
                <span>Calendar Integration<br /><span style={{ fontSize: '9px', color: 'var(--lp-text-muted)' }}>(Google/Outlook)</span></span>
              </div>
              
              <div className="lp-pipeline-arrow">
                <ArrowRight size={18} />
              </div>
              
              <div className="lp-pipeline-step">
                <Cpu className="lp-pipeline-icon" size={24} />
                <span>AI Extraction Engine<br /><span style={{ fontSize: '9px', color: 'var(--lp-text-muted)' }}>(Natural Language)</span></span>
              </div>
              
              <div className="lp-pipeline-arrow">
                <ArrowRight size={18} />
              </div>
              
              <div className="lp-pipeline-step">
                <Database className="lp-pipeline-icon" size={24} />
                <span>Project Cost Log<br /><span style={{ fontSize: '9px', color: 'var(--lp-text-muted)' }}>(100% Attributed)</span></span>
              </div>
            </div>
          </div>

          {/* Section Heading */}
          <div className="lp-section-header">
            <div className="lp-section-subtitle">Core Architecture</div>
            <h2 className="lp-section-title">Power Features To Maximize Team ROI</h2>
          </div>

          {/* Bento Grid Matrix */}
          <div className="lp-bento-grid">
            
            {/* Bento Card 1: Track Burn Rate */}
            <div className="lp-bento-card">
              <div>
                <h4 className="lp-bento-card-title">
                  <TrendingUp size={16} style={{ color: 'var(--lp-violet)' }} />
                  Track Burn Rate
                </h4>
                <p className="lp-bento-card-desc">
                  Monitor actual project financial expenditure in real-time versus pre-allocated project caps.
                </p>
              </div>

              {/* Inline SVG Chart */}
              <div className="lp-bento-visual" style={{ minHeight: '110px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '9px', color: 'var(--lp-text-muted)', marginBottom: '4px' }}>
                  <span>Spend Cap: $40,000</span>
                  <span style={{ color: '#ef4444' }}>Phoenix: Overrun Risk</span>
                </div>
                <div style={{ width: '100%', height: '70px', position: 'relative' }}>
                  <svg viewBox="0 0 100 50" style={{ width: '100%', height: '100%' }}>
                    {/* Budget Line */}
                    <line x1="0" y1="15" x2="100" y2="15" stroke="rgba(239, 68, 68, 0.4)" strokeWidth="1" strokeDasharray="3,3" />
                    
                    {/* Gradient Area under line */}
                    <defs>
                      <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--lp-violet)" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="var(--lp-violet)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,45 L15,40 L35,28 L55,32 L75,18 L95,12 L100,12 L100,50 L0,50 Z" fill="url(#chartGlow)" />
                    
                    {/* Expenditure Line */}
                    <path d="M0,45 L15,40 L35,28 L55,32 L75,18 L95,12" fill="none" stroke="var(--lp-violet)" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 4px rgba(139, 92, 246, 0.6))' }} />
                    
                    {/* Current Node Point */}
                    <circle cx="95" cy="12" r="3" fill="#fff" />
                    <circle cx="95" cy="12" r="5" fill="none" stroke="var(--lp-violet)" strokeWidth="1" />
                  </svg>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '8px', color: 'var(--lp-text-muted)' }}>
                  <span>Week 1</span>
                  <span>Week 2</span>
                  <span>Week 3</span>
                  <span>Week 4</span>
                </div>
              </div>
            </div>

            {/* Bento Card 2: Eliminate Manual Timesheets */}
            <div className="lp-bento-card">
              <div>
                <h4 className="lp-bento-card-title">
                  <Cpu size={16} style={{ color: 'var(--lp-violet)' }} />
                  Eliminate Timesheets
                </h4>
                <p className="lp-bento-card-desc">
                  Low-confidence event matches (&lt;85%) are safely flagged for a rapid single-click review.
                </p>
              </div>

              {/* Triage Interactive Visual */}
              <div className="lp-bento-visual" style={{ minHeight: '110px', background: 'rgba(0,0,0,0.3)', padding: '10px' }}>
                <div className="triage-list">
                  {triageItems.map(item => (
                    <div key={item.id} className="triage-item" style={{ opacity: item.assigned ? 0.35 : 1, transition: 'all 0.3s ease' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: '600', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </span>
                        <span style={{ color: 'var(--lp-text-muted)', fontSize: '9px' }}>Conf: <span className="triage-tag-low">{item.confidence}%</span></span>
                      </div>
                      
                      {item.assigned ? (
                        <span style={{ fontSize: '9px', color: '#10b981', fontWeight: '700' }}>✓ Logged</span>
                      ) : (
                        <button 
                          className="triage-btn"
                          onClick={() => handleAssignItem(item.id, item.budget)}
                        >
                          Assign
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bento Card 3: Privacy-First Design */}
            <div className="lp-bento-card">
              <div>
                <h4 className="lp-bento-card-title">
                  <Shield size={16} style={{ color: 'var(--lp-violet)' }} />
                  Privacy-First Design
                </h4>
                <p className="lp-bento-card-desc">
                  Configurable salary bands manage costs while keeping individual payroll completely hidden.
                </p>
              </div>

              {/* Administrative Masking Tool */}
              <div className="lp-bento-visual" style={{ minHeight: '110px', padding: '12px' }}>
                <div className="payroll-tool">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '700', fontSize: '9px', color: 'var(--lp-violet)', textTransform: 'uppercase' }}>Salary Config</span>
                    <button 
                      onClick={() => setIsMasked(!isMasked)} 
                      style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      {isMasked ? <EyeOff size={10} /> : <Eye size={10} />}
                      <span style={{ fontSize: '8px' }}>{isMasked ? 'Masked' : 'Revealed'}</span>
                    </button>
                  </div>

                  <div className="payroll-row">
                    <span>Executive Band</span>
                    {isMasked ? <span className="payroll-val-masked">••••••</span> : <span style={{ color: '#10b981', fontWeight: '600' }}>$185 / hr</span>}
                  </div>
                  <div className="payroll-row">
                    <span>Engineering Band</span>
                    {isMasked ? <span className="payroll-val-masked">••••••</span> : <span style={{ color: '#10b981', fontWeight: '600' }}>$125 / hr</span>}
                  </div>
                  <div className="payroll-row">
                    <span>Sarah Jenkins (VP)</span>
                    <span className="payroll-val-masked" style={{ color: 'var(--lp-text-muted)' }}>HIDDEN</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Card 4: Integrate Everywhere */}
            <div className="lp-bento-card">
              <div>
                <h4 className="lp-bento-card-title">
                  <Lock size={16} style={{ color: 'var(--lp-violet)' }} />
                  Integrate Everywhere
                </h4>
                <p className="lp-bento-card-desc">
                  Seamlessly connect to team workspaces and calendar tools in a single click.
                </p>
              </div>

              {/* Node branching visualization */}
              <div className="lp-bento-visual" style={{ minHeight: '110px' }}>
                <div className="integrations-node-wrapper">
                  {/* Central Node */}
                  <div className="node-center">L</div>
                  
                  {/* Branch Nodes */}
                  <div className="node-branch node-google">
                    <Mail size={12} />
                  </div>
                  <div className="node-branch node-slack">
                    <SlackIcon size={12} />
                  </div>
                  <div className="node-branch node-teams">
                    <MessageSquare size={12} />
                  </div>

                  {/* Connectors */}
                  <div className="node-line"></div>
                  <div className="node-line-v"></div>
                </div>
              </div>
            </div>

          </div>
        </section>

      </main>

      <section className="cz-alt-section cz-alt-gray" style={{ padding: '80px 20px', backgroundColor: '#f9fafb' }}>
        <LiveProductTour />
      </section>

      {/* Footer CTA Section */}
      <footer className="lp-footer">
        <div className="lp-footer-container">
          <h2 className="lp-footer-title">Ready to dive in? Start your journey today.</h2>
          <p className="lp-footer-subtitle">Gain absolute cost intelligence over 100% of calendar event resources.</p>
          <button className="lp-footer-btn" onClick={() => onStartDashboard()}>Get Started Now</button>
          
          <div className="lp-footer-credits">
            © 2026 LedgerAI Inc. Built for HR Cost Intelligence. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
