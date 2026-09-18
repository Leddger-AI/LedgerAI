import { useState, useRef, useEffect } from 'react';
import { Upload, CheckCircle2, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { getAuthToken } from '../supabaseAuth';
import { supabase } from '../supabaseClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const TIMEZONES = [
  { value: 'America/New_York', label: '(GMT-5) New York' },
  { value: 'America/Chicago', label: '(GMT-6) Chicago' },
  { value: 'America/Denver', label: '(GMT-7) Denver' },
  { value: 'America/Los_Angeles', label: '(GMT-8) Los Angeles' },
  { value: 'Europe/London', label: '(GMT+0) London' },
  { value: 'Europe/Berlin', label: '(GMT+1) Berlin' },
  { value: 'Asia/Dubai', label: '(GMT+4) Dubai' },
  { value: 'Asia/Kolkata', label: '(GMT+5:30) Kolkata' },
  { value: 'Asia/Jakarta', label: '(GMT+7) Jakarta' },
  { value: 'Asia/Tokyo', label: '(GMT+9) Tokyo' },
  { value: 'Australia/Sydney', label: '(GMT+11) Sydney' },
];

const PREFS_KEY = 'led_email_prefs';

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { weekly: true, deals: true, news: false };
}

function splitName(full) {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

export default function ProfileSection({ user, onAvatarChange }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(user?.photoURL || '');
  const [timezone, setTimezone] = useState('');
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [prefs, setPrefs] = useState(loadPrefs);
  const fileInputRef = useRef(null);

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

  // Fetch profile from backend on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await getAuthToken();
        if (!token) { setLoading(false); return; }

        const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.display_name) {
            const { first, last } = splitName(data.display_name);
            setFirstName(first);
            setLastName(last);
          } else if (user?.displayName) {
            const { first, last } = splitName(user.displayName);
            setFirstName(first);
            setLastName(last);
          }
          if (data.email) setEmail(data.email);
          if (data.role) setRole(data.role);
          if (data.avatar_url) setAvatarUrl(data.avatar_url);
          if (data.timezone) setTimezone(data.timezone);
        }
      } catch {
        // Fall back to user prop data
        if (user?.displayName) {
          const { first, last } = splitName(user.displayName);
          setFirstName(first);
          setLastName(last);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
  }, [prefs]);

  const validateFile = (file) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      showError('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.');
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      showError('File too large. Maximum size is 5MB — it will be compressed to KBs on upload.');
      return false;
    }
    return true;
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateFile(file)) return;

    setUploading(true);
    setErrorMsg('');
    try {
      const token = await getAuthToken();
      if (!token) {
        showError('Not authenticated. Please log in again.');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE_URL}/api/cloudinary/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setAvatarUrl(data.secure_url);
        if (onAvatarChange) onAvatarChange(data.secure_url);
        showSuccess(`Avatar uploaded! (${data.size_kb}KB, WebP ${data.width}x${data.height})`);
      } else {
        const data = await res.json().catch(() => ({}));
        showError(data.error || 'Upload failed. Check Cloudinary configuration.');
      }
    } catch {
      showError('Network error. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAvatarRemove = async () => {
    setRemoving(true);
    setErrorMsg('');
    try {
      const token = await getAuthToken();
      if (!token) {
        showError('Not authenticated. Please log in again.');
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/cloudinary/avatar`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setAvatarUrl('');
        if (onAvatarChange) onAvatarChange('');
        showSuccess('Avatar removed.');
      } else {
        showError('Failed to remove avatar.');
      }
    } catch {
      showError('Network error. Please try again.');
    } finally {
      setRemoving(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      const token = await getAuthToken();
      if (!token) {
        showError('Not authenticated. Please log in again.');
        return;
      }

      const displayName = `${firstName} ${lastName}`.trim();
      const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ display_name: displayName, timezone }),
      });

      if (res.ok) {
        showSuccess('Profile saved successfully!');
      } else {
        const data = await res.json().catch(() => ({}));
        showError(data.error || 'Failed to save profile.');
      }
    } catch {
      showError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (newPassword !== confirmPassword) {
      showError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 12) {
      showError('Minimum 12 characters.');
      return;
    }
    setPwSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        showError(error.message);
      } else {
        setNewPassword('');
        setConfirmPassword('');
        showSuccess('Password updated.');
      }
    } catch {
      showError('Network error. Please try again.');
    } finally {
      setPwSaving(false);
    }
  };

  const initials = (`${firstName} ${lastName}`.trim() || email || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
        <Loader2 size={16} className="spin" />
        Loading profile...
      </div>
    );
  }

  const rowStyle = {
    display: 'grid',
    gridTemplateColumns: '220px minmax(0, 1fr)',
    gap: '24px',
    padding: '24px 0',
    borderBottom: '1px solid var(--border-color)',
    alignItems: 'start',
  };

  const labelStyle = { fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' };
  const hintStyle = { fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' };

  return (
    <div style={{ width: '100%' }}>
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

      {/* Profile photo — big preview */}
      <div style={rowStyle}>
        <div>
          <div style={labelStyle}>Profile photo</div>
          <div style={hintStyle}>Appears on your profile and in comments. Any size uploads — auto-compressed to KBs. Re-upload replaces it.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile preview"
              style={{ width: '112px', height: '112px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)', background: 'rgba(20,20,20,0.04)', flexShrink: 0 }}
            />
          ) : (
            <div className="settings-avatar-placeholder" style={{ width: '112px', height: '112px', fontSize: '32px' }}>{initials}</div>
          )}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={handleAvatarUpload}
            />
            <button type="button" className="settings-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? (<><Loader2 size={14} className="spin" /> Uploading...</>) : (<><Upload size={14} /> Change photo</>)}
            </button>
            {avatarUrl && (
              <button type="button" className="settings-btn settings-btn-danger" onClick={handleAvatarRemove} disabled={removing}>
                {removing ? (<><Loader2 size={14} className="spin" /> Removing...</>) : (<><Trash2 size={14} /> Remove</>)}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Personal info */}
      <form onSubmit={handleSave}>
        <div style={rowStyle}>
          <div>
            <div style={labelStyle}>Personal info</div>
            <div style={hintStyle}>Your name, contact email and role.</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="settings-grid-2">
              <div className="settings-field">
                <label className="settings-label">First name</label>
                <input type="text" className="settings-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Anita" />
              </div>
              <div className="settings-field">
                <label className="settings-label">Last name</label>
                <input type="text" className="settings-input" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Cruz" />
              </div>
            </div>
            <div className="settings-field">
              <label className="settings-label">Email</label>
              <input type="email" className="settings-input" value={email} readOnly />
            </div>
            <div className="settings-field">
              <label className="settings-label">Role</label>
              <input type="text" className="settings-input" value={role || 'Member'} readOnly />
              <div className="settings-hint">Managed by your workspace admin.</div>
            </div>
            <div className="settings-field">
              <label className="settings-label">Timezone</label>
              <select className="settings-select" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                <option value="" disabled>Select your timezone</option>
                {TIMEZONES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button type="submit" className="settings-btn settings-btn-primary" disabled={saving}>
                {saving ? (<><Loader2 size={14} className="spin" /> Saving...</>) : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Password */}
      <div style={rowStyle}>
        <div>
          <div style={labelStyle}>Password</div>
          <div style={hintStyle}>Set a new password for your account.</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="settings-grid-2">
            <div className="settings-field">
              <label className="settings-label">New password</label>
              <input type="password" className="settings-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••••••" />
            </div>
            <div className="settings-field">
              <label className="settings-label">Confirm password</label>
              <input type="password" className="settings-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••••••" />
              <div className="settings-hint">Minimum 12 characters.</div>
            </div>
          </div>
          <div>
            <button type="button" className="settings-btn" onClick={handlePasswordUpdate} disabled={pwSaving}>
              {pwSaving ? (<><Loader2 size={14} className="spin" /> Updating...</>) : 'Update password'}
            </button>
          </div>
        </div>
      </div>

      {/* Email preferences */}
      <div style={{ ...rowStyle, borderBottom: 'none' }}>
        <div>
          <div style={labelStyle}>Email preferences</div>
          <div style={hintStyle}>What we send to your inbox. Stored on this device.</div>
        </div>
        <div>
          {[
            { key: 'weekly', title: 'Weekly summary', hint: 'A digest of pipeline and team activity every Monday.' },
            { key: 'deals', title: 'Deal updates', hint: 'Stage changes and notes on deals you own.' },
            { key: 'news', title: 'Product news', hint: 'Feature announcements and tips.' },
          ].map((item) => (
            <div key={item.key} className="settings-toggle">
              <div>
                <div className="settings-toggle-label">{item.title}</div>
                <div className="settings-toggle-hint">{item.hint}</div>
              </div>
              <div
                className={`settings-toggle-switch ${prefs[item.key] ? 'active' : ''}`}
                onClick={() => setPrefs((p) => ({ ...p, [item.key]: !p[item.key] }))}
                role="switch"
                aria-checked={!!prefs[item.key]}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setPrefs((p) => ({ ...p, [item.key]: !p[item.key] })); }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
