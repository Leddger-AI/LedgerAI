import { useState, useEffect } from 'react';
import { Cloud, CheckCircle2, Loader2, RefreshCw, AlertCircle, GitBranch, Plug, HardDrive } from 'lucide-react';
import { getUserIdentities, unlinkProvider, loginWithGitHub, loginWithGoogleAndCalendar, getAuthToken } from '../supabaseAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function IntegrationsSection() {
  const [identities, setIdentities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [cloudinaryStatus, setCloudinaryStatus] = useState(null);
  const [cloudinaryChecking, setCloudinaryChecking] = useState(false);
  const [driveStatus, setDriveStatus] = useState(null);
  const [driveChecking, setDriveChecking] = useState(false);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setErrorMsg('');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setSuccessMsg('');
    setTimeout(() => setErrorMsg(''), 4000);
  };

  const fetchIdentities = async () => {
    setLoading(true);
    try {
      const ids = await getUserIdentities();
      setIdentities(ids);
    } catch (err) {
      setIdentities([]);
    } finally {
      setLoading(false);
    }
  };

  const checkCloudinaryStatus = async () => {
    setCloudinaryChecking(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/cloudinary/status`);
      const data = await res.json();
      setCloudinaryStatus(data);
    } catch (err) {
      setCloudinaryStatus({ configured: false, message: 'Unable to reach server' });
    } finally {
      setCloudinaryChecking(false);
    }
  };

  const checkDriveStatus = async () => {
    setDriveChecking(true);
    try {
      const token = await getAuthToken();
      if (!token) { setDriveStatus({ connected: false }); return; }
      const res = await fetch(`${API_BASE_URL}/api/google-drive/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDriveStatus(data);
    } catch (err) {
      setDriveStatus({ connected: false });
    } finally {
      setDriveChecking(false);
    }
  };

  const handleConnectDrive = async () => {
    setActionLoading('drive-connect');
    try {
      const token = await getAuthToken();
      if (!token) { showError('Not authenticated. Please log in again.'); return; }
      const res = await fetch(`${API_BASE_URL}/api/google-drive/auth`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        showError('Failed to get Google Drive auth URL.');
      }
    } catch (err) {
      showError('Failed to connect Google Drive. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnectDrive = async () => {
    if (!confirm('Disconnect Google Drive? You can reconnect anytime.')) return;
    setActionLoading('drive-disconnect');
    try {
      const token = await getAuthToken();
      if (!token) { showError('Not authenticated. Please log in again.'); return; }
      const res = await fetch(`${API_BASE_URL}/api/google-drive/disconnect`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showSuccess('Google Drive disconnected successfully.');
        checkDriveStatus();
      } else {
        showError('Failed to disconnect Google Drive.');
      }
    } catch (err) {
      showError('Network error. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchIdentities();
    checkCloudinaryStatus();
    checkDriveStatus();

    const params = new URLSearchParams(window.location.search);
    const driveParam = params.get('drive');
    if (driveParam === 'connected') {
      showSuccess('Google Drive connected successfully!');
    } else if (driveParam === 'error') {
      showError('Failed to connect Google Drive. Please try again.');
    }
    if (driveParam) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const hasProvider = (provider) => identities.some((id) => id.provider === provider);

  const handleConnectGitHub = async () => {
    setActionLoading('github-connect');
    try {
      await loginWithGitHub();
    } catch (err) {
      showError('Failed to connect GitHub. Please try again.');
      setActionLoading(null);
    }
  };

  const handleConnectGoogle = async () => {
    setActionLoading('google-connect');
    try {
      await loginWithGoogleAndCalendar();
    } catch (err) {
      showError('Failed to connect Google. Please try again.');
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (provider) => {
    const providerName = provider === 'github' ? 'GitHub' : 'Google Calendar';
    if (!confirm(`Disconnect ${providerName}? You can reconnect anytime.`)) return;
    setActionLoading(`${provider}-disconnect`);
    try {
      const { error } = await unlinkProvider(provider);
      if (error) {
        showError(`Failed to disconnect: ${error}`);
      } else {
        showSuccess(`${providerName} disconnected successfully.`);
        await fetchIdentities();
      }
    } catch (err) {
      showError('Network error. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
        <Loader2 size={16} className="spin" />
        Loading integrations...
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

      {/* GitHub Integration */}
      <div className="settings-card">
        <div className="settings-card-title" style={{ justifyContent: 'space-between', display: 'flex' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitBranch size={18} style={{ color: 'var(--text-primary)' }} />
            GitHub
          </div>
          <span className={`settings-status-badge ${hasProvider('github') ? 'connected' : 'disconnected'}`}>
            {hasProvider('github') ? (
              <><CheckCircle2 size={12} /> Connected</>
            ) : (
              <><AlertCircle size={12} /> Not Connected</>
            )}
          </span>
        </div>
        <div className="settings-card-desc">
          Connect GitHub to enable repository access, branch creation, and pull request tracking for project tasks.
        </div>
        <div style={{ marginTop: '12px' }}>
          {hasProvider('github') ? (
            <button
              type="button"
              className="settings-btn settings-btn-danger"
              onClick={() => handleDisconnect('github')}
              disabled={actionLoading === 'github-disconnect'}
            >
              {actionLoading === 'github-disconnect' ? <><Loader2 size={14} className="spin" /> Disconnecting...</> : 'Disconnect GitHub'}
            </button>
          ) : (
            <button
              type="button"
              className="settings-btn settings-btn-primary"
              onClick={handleConnectGitHub}
              disabled={actionLoading === 'github-connect'}
            >
              {actionLoading === 'github-connect' ? <><Loader2 size={14} className="spin" /> Connecting...</> : 'Connect GitHub'}
            </button>
          )}
        </div>
      </div>

      {/* Google Calendar Integration */}
      <div className="settings-card">
        <div className="settings-card-title" style={{ justifyContent: 'space-between', display: 'flex' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cloud size={18} style={{ color: 'var(--color-cyan)' }} />
            Google Calendar
          </div>
          <span className={`settings-status-badge ${hasProvider('google') ? 'connected' : 'disconnected'}`}>
            {hasProvider('google') ? (
              <><CheckCircle2 size={12} /> Connected</>
            ) : (
              <><AlertCircle size={12} /> Not Connected</>
            )}
          </span>
        </div>
        <div className="settings-card-desc">
          Connect Google Calendar to sync meetings, schedule interviews, and automate calendar-based workflows.
        </div>
        <div style={{ marginTop: '12px' }}>
          {hasProvider('google') ? (
            <button
              type="button"
              className="settings-btn settings-btn-danger"
              onClick={() => handleDisconnect('google')}
              disabled={actionLoading === 'google-disconnect'}
            >
              {actionLoading === 'google-disconnect' ? <><Loader2 size={14} className="spin" /> Disconnecting...</> : 'Disconnect Google'}
            </button>
          ) : (
            <button
              type="button"
              className="settings-btn settings-btn-primary"
              onClick={handleConnectGoogle}
              disabled={actionLoading === 'google-connect'}
            >
              {actionLoading === 'google-connect' ? <><Loader2 size={14} className="spin" /> Connecting...</> : 'Connect Google'}
            </button>
          )}
        </div>
      </div>

      {/* Google Drive Integration */}
      <div className="settings-card">
        <div className="settings-card-title" style={{ justifyContent: 'space-between', display: 'flex' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HardDrive size={18} style={{ color: 'var(--color-cyan)' }} />
            Google Drive
          </div>
          {driveStatus && (
            <span className={`settings-status-badge ${driveStatus.connected ? 'connected' : 'disconnected'}`}>
              {driveStatus.connected ? (
                <><CheckCircle2 size={12} /> Connected</>
              ) : (
                <><AlertCircle size={12} /> Not Connected</>
              )}
            </span>
          )}
        </div>
        <div className="settings-card-desc">
          Connect Google Drive to save analytics exports (CSV, Google Sheets, JSON) directly to your Drive.
        </div>
        {driveStatus?.connected && driveStatus.email && (
          <div className="settings-hint" style={{ marginTop: '8px' }}>
            Connected as <strong>{driveStatus.email}</strong>
          </div>
        )}
        <div style={{ marginTop: '12px' }}>
          {driveStatus?.connected ? (
            <button
              type="button"
              className="settings-btn settings-btn-danger"
              onClick={handleDisconnectDrive}
              disabled={actionLoading === 'drive-disconnect'}
            >
              {actionLoading === 'drive-disconnect' ? <><Loader2 size={14} className="spin" /> Disconnecting...</> : 'Disconnect Drive'}
            </button>
          ) : (
            <button
              type="button"
              className="settings-btn settings-btn-primary"
              onClick={handleConnectDrive}
              disabled={actionLoading === 'drive-connect'}
            >
              {actionLoading === 'drive-connect' ? <><Loader2 size={14} className="spin" /> Connecting...</> : 'Connect Google Drive'}
            </button>
          )}
        </div>
      </div>

      {/* Cloudinary — server-managed, read-only */}
      <div className="settings-card">
        <div className="settings-card-title" style={{ justifyContent: 'space-between', display: 'flex' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cloud size={18} style={{ color: 'var(--color-cyan)' }} />
            Cloudinary
          </div>
          {cloudinaryStatus && (
            <span className={`settings-status-badge ${cloudinaryStatus.configured ? 'connected' : 'disconnected'}`}>
              {cloudinaryStatus.configured ? (
                <><CheckCircle2 size={12} /> Connected</>
              ) : (
                <><AlertCircle size={12} /> Not Configured</>
              )}
            </span>
          )}
        </div>
        <div className="settings-card-desc">
          Image storage for avatars and file attachments. Managed by the server administrator via environment variables.
        </div>
        {cloudinaryStatus && !cloudinaryStatus.configured && (
          <div className="settings-hint" style={{ marginTop: '8px' }}>
            Avatar uploads and file attachments are unavailable until Cloudinary is configured on the server.
          </div>
        )}
        <div style={{ marginTop: '12px' }}>
          <button
            type="button"
            className="settings-btn"
            onClick={checkCloudinaryStatus}
            disabled={cloudinaryChecking}
          >
            {cloudinaryChecking ? (
              <><Loader2 size={14} className="spin" /> Checking...</>
            ) : (
              <><RefreshCw size={14} /> Check Status</>
            )}
          </button>
        </div>
      </div>

      {/* More Integrations — placeholder */}
      <div className="settings-card" style={{ opacity: 0.6 }}>
        <div className="settings-card-title" style={{ justifyContent: 'space-between', display: 'flex' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plug size={18} style={{ color: 'var(--text-muted)' }} />
            More Integrations
          </div>
          <span className="settings-status-badge disconnected">
            Coming Soon
          </span>
        </div>
        <div className="settings-card-desc">
          Slack, Zapier, and additional integrations will appear here as they become available.
        </div>
      </div>
    </div>
  );
}
