import { useState, useEffect } from 'react';
import { Mail, CheckCircle2, Loader2, Send, AlertCircle, Plus, Trash2, Star, Edit2, X } from 'lucide-react';
import { getCurrentSession } from '../supabaseAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function EmailSection() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [email, setEmail] = useState('');
  const [label, setLabel] = useState('');
  const [authMethod, setAuthMethod] = useState('app_password');
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(587);
  const [appPassword, setAppPassword] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [refreshToken, setRefreshToken] = useState('');

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

  const resetForm = () => {
    setEmail('');
    setLabel('');
    setAuthMethod('app_password');
    setSmtpHost('smtp.gmail.com');
    setSmtpPort(587);
    setAppPassword('');
    setClientId('');
    setClientSecret('');
    setRefreshToken('');
    setEditingId(null);
    setShowAddForm(false);
  };

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const session = await getCurrentSession();
      const res = await fetch(`${API_BASE_URL}/api/email/accounts`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      const session = await getCurrentSession();

      const body = { email, label, authMethod, smtpHost, smtpPort: parseInt(smtpPort) };
      if (authMethod === 'app_password') {
        if (appPassword) body.appPassword = appPassword;
      } else {
        if (refreshToken) body.refreshToken = refreshToken;
        if (clientId) body.clientId = clientId;
        if (clientSecret) body.clientSecret = clientSecret;
      }

      const url = editingId
        ? `${API_BASE_URL}/api/email/accounts/${editingId}`
        : `${API_BASE_URL}/api/email/accounts`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showSuccess(editingId ? 'Email account updated!' : 'Email account added!');
        resetForm();
        fetchAccounts();
      } else {
        const data = await res.json().catch(() => ({}));
        showError(data.error || 'Failed to save');
      }
    } catch (err) {
      showError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (account) => {
    setEditingId(account.id);
    setShowAddForm(true);
    setEmail(account.email);
    setLabel(account.label || '');
    setAuthMethod(account.authMethod);
    setSmtpHost(account.smtpHost);
    setSmtpPort(account.smtpPort);
    setClientId(account.clientId || '');
    setAppPassword('');
    setClientSecret('');
    setRefreshToken('');
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this email account?')) return;
    try {
      const session = await getCurrentSession();
      const res = await fetch(`${API_BASE_URL}/api/email/accounts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.ok) {
        showSuccess('Email account deleted.');
        fetchAccounts();
      } else {
        showError('Failed to delete account.');
      }
    } catch (err) {
      showError('Network error.');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      const session = await getCurrentSession();
      const res = await fetch(`${API_BASE_URL}/api/email/accounts/${id}/default`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.ok) {
        showSuccess('Default sender updated.');
        fetchAccounts();
      }
    } catch (err) {
      showError('Network error.');
    }
  };

  const handleTestSend = async (id) => {
    setTestingId(id);
    setErrorMsg('');
    try {
      const session = await getCurrentSession();
      const res = await fetch(`${API_BASE_URL}/api/email/accounts/${id}/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.ok) {
        showSuccess('Test email sent! Check your inbox.');
      } else {
        const data = await res.json().catch(() => ({}));
        showError(data.error || 'Test email failed.');
      }
    } catch (err) {
      showError('Network error.');
    } finally {
      setTestingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
        <Loader2 size={16} className="spin" />
        Loading email accounts...
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

      <div className="settings-card">
        <div className="settings-card-title">
          <Mail size={18} style={{ color: 'var(--color-cyan)' }} />
          Email Accounts
        </div>
        <div className="settings-card-desc">
          Add multiple Gmail accounts with app passwords. All credentials are encrypted with AES-256-GCM. Select a default sender for email campaigns.
        </div>

        {accounts.length === 0 && !showAddForm && (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
            No email accounts configured. Add one to start sending emails.
          </div>
        )}

        {accounts.map((account) => (
          <div key={account.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{account.email}</span>
                {account.isDefault && (
                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(20,20,20,0.06)', color: 'var(--text-primary)', fontWeight: '600' }}>DEFAULT</span>
                )}
              </div>
              {account.label && <div className="settings-hint" style={{ marginTop: '2px' }}>{account.label}</div>}
              <div className="settings-hint" style={{ marginTop: '2px' }}>
                {account.authMethod === 'app_password' ? `App Password · ${account.smtpHost}:${account.smtpPort}` : 'OAuth2'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {!account.isDefault && (
                <button type="button" className="settings-btn" style={{ padding: '6px 8px' }} onClick={() => handleSetDefault(account.id)} title="Set as default">
                  <Star size={14} />
                </button>
              )}
              <button type="button" className="settings-btn" style={{ padding: '6px 8px' }} onClick={() => handleTestSend(account.id)} disabled={testingId === account.id} title="Send test email">
                {testingId === account.id ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
              </button>
              <button type="button" className="settings-btn" style={{ padding: '6px 8px' }} onClick={() => handleEdit(account)} title="Edit">
                <Edit2 size={14} />
              </button>
              <button type="button" className="settings-btn settings-btn-danger" style={{ padding: '6px 8px' }} onClick={() => handleDelete(account.id)} title="Delete">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {!showAddForm && (
          <div style={{ marginTop: '16px' }}>
            <button type="button" className="settings-btn settings-btn-primary" onClick={() => { resetForm(); setShowAddForm(true); }}>
              <Plus size={14} />
              Add Email Account
            </button>
          </div>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleSave}>
          <div className="settings-card">
            <div className="settings-card-title">
              <Mail size={18} style={{ color: 'var(--color-cyan)' }} />
              {editingId ? 'Edit Email Account' : 'New Email Account'}
            </div>

            <div className="settings-grid-2">
              <div className="settings-field">
                <label className="settings-label">Email Address</label>
                <input type="email" className="settings-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@gmail.com" required disabled={!!editingId} />
              </div>
              <div className="settings-field">
                <label className="settings-label">Label (optional)</label>
                <input type="text" className="settings-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Work, Personal, etc." />
              </div>
            </div>

            <div className="settings-grid-2">
              <div className="settings-field">
                <label className="settings-label">Authentication Method</label>
                <select className="settings-select" value={authMethod} onChange={(e) => setAuthMethod(e.target.value)}>
                  <option value="app_password">App Password</option>
                  <option value="oauth2">OAuth2</option>
                </select>
              </div>
              <div className="settings-field">
                <label className="settings-label">SMTP Host</label>
                <input type="text" className="settings-input" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" />
              </div>
            </div>

            {authMethod === 'app_password' ? (
              <div className="settings-field">
                <label className="settings-label">App Password</label>
                <input type="password" className="settings-input" value={appPassword} onChange={(e) => setAppPassword(e.target.value)} placeholder={editingId ? 'Leave empty to keep existing' : '16-character app password'} required={!editingId} />
                <div className="settings-hint">Generate in Google Account → Security → App Passwords. Encrypted with AES-256-GCM.</div>
              </div>
            ) : (
              <>
                <div className="settings-grid-2">
                  <div className="settings-field">
                    <label className="settings-label">Client ID</label>
                    <input type="text" className="settings-input" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="OAuth2 client ID" />
                  </div>
                  <div className="settings-field">
                    <label className="settings-label">Client Secret</label>
                    <input type="password" className="settings-input" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder={editingId ? 'Leave empty to keep existing' : 'OAuth2 client secret'} />
                  </div>
                </div>
                <div className="settings-field">
                  <label className="settings-label">Refresh Token</label>
                  <input type="password" className="settings-input" value={refreshToken} onChange={(e) => setRefreshToken(e.target.value)} placeholder={editingId ? 'Leave empty to keep existing' : 'OAuth2 refresh token'} />
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button type="submit" className="settings-btn settings-btn-primary" disabled={saving}>
                {saving ? <><Loader2 size={14} className="spin" /> Saving...</> : editingId ? 'Update Account' : 'Add Account'}
              </button>
              <button type="button" className="settings-btn" onClick={resetForm}>
                <X size={14} />
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
