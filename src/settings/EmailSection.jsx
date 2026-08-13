import { useState, useEffect } from 'react';
import { Mail, CheckCircle2, Loader2, Send, AlertCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function EmailSection() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [email, setEmail] = useState('');
  const [authMethod, setAuthMethod] = useState('app_password');
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(587);
  const [appPassword, setAppPassword] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [refreshToken, setRefreshToken] = useState('');

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/email/config`, {
        headers: { 'x-test-uid': 'demo' },
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        if (data) {
          setEmail(data.email || '');
          setAuthMethod(data.authMethod || 'app_password');
          setSmtpHost(data.smtpHost || 'smtp.gmail.com');
          setSmtpPort(data.smtpPort || 587);
          setClientId(data.clientId || '');
        }
      }
    } catch (err) {
      // Config not yet set up
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      const body = { email, authMethod, smtpHost, smtpPort: parseInt(smtpPort) };
      if (authMethod === 'app_password') {
        body.appPassword = appPassword;
      } else {
        body.clientId = clientId;
        body.clientSecret = clientSecret;
        body.refreshToken = refreshToken;
      }

      const res = await fetch(`${API_BASE_URL}/api/email/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSuccessMsg('Email configuration saved!');
        setAppPassword('');
        setClientSecret('');
        setRefreshToken('');
        setTimeout(() => setSuccessMsg(''), 3000);
        fetchConfig();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to save');
      }
    } catch (err) {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSend = async () => {
    setTesting(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/email/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toEmail: email }),
      });

      if (res.ok) {
        setSuccessMsg('Test email sent! Check your inbox.');
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Test email failed');
      }
    } catch (err) {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete your email configuration?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/email/config`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSuccessMsg('Email configuration deleted.');
        setConfig(null);
        setEmail('');
        setAppPassword('');
        setClientId('');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      setErrorMsg('Failed to delete configuration.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
        <Loader2 size={16} className="spin" />
        Loading email configuration...
      </div>
    );
  }

  return (
    <div>
      {successMsg && (
        <div className="settings-success">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="settings-success" style={{ background: 'var(--color-danger-glow)', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="settings-card">
          <div className="settings-card-title">
            <Mail size={18} style={{ color: 'var(--color-cyan)' }} />
            Email Configuration
          </div>
          <div className="settings-card-desc">
            Configure SMTP settings for sending emails. Supports Gmail App Password or OAuth2.
          </div>

          <div className="settings-grid-2">
            <div className="settings-field">
              <label className="settings-label">Sender Email Address</label>
              <input
                type="email"
                className="settings-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@gmail.com"
                required
              />
            </div>

            <div className="settings-field">
              <label className="settings-label">Authentication Method</label>
              <select
                className="settings-select"
                value={authMethod}
                onChange={(e) => setAuthMethod(e.target.value)}
              >
                <option value="app_password">App Password</option>
                <option value="oauth2">OAuth2</option>
              </select>
            </div>
          </div>

          <div className="settings-grid-2">
            <div className="settings-field">
              <label className="settings-label">SMTP Host</label>
              <input
                type="text"
                className="settings-input"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
              />
            </div>

            <div className="settings-field">
              <label className="settings-label">SMTP Port</label>
              <input
                type="number"
                className="settings-input"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="587"
              />
            </div>
          </div>
        </div>

        {authMethod === 'app_password' ? (
          <div className="settings-card">
            <div className="settings-card-title">
              <Mail size={18} style={{ color: 'var(--color-purple)' }} />
              App Password Credentials
            </div>
            <div className="settings-card-desc">
              Use a Gmail App Password for authentication. Generate one in your Google Account settings.
            </div>

            <div className="settings-field">
              <label className="settings-label">App Password</label>
              <input
                type="password"
                className="settings-input"
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                placeholder="16-character app password"
              />
              <div className="settings-hint">Leave empty to keep existing password. Never displayed after saving.</div>
            </div>
          </div>
        ) : (
          <div className="settings-card">
            <div className="settings-card-title">
              <Mail size={18} style={{ color: 'var(--color-purple)' }} />
              OAuth2 Credentials
            </div>
            <div className="settings-card-desc">
              Configure Gmail OAuth2 for secure email sending without sharing your password.
            </div>

            <div className="settings-grid-2">
              <div className="settings-field">
                <label className="settings-label">Client ID</label>
                <input
                  type="text"
                  className="settings-input"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Your OAuth2 client ID"
                />
              </div>

              <div className="settings-field">
                <label className="settings-label">Client Secret</label>
                <input
                  type="password"
                  className="settings-input"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Your OAuth2 client secret"
                />
              </div>
            </div>

            <div className="settings-field">
              <label className="settings-label">Refresh Token</label>
              <input
                type="password"
                className="settings-input"
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
                placeholder="Your OAuth2 refresh token"
              />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {config && (
              <button
                type="button"
                className="settings-btn"
                onClick={handleTestSend}
                disabled={testing}
              >
                {testing ? (
                  <>
                    <Loader2 size={14} className="spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Send Test Email
                  </>
                )}
              </button>
            )}
            {config && (
              <button
                type="button"
                className="settings-btn settings-btn-danger"
                onClick={handleDelete}
              >
                Delete Config
              </button>
            )}
          </div>
          <button type="submit" className="settings-btn settings-btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
