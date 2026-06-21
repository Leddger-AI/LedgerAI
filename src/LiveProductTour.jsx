import React, { useState, useEffect, useRef } from 'react';
import './LiveProductTour.css';

export default function LiveProductTour() {
  const [activeTab, setActiveTab] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: 400, y: 150 });
  const [isClicking, setIsClicking] = useState(false);
  const mockupRef = useRef(null);

  // Phase 2 States
  const [f1DragState, setF1DragState] = useState('idle'); // idle, dragging, parsing, emails_extracted
  const [f2ProfileState, setF2ProfileState] = useState('hidden'); // hidden, loading, loaded
  const [f3TerminalState, setF3TerminalState] = useState('hidden'); // hidden, reading, q1, q2, q3

  // Phase 3 States
  const [f4AnalyticsState, setF4AnalyticsState] = useState('hidden'); // hidden, loading, loaded
  const [f5QualityState, setF5QualityState] = useState('hidden'); // hidden, scanning, verified

  const tabs = [
    { id: 0, label: "Sourcing Automation Hub" },
    { id: 1, label: "Assessment Analytics Engine" }
  ];

  useEffect(() => {
    let isActive = true;
    
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const moveCursorTo = async (elementId, offsetX = 0, offsetY = 0, speedMs = 1000) => {
      const actualSpeed = speedMs * 0.5; // Made 50% faster
      if (!mockupRef.current) return false;
      const el = document.getElementById(elementId);
      if (el) {
        const mockupRect = mockupRef.current.getBoundingClientRect();
        const rect = el.getBoundingClientRect();
        const targetX = rect.left - mockupRect.left + (rect.width / 2) + offsetX;
        const targetY = rect.top - mockupRect.top + (rect.height / 2) + offsetY;
        
        const cursorEl = document.querySelector('.lpt-cursor');
        if (cursorEl) {
          cursorEl.style.transition = `top ${actualSpeed}ms cubic-bezier(0.25, 1, 0.5, 1), left ${actualSpeed}ms cubic-bezier(0.25, 1, 0.5, 1)`;
        }
        
        setCursorPos({ x: targetX, y: targetY });
        await sleep(actualSpeed);
        return true;
      }
      return false;
    };

    const runChoreography = async () => {
      while (isActive) {
        // --- PHASE 2: Sourcing Automation Hub ---
        setActiveTab(0);
        
        // Reset states
        setF1DragState('idle');
        setF2ProfileState('hidden');
        setF3TerminalState('hidden');
        setF4AnalyticsState('hidden');
        setF5QualityState('hidden');
        
        await sleep(1000);
        if (!isActive) break;

        // Step 1: Bulk Campaign Drag & Drop
        await moveCursorTo('lpt-file-xlsx', 0, 0, 600);
        if (!isActive) break;
        setIsClicking(true);
        await sleep(150);
        setF1DragState('dragging');
        
        await moveCursorTo('lpt-dropzone', 0, 0, 400); 
        setIsClicking(false);
        if (!isActive) break;
        setF1DragState('parsing');
        
        await sleep(1000);
        if (!isActive) break;
        setF1DragState('emails_extracted');
        
        // Step 2: Smart Profile Sync
        await sleep(500);
        setF2ProfileState('loading');
        await sleep(800);
        setF2ProfileState('loaded');
        
        // Step 3: Async Screening Terminal
        await sleep(500);
        setF3TerminalState('reading');
        await sleep(1000);
        setF3TerminalState('q1');
        await sleep(800);
        setF3TerminalState('q2');
        await sleep(800);
        setF3TerminalState('q3');
        
        await sleep(3000);

        // --- TRANSITION TO PHASE 3 (Tab 1) ---
        await moveCursorTo('lpt-tab-1', 0, 0, 600);
        if (!isActive) break;
        setIsClicking(true);
        await sleep(150);
        setActiveTab(1);
        setIsClicking(false);
        
        await sleep(1000);
        
        // --- PHASE 3: Assessment Analytics Engine ---
        setF4AnalyticsState('loading');
        await sleep(800);
        if (!isActive) break;
        setF4AnalyticsState('loaded');
        
        await sleep(1000);
        setF5QualityState('scanning');
        await sleep(1200);
        setF5QualityState('verified');
        
        await sleep(4000); // Wait so user can observe
        
        // Go back to start
        await moveCursorTo('lpt-tab-0', 0, 0, 600);
        if (!isActive) break;
        setIsClicking(true);
        await sleep(150);
        setActiveTab(0);
        setIsClicking(false);
        await sleep(500);
      }
    };

    runChoreography();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className="lpt-container">
      <div className="lpt-browser-mockup" ref={mockupRef}>
        <div className="lpt-browser-header">
          <div className="lpt-browser-dots">
            <div className="lpt-browser-dot"></div>
            <div className="lpt-browser-dot"></div>
            <div className="lpt-browser-dot"></div>
          </div>
          <div className="lpt-browser-tabs">
            {tabs.map((tab) => (
              <div 
                key={tab.id}
                id={`lpt-tab-${tab.id}`}
                className={`lpt-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </div>
            ))}
          </div>
        </div>

        <div className="lpt-dashboard-content">
          
          {/* Phase 2: Sourcing Automation Hub */}
          <div className={`lpt-page-transition-wrapper ${activeTab === 0 ? 'visible' : ''}`}>
            <div className="lpt-sourcing-hub">
              
              <div className="lpt-card lpt-f1-container">
                <div className="lpt-card-title">1. Bulk Campaign <span className="cz-fw-highlight">Initialization</span></div>
                <div className="lpt-f1-zone">
                  <div 
                    id="lpt-file-xlsx" 
                    className={`lpt-file-asset ${['parsing', 'emails_extracted'].includes(f1DragState) ? 'hidden' : ''}`}
                    style={f1DragState === 'dragging' ? { 
                      left: cursorPos.x - 60, 
                      top: cursorPos.y - 20, 
                      transition: 'none', 
                      position: 'fixed',
                      zIndex: 1001 
                    } : {}}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    candidates.xlsx
                  </div>
                  
                  <div id="lpt-dropzone" className={`lpt-dropzone ${f1DragState === 'dragging' ? 'highlight' : ''}`}>
                    {['idle', 'dragging'].includes(f1DragState) && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        Drop Spreadsheet to Parse
                      </span>
                    )}
                    {f1DragState === 'parsing' && <div className="lpt-loader"></div>}
                    {f1DragState === 'emails_extracted' && (
                      <div className="lpt-email-list">
                        <div className="lpt-email-item"><span>alex.dev@github.com</span> <span>✓ Extracted</span></div>
                        <div className="lpt-email-item"><span>sarah.engineer@gitlab.com</span> <span>✓ Extracted</span></div>
                        <div className="lpt-email-item"><span>mike.j.coder@bitbucket.org</span> <span>✓ Extracted</span></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className={`lpt-card lpt-f2-container ${f2ProfileState !== 'hidden' ? 'visible' : ''}`}>
                <div className="lpt-card-title">2. Smart Profile <span className="cz-fw-highlight">Sync</span></div>
                <div className="lpt-profile-card">
                  {f2ProfileState === 'loading' && (
                    <>
                      <div className="lpt-avatar-placeholder"></div>
                      <div className="lpt-profile-info-placeholder">
                        <div></div>
                        <div></div>
                      </div>
                    </>
                  )}
                  {f2ProfileState === 'loaded' && (
                    <>
                      <div className="lpt-avatar-real">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                      </div>
                      <div className="lpt-profile-info-real">
                        <h4>Alex Developer</h4>
                        <p>Senior Frontend Engineer • @alexdev</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className={`lpt-f3-container ${f3TerminalState !== 'hidden' ? 'visible' : ''}`}>
                <div className="lpt-terminal">
                  <div className="lpt-terminal-header">3. AI Screening <span className="cz-fw-highlight">Widget</span></div>
                  <div className="lpt-terminal-body">
                    {['reading', 'q1', 'q2', 'q3'].includes(f3TerminalState) && (
                      <div className="lpt-term-line system">
                        <span>{'>'}</span> Scanning candidate repositories... Complete.
                      </div>
                    )}
                    {['q1', 'q2', 'q3'].includes(f3TerminalState) && (
                      <div className="lpt-term-line question">
                        <span style={{color:'#ffbd2e'}}>?</span> 1. I see you used React.memo in `Dashboard.tsx`. Can you explain the specific re-render bottleneck it solved?
                      </div>
                    )}
                    {['q2', 'q3'].includes(f3TerminalState) && (
                      <div className="lpt-term-line question">
                        <span style={{color:'#ffbd2e'}}>?</span> 2. Your WebGL implementation lacks fallback contexts. How would you handle graceful degradation?
                      </div>
                    )}
                    {['q3'].includes(f3TerminalState) && (
                      <div className="lpt-term-line question">
                        <span style={{color:'#ffbd2e'}}>?</span> 3. Why did you choose AES-GCM for payload encryption over standard RSA for the local keys?
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
            </div>
          </div>

          {/* Phase 3: Assessment Analytics Engine */}
          <div className={`lpt-page-transition-wrapper ${activeTab === 1 ? 'visible' : ''}`}>
            <div className="lpt-analytics-engine">
              
              <div className="lpt-card lpt-f4-container">
                <div className="lpt-card-title">4. Git-Analytics & Commit <span className="cz-fw-highlight">Pulse</span></div>
                {f4AnalyticsState === 'loading' && <div className="lpt-loader" style={{margin: '40px auto'}}></div>}
                {f4AnalyticsState === 'loaded' && (
                  <div className="lpt-f4-content lpt-fade-in">
                    <div className="lpt-pulse-graph">
                      <svg viewBox="0 0 400 100" className="lpt-pulse-svg">
                        <polyline points="0,80 50,60 100,80 150,20 200,50 250,10 300,40 350,70 400,30" fill="none" stroke="#D7FEFA" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lpt-line-anim" />
                        <circle cx="150" cy="20" r="5" fill="#1A1D1D" stroke="#D7FEFA" strokeWidth="2" className="lpt-pulse-dot" />
                        <circle cx="250" cy="10" r="5" fill="#1A1D1D" stroke="#D7FEFA" strokeWidth="2" className="lpt-pulse-dot" style={{animationDelay: '0.2s'}} />
                      </svg>
                    </div>
                    <div className="lpt-stack-bars">
                      <div className="lpt-bar-row">
                        <span className="lpt-bar-label">React</span>
                        <div className="lpt-bar-track"><div className="lpt-bar-fill" style={{width: '75%', backgroundColor: '#D7FEFA'}}></div></div>
                        <span className="lpt-bar-pct">75%</span>
                      </div>
                      <div className="lpt-bar-row">
                        <span className="lpt-bar-label">TypeScript</span>
                        <div className="lpt-bar-track"><div className="lpt-bar-fill" style={{width: '60%', backgroundColor: '#ffbd2e'}}></div></div>
                        <span className="lpt-bar-pct">60%</span>
                      </div>
                      <div className="lpt-bar-row">
                        <span className="lpt-bar-label">Node.js</span>
                        <div className="lpt-bar-track"><div className="lpt-bar-fill" style={{width: '40%', backgroundColor: '#27c93f'}}></div></div>
                        <span className="lpt-bar-pct">40%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="lpt-card lpt-f5-container">
                <div className="lpt-card-title">5. Quality & Security <span className="cz-fw-highlight">Matrix</span></div>
                {f5QualityState === 'scanning' && <div className="lpt-loader" style={{margin: '40px auto'}}></div>}
                {f5QualityState === 'verified' && (
                  <div className="lpt-f5-content lpt-fade-in">
                    <div className="lpt-score-layout">
                      <div className="lpt-score-circle-wrap">
                        <div className="lpt-score-circle">
                          <svg viewBox="0 0 100 100" className="lpt-score-svg">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                            <circle cx="50" cy="50" r="45" fill="none" stroke="#D7FEFA" strokeWidth="8" strokeDasharray="283" strokeDashoffset="283" className="lpt-score-anim" />
                          </svg>
                          <div className="lpt-score-text">94%<br/><span>Match</span></div>
                        </div>
                      </div>
                      
                      <div className="lpt-plagiarism-badge">
                        <div className="lpt-badge-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#27c93f" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        </div>
                        <div className="lpt-badge-text">
                          <div className="lpt-badge-title">Original Architecture</div>
                          <div className="lpt-badge-sub">0% Plagiarism Detected</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>

        <div 
          className={`lpt-cursor ${isClicking ? 'clicking' : ''}`}
          style={{ 
            left: `${cursorPos.x}px`, 
            top: `${cursorPos.y}px` 
          }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 25.5L8.5 7L24 16L16.5 17.5L11 25.5Z" fill="#FFFFFF" stroke="#0D9488" strokeWidth="2" strokeLinejoin="round"/>
          </svg>
          <div className="lpt-cursor-click-ripple"></div>
        </div>
      </div>
    </div>
  );
}
