import { useState } from 'react';
import { Lock, LogOut, RefreshCw, AlertTriangle, CheckCircle2, Loader2, Trash2, UserX } from 'lucide-react';
import { getCurrentSession } from '../supabaseAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function SecuritySection({ onLogout, onResetData, user }) {
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [deletingData, setDeletingData] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteDataModal, setShowDeleteDataModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [confirmEmailData, setConfirmEmailData] = useState('');
  const [confirmEmailAccount, setConfirmEmailAccount] = useState('');
  const [acknowledgeIrreversible, setAcknowledgeIrreversible] = useState(false);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setErrorMsg('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setSuccessMsg('');
    setTimeout(() => setErrorMsg(''), 5000);
  };

  const handleReset = () => {
    if (confirm('Reset all state and clear cached meetings? This cannot be undone.')) {
      onResetData();
      showSuccess('Ledger registry completely reset.');
    }
  };

  const handleDeleteData = async () => {
    setDeletingData(true);
    setErrorMsg('');
    try {
      const session = await getCurrentSession();
      const res = await fetch(`${API_BASE_URL}/api/user/data`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmEmail: confirmEmailData }),
      });

      if (res.ok) {
        const data = await res.json();
        showSuccess('All your data has been deleted. Your account remains active.');
        setShowDeleteDataModal(false);
        setConfirmEmailData('');
        setTimeout(() => onLogout(), 2000);
      } else {
        const data = await res.json().catch(() => ({}));
        showError(data.error || 'Failed to delete data.');
      }
    } catch (err) {
      showError('Network error. Please try again.');
    } finally {
      setDeletingData(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    setErrorMsg('');
    try {
      const session = await getCurrentSession();
      const res = await fetch(`${API_BASE_URL}/api/user/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmEmail: confirmEmailAccount }),
      });

      if (res.ok) {
        showSuccess('Your account has been permanently deleted.');
        setShowDeleteAccountModal(false);
        setConfirmEmailAccount('');
        setAcknowledgeIrreversible(false);
        setTimeout(() => onLogout(), 2000);
      } else {
        const data = await res.json().catch(() => ({}));
        showError(data.error || 'Failed to delete account.');
      }
    } catch (err) {
      showError('Network error. Please try again.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const userEmail = user?.email || '';

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
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
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
            <button type="button" className="settings-btn settings-btn-danger" onClick={onLogout}>
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
              Reset App Registry
            </div>
            <div className="settings-hint" style={{ marginTop: '2px' }}>
              Wipe all alerts, meeting caches, and project cost logs from your browser.
            </div>
          </div>
          <button type="button" className="settings-btn settings-btn-danger" onClick={handleReset}>
            <RefreshCw size={14} />
            Format Cache
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
              Delete All Data
            </div>
            <div className="settings-hint" style={{ marginTop: '2px' }}>
              Permanently delete all your data from Supabase, MongoDB, and Cloudinary. Your login account remains active.
            </div>
          </div>
          <button type="button" className="settings-btn settings-btn-danger" onClick={() => setShowDeleteDataModal(true)}>
            <Trash2 size={14} />
            Delete Data
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-danger)' }}>
              Delete Account
            </div>
            <div className="settings-hint" style={{ marginTop: '2px' }}>
              Permanently delete your account and ALL associated data. This is irreversible — you will not be able to log in again.
            </div>
          </div>
          <button type="button" className="settings-btn settings-btn-danger" onClick={() => setShowDeleteAccountModal(true)}>
            <UserX size={14} />
            Delete Account
          </button>
        </div>
      </div>

      {showDeleteDataModal && (
        <div className="modal-overlay" onClick={() => !deletingData && setShowDeleteDataModal(false)}>
          <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Delete All Data</h3>
              {!deletingData && <button className="modal-close-btn" onClick={() => setShowDeleteDataModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><RefreshCw size={16} /></button>}
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              This will permanently delete <strong style={{ color: 'var(--text-primary)' }}>all your data</strong> across Supabase, MongoDB, and Cloudinary, including:
              <ul style={{ margin: '8px 0', paddingLeft: '20px', color: 'var(--text-muted)', fontSize: '12px' }}>
                <li>Profile info, avatar, departments</li>
                <li>All form drafts and submissions</li>
                <li>All meetings, alerts, candidates</li>
                <li>All email accounts, drafts, campaigns</li>
                <li>All email send logs</li>
              </ul>
              Your <strong style={{ color: 'var(--text-primary)' }}>login account will remain active</strong> — you can log back in with a fresh workspace.
            </div>

            <div className="form-group">
              <label className="form-label">Type your email to confirm: <strong style={{ color: 'var(--text-primary)' }}>{userEmail}</strong></label>
              <input
                type="email"
                className="settings-input"
                value={confirmEmailData}
                onChange={(e) => setConfirmEmailData(e.target.value)}
                placeholder={userEmail}
                disabled={deletingData}
              />
            </div>

            <div className="modal-footer">
              <button className="settings-btn" onClick={() => setShowDeleteDataModal(false)} disabled={deletingData}>
                Cancel
              </button>
              <button
                className="settings-btn settings-btn-danger"
                onClick={handleDeleteData}
                disabled={deletingData || confirmEmailData !== userEmail}
              >
                {deletingData ? <><Loader2 size={14} className="spin" /> Deleting...</> : <><Trash2 size={14} /> Delete All Data</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteAccountModal && (
        <div className="modal-overlay" onClick={() => !deletingAccount && setShowDeleteAccountModal(false)}>
          <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: 'var(--color-danger)' }}>Delete Account Permanently</h3>
              {!deletingAccount && <button className="modal-close-btn" onClick={() => setShowDeleteAccountModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><RefreshCw size={16} /></button>}
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              <AlertTriangle size={16} style={{ color: 'var(--color-danger)', marginBottom: '4px' }} />
              This will <strong style={{ color: 'var(--color-danger)' }}>permanently delete your account</strong> and ALL associated data. You will <strong>never be able to log in again</strong> with this email. This action is <strong>irreversible</strong>.
            </div>

            <div className="form-group">
              <label className="form-label">Type your email to confirm: <strong style={{ color: 'var(--text-primary)' }}>{userEmail}</strong></label>
              <input
                type="email"
                className="settings-input"
                value={confirmEmailAccount}
                onChange={(e) => setConfirmEmailAccount(e.target.value)}
                placeholder={userEmail}
                disabled={deletingAccount}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={acknowledgeIrreversible}
                  onChange={(e) => setAcknowledgeIrreversible(e.target.checked)}
                  disabled={deletingAccount}
                />
                I understand this action is irreversible and will permanently delete my account and all data.
              </label>
            </div>

            <div className="modal-footer">
              <button className="settings-btn" onClick={() => setShowDeleteAccountModal(false)} disabled={deletingAccount}>
                Cancel
              </button>
              <button
                className="settings-btn settings-btn-danger"
                onClick={handleDeleteAccount}
                disabled={deletingAccount || confirmEmailAccount !== userEmail || !acknowledgeIrreversible}
              >
                {deletingAccount ? <><Loader2 size={14} className="spin" /> Deleting...</> : <><UserX size={14} /> Delete Account Permanently</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
