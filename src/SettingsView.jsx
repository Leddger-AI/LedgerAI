import React, { useState } from 'react';
import { Settings, Shield, Key, Sliders, Server, Play, RefreshCw, CheckCircle2, LogOut } from 'lucide-react';

export default function SettingsView({ 
  onResetData, 
  onToggleDemo, 
  demoActive, 
  defaultRate = 75,
  confidenceThreshold = 60,
  onUpdateSettings,
  onLogout
}) {
  const [rateInput, setRateInput] = useState(defaultRate);
  const [sliderInput, setSliderInput] = useState(confidenceThreshold);
  const [supabaseUrl, setSupabaseUrl] = useState(import.meta.env.VITE_SUPABASE_URL || '');
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('GEMINI_API_KEY') || '');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSaveGeneral = (e) => {
    e.preventDefault();
    onUpdateSettings({
      defaultRate: parseInt(rateInput),
      confidenceThreshold: parseInt(sliderInput)
    });
    localStorage.setItem('GEMINI_API_KEY', geminiApiKey);
    setSuccessMsg('Configurations successfully updated!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleClearKey = () => {
    setGeminiApiKey('');
    localStorage.removeItem('GEMINI_API_KEY');
    setSuccessMsg('Gemini API Key removed.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="settings-view-container" style={{ maxWidth: '800px' }}>
      {/* Header title */}
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Settings size={20} style={{ color: 'var(--color-cyan)' }} />
            System Configurations & Settings
          </h2>
          <p className="section-subtitle">Adjust core hourly billing metrics, AI confidence filters, and API authorization keys</p>
        </div>
      </div>

      {successMsg && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'var(--color-success-glow)', border: '1px solid var(--color-success)', borderRadius: '8px', padding: '12px 16px', color: 'var(--color-success)', fontSize: '13px', marginBottom: '20px' }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveGeneral} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Section 1: Financial & Burden Tuning */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={18} style={{ color: 'var(--color-cyan)' }} />
            HR Financial & Burden Tuning
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Default Hourly Rate per Attendee ($)
              </label>
              <input 
                type="number"
                value={rateInput}
                onChange={e => setRateInput(e.target.value)}
                style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                Used as fallback when individual cost rates are unavailable.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Human Review Trigger Threshold</span>
                <strong style={{ color: 'var(--color-cyan)' }}>{sliderInput}%</strong>
              </label>
              <input 
                type="range"
                min="30"
                max="90"
                value={sliderInput}
                onChange={e => setSliderInput(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-cyan)', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '14px', outline: 'none' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '8px' }}>
                Meetings with AI attribution confidence below this score are flagged for audit.
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: AI Engine Configurations */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} style={{ color: 'var(--color-purple)' }} />
            Gemini GenAI Client Keys
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Gemini API Key (Optionally overrides process env)
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="password"
                  placeholder={geminiApiKey ? "••••••••••••••••••••••••••••" : "Paste custom GEMINI_API_KEY..."}
                  value={geminiApiKey}
                  onChange={e => setGeminiApiKey(e.target.value)}
                  style={{ flex: 1, padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }}
                />
                {geminiApiKey && (
                  <button 
                    type="button"
                    className="table-action-btn"
                    style={{ padding: '8px 14px', backgroundColor: 'rgba(244, 63, 94, 0.1)', borderColor: 'rgba(244, 63, 94, 0.2)', color: 'var(--color-pink)' }}
                    onClick={handleClearKey}
                  >
                    Clear Key
                  </button>
                )}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                The key is saved in secure local browser context. If empty, the system defaults to the keyword heuristic fallback.
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Active Model Specification
                </label>
                <select 
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                  style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }}
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Default Speed)</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (Max Accuracy)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Supabase URL
                </label>
                <input 
                  type="text"
                  value={supabaseUrl}
                  readOnly
                  style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Environment Actions */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={18} style={{ color: 'var(--color-cyan)' }} />
            System Actions & Maintenance
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyItems: 'space-between', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>System Demo Controls</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '12px' }}>
                  Load or disconnect pre-compiled mock datasets into calendar state.
                </p>
              </div>
              <button 
                type="button" 
                className="table-action-btn"
                onClick={onToggleDemo}
                style={{ width: '100%', padding: '10px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Play size={12} />
                <span>{demoActive ? 'Disconnect Demo Mode' : 'Connect Demo Data'}</span>
              </button>
            </div>

            <div style={{ border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyItems: 'space-between', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Reset App Registry</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '12px' }}>
                  Wipe all active and resolved alerts, meeting caches, and project cost logs.
                </p>
              </div>
              <button 
                type="button" 
                className="table-action-btn"
                onClick={() => {
                  if (confirm("Reset all state and clear cached meetings?")) {
                    onResetData();
                    setSuccessMsg('Ledger registry completely reset.');
                    setTimeout(() => setSuccessMsg(''), 3000);
                  }
                }}
                style={{ width: '100%', padding: '10px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: 'rgba(244, 63, 94, 0.1)', borderColor: 'rgba(244, 63, 94, 0.2)', color: 'var(--color-pink)' }}
              >
                <RefreshCw size={12} />
                <span>Format Cache Database</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 4: Account Session */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LogOut size={18} style={{ color: 'var(--color-pink)' }} />
            Account Session
          </h3>

          <div style={{ border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Sign Out</h4>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Log out of your Leddger AI account. You will be returned to the login page.
              </p>
            </div>
            <button 
              type="button" 
              className="table-action-btn"
              onClick={onLogout}
              style={{ width: 'fit-content', padding: '10px 24px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(244, 63, 94, 0.1)', borderColor: 'rgba(244, 63, 94, 0.2)', color: 'var(--color-pink)', fontWeight: '600' }}
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
          <button 
            type="submit"
            className="table-action-btn"
            style={{ padding: '12px 30px', fontSize: '14px', backgroundColor: 'rgba(0, 240, 255, 0.12)', borderColor: 'rgba(0, 240, 255, 0.2)', color: 'var(--color-cyan)', fontWeight: '600' }}
          >
            Save All Configurations
          </button>
        </div>
        
      </form>
    </div>
  );
}
