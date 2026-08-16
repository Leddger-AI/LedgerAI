import { useState, useRef, useEffect } from 'react';
import { User, Upload, CheckCircle2, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { getAuthToken } from '../supabaseAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function ProfileSection({ user }) {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.photoURL || '');
  const [timezone, setTimezone] = useState('');
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
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
          if (data.display_name) setDisplayName(data.display_name);
          if (data.email) setEmail(data.email);
          if (data.avatar_url) setAvatarUrl(data.avatar_url);
          if (data.timezone) setTimezone(data.timezone);
        }
      } catch {
        // Fall back to user prop data
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const validateFile = (file) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      showError('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.');
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      showError('File too large. Maximum size is 5MB.');
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

  const initials = (displayName || email || 'U')
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
            <User size={18} style={{ color: 'var(--color-cyan)' }} />
            Profile Picture
          </div>
          <div className="settings-card-desc">
            Upload a profile photo. Images are automatically compressed to WebP format (under 50KB) and stored securely via Cloudinary. Re-uploading replaces your existing photo.
          </div>

          <div className="settings-avatar-container">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="settings-avatar" />
            ) : (
              <div className="settings-avatar-placeholder">{initials}</div>
            )}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={handleAvatarUpload}
              />
              <button
                type="button"
                className="settings-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 size={14} className="spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    {avatarUrl ? 'Change Photo' : 'Upload Photo'}
                  </>
                )}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  className="settings-btn settings-btn-danger"
                  style={{ marginLeft: '8px' }}
                  onClick={handleAvatarRemove}
                  disabled={removing}
                >
                  {removing ? (
                    <>
                      <Loader2 size={14} className="spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      Remove
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          <div className="settings-hint" style={{ marginTop: '12px' }}>
            Accepted formats: JPEG, PNG, WebP, GIF. Max size: 5MB. Auto-converted to WebP at 256x256.
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-title">
            <User size={18} style={{ color: 'var(--color-cyan)' }} />
            Account Information
          </div>
          <div className="settings-card-desc">
            Your account details and display preferences.
          </div>

          <div className="settings-grid-2">
            <div className="settings-field">
              <label className="settings-label">Display Name</label>
              <input
                type="text"
                className="settings-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="settings-field">
              <label className="settings-label">Email Address</label>
              <input
                type="email"
                className="settings-input"
                value={email}
                readOnly
              />
              <div className="settings-hint">Email cannot be changed directly.</div>
            </div>
          </div>

          <div className="settings-field">
            <label className="settings-label">Timezone</label>
            <select className="settings-select" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              <option value="" disabled>Select your timezone</option>
              <option value="America/New_York">America/New York (EST)</option>
              <option value="America/Chicago">America/Chicago (CST)</option>
              <option value="America/Denver">America/Denver (MST)</option>
              <option value="America/Los_Angeles">America/Los Angeles (PST)</option>
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="Europe/Berlin">Europe/Berlin (CET)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              <option value="Australia/Sydney">Australia/Sydney (AEDT)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="settings-btn settings-btn-primary" disabled={saving}>
            {saving ? (
              <>
                <Loader2 size={14} className="spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
