import { useState } from 'react';
import { Shield, CheckCircle2 } from 'lucide-react';

export default function AISection({ defaultRate = 75, confidenceThreshold = 60, onUpdateSettings }) {
  const [rateInput, setRateInput] = useState(defaultRate);
  const [sliderInput, setSliderInput] = useState(confidenceThreshold);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('GEMINI_API_KEY') || '');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    onUpdateSettings({
      defaultRate: parseInt(rateInput),
      confidenceThreshold: parseInt(sliderInput),
    });
    localStorage.setItem('GEMINI_API_KEY', geminiApiKey);
    setSuccessMsg('AI configurations saved successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleClearKey = () => {
    setGeminiApiKey('');
    localStorage.removeItem('GEMINI_API_KEY');
    setSuccessMsg('Gemini API Key removed.');
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

      <form onSubmit={handleSave}>
        <div className="settings-card">
          <div className="settings-card-title">
            <Shield size={18} style={{ color: 'var(--color-purple)' }} />
            HR Financial & Burden Tuning
          </div>
          <div className="settings-card-desc">
            Adjust core hourly billing metrics and AI confidence filters.
          </div>

          <div className="settings-grid-2">
            <div className="settings-field">
              <label className="settings-label">Default Hourly Rate per Attendee ($)</label>
              <input
                type="number"
                className="settings-input"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
              />
              <div className="settings-hint">Used as fallback when individual cost rates are unavailable.</div>
            </div>

            <div className="settings-field">
              <label className="settings-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Human Review Trigger Threshold</span>
                <strong style={{ color: 'var(--color-cyan)' }}>{sliderInput}%</strong>
              </label>
              <input
                type="range"
                min="30"
                max="90"
                value={sliderInput}
                onChange={(e) => setSliderInput(parseInt(e.target.value))}
                className="settings-range"
                style={{ marginTop: '14px' }}
              />
              <div className="settings-hint">Meetings with AI confidence below this score are flagged for audit.</div>
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-title">
            <Shield size={18} style={{ color: 'var(--color-purple)' }} />
            Gemini GenAI Client Keys
          </div>
          <div className="settings-card-desc">
            Configure your Gemini API key and model selection for AI-powered features.
          </div>

          <div className="settings-field">
            <label className="settings-label">Gemini API Key</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="password"
                className="settings-input"
                placeholder={geminiApiKey ? '••••••••••••••••••••' : 'Paste custom GEMINI_API_KEY...'}
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
              />
              {geminiApiKey && (
                <button
                  type="button"
                  className="settings-btn settings-btn-danger"
                  onClick={handleClearKey}
                >
                  Clear
                </button>
              )}
            </div>
            <div className="settings-hint">Saved in local browser context. If empty, system defaults to keyword heuristic fallback.</div>
          </div>

          <div className="settings-grid-2">
            <div className="settings-field">
              <label className="settings-label">Active Model</label>
              <select
                className="settings-select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Default Speed)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Max Accuracy)</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="settings-btn settings-btn-primary">
            Save All AI Configurations
          </button>
        </div>
      </form>
    </div>
  );
}
