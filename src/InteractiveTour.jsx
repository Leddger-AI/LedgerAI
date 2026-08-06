import React, { useState, useEffect, useRef } from 'react';
import './InteractiveTour.css';

// Custom hook for Intersection Observer
function useOnScreen(options) {
  const ref = useRef();
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, options);
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, [ref, options]);
  
  return [ref, isVisible];
}

export default function InteractiveTour() {
  const [ref1, isVisible1] = useOnScreen({ threshold: 0.5 });
  const [ref2, isVisible2] = useOnScreen({ threshold: 0.5 });
  const [ref3, isVisible3] = useOnScreen({ threshold: 0.5 });
  const [ref4, isVisible4] = useOnScreen({ threshold: 0.5 });

  // States
  const [step1State, setStep1State] = useState({ text: '', cursorPos: 0, isClicking: false, toggle1: false, toggle2: false, toggle3: false });
  const [step2State, setStep2State] = useState('idle');
  const [step3State, setStep3State] = useState({ cursorMoving: false, clicked: false, repoChecked: false, avatarLoaded: true });
  const [step4State, setStep4State] = useState({ scoreVisible: false, graphVisible: false, pillsVisible: false, bulletsVisible: false });

  // scrollToStep removed as per user request for manual scrolling

  // Step 1: Campaign Creation (Dark Theme)
  useEffect(() => {
    if (!isVisible1) {
      setStep1State({ text: '', cursorPos: 0, isClicking: false, toggle1: false, toggle2: false, toggle3: false });
      return;
    }

    let typeInterval;
    let timeouts = [];

    const startAnimation = () => {
      setStep1State({ text: '', cursorPos: 0, isClicking: false, toggle1: false, toggle2: false, toggle3: false });
      
      const typeText = "We are seeking a versatile developer to build highly secure and modular systems.";
      let i = 0;
      
      typeInterval = setInterval(() => {
        if (i <= typeText.length) {
          setStep1State(s => ({ ...s, text: typeText.substring(0, i) }));
          i++;
        } else {
          clearInterval(typeInterval);

          // Toggle 1: Require Resume Upload
          const t1 = setTimeout(() => setStep1State(s => ({ ...s, cursorPos: 1 })), 500);
          const t2 = setTimeout(() => setStep1State(s => ({ ...s, isClicking: true, toggle1: true })), 1500);
          const t3 = setTimeout(() => setStep1State(s => ({ ...s, isClicking: false })), 1800);

          // Toggle 2: Request Private GitHub Access
          const t4 = setTimeout(() => setStep1State(s => ({ ...s, cursorPos: 2 })), 2300);
          const t5 = setTimeout(() => setStep1State(s => ({ ...s, isClicking: true, toggle2: true })), 3300);
          const t6 = setTimeout(() => setStep1State(s => ({ ...s, isClicking: false })), 3600);

          // Toggle 3: Request LinkedIn Profile
          const t7 = setTimeout(() => setStep1State(s => ({ ...s, cursorPos: 3 })), 4100);
          const t8 = setTimeout(() => setStep1State(s => ({ ...s, isClicking: true, toggle3: true })), 5100);
          const t9 = setTimeout(() => setStep1State(s => ({ ...s, isClicking: false })), 5400);

          timeouts.push(t1, t2, t3, t4, t5, t6, t7, t8, t9);
        }
      }, 30);
    };

    startAnimation();

    return () => {
      clearInterval(typeInterval);
      timeouts.forEach(clearTimeout);
    };
  }, [isVisible1]);

  // Step 2: Bulk Dispatch (Light Theme)
  useEffect(() => {
    if (!isVisible2) {
      setStep2State('idle');
      return;
    }

    let timeouts = [];

    const startAnimation = () => {
      setStep2State('idle');
      
      const t1 = setTimeout(() => setStep2State('dragging'), 800);
      const t2 = setTimeout(() => setStep2State('processing'), 2000);
      const t3 = setTimeout(() => setStep2State('success'), 4200);
      
      timeouts.push(t1, t2, t3);
    };

    startAnimation();

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [isVisible2]);

  // Step 3: Candidate Sourcing (Light Theme)
  useEffect(() => {
    if (!isVisible3) {
      setStep3State({ cursorMoving: false, clicked: false, repoChecked: false, avatarLoaded: true });
      return;
    }

    let timeouts = [];

    const startAnimation = () => {
      setStep3State({ cursorMoving: false, clicked: false, repoChecked: false, avatarLoaded: false });
      
      const t1 = setTimeout(() => setStep3State(s => ({ ...s, avatarLoaded: true })), 1000);
      const t2 = setTimeout(() => setStep3State(s => ({ ...s, cursorMoving: true })), 2200);
      const t3 = setTimeout(() => setStep3State(s => ({ ...s, clicked: true, repoChecked: true })), 3400);
      
      timeouts.push(t1, t2, t3);
    };

    startAnimation();

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [isVisible3]);

  // Step 4: AI Assessment (Dark Theme)
  useEffect(() => {
    if (!isVisible4) {
      setStep4State({ scoreVisible: false, graphVisible: false, pillsVisible: false, bulletsVisible: false });
      return;
    }

    let timeouts = [];

    const startAnimation = () => {
      setStep4State({ scoreVisible: false, graphVisible: false, pillsVisible: false, bulletsVisible: false });
      
      const t1 = setTimeout(() => setStep4State(s => ({ ...s, scoreVisible: true })), 500);
      const t2 = setTimeout(() => setStep4State(s => ({ ...s, graphVisible: true })), 1100);
      const t3 = setTimeout(() => setStep4State(s => ({ ...s, pillsVisible: true })), 1700);
      const t4 = setTimeout(() => setStep4State(s => ({ ...s, bulletsVisible: true })), 2300);
      
      timeouts.push(t1, t2, t3, t4);
    };

    startAnimation();

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [isVisible4]);

  const mockOpacities = [
    0.1, 0.4, 0.8, 0.2, 0.1, 0.9, 0.5, 0.1, 0.2, 0.6, 0.3, 0.1, 0.7, 0.4,
    0.8, 0.1, 0.2, 0.9, 0.5, 0.1, 0.4, 0.2, 0.1, 0.8, 0.6, 0.3, 0.1, 0.2,
    0.4, 0.9, 0.5, 0.1, 0.2, 0.6, 0.1, 0.3, 0.8, 0.4, 0.2, 0.1, 0.7, 0.5
  ];

  return (
    <div className="tour-pages-wrapper">
      
      {/* SECTION 1: Campaign Creation (Dark Theme) */}
      <section className="tour-page-section tour-dark" ref={ref1}>
        <div className={`tour-page-content ${isVisible1 ? 'it-enter-active' : ''}`}>
          <div className="tour-text-block">
            <h2 className="tour-section-title">
              1. <span className="cz-fw-highlight">Campaign</span> Creation
            </h2>
            <p className="tour-section-desc">Instantly launch recruitment campaigns. Configure granular candidate requirements, mandate custom resume formats, and effortlessly request private GitHub repository access and LinkedIn verification.</p>
          </div>
          <div className="tour-visual-block">
            <div className="it-campaign-builder">
              <div className="it-builder-header">
                <div className="it-b-title">New Recruitment Campaign</div>
                <div className="it-b-subtitle">Configure candidate requirements and privacy settings</div>
              </div>
              <div className="it-form-group">
                <label>Job Description & Notes</label>
                <div className="it-textarea-mock">
                  {step1State.text}
                  {step1State.cursorPos === 0 && <span className="it-cursor">|</span>}
                </div>
              </div>
              <div className="it-toggles-container" style={{ position: 'relative' }}>
                <div className="it-toggle-row">
                  <div className="it-toggle-info">
                    <div className="it-toggle-title">Require Resume Upload</div>
                    <div className="it-toggle-desc">Candidates must provide a PDF resume</div>
                  </div>
                  <div className={`it-toggle-switch ${step1State.toggle1 ? 'on' : 'off'}`}>
                    <div className="it-toggle-knob"></div>
                  </div>
                </div>
                <div className="it-toggle-row">
                  <div className="it-toggle-info">
                    <div className="it-toggle-title">Request Private GitHub Access</div>
                    <div className="it-toggle-desc">Securely connect and analyze private repositories</div>
                  </div>
                  <div className={`it-toggle-switch ${step1State.toggle2 ? 'on' : 'off'}`}>
                    <div className="it-toggle-knob"></div>
                  </div>
                </div>
                <div className="it-toggle-row">
                  <div className="it-toggle-info">
                    <div className="it-toggle-title">Request LinkedIn Profile</div>
                    <div className="it-toggle-desc">Verify professional history and endorsements</div>
                  </div>
                  <div className={`it-toggle-switch ${step1State.toggle3 ? 'on' : 'off'}`}>
                    <div className="it-toggle-knob"></div>
                  </div>
                </div>
                {/* Simulated Cursor */}
                <div className={`simulated-cursor c-step1 ${step1State.cursorPos > 0 ? `moving moving-${step1State.cursorPos}` : ''} ${step1State.isClicking ? 'clicked' : ''}`}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="#1A1D1D" stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.42c.45 0 .67-.54.35-.85L5.85 2.86a.5.5 0 0 0-.85.35Z"/>
                  </svg>
                  {step1State.isClicking && <div className="click-ripple"></div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Bulk Dispatch (Light Theme) */}
      <section className="tour-page-section tour-light tour-reverse" ref={ref2}>
        <div className={`tour-page-content ${isVisible2 ? 'it-enter-active' : ''}`}>
          <div className="tour-text-block">
            <h2 className="tour-section-title">
              2. Bulk Automated <span className="cz-fw-highlight">Dispatch</span>
            </h2>
            <p className="tour-section-desc">Don't invite candidates one by one. Drop a massive Excel spreadsheet, and our system automatically queues, processes, and dispatches encrypted platform invites instantaneously.</p>
          </div>
          <div className="tour-visual-block">
            <div className={`it-dropzone ${step2State === 'dragging' ? 'drag-active' : ''} ${step2State === 'processing' || step2State === 'success' ? 'file-dropped' : ''} light-dz`}>
              {step2State === 'idle' && (
                <div className="it-dz-content">
                  <div className="it-dz-icon">📁</div>
                  <div className="it-dz-text">Drag & Drop candidate_list.xlsx here</div>
                </div>
              )}
              {step2State === 'dragging' && (
                <div className="it-dz-content">
                  <div className="it-dz-icon float-animation">📄</div>
                  <div className="it-dz-text" style={{ color: '#00BFA5' }}>Drop file to upload...</div>
                </div>
              )}
              {step2State === 'processing' && (
                <div className="it-dz-content">
                  <div className="it-spinner light-spinner"></div>
                  <div className="it-dz-text">Processing 45 rows...</div>
                  <div className="it-progress-bar light-pb"><div className="it-progress-fill"></div></div>
                </div>
              )}
              {step2State === 'success' && (
                <div className="it-dz-content success-state">
                  <div className="it-success-check">✓</div>
                  <div className="it-dz-text" style={{ color: '#00BFA5', fontWeight: '600' }}>Upload Complete!</div>
                  <div className="it-queue-visual light-queue">
                    <div className="it-queue-item queue-anim-1">✉️ Queuing invite to alex@example.com...</div>
                    <div className="it-queue-item queue-anim-2">✉️ Queuing invite to sarah@example.com...</div>
                    <div className="it-queue-item queue-anim-3">✉️ Queuing invite to david@example.com...</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Sourcing (Light Theme) */}
      <section className="tour-page-section tour-light" ref={ref3}>
        <div className={`tour-page-content ${isVisible3 ? 'it-enter-active' : ''}`}>
          <div className="tour-text-block">
            <h2 className="tour-section-title">
              3. Frictionless Candidate <span className="cz-fw-highlight">Sourcing</span>
            </h2>
            <p className="tour-section-desc">Candidates enjoy a premium, frictionless application portal. Watch how seamlessly they can authorize GitHub integration, syncing avatars and safely granting access to specific private repositories.</p>
          </div>
          <div className="tour-visual-block" style={{ position: 'relative' }}>
            <div className="it-candidate-view light-cv">
              <div className="it-builder-header light-header">
                <div className="it-b-title">Candidate Application Portal</div>
                <div className="it-b-subtitle">Submit your profile and securely connect repositories</div>
              </div>
              <div className="it-cv-form light-form">
                <div className="it-avatar-section">
                  <div className={`it-avatar-circle ${step3State.avatarLoaded ? 'loaded' : ''}`}>
                    {!step3State.avatarLoaded ? (
                      <span className="it-avatar-placeholder">👤</span>
                    ) : (
                      <img src="https://avatars.githubusercontent.com/u/9919?s=200&v=4" alt="GitHub Avatar" className="it-avatar-img" />
                    )}
                  </div>
                  <div className="it-avatar-text">
                    <div className="it-cv-label">Profile Image</div>
                    <div className="it-cv-sublabel">{step3State.avatarLoaded ? 'Synced from GitHub' : 'Fetching from GitHub...'}</div>
                  </div>
                </div>
                <div className="it-cv-field">
                  <label>GitHub Username</label>
                  <div className="it-cv-input">torvalds</div>
                </div>
                <div className="it-cv-field">
                  <label>LinkedIn Profile</label>
                  <div className="it-cv-input-prefixed">
                    <span className="it-cv-prefix">linkedin.com/in/</span>
                    <span className="it-cv-suffix">torvalds</span>
                  </div>
                </div>
                <button className="it-btn-connect-gh">Connect GitHub App</button>
              </div>

              {step3State.avatarLoaded && (
                <div className="it-gh-modal-overlay it-fade-in">
                  <div className="it-gh-modal light-modal">
                    <div className="it-gh-modal-header">
                      <div className="it-gh-logo">🐙 GitHub App Authorization</div>
                    </div>
                    <div className="it-gh-modal-body">
                      <p>Select which repositories Ledger AI can access:</p>
                      <div className="it-repo-list">
                        <div className="it-repo-item">
                          <div className={`it-checkbox ${step3State.repoChecked ? 'checked' : ''}`}>
                            {step3State.repoChecked && '✓'}
                          </div>
                          <div className="it-repo-name">🔒 digital-portfolio-3d</div>
                        </div>
                        <div className="it-repo-item disabled">
                          <div className="it-checkbox"></div>
                          <div className="it-repo-name">🔒 personal-diary-notes</div>
                        </div>
                      </div>
                      <button className={`it-btn-authorize ${step3State.repoChecked ? 'active' : ''}`}>Authorize Ledger AI</button>
                    </div>
                    {/* Simulated Cursor for Step 3 */}
                    <div className={`simulated-cursor c-step3 ${step3State.cursorMoving ? 'moving' : ''} ${step3State.clicked ? 'clicked' : ''}`}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="#1A1D1D" stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.42c.45 0 .67-.54.35-.85L5.85 2.86a.5.5 0 0 0-.85.35Z"/>
                      </svg>
                      {step3State.clicked && <div className="click-ripple"></div>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: AI Assessment (Dark Theme) */}
      <section className="tour-page-section tour-dark tour-reverse" ref={ref4}>
        <div className={`tour-page-content ${isVisible4 ? 'it-enter-active' : ''}`}>
          <div className="tour-text-block">
            <h2 className="tour-section-title">
              4. AI Assessment <span className="cz-fw-highlight">Analytics</span>
            </h2>
            <p className="tour-section-desc">Recruiters are presented with instant, high-fidelity AI Match Scores. Dive deep into a candidate's codebase with automated language distribution parsing and commit commit pulse tracking.</p>
          </div>
          <div className="tour-visual-block">
            <div className="it-analytics-panel">
              <div className="it-builder-header">
                <div className="it-b-title">AI Assessment Analytics</div>
                <div className="it-b-subtitle">Final evaluation dashboard for torvalds</div>
              </div>
              <div className="it-dashboard-grid">
                <div className="it-dash-left">
                  <div className={`it-score-card ${step4State.scoreVisible ? 'visible' : ''}`}>
                    <div className="it-score-title">AI Match Score</div>
                    <div className="it-radial-badge">
                      <div className="it-radial-inner">94%</div>
                      <svg className="it-radial-svg" viewBox="0 0 100 100">
                        <circle className="it-radial-bg" cx="50" cy="50" r="45"></circle>
                        <circle className="it-radial-progress" cx="50" cy="50" r="45"></circle>
                      </svg>
                    </div>
                    <div className="it-score-desc">Exceptional fit for Senior React Developer role</div>
                  </div>
                </div>
                <div className="it-dash-right">
                  <div className={`it-dash-section ${step4State.graphVisible ? 'visible' : ''}`}>
                    <div className="it-section-title">Commit Pulse Graph (90 Days)</div>
                    <div className="it-pulse-graph">
                      {mockOpacities.map((opacity, i) => (
                        <div key={i} className="it-pulse-box" style={{ opacity }}></div>
                      ))}
                    </div>
                  </div>
                  <div className={`it-dash-section ${step4State.pillsVisible ? 'visible' : ''}`}>
                    <div className="it-section-title">Tech Stack Composition</div>
                    <div className="it-pills-list">
                      <div className="it-pill" style={{ borderColor: '#3178c6' }}><span style={{ color: '#3178c6' }}>●</span> TypeScript 80%</div>
                      <div className="it-pill" style={{ borderColor: '#f1e05a' }}><span style={{ color: '#f1e05a' }}>●</span> JavaScript 15%</div>
                      <div className="it-pill" style={{ borderColor: '#563d7c' }}><span style={{ color: '#563d7c' }}>●</span> CSS 5%</div>
                    </div>
                  </div>
                  <div className={`it-dash-section ${step4State.bulletsVisible ? 'visible' : ''}`}>
                    <div className="it-section-title">AI Strengths Analysis</div>
                    <ul className="it-strengths-list">
                      <li>High modularity across React component architecture.</li>
                      <li>Exceptional usage of secure OAuth and AES encryption.</li>
                      <li>Consistent continuous integration patterns in <code>digital-portfolio-3d</code>.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
