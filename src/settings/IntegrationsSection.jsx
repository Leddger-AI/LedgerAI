import { useState, useEffect } from 'react';
import { Cloud, CheckCircle2, Loader2, AlertCircle, Github } from 'lucide-react';
import { getUserIdentities, unlinkProvider, loginWithGitHub, loginWithGoogleAndCalendar } from '../supabaseAuth';

export default function IntegrationsSection() {
  const [identities, setIdentities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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

  useEffect(() => {
    fetchIdentities();
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
            <Github size={18} style={{ color: 'var(--text-primary)' }} />
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
    </div>
  );
}
