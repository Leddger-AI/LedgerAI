import { useState, useEffect } from 'react';
import { Plug, Cloud, CheckCircle2, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function IntegrationsSection() {
  const [cloudName, setCloudName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [status, setStatus] = useState(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const checkStatus = async () => {
    setChecking(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/cloudinary/status`);
      const data = await res.json();
      setStatus(data);
      if (data.configured) {
        setCloudName(data.cloudName || '');
      }
    } catch (err) {
      setStatus({ configured: false, message: 'Unable to reach server' });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/cloudinary/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloudName,
          apiKey,
          apiSecret,
        }),
      });

      if (res.ok) {
        setSuccessMsg('Cloudinary configuration saved!');
        setApiSecret('');
        setTimeout(() => setSuccessMsg(''), 3000);
        checkStatus();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to save configuration');
      }
    } catch (err) {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

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

      {/* Cloudinary Integration Card */}
      <div className="settings-card">
        <div className="settings-card-title" style={{ justifyContent: 'space-between', display: 'flex' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cloud size={18} style={{ color: 'var(--color-cyan)' }} />
            Cloudinary
          </div>
          {status && (
            <span className={`settings-status-badge ${status.configured ? 'connected' : 'disconnected'}`}>
              {status.configured ? (
                <>
                  <CheckCircle2 size={12} />
                  Connected
                </>
              ) : (
                <>
                  <AlertCircle size={12} />
                  Not Configured
                </>
              )}
            </span>
          )}
        </div>
        <div className="settings-card-desc">
          Cloudinary provides cloud-based image and video storage, optimization, and delivery via CDN.
          Configure your account to enable avatar uploads and file attachments.
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
          <button
            type="button"
            className="settings-btn"
            onClick={checkStatus}
            disabled={checking}
          >
            {checking ? (
              <>
                <Loader2 size={14} className="spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                Check Status
              </>
            )}
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="settings-grid-2">
            <div className="settings-field">
              <label className="settings-label">Cloud Name</label>
              <input
                type="text"
                className="settings-input"
                value={cloudName}
                onChange={(e) => setCloudName(e.target.value)}
                placeholder="e.g. my-cloud-name"
              />
              <div className="settings-hint">Found in your Cloudinary console dashboard.</div>
            </div>

            <div className="settings-field">
              <label className="settings-label">API Key</label>
              <input
                type="text"
                className="settings-input"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Your Cloudinary API key"
              />
            </div>
          </div>

          <div className="settings-field">
            <label className="settings-label">API Secret</label>
            <input
              type="password"
              className="settings-input"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="Your Cloudinary API secret"
            />
            <div className="settings-hint">Stored securely on the server. Never exposed to the client.</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="settings-btn settings-btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={14} className="spin" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Future integrations placeholder */}
      <div className="settings-card" style={{ opacity: 0.6 }}>
        <div className="settings-card-title">
          <Plug size={18} style={{ color: 'var(--text-muted)' }} />
          More Integrations
        </div>
        <div className="settings-card-desc">
          Additional integrations will appear here as they become available.
        </div>
      </div>
    </div>
  );
}
