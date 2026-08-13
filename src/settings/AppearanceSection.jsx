import { useState } from 'react';
import { Palette, Play, CheckCircle2 } from 'lucide-react';

export default function AppearanceSection({ demoActive, onToggleDemo, defaultRate = 75, onUpdateSettings }) {
  const [rateInput, setRateInput] = useState(defaultRate);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSaveRate = (e) => {
    e.preventDefault();
    onUpdateSettings({ defaultRate: parseInt(rateInput) });
    setSuccessMsg('Preferences saved!');
    setTimeout(() => setSuccessMsg(''), 3000);
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
          <Palette size={18} style={{ color: 'var(--color-cyan)' }} />
          Display Preferences
        </div>
        <div className="settings-card-desc">
          Customize how Leddger-AI looks and behaves.
        </div>

        <div className="settings-toggle">
          <div>
            <div className="settings-toggle-label">Demo Mode</div>
            <div className="settings-toggle-hint">Load pre-compiled mock datasets into the workspace.</div>
          </div>
          <div
            className={`settings-toggle-switch ${demoActive ? 'active' : ''}`}
            onClick={onToggleDemo}
          />
        </div>
      </div>

      <form onSubmit={handleSaveRate}>
        <div className="settings-card">
          <div className="settings-card-title">
            <Palette size={18} style={{ color: 'var(--color-purple)' }} />
            Default Billing Rate
          </div>
          <div className="settings-card-desc">
            Set the default hourly rate used for cost calculations.
          </div>

          <div className="settings-field">
            <label className="settings-label">Default Hourly Rate ($)</label>
            <input
              type="number"
              className="settings-input"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
            />
            <div className="settings-hint">Used as fallback when individual cost rates are unavailable.</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="settings-btn settings-btn-primary">
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
