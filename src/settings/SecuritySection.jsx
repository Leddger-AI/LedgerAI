import { Lock, LogOut, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function SecuritySection({ onLogout, onResetData }) {
  const [successMsg, setSuccessMsg] = useState('');

  const handleReset = () => {
    if (confirm('Reset all state and clear cached meetings? This cannot be undone.')) {
      onResetData();
      setSuccessMsg('Ledger registry completely reset.');
      setTimeout(() => setSuccessMsg(''), 3000);
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

      <div className="settings-card">
        <div className="settings-card-title">
          <Lock size={18} style={{ color: 'var(--color-cyan)' }} />
          Session Management
        </div>
        <div className="settings-card-desc">
          Manage your active session and sign out of your account.
        </div>

        <div className="settings-field" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                Sign Out
              </div>
              <div className="settings-hint" style={{ marginTop: '2px' }}>
                Log out of your Leddger-AI account. You will be returned to the login page.
              </div>
            </div>
            <button
              type="button"
              className="settings-btn settings-btn-danger"
              onClick={onLogout}
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="settings-danger-zone">
        <div className="settings-danger-zone-title">
          <AlertTriangle size={16} style={{ display: 'inline', marginRight: '6px' }} />
          Danger Zone
        </div>
        <div className="settings-danger-zone-desc">
          Irreversible and destructive actions. Proceed with caution.
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
              Reset App Registry
            </div>
            <div className="settings-hint" style={{ marginTop: '2px' }}>
              Wipe all alerts, meeting caches, and project cost logs.
            </div>
          </div>
          <button
            type="button"
            className="settings-btn settings-btn-danger"
            onClick={handleReset}
          >
            <RefreshCw size={14} />
            Format Cache
          </button>
        </div>
      </div>
    </div>
  );
}
