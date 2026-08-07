import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Users,
  Cloud,
  RefreshCw,
  Mail,
  LineChart,
  Target,
  Globe,
  Play,
  AlertTriangle,
  ChevronDown,
  Database,
  Layers,
  Cpu,
  Zap,
  Snowflake,
  GitBranch,
  Bot,
  ArrowRight,
  TrendingUp,
  Server,
  DollarSign,
  X,
  Clock,
  PieChart,
  Bell,
  User,
  BarChart2
} from 'lucide-react';
import CryptoJS from 'crypto-js';
import './LandingPage.css';
import secureAccessImg from './assets/secure_access.png';
import teamsWorkImg from './assets/teams_work.png';
import InteractiveTour from './InteractiveTour';
import LiveProductTour from './LiveProductTour';
import CollaboratorNetwork from './CollaboratorNetwork';

export default function LandingPage({ onStartDashboard, loading, apiError, onClearError }) {
  const location = useLocation();
  const [scrollHeaderVisible, setScrollHeaderVisible] = useState(true);

  useEffect(() => {
    if (location.pathname === '/security') {
      const element = document.getElementById('security');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 120) {
        setScrollHeaderVisible(false);
      } else {
        setScrollHeaderVisible(true);
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return (
    <div className="lp-wrapper">
      {/* Home Page Top Header Navbar */}
      <header className={`cz-home-header ${scrollHeaderVisible ? 'visible' : 'hidden'}`}>
        <div className="cz-logo" onClick={onStartDashboard} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.webp" alt="Leddger Logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
          Leddger
        </div>
        <div className="cz-nav-right">
          <button className="cz-btn-login" onClick={onStartDashboard} disabled={loading}>Log In</button>
          <button className="cz-btn-tour" onClick={onStartDashboard} disabled={loading}>Sign Up</button>
        </div>
      </header>

      {/* Floating API Authentication Error Banner */}
      {apiError && (
        <div style={{
          backgroundColor: 'rgba(215, 254, 250, 0.12)',
          border: '1px solid rgba(215, 254, 250, 0.25)',
          color: '#D7FEFA',
          padding: '10px 20px',
          fontSize: '12px',
          fontWeight: '600',
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          borderRadius: '20px',
          zIndex: 1000,
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.6)'
        }}>
          <span>{apiError}</span>
          <button 
            onClick={onClearError} 
            style={{ background: 'none', border: 'none', color: '#D7FEFA', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* HERO SECTION */}
      <section id="overview" className="cz-hero" style={{ paddingTop: '100px' }}>
        <div className="cz-hero-left">
          <h1 className="cz-hero-title">
            Your Single Source<br/>
            Of Truth For Secure<br/>
            <span className="cz-fw-highlight">Recruitment</span>
          </h1>
          <p className="cz-hero-desc">
            End-to-end AES encryption. Protect candidate data, set dates, and securely sync with Google Calendar to manage schedules and cross-check your recruitment timelines.
          </p>
        </div>
        
        <div className="cz-hero-right">
          <div className="cz-concentric-rings"></div>
          
          <div className="cz-visual-lockup">
            {/* Chart Card */}
            <div className="cz-chart-card">
              <div className="cz-chart-grid">
                <div className="cz-grid-line"></div>
                <div className="cz-grid-line"></div>
                <div className="cz-grid-line"></div>
                <div className="cz-grid-line"></div>
              </div>
              <div className="cz-bar" style={{ height: '80%' }}></div>
              <div className="cz-bar" style={{ height: '50%' }}></div>
              <div className="cz-bar" style={{ height: '30%' }}></div>
              <div className="cz-bar" style={{ height: '40%' }}></div>
            </div>

            {/* Boxes */}
            <div className="cz-box cz-box-grey cz-pos-top-left">
              <Users size={24} />
            </div>
            
            <div className="cz-box cz-box-grey cz-pos-bottom-left">
              <LineChart size={24} />
            </div>

            <div className="cz-box cz-box-teal cz-pos-r1">
              <Cloud size={24} />
            </div>
            <div className="cz-box cz-box-beige cz-pos-r2">
              <RefreshCw size={24} />
            </div>
            <div className="cz-box cz-box-grey cz-pos-r3">
              <Mail size={24} />
            </div>
            <div className="cz-box cz-box-grey cz-pos-r4">
              <TrendingUp size={24} />
            </div>
            <div className="cz-box cz-box-grey cz-pos-r5">
              <Users size={24} />
            </div>
            <div className="cz-box cz-box-grey cz-pos-r6">
              <Target size={24} />
            </div>

            <div className="cz-box cz-box-grey cz-pos-bottom-globe">
              <Globe size={24} />
            </div>

            <div className="cz-alert-tag">
              <AlertTriangle size={14} /> $10K/Month
            </div>
          </div>
        </div>
      </section>

      {/* PHASE 2: HOW IT WORKS SECTION */}
      <section id="how-it-works" className="cz-hiw-section">
        {/* NAVBAR PLACEHOLDER */}
        <div id="navbar-placeholder" style={{ height: '48px', margin: '0 auto 40px auto' }}></div>

        <div className="cz-hiw-header">
          <h2 className="cz-hiw-title">
            How It <span className="cz-fw-highlight">Works</span>?
          </h2>
          <p className="cz-hiw-subtitle">
            A secure two-way portal connecting Recruiters and Students through local AES encryption.
          </p>
        </div>

        <div className="cz-hiw-grid">
          {/* Col 1 */}
          <div className="cz-hiw-col">
            <div className="cz-hiw-visual-container">
              <div className="cz-3x3-grid">
                <div className="cz-grid-box cz-box-gray"><Database size={24} className="cz-sq-icon" /></div>
                <div className="cz-grid-box cz-box-beige"><Layers size={24} className="cz-sq-icon" /></div>
                <div className="cz-grid-box cz-box-teal"><Cpu size={24} className="cz-sq-icon" /></div>
                <div className="cz-grid-box cz-box-teal"><Zap size={24} className="cz-sq-icon" /></div>
                <div className="cz-grid-box cz-box-beige"><Cloud size={24} className="cz-sq-icon" /></div>
                <div className="cz-grid-box cz-box-orange"><Snowflake size={24} className="cz-sq-icon" /></div>
                <div className="cz-grid-box cz-box-beige"><GitBranch size={24} className="cz-sq-icon" /></div>
                <div className="cz-grid-box cz-box-gray"><Mail size={24} className="cz-sq-icon" /></div>
                <div className="cz-grid-box cz-box-beige"><Bot size={24} className="cz-sq-icon" /></div>
              </div>
            </div>
            <h3 className="cz-hiw-col-title">Generate Unique Codes</h3>
            <p className="cz-hiw-col-desc">
              Recruiters generate a one-time access code. This securely derives the AES encryption key used to protect student data.
            </p>
          </div>

          {/* Col 2 */}
          <div className="cz-hiw-col">
            <div className="cz-hiw-visual-container">
              <div className="cz-wireframe-container cz-wf2">
                <div className="cz-wf-box cz-wf2-r1-left"></div>
                <div className="cz-wf-box cz-wf2-r1-right">
                  <div className="cz-wf-badge"><Bell size={12} /></div>
                </div>
                <div className="cz-wf-box cz-wf2-r2-left">
                  <div className="cz-wf-badge"><Clock size={12} /></div>
                </div>
                <div className="cz-wf-box cz-wf2-r2-right"></div>
                <div className="cz-wf2-r3-all">
                  <div className="cz-wf-box cz-wf2-r3-1"></div>
                  <div className="cz-wf-box cz-wf2-r3-2">
                    <div className="cz-wf-badge"><PieChart size={12} /></div>
                  </div>
                  <div className="cz-wf-box cz-wf2-r3-3"></div>
                </div>
              </div>
            </div>
            <h3 className="cz-hiw-col-title">Secure Application Portal</h3>
            <p className="cz-hiw-col-desc">
              Students enter the unique code to access the secure form. Their project ideas and details are heavily encrypted locally before submission.
            </p>
          </div>

          {/* Col 3 */}
          <div className="cz-hiw-col">
            <div className="cz-hiw-visual-container">
              <div className="cz-wireframe-container cz-wf3">
                <div className="cz-wf-box cz-wf3-r1-left">
                  <div className="cz-wf-badge"><User size={12} /></div>
                </div>
                <div className="cz-wf-box cz-wf3-r1-right"></div>
                <div className="cz-wf-box cz-wf3-r2-left"></div>
                <div className="cz-wf-box cz-wf3-r2-right">
                  <div className="cz-wf-badge"><BarChart2 size={12} /></div>
                </div>
                <div className="cz-wf3-r3-all">
                  <div className="cz-wf-box cz-wf3-r3-1"></div>
                  <div className="cz-wf-box cz-wf3-r3-2"></div>
                  <div className="cz-wf-box cz-wf3-r3-3"></div>
                </div>
              </div>
            </div>
            <h3 className="cz-hiw-col-title">Data Decryption & Analysis</h3>
            <p className="cz-hiw-col-desc">
              Only the recruiter holds the key to decrypt incoming payloads. Integrate with Google Calendar to seamlessly set dates, schedule reminders, and track recruitment cycles.
            </p>
          </div>
        </div>
      </section>

      {/* INTERACTIVE PRODUCT TOUR SECTION */}
      {/* INTERACTIVE PRODUCT TOUR SECTION (Original 4-step) */}
      <section style={{ padding: '0 20px', marginBottom: '80px' }}>
        <InteractiveTour />
      </section>

      {/* LIVE PRODUCT TOUR FRAME (New 2-Page Hub) */}
      <section className="cz-alt-section cz-alt-gray" style={{ padding: '80px 20px' }}>
        <LiveProductTour />
      </section>

      {/* PHASE 4: COMBINED FEATURES SECTION */}
      <section id="security" className="cz-alt-section cz-alt-dark" style={{ padding: '100px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '60px', maxWidth: '1100px', margin: '0 auto' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="cz-alt-text" style={{ margin: 0, padding: 0, width: '100%' }}>
              <h2 className="cz-alt-title" style={{ fontSize: '2.2rem' }}>
                <span className="cz-fw-highlight">Secure</span> Candidate Data
              </h2>
              <p className="cz-alt-desc">
                In today's recruitment landscape, data privacy is paramount. That's why our system employs military-grade AES encryption directly in the browser, ensuring candidate ideas and working procedures are strictly confidential.
              </p>
            </div>
            <img src={secureAccessImg} alt="Secure Your Candidate Data" style={{ width: '100%', height: 'auto', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', objectFit: 'cover' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <img src={teamsWorkImg} alt="Collaborate Across Teams" style={{ width: '100%', height: 'auto', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', objectFit: 'cover' }} />
            <div className="cz-alt-text" style={{ margin: 0, padding: 0, width: '100%' }}>
              <h2 className="cz-alt-title" style={{ fontSize: '2.2rem' }}>
                <span className="cz-fw-highlight">Collaborate</span> Across Teams
              </h2>
              <p className="cz-alt-desc">
                Share recruiter access or connect with multiple students simultaneously. Our platform is built from the ground up to support remote hiring teams and seamless coordination across the globe.
              </p>
            </div>
          </div>

        </div>
      </section>


      

      {/* PHASE 5: THE OPEN-SOURCE COLLABORATOR NETWORK */}
      <CollaboratorNetwork />

    </div>
  );
}
