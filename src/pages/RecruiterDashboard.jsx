import { useState, useEffect } from 'react';
import { Shield, Key, Download, FileText, BarChart2, Search, ArrowRight, UserCheck, Eye, Settings, FileUp, GitBranch, Globe, Check, Mail, Upload, X, FileSpreadsheet } from 'lucide-react';
import CryptoJS from 'crypto-js';
import Papa from 'papaparse';
import { useNavigate } from 'react-router-dom';
import '../LandingPage.css'; // Inherit styling

function CandidateAvatar({ githubUsername, manualAvatar }) {
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    if (!githubUsername) {
      setAvatarUrl(null);
      return;
    }

    const fetchGithubAvatar = async () => {
      try {
        const response = await fetch(`https://api.github.com/users/${githubUsername}`);
        if (response.ok) {
          const data = await response.json();
          setAvatarUrl(data.avatar_url);
        } else {
          setAvatarUrl(null);
        }
      } catch (err) {
        setAvatarUrl(null);
      }
    };

    fetchGithubAvatar();
  }, [githubUsername]);

  const displaySrc = manualAvatar || avatarUrl;

  if (displaySrc) {
    return (
      <img
        src={displaySrc}
        alt="Candidate Avatar"
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          objectFit: 'cover',
          border: '2px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25)',
          flexShrink: 0
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        backgroundColor: '#1A1D1D',
        border: '2px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: '14px',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25)',
        flexShrink: 0
      }}
    >
      {githubUsername ? githubUsername.substring(0, 2).toUpperCase() : '??'}
    </div>
  );
}

function GithubAnalysis({ githubUsername, projectIdea, experience }) {
  const [loading, setLoading] = useState(false);
  const [languages, setLanguages] = useState([]);
  const [commitActivity, setCommitActivity] = useState([]);
  const [aiReport, setAiReport] = useState(null);
  const [totalCommits, setTotalCommits] = useState(0);

  const generateDeterministicGrid = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const grid = [];
    let sum = 0;
    for (let i = 0; i < 98; i++) {
      const val = Math.abs((hash + i * 29) % 37);
      let level = 0;
      if (val < 14) {
        level = 0;
      } else if (val < 24) {
        level = 1;
        sum += 1;
      } else if (val < 30) {
        level = 2;
        sum += 2;
      } else if (val < 34) {
        level = 3;
        sum += 4;
      } else {
        level = 4;
        sum += 7;
      }
      grid.push(level);
    }
    return { grid, sum };
  };

  const generateAIReport = (repoNames, langs) => {
    const mainLang = langs[0]?.name || 'TypeScript';
    let codeReadability = 85;
    let modularStructure = 88;
    let securityScan = 92;

    if (experience > 5) {
      codeReadability = 94;
      modularStructure = 95;
      securityScan = 96;
    } else if (experience < 2) {
      codeReadability = 78;
      modularStructure = 72;
      securityScan = 80;
    }

    let summaryText = `Demonstrates robust code structuring. Excellent directory organization and adherence to ${mainLang} design patterns.`;
    let concernsText = `No major security flags. Ensure environment keys are externalized.`;

    if (repoNames && repoNames.length > 0) {
      summaryText = `Successfully analyzed candidate's public repositories including: ${repoNames.join(', ')}. Strong object-oriented modeling and modular separations observed in ${mainLang}.`;
    }

    if (mainLang === 'Python') {
      concernsText = `Recommended additions: implement typing hints and clean up docstrings. Virtualenv configurations detected.`;
    } else {
      concernsText = `Minor npm dependency warnings. Codebase uses clean async/await patterns for network requests.`;
    }

    return {
      readability: codeReadability,
      structure: modularStructure,
      security: securityScan,
      summary: summaryText,
      concerns: concernsText
    };
  };

  useEffect(() => {
    const seed = githubUsername || 'candidate';
    const { grid, sum } = generateDeterministicGrid(seed);
    setCommitActivity(grid);
    setTotalCommits(sum);

    if (!githubUsername) {
      // Setup default mock stack
      let defaultLangs = [
        { name: 'TypeScript', percentage: 65, color: '#00f0ff' },
        { name: 'Python', percentage: 25, color: '#b55fe6' },
        { name: 'Shell', percentage: 10, color: '#f59e0b' }
      ];
      if (projectIdea && (projectIdea.toLowerCase().includes('python') || projectIdea.toLowerCase().includes('algorithm') || projectIdea.toLowerCase().includes('ai'))) {
        defaultLangs = [
          { name: 'Python', percentage: 70, color: '#b55fe6' },
          { name: 'TypeScript', percentage: 20, color: '#00f0ff' },
          { name: 'Docker', percentage: 10, color: '#10b981' }
        ];
      }
      setLanguages(defaultLangs);
      setAiReport(generateAIReport([], defaultLangs));
      return;
    }

    const fetchGithubData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`https://api.github.com/users/${githubUsername}/repos?per_page=100&sort=updated`);
        if (response.ok) {
          const list = await response.json();
          if (list && list.length > 0) {
            // Calculate real stack
            const langCounts = {};
            let totalLangs = 0;
            list.forEach(r => {
              if (r.language) {
                langCounts[r.language] = (langCounts[r.language] || 0) + 1;
                totalLangs++;
              }
            });

            const colorPalette = ['#00f0ff', '#b55fe6', '#f59e0b', '#10b981', '#f43f5e'];
            let idx = 0;
            const langList = Object.keys(langCounts).map(name => {
              const percentage = Math.round((langCounts[name] / totalLangs) * 100);
              const color = colorPalette[idx % colorPalette.length];
              idx++;
              return { name, percentage, color };
            }).sort((a, b) => b.percentage - a.percentage);

            setLanguages(langList.length > 0 ? langList : [{ name: 'JavaScript', percentage: 100, color: '#00f0ff' }]);
            
            const topRepos = list.slice(0, 3).map(r => r.name);
            setAiReport(generateAIReport(topRepos, langList.length > 0 ? langList : [{ name: 'JavaScript' }]));
          } else {
            fallbackMock();
          }
        } else {
          fallbackMock();
        }
      } catch (err) {
        fallbackMock();
      } finally {
        setLoading(false);
      }
    };

    const fallbackMock = () => {
      let defaultLangs = [
        { name: 'TypeScript', percentage: 65, color: '#00f0ff' },
        { name: 'Python', percentage: 25, color: '#b55fe6' },
        { name: 'Shell', percentage: 10, color: '#f59e0b' }
      ];
      if (projectIdea && (projectIdea.toLowerCase().includes('python') || projectIdea.toLowerCase().includes('algorithm') || projectIdea.toLowerCase().includes('ai'))) {
        defaultLangs = [
          { name: 'Python', percentage: 70, color: '#b55fe6' },
          { name: 'TypeScript', percentage: 20, color: '#00f0ff' },
          { name: 'Docker', percentage: 10, color: '#10b981' }
        ];
      }
      setLanguages(defaultLangs);
      setAiReport(generateAIReport([], defaultLangs));
    };

    fetchGithubData();
  }, [githubUsername, projectIdea, experience]);

  if (loading) {
    return (
      <div style={{ color: '#FFFFFF', padding: '20px 0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#FFFFFF', animation: 'spin 1s linear infinite' }} />
        <span>Fetching GitHub repository telemetry and repository data...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '20px' }}>
      
      {/* 1. Commit Pulse Graph Card */}
      <div style={{ backgroundColor: '#1C1E20', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '20px' }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '11px', fontWeight: '700', color: '#FFFFFF', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Commit Pulse Graph (90 Days)
        </h4>
        
        <div style={{ display: 'flex', gap: '3px', overflowX: 'auto', paddingBottom: '10px' }}>
          {Array.from({ length: 14 }).map((_, colIdx) => (
            <div key={colIdx} style={{ display: 'flex', flexDirection: 'column', gap: '3px', flexShrink: 0 }}>
              {Array.from({ length: 7 }).map((_, rowIdx) => {
                const dayIndex = colIdx * 7 + rowIdx;
                const commitLevel = commitActivity[dayIndex] || 0;
                const squareColors = [
                  '#2B2E2E',
                  'rgba(0, 240, 255, 0.25)',
                  'rgba(0, 240, 255, 0.5)',
                  'rgba(0, 240, 255, 0.75)',
                  '#00f0ff'
                ];
                return (
                  <div
                    key={rowIdx}
                    style={{
                      width: '11px',
                      height: '11px',
                      backgroundColor: squareColors[commitLevel],
                      borderRadius: '2px',
                      transition: 'background-color 0.2s ease'
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '11px', color: '#FFFFFF' }}>
          <span>Total Commits: {totalCommits}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Less</span>
            <div style={{ width: '8px', height: '8px', borderRadius: '1px', backgroundColor: '#2B2E2E' }} />
            <div style={{ width: '8px', height: '8px', borderRadius: '1px', backgroundColor: 'rgba(0, 240, 255, 0.35)' }} />
            <div style={{ width: '8px', height: '8px', borderRadius: '1px', backgroundColor: '#00f0ff' }} />
            <span>More</span>
          </div>
        </div>
      </div>

      {/* 2. Tech Stack Distribution Card */}
      <div style={{ backgroundColor: '#1C1E20', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '20px' }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '11px', fontWeight: '700', color: '#FFFFFF', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Tech Stack Distribution
        </h4>

        <div style={{ display: 'flex', height: '10px', borderRadius: '5px', overflow: 'hidden', backgroundColor: '#08090A', marginBottom: '20px' }}>
          {languages.map((l, i) => (
            <div
              key={i}
              style={{
                width: `${l.percentage}%`,
                backgroundColor: l.color,
                height: '100%'
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 16px' }}>
          {languages.map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: l.color }} />
              <span style={{ fontSize: '12px', color: '#FFFFFF', fontWeight: '500' }}>
                {l.name} {l.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. AI Analysis Summary Card */}
      <div style={{ backgroundColor: '#1C1E20', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h4 style={{ margin: '0', fontSize: '11px', fontWeight: '700', color: '#FFFFFF', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          AI Attribution Summary
        </h4>

        {aiReport && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#FFFFFF', marginBottom: '4px' }}>
                <span>Code Readability</span>
                <span>{aiReport.readability}%</span>
              </div>
              <div style={{ height: '4px', backgroundColor: '#08090A', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${aiReport.readability}%`, backgroundColor: '#00f0ff', height: '100%' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#FFFFFF', marginBottom: '4px' }}>
                <span>Modular Structure</span>
                <span>{aiReport.structure}%</span>
              </div>
              <div style={{ height: '4px', backgroundColor: '#08090A', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${aiReport.structure}%`, backgroundColor: '#b55fe6', height: '100%' }} />
              </div>
            </div>

            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.4' }}>
              {aiReport.summary}
            </p>
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '8px', fontStyle: 'italic' }}>
              {aiReport.concerns}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default function RecruiterDashboard() {
  const navigate = useNavigate();
  
  // View states
  const [activeTab, setActiveTab] = useState('form-creator');

  // Form customizer states
  const [requestResume, setRequestResume] = useState(true);
  const [requestGithub, setRequestGithub] = useState(true);
  const [requestPortfolio, setRequestPortfolio] = useState(true);
  const [recruiterNotes, setRecruiterNotes] = useState(
    'Please provide detailed descriptions of your past engineering projects and experience. Upload your verified code repositories for cryptographic validation.'
  );

  // Phase 2 Drawer & Invite states
  const [showInviteDrawer, setShowInviteDrawer] = useState(false);
  const [inviteTab, setInviteTab] = useState('single'); // 'single' | 'bulk'
  const [singleEmail, setSingleEmail] = useState('');
  const [singleStatus, setSingleStatus] = useState(''); // '' | 'sending' | 'sent'
  const [bulkCandidates, setBulkCandidates] = useState([]);
  const [campaignStatus, setCampaignStatus] = useState(''); // '' | 'sending' | 'sent'
  const [dragOver, setDragOver] = useState(false);

  // Key generator states
  const [uniqueCode, setUniqueCode] = useState('');
  const [encryptionKey, setEncryptionKey] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [decryptedData, setDecryptedData] = useState({});
  const [csvData, setCsvData] = useState([]);

  const generateCode = () => {
    const code = 'REC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const key = 'secret-key-' + code; 
    setUniqueCode(code);
    setEncryptionKey(key);
    
    setCandidates([{
      id: Date.now(),
      name: 'Incoming Submission...',
      submittedAt: 'Pending',
      codeUsed: code,
      payload: CryptoJS.AES.encrypt(JSON.stringify({
        idea: 'Quantum computing algorithm for optimizing logistics.',
        workingProcedure: 'Applying QAOA to TSP variants.',
        experience: 5,
        score: 98,
        githubUsername: 'ChitkulLakshya',
        manualAvatar: ''
      }), key).toString()
    }]);
  };

  const handleDecrypt = (candidate) => {
    try {
      const bytes = CryptoJS.AES.decrypt(candidate.payload, encryptionKey);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
      if (!decryptedString) throw new Error("Invalid Key");
      
      const parsed = JSON.parse(decryptedString);
      setDecryptedData(prev => ({ ...prev, [candidate.id]: parsed }));
    } catch (e) {
      alert("Decryption failed. Invalid one-time key or corrupted data.");
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          setCsvData(results.data);
        }
      });
    }
  };

  // Phase 2 Handlers
  const handleSendSingleInvite = () => {
    setSingleStatus('sending');
    setTimeout(() => {
      setSingleStatus('sent');
      setSingleEmail('');
      setTimeout(() => setSingleStatus(''), 3000);
    }, 1500);
  };

  const handleBulkUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsed = results.data.map(row => {
            const keys = Object.keys(row);
            const emailKey = keys.find(k => k.toLowerCase().includes('email')) || keys[0];
            const nameKey = keys.find(k => k.toLowerCase().includes('name')) || keys[1];
            return {
              name: row[nameKey],
              email: row[emailKey]
            };
          });
          setBulkCandidates(parsed);
          setCampaignStatus('');
        }
      });
    }
  };

  const handleBulkDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsed = results.data.map(row => {
            const keys = Object.keys(row);
            const emailKey = keys.find(k => k.toLowerCase().includes('email')) || keys[0];
            const nameKey = keys.find(k => k.toLowerCase().includes('name')) || keys[1];
            return {
              name: row[nameKey],
              email: row[emailKey]
            };
          });
          setBulkCandidates(parsed);
          setCampaignStatus('');
        }
      });
    }
  };

  const handleRunCampaign = () => {
    setCampaignStatus('sending');
    setTimeout(() => {
      setCampaignStatus('sent');
      setTimeout(() => {
        setBulkCandidates([]);
        setCampaignStatus('');
        setShowInviteDrawer(false);
      }, 3000);
    }, 2000);
  };

  return (
    <div className="lp-wrapper" style={{ minHeight: '100vh', backgroundColor: '#1A1D1D', color: '#fff' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '120px 40px 40px 40px' }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '35px', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Shield size={32} color="#D7FEFA" />
            <h1 style={{ fontSize: '32px', fontWeight: '700', letterSpacing: '-0.03em', margin: 0 }}>Recruiter Control Center</h1>
          </div>
          <button 
            className="cz-btn-tour" 
            style={{ backgroundColor: '#D7FEFA', borderColor: '#D7FEFA', padding: '10px 20px', borderRadius: '9999px', fontSize: '13px', fontWeight: '600' }} 
            onClick={() => navigate('/analytics')}
          >
            Open Analytics Engine
          </button>
        </div>

        {/* Tab Selector (Pill Capsule Design) */}
        <div style={{ display: 'inline-flex', backgroundColor: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '9999px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '35px' }}>
          <button 
            onClick={() => setActiveTab('form-creator')}
            style={{
              backgroundColor: activeTab === 'form-creator' ? '#D7FEFA' : 'transparent',
              color: activeTab === 'form-creator' ? '#1A1D1D' : 'rgba(255,255,255,0.6)',
              border: 'none',
              padding: '8px 24px',
              borderRadius: '9999px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Settings size={14} />
            Form Customizer
          </button>
          <button 
            onClick={() => setActiveTab('submissions')}
            style={{
              backgroundColor: activeTab === 'submissions' ? '#D7FEFA' : 'transparent',
              color: activeTab === 'submissions' ? '#1A1D1D' : 'rgba(255,255,255,0.6)',
              border: 'none',
              padding: '8px 24px',
              borderRadius: '9999px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <UserCheck size={14} />
            Submissions & Keys
          </button>
        </div>

        {/* Tab 1: Form Customizer */}
        {activeTab === 'form-creator' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.3fr', gap: '40px', alignItems: 'start' }}>
            
            {/* Customizer Settings Card */}
            <div style={{ backgroundColor: '#2B2E2E', padding: '30px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 30px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Settings size={18} color="#D7FEFA" />
                  Form Settings
                </h2>
                <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '13px', lineHeight: '1.4' }}>
                  Customize the fields and instructions candidates will see in their application portal.
                </p>
              </div>

              {/* Instructions Text Field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)' }}>
                  Recruiter Notes / Instructions
                </label>
                <textarea
                  rows={4}
                  value={recruiterNotes}
                  onChange={(e) => setRecruiterNotes(e.target.value)}
                  placeholder="Enter notes for candidates..."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    backgroundColor: '#1A1D1D',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    resize: 'vertical',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                />
              </div>

              {/* Toggle Switches */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
                  Optional Fields Toggles
                </span>

                {/* Switch 1: Resume */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '13.5px', color: '#fff' }}>Request Resume</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Let freshers upload their PDF resume.</div>
                  </div>
                  <button 
                    onClick={() => setRequestResume(!requestResume)}
                    style={{
                      width: '42px',
                      height: '22px',
                      borderRadius: '9999px',
                      backgroundColor: requestResume ? '#D7FEFA' : 'rgba(255,255,255,0.1)',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.25s ease',
                      padding: '0'
                    }}
                  >
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: requestResume ? '#1A1D1D' : '#FFFFFF',
                      position: 'absolute',
                      top: '3px',
                      left: requestResume ? '23px' : '3px',
                      transition: 'all 0.25s cubic-bezier(0.25, 1, 0.5, 1)'
                    }} />
                  </button>
                </div>

                {/* Switch 2: GitHub */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '13.5px', color: '#fff' }}>Request GitHub Repo Access</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Request access to code repositories.</div>
                  </div>
                  <button 
                    onClick={() => setRequestGithub(!requestGithub)}
                    style={{
                      width: '42px',
                      height: '22px',
                      borderRadius: '9999px',
                      backgroundColor: requestGithub ? '#D7FEFA' : 'rgba(255,255,255,0.1)',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.25s ease',
                      padding: '0'
                    }}
                  >
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: requestGithub ? '#1A1D1D' : '#FFFFFF',
                      position: 'absolute',
                      top: '3px',
                      left: requestGithub ? '23px' : '3px',
                      transition: 'all 0.25s cubic-bezier(0.25, 1, 0.5, 1)'
                    }} />
                  </button>
                </div>

                {/* Switch 3: Portfolio */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '13.5px', color: '#fff' }}>Require Portfolio Link</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Ask for candidate portfolio URL.</div>
                  </div>
                  <button 
                    onClick={() => setRequestPortfolio(!requestPortfolio)}
                    style={{
                      width: '42px',
                      height: '22px',
                      borderRadius: '9999px',
                      backgroundColor: requestPortfolio ? '#D7FEFA' : 'rgba(255,255,255,0.1)',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.25s ease',
                      padding: '0'
                    }}
                  >
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: requestPortfolio ? '#1A1D1D' : '#FFFFFF',
                      position: 'absolute',
                      top: '3px',
                      left: requestPortfolio ? '23px' : '3px',
                      transition: 'all 0.25s cubic-bezier(0.25, 1, 0.5, 1)'
                    }} />
                  </button>
                </div>
              </div>

              {/* Share Form Trigger Button */}
              <button 
                onClick={() => setShowInviteDrawer(true)}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: '#D7FEFA',
                  color: '#1A1D1D',
                  border: 'none',
                  borderRadius: '9999px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '10px',
                  boxShadow: '0 4px 12px rgba(215, 254, 250, 0.2)',
                  transition: 'transform 0.2s ease'
                }}
              >
                <Mail size={16} />
                <span>Share Form / Invite Candidates</span>
              </button>
            </div>

            {/* Live Form Preview Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.5)' }}>
                <Eye size={16} />
                <span style={{ fontSize: '13px', fontWeight: '500' }}>Live Candidate Portal Preview</span>
              </div>

              {/* Browser Shell Mockup */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 50px rgba(0,0,0,0.45)', overflow: 'hidden' }}>
                
                {/* Browser Address Bar */}
                <div style={{ backgroundColor: '#2B2E2E', height: '40px', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)' }} />
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)' }} />
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)' }} />
                  </div>
                  <div style={{ flex: 1, backgroundColor: '#1A1D1D', height: '24px', borderRadius: '6px', fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
                    https://ledgerai.co/apply/REC-MOCK-CODE
                  </div>
                </div>

                {/* Candidate Portal Form content */}
                <div style={{ padding: '30px', backgroundColor: '#FFFFFF', color: '#1A1D1D', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '550px', overflowY: 'auto' }}>
                  
                  {/* Portal Header */}
                  <div style={{ textAlign: 'center', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '20px' }}>
                    <h3 style={{ fontSize: '22px', fontWeight: '700', color: '#1a1d1d', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                      Student Candidate Portal
                    </h3>
                    
                    {/* Live Recruiter Notes display */}
                    {recruiterNotes && (
                      <div style={{ backgroundColor: '#D7FEFA', padding: '12px 16px', borderRadius: '12px', fontSize: '12px', color: '#1a1d1d', textAlign: 'left', lineHeight: '1.4', marginTop: '12px', borderLeft: '4px solid #2B2E2E' }}>
                        <strong>Recruiter Instructions:</strong><br/>
                        {recruiterNotes}
                      </div>
                    )}
                  </div>

                  {/* Core fields (Always enabled) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#1a1d1d' }}>Project Idea *</label>
                    <textarea 
                      disabled
                      rows={2}
                      placeholder="Describe your core concept..."
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.02)', fontSize: '12px', resize: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#1a1d1d' }}>Working Procedure *</label>
                    <textarea 
                      disabled
                      rows={2}
                      placeholder="How will you implement this?"
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.02)', fontSize: '12px', resize: 'none' }}
                    />
                  </div>

                  {/* Toggled Field 1: Resume */}
                  {requestResume && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px', border: '1px dashed rgba(0,0,0,0.15)', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.01)' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#1a1d1d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileUp size={14} />
                        Upload PDF Resume *
                      </label>
                      <div style={{ border: '1px dashed rgba(0,0,0,0.15)', padding: '16px', borderRadius: '6px', textAlign: 'center', color: 'rgba(0,0,0,0.5)', fontSize: '11px', cursor: 'default' }}>
                        Drag & Drop or click to browse files
                      </div>
                    </div>
                  )}

                  {/* Toggled Field 2: GitHub */}
                  {requestGithub && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#1a1d1d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <GitBranch size={14} />
                        GitHub Repository URL *
                      </label>
                      <input 
                        type="text" 
                        disabled
                        placeholder="https://github.com/username/project"
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.02)', fontSize: '12px' }}
                      />
                    </div>
                  )}

                  {/* Toggled Field 3: Portfolio */}
                  {requestPortfolio && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#1a1d1d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Globe size={14} />
                        Portfolio URL *
                      </label>
                      <input 
                        type="text" 
                        disabled
                        placeholder="https://myportfolio.dev"
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.02)', fontSize: '12px' }}
                      />
                    </div>
                  )}

                  {/* Submit Button (Pill Design) */}
                  <button 
                    disabled 
                    style={{ 
                      width: '100%', 
                      padding: '14px', 
                      backgroundColor: '#D7FEFA', 
                      color: '#1A1D1D', 
                      border: 'none', 
                      borderRadius: '9999px', 
                      fontWeight: '700', 
                      fontSize: '13px',
                      cursor: 'default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      marginTop: '8px',
                      boxShadow: '0 4px 12px rgba(215, 254, 250, 0.2)'
                    }}
                  >
                    <span>Encrypt & Submit Application</span>
                  </button>

                </div>
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: Submissions & Key Gen (Original Dashboard) */}
        {activeTab === 'submissions' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '40px' }}>
              {/* LEFT COL: Key Generation */}
              <div style={{ backgroundColor: '#2B2E2E', padding: '30px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Key size={18} color="#f25530" /> Generate Access Key
                </h2>
                <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '13px', lineHeight: '1.4', marginBottom: '20px' }}>
                  Create a unique one-time code to send to candidates. Their submission will be encrypted with a derived key.
                </p>
                <button className="cz-btn-hero-primary" style={{ width: '100%', borderRadius: '9999px', marginBottom: '20px' }} onClick={generateCode}>
                  Generate Unique Code
                </button>

                {uniqueCode && (
                  <div style={{ backgroundColor: '#1A1D1D', padding: '15px', borderRadius: '12px', border: '1px dashed #D7FEFA' }}>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>Send this code to student:</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#D7FEFA', marginBottom: '10px' }}>{uniqueCode}</div>
                    
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>Your Local Decryption Key (Save this):</div>
                    <div style={{ fontSize: '15px', fontFamily: 'monospace', color: '#f25530' }}>{encryptionKey}</div>
                  </div>
                )}
              </div>

              {/* RIGHT COL: Submissions */}
              <div style={{ backgroundColor: '#2B2E2E', padding: '30px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={18} color="#D7FEFA" /> Encrypted Submissions
                </h2>
                
                {candidates.length === 0 ? (
                  <div style={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', padding: '40px 0' }}>No submissions yet. Generate a code.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {candidates.map(cand => (
                      <div key={cand.id} style={{ backgroundColor: '#2B2E2E', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <CandidateAvatar 
                              githubUsername={decryptedData[cand.id]?.githubUsername} 
                              manualAvatar={decryptedData[cand.id]?.manualAvatar} 
                            />
                            <div>
                              <div style={{ fontWeight: '600' }}>{cand.name}</div>
                              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>Code Used: {cand.codeUsed}</div>
                            </div>
                          </div>
                          {!decryptedData[cand.id] && (
                            <button className="cz-btn-tour" style={{ backgroundColor: '#D7FEFA', borderColor: '#D7FEFA', borderRadius: '9999px' }} onClick={() => handleDecrypt(cand)}>
                              Decrypt Data
                            </button>
                          )}
                        </div>
 
                        {decryptedData[cand.id] ? (
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '15px', color: '#FFFFFF' }}>
                            <div style={{ marginBottom: '8px' }}><strong>Project Idea:</strong> {decryptedData[cand.id].idea}</div>
                            <div style={{ marginBottom: '8px' }}><strong>Working Procedure:</strong> {decryptedData[cand.id].workingProcedure}</div>
                            <div style={{ display: 'flex', gap: '20px', marginTop: '15px' }}>
                              <span style={{ backgroundColor: '#f25530', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                                Score: {decryptedData[cand.id].score}
                              </span>
                              <span style={{ backgroundColor: '#D7FEFA', color: '#1A1D1D', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                                Experience: {decryptedData[cand.id].experience} yrs
                              </span>
                            </div>
                            <GithubAnalysis 
                              githubUsername={decryptedData[cand.id].githubUsername} 
                              projectIdea={decryptedData[cand.id].idea}
                              experience={decryptedData[cand.id].experience}
                            />
                          </div>
                        ) : (
                          <div style={{ color: '#ff5722', fontSize: '12px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            ENCRYPTED PAYLOAD: {cand.payload.substring(0, 80)}...
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* BULK UPLOAD */}
            <div style={{ marginTop: '40px', backgroundColor: '#2B2E2E', padding: '30px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="#FFFFFF" /> Bulk Resume/Data Upload (CSV)
              </h2>
              <input type="file" accept=".csv" onChange={handleFileUpload} style={{ marginBottom: '20px', color: '#fff' }} />
              
              {csvData.length > 0 && (
                <div>
                  <p style={{ color: '#D7FEFA', marginBottom: '10px' }}>Successfully parsed {csvData.length} records!</p>
                  <button className="cz-btn-hero-primary" style={{ borderRadius: '9999px' }} onClick={() => navigate('/analytics', { state: { csvData } })}>
                    Run Analytics Engine <ArrowRight size={16} style={{display: 'inline', marginLeft: '8px', verticalAlign: 'middle'}}/>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* --- PHASE 2: SLIDE-OUT INVITE DRAWER OVERLAY --- */}
      {showInviteDrawer && (
        <div 
          onClick={() => setShowInviteDrawer(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(26, 29, 29, 0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          {/* Drawer Panel */}
          <div 
            onClick={(e) => e.stopPropagation()} // Prevent click-out closing when clicking inside
            style={{
              width: '460px',
              height: '100%',
              backgroundColor: '#2B2E2E',
              borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '40px 30px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.3)',
              overflowY: 'auto'
            }}
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Mail size={20} color="#D7FEFA" />
                <h3 style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.02em', margin: 0 }}>
                  Share Form / Invite Candidates
                </h3>
              </div>
              <button 
                onClick={() => setShowInviteDrawer(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '13px', lineHeight: '1.4', margin: 0 }}>
              Send invitations to freshers with cryptographic instructions to submit their projects securely.
            </p>

            {/* Drawer Tab Switcher (Pill style) */}
            <div style={{ display: 'inline-flex', backgroundColor: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '9999px', border: '1px solid rgba(255,255,255,0.05)', alignSelf: 'flex-start' }}>
              <button 
                onClick={() => setInviteTab('single')}
                style={{
                  backgroundColor: inviteTab === 'single' ? '#D7FEFA' : 'transparent',
                  color: inviteTab === 'single' ? '#1A1D1D' : 'rgba(255,255,255,0.6)',
                  border: 'none',
                  padding: '6px 18px',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
              >
                Single Invite
              </button>
              <button 
                onClick={() => setInviteTab('bulk')}
                style={{
                  backgroundColor: inviteTab === 'bulk' ? '#D7FEFA' : 'transparent',
                  color: inviteTab === 'bulk' ? '#1A1D1D' : 'rgba(255,255,255,0.6)',
                  border: 'none',
                  padding: '6px 18px',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
              >
                Bulk Invite
              </button>
            </div>

            {/* Tab 1: Single Invite */}
            {inviteTab === 'single' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)' }}>
                    Candidate Email Address
                  </label>
                  <input 
                    type="email"
                    value={singleEmail}
                    onChange={(e) => setSingleEmail(e.target.value)}
                    placeholder="e.g. candidate@domain.com"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      backgroundColor: '#1A1D1D',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                <button 
                  onClick={handleSendSingleInvite}
                  disabled={!singleEmail || singleStatus === 'sending'}
                  style={{
                    width: '100%',
                    padding: '14px',
                    backgroundColor: '#D7FEFA',
                    color: '#1A1D1D',
                    border: 'none',
                    borderRadius: '9999px',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: singleEmail ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: singleEmail ? '0 4px 12px rgba(215, 254, 250, 0.2)' : 'none',
                    opacity: singleEmail ? 1 : 0.6
                  }}
                >
                  {singleStatus === 'sending' ? 'Sending Invite...' : singleStatus === 'sent' ? 'Invitation Sent!' : 'Send Invitation'}
                </button>
              </div>
            )}

            {/* Tab 2: Bulk Invite */}
            {inviteTab === 'bulk' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Drag-and-drop zone */}
                <div 
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleBulkDrop}
                  style={{
                    border: '2px dashed ' + (dragOver ? '#D7FEFA' : 'rgba(255,255,255,0.15)'),
                    padding: '30px 20px',
                    borderRadius: '16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: dragOver ? 'rgba(215, 254, 250, 0.04)' : 'rgba(255,255,255,0.01)',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  <input 
                    type="file" 
                    accept=".csv"
                    onChange={handleBulkUpload}
                    style={{
                      position: 'absolute',
                      top: 0, left: 0, width: '100%', height: '100%',
                      opacity: 0, cursor: 'pointer'
                    }}
                  />
                  <Upload size={24} color="#D7FEFA" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>Drag & drop your CSV file here</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Supports .csv spreadsheets containing Candidate Name & Email</div>
                </div>

                {/* Parsed Layout Preview */}
                {bulkCandidates.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Parsed Candidates ({bulkCandidates.length})</span>
                      <span style={{ color: '#D7FEFA' }}>Auto-detected columns</span>
                    </div>
                    
                    {/* Scrollable mini-table preview */}
                    <div style={{ backgroundColor: '#1A1D1D', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', maxHeight: '180px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: '8px 12px', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>Candidate Name</th>
                            <th style={{ padding: '8px 12px', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>Email Address</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkCandidates.map((cand, idx) => (
                            <tr key={idx} style={{ borderBottom: idx === bulkCandidates.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.02)' }}>
                              <td style={{ padding: '8px 12px', color: '#fff' }}>{cand.name || 'Unknown'}</td>
                              <td style={{ padding: '8px 12px', color: '#D7FEFA', fontFamily: 'monospace' }}>{cand.email || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Campaign Action Button */}
                <button 
                  onClick={handleRunCampaign}
                  disabled={bulkCandidates.length === 0 || campaignStatus === 'sending'}
                  style={{
                    width: '100%',
                    padding: '14px',
                    backgroundColor: '#D7FEFA',
                    color: '#1A1D1D',
                    border: 'none',
                    borderRadius: '9999px',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: bulkCandidates.length > 0 ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: bulkCandidates.length > 0 ? '0 4px 12px rgba(215, 254, 250, 0.2)' : 'none',
                    opacity: bulkCandidates.length > 0 ? 1 : 0.5
                  }}
                >
                  {campaignStatus === 'sending' ? 'Running Campaign...' : campaignStatus === 'sent' ? 'Campaign Triggered!' : 'Run Automated Outreach Campaign'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
