import { useState } from 'react';
import { Lock, LogOut, RefreshCw, AlertTriangle, CheckCircle2, Loader2, Trash2, UserX } from 'lucide-react';
import { getCurrentSession } from '../supabaseAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function SecuritySection({ onLogout, onResetData, user }) {
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [deletingData, setDeletingData] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [confirmEmailData, setConfirmEmailData] = useState('');
  const [confirmEmailAccount, setConfirmEmailAccount] = useState('');
  const [ackReset, setAckReset] = useState(false);
  const [ackDeleteData, setAckDeleteData] = useState(false);
  const [ackDeleteAccount, setAckDeleteAccount] = useState(false);

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
    onResetData();
    showSuccess('Ledger registry completely reset.');
    setAckReset(false);
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
        showSuccess('All your data has been deleted. Your account remains active.');
        setConfirmEmailData('');
        setAckDeleteData(false);
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
        setConfirmEmailAccount('');
        setAckDeleteAccount(false);
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

  const dividerStyle = { borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px' };
  const checkboxLabelStyle = { display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' };
  const checkboxStyle = { marginTop: '2px', cursor: 'pointer' };

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

        {/* Reset App Registry */}
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
            Reset App Registry
          </div>
          <div className="settings-hint" style={{ marginTop: '2px', marginBottom: '12px' }}>
            Wipe all alerts, meeting caches, and project cost logs from your browser.
          </div>
          <label style={checkboxLabelStyle}>
            <input type="checkbox" checked={ackReset} onChange={(e) => setAckReset(e.target.checked)} style={checkboxStyle} />
            <span>I understand this will clear all local cached data from my browser.</span>
          </label>
          <button type="button" className="settings-btn settings-btn-danger" onClick={handleReset} disabled={!ackReset}>
            <RefreshCw size={14} />
            Format Cache
          </button>
        </div>

        {/* Delete All Data */}
        <div style={dividerStyle}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
            Delete All Data
          </div>
          <div className="settings-hint" style={{ marginTop: '2px', marginBottom: '12px' }}>
            Permanently delete all your data from Supabase, MongoDB, and Cloudinary. Your login account remains active.
          </div>
          <label style={checkboxLabelStyle}>
            <input type="checkbox" checked={ackDeleteData} onChange={(e) => setAckDeleteData(e.target.checked)} disabled={deletingData} style={checkboxStyle} />
            <span>I understand this will permanently delete all my data across all services. My login account will remain active.</span>
          </label>
          {ackDeleteData && (
            <div className="settings-field" style={{ marginBottom: '12px' }}>
              <label className="settings-label">Type your email to confirm: <strong style={{ color: 'var(--text-primary)' }}>{userEmail}</strong></label>
              <input
                type="email"
                className="settings-input"
                value={confirmEmailData}
                onChange={(e) => setConfirmEmailData(e.target.value)}
                placeholder={userEmail}
                disabled={deletingData}
              />
            </div>
          )}
          <button
            type="button"
            className="settings-btn settings-btn-danger"
            onClick={handleDeleteData}
            disabled={deletingData || !ackDeleteData || confirmEmailData !== userEmail}
          >
            {deletingData ? <><Loader2 size={14} className="spin" /> Deleting...</> : <><Trash2 size={14} /> Delete All Data</>}
          </button>
        </div>

        {/* Delete Account */}
        <div style={dividerStyle}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-danger)' }}>
            Delete Account
          </div>
          <div className="settings-hint" style={{ marginTop: '2px', marginBottom: '12px' }}>
            Permanently delete your account and ALL associated data. This is irreversible — you will not be able to log in again.
          </div>
          <label style={checkboxLabelStyle}>
            <input type="checkbox" checked={ackDeleteAccount} onChange={(e) => setAckDeleteAccount(e.target.checked)} disabled={deletingAccount} style={checkboxStyle} />
            <span>I understand this action is irreversible and will permanently delete my account and all data.</span>
          </label>
          {ackDeleteAccount && (
            <div className="settings-field" style={{ marginBottom: '12px' }}>
              <label className="settings-label">Type your email to confirm: <strong style={{ color: 'var(--text-primary)' }}>{userEmail}</strong></label>
              <input
                type="email"
                className="settings-input"
                value={confirmEmailAccount}
                onChange={(e) => setConfirmEmailAccount(e.target.value)}
                placeholder={userEmail}
                disabled={deletingAccount}
              />
            </div>
          )}
          <button
            type="button"
            className="settings-btn settings-btn-danger"
            onClick={handleDeleteAccount}
            disabled={deletingAccount || !ackDeleteAccount || confirmEmailAccount !== userEmail}
          >
            {deletingAccount ? <><Loader2 size={14} className="spin" /> Deleting...</> : <><UserX size={14} /> Delete Account Permanently</>}
          </button>
        </div>
      </div>
    </div>
  );
}
