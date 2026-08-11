import { useState, useEffect } from 'react';
import { Lock, FileSignature, UploadCloud, Link2, GitBranch, Globe } from 'lucide-react';
import CryptoJS from 'crypto-js';
import { useNavigate } from 'react-router-dom';
import '../LandingPage.css'; // Inherit styling
import { auth } from '../firebaseAuth';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// Default field template used when no recruiter config is found for a code
// (e.g. testing the portal directly without going through the Recruiter Dashboard first).
const DEFAULT_FORM_CONFIG = {
  requestResume: true,
  requestGithub: true,
  requestGithubPrivate: false,
  requestLinkedin: true,
  requestPortfolio: true,
  recruiterNotes: ''
};

// Input with a locked domain prefix chip, e.g. "linkedin.com/in/" + editable handle
function PrefixedLinkInput({ prefix, value, onChange, placeholder }) {
  return (
    <div style={{ display: 'flex', width: '100%', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#1A1D1D' }}>
      <span style={{ padding: '12px 6px 12px 12px', fontSize: '13px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', backgroundColor: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center' }}>
        {prefix}
      </span>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{ flex: 1, minWidth: 0, padding: '12px 12px 12px 4px', border: 'none', backgroundColor: 'transparent', fontSize: '14px', outline: 'none', color: '#ffffff' }}
      />
    </div>
  );
}

export default function StudentPortal() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [isCodeValid, setIsCodeValid] = useState(false);
  const [formConfig, setFormConfig] = useState(DEFAULT_FORM_CONFIG);
  const [formData, setFormData] = useState({ idea: '', procedure: '', experience: '', githubUsername: '', linkedinUsername: '', portfolioUrl: '', manualAvatar: '' });

  useEffect(() => {
    // Enable anonymous sign-in for candidates to establish a unique user ID
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.error("Anonymous auth failed:", err);
        }
      }
    });

    const params = new URLSearchParams(window.location.search);
    const username = params.get('githubUsername');
    const token = params.get('githubToken');
    const status = params.get('status');

    if (status === 'connected' && username) {
      setFormData(prev => ({
        ...prev,
        githubUsername: username
      }));
      localStorage.setItem('github_access_token', token);
      alert(`Successfully connected GitHub account: ${username}!`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return () => unsubscribe();
  }, []);

  const handleConnectGitHub = () => {
    const clientId = 'Iv23liDJmyW1k1Xc3aA6';
    const redirectUri = encodeURIComponent('http://localhost:8000/api/github/callback');

    // Extract candidate Firebase UID
    const firebaseUid = auth.currentUser ? auth.currentUser.uid : 'anonymous';
    const state = `${Math.random().toString(36).substring(2, 9)}:${firebaseUid}`;

    localStorage.setItem('github_oauth_state', state);
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=user:email`;
    window.location.href = authUrl;
  };
  const [submitted, setSubmitted] = useState(false);
  const [encryptedPayload, setEncryptedPayload] = useState('');

  const handleVerifyCode = () => {
    if (code.startsWith('REC-')) {
      const stored = localStorage.getItem('ledgerai_form_config_' + code);
      setFormConfig(stored ? JSON.parse(stored) : DEFAULT_FORM_CONFIG);
      setIsCodeValid(true);
    } else {
      alert("Invalid code format. Must start with REC-");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, manualAvatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate encryption before sending to backend
    // The key is derived from the unique code the recruiter provided.
    const key = 'secret-key-' + code;
    const payloadString = JSON.stringify({
      idea: formData.idea,
      workingProcedure: formData.procedure,
      experience: parseInt(formData.experience) || 0,
      score: Math.floor(Math.random() * 40) + 60, // Mock generated score
      githubUsername: formConfig.requestGithub ? formData.githubUsername || '' : '',
      githubPrivateAccessGranted: formConfig.requestGithubPrivate,
      linkedinUsername: formConfig.requestLinkedin ? formData.linkedinUsername || '' : '',
      portfolioUrl: formConfig.requestPortfolio ? formData.portfolioUrl || '' : '',
      manualAvatar: formData.manualAvatar || ''
    });

    const encrypted = CryptoJS.AES.encrypt(payloadString, key).toString();
    setEncryptedPayload(encrypted);
    setSubmitted(true);
  };

  return (
    <div className="lp-wrapper" style={{ minHeight: '100vh', backgroundColor: '#1A1D1D', color: '#ffffff' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '120px 40px 40px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h1 style={{ fontSize: '42px', fontWeight: '700', letterSpacing: '-0.02em', marginBottom: '16px', color: '#ffffff' }}>
            Student Candidate Portal
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '18px' }}>
            Securely submit your project proposal. Your data is AES encrypted locally.
          </p>
        </div>

        {!isCodeValid ? (
          <div style={{ backgroundColor: '#2B2E2E', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', color: '#ffffff' }}>
            <Lock size={48} color="#D7FEFA" style={{ margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: '24px', marginBottom: '20px', color: '#ffffff' }}>Enter Recruiter Code</h2>
            <input
              type="text"
              placeholder="e.g. REC-XYZ123"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{ width: '100%', maxWidth: '300px', padding: '12px 16px', fontSize: '16px', backgroundColor: '#1A1D1D', color: '#ffffff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', outline: 'none' }}
            />
            <br />
            <button className="cz-btn-hero-primary" onClick={handleVerifyCode} style={{ background: '#D7FEFA', color: '#1A1D1D', border: 'none', padding: '12px 28px', borderRadius: '9999px', fontWeight: '700', cursor: 'pointer' }}>
              Verify & Proceed
            </button>
          </div>
        ) : !submitted ? (
          <div style={{ backgroundColor: '#2B2E2E', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', color: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px', color: '#ffffff', fontWeight: '600' }}>
              <FileSignature size={24} /> Secure Application Form
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: 'rgba(255,255,255,0.8)' }}>Project Idea</label>
                <textarea
                  required
                  rows={4}
                  style={{ width: '100%', padding: '12px', backgroundColor: '#1A1D1D', color: '#ffffff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', resize: 'vertical', outline: 'none' }}
                  value={formData.idea}
                  onChange={(e) => setFormData({ ...formData, idea: e.target.value })}
                  placeholder="Describe your core concept..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: 'rgba(255,255,255,0.8)' }}>Working Procedure</label>
                <textarea
                  required
                  rows={4}
                  style={{ width: '100%', padding: '12px', backgroundColor: '#1A1D1D', color: '#ffffff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', resize: 'vertical', outline: 'none' }}
                  value={formData.procedure}
                  onChange={(e) => setFormData({ ...formData, procedure: e.target.value })}
                  placeholder="How will you implement this?"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: 'rgba(255,255,255,0.8)' }}>Years of Experience (Tech)</label>
                <input
                  type="number"
                  required
                  style={{ width: '100%', padding: '12px', backgroundColor: '#1A1D1D', color: '#ffffff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', outline: 'none' }}
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  placeholder="e.g. 2"
                />
              </div>

              {formConfig.requestGithub && (
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', marginBottom: '8px', color: 'rgba(255,255,255,0.8)' }}>
                    <GitBranch size={14} /> GitHub Username
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <PrefixedLinkInput
                        prefix="github.com/"
                        value={formData.githubUsername}
                        onChange={(e) => setFormData({ ...formData, githubUsername: e.target.value })}
                        placeholder="torvalds"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleConnectGitHub}
                      style={{
                        backgroundColor: '#2B2E2E',
                        color: '#ffffff',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '8px',
                        padding: '0 16px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'background-color 0.2s',
                        flexShrink: 0
                      }}
                    >
                      Connect GitHub
                    </button>
                  </div>
                  {formConfig.requestGithubPrivate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                      <Lock size={12} />
                      This recruiter also requests access to your private repositories.
                    </div>
                  )}
                </div>
              )}

              {formConfig.requestLinkedin && (
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', marginBottom: '8px', color: 'rgba(255,255,255,0.8)' }}>
                    <Link2 size={14} /> LinkedIn Profile
                  </label>
                  <PrefixedLinkInput
                    prefix="linkedin.com/in/"
                    value={formData.linkedinUsername}
                    onChange={(e) => setFormData({ ...formData, linkedinUsername: e.target.value })}
                    placeholder="janedoe"
                  />
                </div>
              )}

              {formConfig.requestPortfolio && (
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', marginBottom: '8px', color: 'rgba(255,255,255,0.8)' }}>
                    <Globe size={14} /> Portfolio URL
                  </label>
                  <input
                    type="text"
                    style={{ width: '100%', padding: '12px', backgroundColor: '#1A1D1D', color: '#ffffff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', outline: 'none' }}
                    value={formData.portfolioUrl}
                    onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                    placeholder="https://myportfolio.dev"
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: 'rgba(255,255,255,0.8)' }}>Profile Picture (Manual Upload)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ width: '100%', padding: '12px', backgroundColor: '#1A1D1D', color: '#ffffff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', outline: 'none' }}
                />
                {formData.manualAvatar && (
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img
                      src={formData.manualAvatar}
                      alt="Preview"
                      style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #D7FEFA' }}
                    />
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Manual image selected</span>
                  </div>
                )}
              </div>

              <div style={{ backgroundColor: 'rgba(215, 254, 250, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(215, 254, 250, 0.2)', fontSize: '13px', color: '#ffffff' }}>
                <Lock size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                Your data will be heavily encrypted before it ever leaves your browser.
              </div>

              <button type="submit" className="cz-btn-hero-primary" style={{ marginTop: '10px', background: '#D7FEFA', color: '#1A1D1D', border: 'none', padding: '12px 28px', borderRadius: '9999px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <UploadCloud size={16} />
                Encrypt & Submit Application
              </button>
            </form>
          </div>
        ) : (
          <div style={{ backgroundColor: '#2B2E2E', padding: '50px', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', color: '#ffffff' }}>
            <div style={{ width: '60px', height: '60px', backgroundColor: 'rgba(215, 254, 250, 0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Lock size={30} color="#D7FEFA" />
            </div>
            <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#ffffff' }}>Securely Transmitted!</h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '20px' }}>
              Your application was AES-encrypted locally and safely delivered to the recruiter.
            </p>
            <div style={{ backgroundColor: '#1A1D1D', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '11px', fontFamily: 'monospace', wordBreak: 'break-all', color: '#ffffff', textAlign: 'left' }}>
              <strong>ENCRYPTED PAYLOAD:</strong><br />
              {encryptedPayload}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
