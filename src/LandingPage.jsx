import { useState } from 'react';
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

export default function LandingPage({ onStartDashboard, loading, apiError, onClearError }) {
  
  return (
    <div className="lp-wrapper">

      {/* Floating API Authentication Error Banner */}
      {apiError && (
        <div style={{
          backgroundColor: 'rgba(244, 63, 94, 0.12)',
          border: '1px solid rgba(244, 63, 94, 0.25)',
          color: '#f43f5e',
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
            style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* NAVBAR */}
      <nav className="cz-navbar">
        <div className="cz-nav-left">
          <div className="cz-logo" onClick={onStartDashboard}>
            LedgerAI
          </div>
          <ul className="cz-nav-links">
            <li><a href="#how-it-works" className="cz-nav-link">How It Works</a></li>
            <li><a href="#demystify" className="cz-nav-link">Demystify Spend</a></li>
            <li><a href="#framework" className="cz-nav-link">Framework</a></li>
            <li><a href="#interactive-demo" className="cz-nav-link" style={{color: '#6bc4c9'}}>Security Workflow</a></li>
          </ul>
        </div>
        <div className="cz-nav-right">
          <button className="cz-btn-login" onClick={onStartDashboard} disabled={loading}>
            Log In
          </button>
          <button className="cz-btn-tour" onClick={onStartDashboard} disabled={loading}>
            Sign Up
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="cz-hero">
        <div className="cz-hero-left">
          <h1 className="cz-hero-title">
            Your Single Source<br/>
            Of Truth For Secure<br/>
            Recruitment
          </h1>
          <p className="cz-hero-desc">
            End-to-end AES encryption. Protect candidate data and analyze submissions with confidence.
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
        <div className="cz-hiw-header">
          <h2 className="cz-hiw-title">How It Works?</h2>
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
              Only the recruiter holds the key to decrypt the incoming payloads. Bulk upload Excel/CSV data to analyze and rank the best candidates.
            </p>
          </div>
        </div>
      </section>

      {/* PHASE 4: ALTERNATING FEATURES */}
      <section id="demystify" className="cz-alt-section cz-alt-dark">
        <div className="cz-alt-container">
          <div className="cz-alt-text">
            <h2 className="cz-alt-title">Secure Your Candidate Data</h2>
            <p className="cz-alt-desc">
              In today's recruitment landscape, data privacy is paramount. That's why our system employs military-grade AES encryption directly in the browser, ensuring candidate ideas and working procedures are strictly confidential.
            </p>
          </div>
          <div className="cz-alt-visual">
            <div className="cz-f1-graphic">
              <div className="cz-f1-red-line">
                <div className="cz-f1-red-dot"></div>
              </div>
              <div className="cz-f1-col">
                <div className="cz-f1-bar-top" style={{height: '20%'}}></div>
                <div className="cz-f1-bar-mid" style={{height: '30%'}}></div>
                <div className="cz-f1-bar-bot" style={{height: '50%'}}></div>
              </div>
              <div className="cz-f1-col">
                <div className="cz-f1-bar-top" style={{height: '10%'}}></div>
                <div className="cz-f1-bar-mid" style={{height: '40%'}}></div>
                <div className="cz-f1-bar-bot" style={{height: '30%'}}></div>
              </div>
              <div className="cz-f1-col">
                <div className="cz-f1-bar-top" style={{height: '30%'}}></div>
                <div className="cz-f1-bar-mid" style={{height: '20%'}}></div>
                <div className="cz-f1-bar-bot" style={{height: '50%'}}></div>
              </div>
              <div className="cz-f1-col">
                <div className="cz-f1-bar-top" style={{height: '15%'}}></div>
                <div className="cz-f1-bar-mid" style={{height: '25%'}}></div>
                <div className="cz-f1-bar-bot" style={{height: '45%'}}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cz-alt-section cz-alt-gray">
        <div className="cz-alt-container cz-alt-reverse">
          <div className="cz-alt-text">
            <h2 className="cz-alt-title">Automatically Rank Candidates</h2>
            <p className="cz-alt-desc">
              Once the data is securely decrypted by the recruiter, our automated analytics engine processes raw scores and experience factors to instantly highlight the top performers in your pool.
            </p>
          </div>
          <div className="cz-alt-visual">
            <div className="cz-f2-graphic">
              <div className="cz-line-chart-wrapper">
                <svg className="cz-svg-line" viewBox="0 0 300 150" preserveAspectRatio="none">
                  <path d="M 0 130 Q 80 130, 150 60 T 300 100" fill="none" stroke="#6bc4c9" strokeWidth="4" strokeLinecap="round" />
                </svg>
                <div className="cz-anomaly-point"></div>
                <div className="cz-anomaly-alert">
                  <AlertTriangle size={14} /> Review Anomaly
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* PHASE 3: FRAMEWORK SECTION */}
      <section id="framework" className="cz-hiw-section cz-fw-section">
        <div className="cz-hiw-header">
          <h2 className="cz-hiw-title cz-fw-title">
            The Secure <span className="cz-fw-highlight">Recruitment</span> Framework
          </h2>
        </div>

        <div className="cz-hiw-grid">
          {/* Col 1 */}
          <div className="cz-hiw-col">
            <div className="cz-fw-graphic">
              <div className="cz-fw-bar-chart">
                <div className="cz-fw-bar cz-fw-bar-1"></div>
                <div className="cz-fw-bar cz-fw-bar-2"></div>
                <div className="cz-fw-bar cz-fw-bar-3"></div>
                <div className="cz-fw-bar cz-fw-bar-4"></div>
              </div>
            </div>
            <h3 className="cz-hiw-col-title">Complete Security</h3>
            <p className="cz-hiw-col-desc">
              100% local payload encryption — your data never leaks.
            </p>
          </div>

          {/* Col 2 */}
          <div className="cz-hiw-col">
            <div className="cz-fw-graphic">
              <div className="cz-fw-dashboard">
                <div className="cz-fw-dash-top"></div>
                <div className="cz-fw-dash-bottom">
                  <div className="cz-fw-dash-left"><PieChart size={16} color="#6bc4c9" /></div>
                  <div className="cz-fw-dash-right">
                    <div className="cz-fw-dash-line"></div>
                    <div className="cz-fw-dash-line" style={{ width: '60%' }}></div>
                    <div className="cz-fw-dash-line" style={{ width: '80%' }}></div>
                  </div>
                </div>
              </div>
            </div>
            <h3 className="cz-hiw-col-title">Candidate Analysis</h3>
            <p className="cz-hiw-col-desc">
              Combine bulk CSV uploads and direct submissions to get efficiency metrics that quantify candidate quality.
            </p>
          </div>

          {/* Col 3 */}
          <div className="cz-hiw-col">
            <div className="cz-fw-graphic">
              <div className="cz-fw-line-chart">
                <div className="cz-fw-bar cz-fw-bar-2"></div>
                <div className="cz-fw-bar cz-fw-bar-3"></div>
                <div className="cz-fw-bar cz-fw-bar-2" style={{height: '90%'}}></div>
                <div className="cz-fw-node cz-fw-node-1"></div>
                <div className="cz-fw-node cz-fw-node-2"></div>
                <div className="cz-fw-node cz-fw-node-3"></div>
              </div>
            </div>
            <h3 className="cz-hiw-col-title">Recruiter Empowerment</h3>
            <p className="cz-hiw-col-desc">
              Turn your recruiters into autonomous, data-driven hiring managers.
            </p>
          </div>
        </div>
      </section>

      {/* UNIQUE WORKFLOW PIPELINE SECTION */}
      <section id="interactive-demo" className="cz-workflow-section">
        <div style={{ textAlign: 'center', marginBottom: '40px', position: 'relative', zIndex: 10 }}>
          <h2 className="cz-alt-title" style={{ fontSize: '42px', color: '#fff' }}>How The Security Workflow Operates</h2>
          <p className="cz-alt-desc" style={{ maxWidth: '600px', margin: '0 auto', color: '#a0aab2' }}>
            A visual breakdown of our zero-trust architecture. Watch the data flow securely from recruiter to student and back again.
          </p>
        </div>

        <div className="cz-workflow-container">
          <div className="cz-workflow-line"></div>
          <div className="cz-workflow-packet"></div>

          <div className="cz-workflow-steps">
            
            {/* STEP 1: KEY GEN */}
            <div className="cz-workflow-step">
              <div className="cz-workflow-icon-wrap">
                <Globe color="#6bc4c9" size={24} />
              </div>
              <div className="cz-workflow-card">
                <h3 className="cz-workflow-card-title"><span style={{color: '#6bc4c9'}}>01.</span> Key Generation</h3>
                <p className="cz-workflow-card-desc">
                  Recruiter initializes a session. A unique code is generated for the student, while the AES key remains hidden locally.
                </p>
                <div className="cz-terminal-box">
                  <div style={{color: '#a0aab2', marginBottom: '4px'}}>// Shared Student Code</div>
                  <div style={{color: '#ffffff', fontSize: '14px', marginBottom: '10px'}}>REC-A9F21B</div>
                  <div style={{color: '#a0aab2', marginBottom: '4px'}}>// Local AES Key</div>
                  <div style={{color: '#ff5432'}}>*** HIDDEN ***</div>
                </div>
              </div>
            </div>

            {/* STEP 2: ENCRYPTED SUBMISSION */}
            <div className="cz-workflow-step">
              <div className="cz-workflow-icon-wrap">
                <Users color="#ff5432" size={24} />
              </div>
              <div className="cz-workflow-card">
                <h3 className="cz-workflow-card-title"><span style={{color: '#ff5432'}}>02.</span> Encrypted Submission</h3>
                <p className="cz-workflow-card-desc">
                  Student inputs code. Their application is locally AES-encrypted before ever touching the network.
                </p>
                <div className="cz-terminal-box" style={{color: '#ff5432', borderColor: 'rgba(255,84,50,0.2)'}}>
                  U2FsdGVkX19sY2tLZFJhbgA...<br/>
                  D3KxVb5pQ9XzT2nL1M4rA8c...<br/>
                  j9Xq1vW4zT7mP2nL5rA8...
                </div>
              </div>
            </div>

            {/* STEP 3: LOCAL DECRYPT */}
            <div className="cz-workflow-step">
              <div className="cz-workflow-icon-wrap">
                <Target color="#6bc4c9" size={24} />
              </div>
              <div className="cz-workflow-card">
                <h3 className="cz-workflow-card-title"><span style={{color: '#6bc4c9'}}>03.</span> Local Decryption</h3>
                <p className="cz-workflow-card-desc">
                  Payload arrives at dashboard. The local hidden key instantly unlocks the candidate's data for analysis.
                </p>
                <div className="cz-terminal-box">
                  <div style={{color: '#6bc4c9', marginBottom: '8px'}}>[ SYSTEM ] Payload Unlocked ✓</div>
                  <div style={{color: '#ffffff'}}>Idea: AI Resume Parser</div>
                  <div style={{color: '#a0aab2', marginTop: '4px'}}>Score: 94% Fit</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
