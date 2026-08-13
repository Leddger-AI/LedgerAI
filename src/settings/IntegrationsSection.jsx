import { useState, useEffect } from 'react';
import { Cloud, CheckCircle2, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function IntegrationsSection() {
  const [status, setStatus] = useState(null);
  const [checking, setChecking] = useState(false);

  const checkStatus = async () => {
    setChecking(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/cloudinary/status`);
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      setStatus({ configured: false, message: 'Unable to reach server' });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div>
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
          Cloudinary provides cloud-based image and video storage for avatar uploads and file attachments.
          This integration is managed by the server administrator via environment variables.
        </div>

        {status && !status.configured && (
          <div className="settings-hint" style={{ marginTop: '8px' }}>
            Avatar uploads and file attachments are unavailable until Cloudinary is configured on the server.
          </div>
        )}

        <div style={{ marginTop: '12px' }}>
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
      </div>
    </div>
  );
}
