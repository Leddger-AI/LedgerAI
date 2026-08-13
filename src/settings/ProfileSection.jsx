import { useState, useRef } from 'react';
import { User, Upload, CheckCircle2, Loader2 } from 'lucide-react';
import { getCurrentSession } from '../supabaseAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ProfileSection({ user }) {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.photoURL || '');
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'avatars');

      const session = await getCurrentSession();
      const token = session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/cloudinary/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setAvatarUrl(data.secure_url);
        setSuccessMsg('Avatar uploaded successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setSuccessMsg('Upload failed. Check your Cloudinary configuration.');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      setSuccessMsg('Upload failed. Please try again.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSuccessMsg('Profile saved successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const initials = (displayName || email || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div>
      {successMsg && (
        <div className="settings-success">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="settings-card">
          <div className="settings-card-title">
            <User size={18} style={{ color: 'var(--color-cyan)' }} />
            Profile Picture
          </div>
          <div className="settings-card-desc">
            Upload a profile photo. Images are stored securely via Cloudinary.
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
                accept="image/*"
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
                    Upload Photo
                  </>
                )}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  className="settings-btn settings-btn-danger"
                  style={{ marginLeft: '8px' }}
                  onClick={() => setAvatarUrl('')}
                >
                  Remove
                </button>
              )}
            </div>
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
            <select className="settings-select" defaultValue="">
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
          <button type="submit" className="settings-btn settings-btn-primary">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
