import React, { useState, useEffect, useCallback } from 'react';
import {
  Send, Mail, Clock, FileSpreadsheet, Trash2, RefreshCw,
  Settings, Loader2, AlertTriangle, CheckCircle2, Plus, X,
  Zap, Users, Upload
} from 'lucide-react';
import Papa from 'papaparse';
import { getAuthToken } from './supabaseAuth';
import './EmailAutomationView.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function formatRelativeTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

export default function EmailAutomationView() {
  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [draftsError, setDraftsError] = useState(null);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [draftDetail, setDraftDetail] = useState(null);
  const [draftDetailLoading, setDraftDetailLoading] = useState(false);

  const [config, setConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({
    email: '',
    authMethod: 'app_password',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    appPassword: '',
    refreshToken: '',
    clientId: '',
    clientSecret: '',
  });
  const [configSaving, setConfigSaving] = useState(false);
  const [configStatus, setConfigStatus] = useState(null);

  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState(null);

  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);

  const [showSendModal, setShowSendModal] = useState(false);
  const [sendDraft, setSendDraft] = useState(null);
  const [campaignName, setCampaignName] = useState('');
  const [recipients, setRecipients] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [variableMapping, setVariableMapping] = useState({});
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null);
  const [sendError, setSendError] = useState(null);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(null);

  const fetchDrafts = useCallback(async () => {
    setDraftsLoading(true);
    setDraftsError(null);
    try {
      const token = await getAuthToken();
      if (!token) { setDraftsError('Not authenticated.'); return; }
      const res = await fetch(`${API_BASE_URL}/api/email/drafts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch drafts');
      const data = await res.json();
      setDrafts(data.drafts || []);
    } catch (err) {
      console.error('Error fetching drafts:', err);
      setDraftsError('Failed to load drafts.');
    } finally {
      setDraftsLoading(false);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/email/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setConfig(data.config);
      if (data.config) {
        setConfigForm(prev => ({
          ...prev,
          email: data.config.email || '',
          authMethod: data.config.authMethod || 'app_password',
          smtpHost: data.config.smtpHost || 'smtp.gmail.com',
          smtpPort: data.config.smtpPort || 587,
          clientId: data.config.clientId || '',
        }));
      }
    } catch (err) {
      console.error('Error fetching config:', err);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const fetchCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/email/campaigns`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  const fetchDraftDetail = async (draftId) => {
    setDraftDetailLoading(true);
    setDraftDetail(null);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/email/drafts/${draftId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch draft');
      const data = await res.json();
      setDraftDetail(data.draft);
    } catch (err) {
      console.error('Error fetching draft detail:', err);
    } finally {
      setDraftDetailLoading(false);
    }
  };

  const handleDeleteDraft = async (draftId) => {
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/email/drafts/${draftId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      setDrafts(prev => prev.filter(d => d._id !== draftId));
      if (selectedDraft === draftId) {
        setSelectedDraft(null);
        setDraftDetail(null);
      }
    } catch (err) {
      console.error('Error deleting draft:', err);
    }
  };

  const handleSaveConfig = async () => {
    setConfigSaving(true);
    setConfigStatus(null);
    try {
      const token = await getAuthToken();
      if (!token) { setConfigStatus({ type: 'error', message: 'Not authenticated.' }); return; }
      const res = await fetch(`${API_BASE_URL}/api/email/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(configForm),
      });
      if (!res.ok) throw new Error('Failed to save config');
      const data = await res.json();
      setConfig(data.config);
      setConfigStatus({ type: 'success', message: 'Email config saved!' });
      setTimeout(() => { setConfigStatus(null); setShowConfigModal(false); }, 1500);
    } catch (err) {
      console.error('Error saving config:', err);
      setConfigStatus({ type: 'error', message: 'Failed to save config.' });
    } finally {
      setConfigSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setTesting(true);
    setTestStatus(null);
    try {
      const token = await getAuthToken();
      if (!token) { setTestStatus({ type: 'error', message: 'Not authenticated.' }); return; }
      const res = await fetch(`${API_BASE_URL}/api/email/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Test failed');
      setTestStatus({ type: 'success', message: 'Test email sent!' });
      setTimeout(() => setTestStatus(null), 3000);
    } catch (err) {
      setTestStatus({ type: 'error', message: err.message });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
    fetchConfig();
    fetchCampaigns();
  }, [fetchDrafts, fetchConfig, fetchCampaigns]);

  const handleDraftClick = (draft) => {
    setSelectedDraft(draft._id);
    fetchDraftDetail(draft._id);
  };

  const openSendModal = (draft) => {
    setSendDraft(draft);
    setCampaignName(`Campaign — ${draft.subject || 'Untitled'}`);
    setRecipients([]);
    setCsvHeaders([]);
    setVariableMapping({});
    setSendStatus(null);
    setSendError(null);
    setShowSchedulePicker(false);
    setScheduleDateTime('');
    setScheduleSuccess(null);
    setShowSendModal(true);
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        if (results.meta?.fields) {
          setCsvHeaders(results.meta.fields);
          const emailCol = results.meta.fields.find(f => f.toLowerCase().includes('email'));
          const nameCol = results.meta.fields.find(f => f.toLowerCase().includes('name') && !f.toLowerCase().includes('company'));
          const parsed = results.data.map(row => ({
            email: emailCol ? (row[emailCol] || '').trim() : '',
            name: nameCol ? (row[nameCol] || '').trim() : '',
            variables: { ...row },
          })).filter(r => r.email);
          setRecipients(parsed);
          if (sendDraft?.variables?.length) {
            const mapping = {};
            sendDraft.variables.forEach(v => {
              const match = results.meta.fields.find(h => h.toLowerCase().replace(/\s+/g, '_') === v.id || h === v.id);
              if (match) mapping[v.id] = match;
            });
            setVariableMapping(mapping);
          }
        }
      }
    });
    if (e.target.value) e.target.value = '';
  };

  const addManualRecipient = () => {
    setRecipients(prev => [...prev, { email: '', name: '', variables: {} }]);
  };

  const updateManualRecipient = (idx, field, value) => {
    setRecipients(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const removeRecipient = (idx) => {
    setRecipients(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSendCampaign = async () => {
    setSending(true);
    setSendStatus(null);
    setSendError(null);
    try {
      const token = await getAuthToken();
      if (!token) { setSendError('Not authenticated.'); return; }
      if (!sendDraft?._id) { setSendError('No draft selected.'); return; }
      if (recipients.length === 0) { setSendError('Add at least one recipient.'); return; }
      const finalRecipients = recipients.map(r => {
        const mappedVars = {};
        if (sendDraft.variables) {
          sendDraft.variables.forEach(v => {
            const csvCol = variableMapping[v.id];
            if (csvCol && r.variables[csvCol] !== undefined) {
              mappedVars[v.id] = r.variables[csvCol];
            }
          });
        }
        return { email: r.email, name: r.name, variables: mappedVars };
      });
      const res = await fetch(`${API_BASE_URL}/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          draftId: sendDraft._id,
          recipients: finalRecipients,
          campaignName: campaignName || `Campaign ${new Date().toLocaleDateString()}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send campaign');
      setSendStatus({ sentCount: data.sentCount, failedCount: data.failedCount, total: data.totalRecipients });
      fetchCampaigns();
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleScheduleCampaign = async () => {
    setScheduling(true);
    setSendError(null);
    setScheduleSuccess(null);
    try {
      const token = await getAuthToken();
      if (!token) { setSendError('Not authenticated.'); return; }
      if (!sendDraft?._id) { setSendError('No draft selected.'); return; }
      if (recipients.length === 0) { setSendError('Add at least one recipient.'); return; }
      if (!scheduleDateTime) { setSendError('Pick a date and time.'); return; }

      const finalRecipients = recipients.map(r => {
        const mappedVars = {};
        if (sendDraft.variables) {
          sendDraft.variables.forEach(v => {
            const csvCol = variableMapping[v.id];
            if (csvCol && r.variables[csvCol] !== undefined) {
              mappedVars[v.id] = r.variables[csvCol];
            }
          });
        }
        return { email: r.email, name: r.name, variables: mappedVars };
      });

      const res = await fetch(`${API_BASE_URL}/api/email/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          draftId: sendDraft._id,
          recipients: finalRecipients,
          campaignName: campaignName || `Scheduled Campaign ${new Date().toLocaleDateString()}`,
          scheduledAt: new Date(scheduleDateTime).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to schedule campaign');
      setScheduleSuccess({ scheduledAt: data.scheduledAt, campaignId: data.campaignId });
      fetchCampaigns();
    } catch (err) {
      setSendError(err.message);
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="ea-container">
      <div className="ea-main">
        <div className="ea-header">
          <div>
            <h2 className="ea-title">
              <Send size={20} />
              Email Automation
            </h2>
            <p className="ea-subtitle">Saved email drafts and automation campaigns</p>
          </div>
          <button className="ea-refresh-btn" onClick={fetchDrafts} disabled={draftsLoading}>
            <RefreshCw size={16} className={draftsLoading ? 'spin' : ''} />
            Refresh
          </button>
        </div>

        {draftsError && (
          <div className="ea-error-banner">
            <AlertTriangle size={16} />
            {draftsError}
          </div>
        )}

        {draftsLoading ? (
          <div className="ea-loading">
            <Loader2 size={24} className="spin" />
            <span>Loading drafts...</span>
          </div>
        ) : drafts.length === 0 ? (
          <div className="ea-empty">
            <Mail size={40} />
            <h3>No saved drafts yet</h3>
            <p>Create an email body in the Body editor and save it to see it here.</p>
          </div>
        ) : (
          <div className="ea-draft-grid">
            {drafts.map(draft => (
              <div
                key={draft._id}
                className={`ea-draft-card ${selectedDraft === draft._id ? 'selected' : ''}`}
                onClick={() => handleDraftClick(draft)}
              >
                <div className="ea-draft-card-body">
                  {draft.subject && (
                    <div className="ea-draft-subject">{draft.subject}</div>
                  )}
                  <div className="ea-draft-preview">
                    {stripHtml(draft.bodyHtml || '').substring(0, 120) || 'No content'}
                    {stripHtml(draft.bodyHtml || '').length > 120 ? '...' : ''}
                  </div>
                </div>
                <div className="ea-draft-card-footer">
                  <div className="ea-draft-meta">
                    {draft.dataSourceFile && (
                      <span className="ea-draft-file">
                        <FileSpreadsheet size={12} />
                        {draft.dataSourceFile}
                      </span>
                    )}
                    <span className="ea-draft-time">
                      <Clock size={12} />
                      {formatRelativeTime(draft.updatedAt)}
                    </span>
                  </div>
                  <div className="ea-draft-actions">
                    <button
                      className="ea-draft-send"
                      onClick={(e) => { e.stopPropagation(); openSendModal(draft); }}
                      title="Send Campaign"
                    >
                      <Send size={14} />
                    </button>
                    <button
                      className="ea-draft-delete"
                      onClick={(e) => { e.stopPropagation(); handleDeleteDraft(draft._id); }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {draftDetail && (
          <div className="ea-draft-detail">
            <div className="ea-draft-detail-header">
              <h3>{draftDetail.subject || 'Untitled Draft'}</h3>
              <button onClick={() => { setSelectedDraft(null); setDraftDetail(null); }}>
                <X size={18} />
              </button>
            </div>
            <div className="ea-draft-detail-meta">
              {draftDetail.dataSourceFile && (
                <span className="ea-chip">
                  <FileSpreadsheet size={12} />
                  {draftDetail.dataSourceFile}
                </span>
              )}
              <span className="ea-chip">
                <Clock size={12} />
                {formatRelativeTime(draftDetail.createdAt)}
              </span>
              {draftDetail.variables?.length > 0 && (
                <span className="ea-chip">
                  <Zap size={12} />
                  {draftDetail.variables.length} variables
                </span>
              )}
            </div>
            <div
              className="ea-draft-detail-body"
              dangerouslySetInnerHTML={{ __html: draftDetail.bodyHtml || '<p>No content</p>' }}
            />
          </div>
        )}
      </div>

      <div className="ea-sidebar">
        <div className="ea-sidebar-section">
          <div className="ea-sidebar-header">
            <Settings size={16} />
            <span>Email Configuration</span>
          </div>

          {configLoading ? (
            <div className="ea-sidebar-loading">
              <Loader2 size={16} className="spin" />
            </div>
          ) : config ? (
            <div className="ea-config-info">
              <div className="ea-config-row">
                <Mail size={14} />
                <span>{config.email}</span>
              </div>
              <div className="ea-config-row">
                <span className="ea-config-method">{config.authMethod === 'oauth2' ? 'OAuth2' : 'App Password'}</span>
                <span className={`ea-config-status ${config.isActive ? 'active' : ''}`}>
                  {config.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <button className="ea-test-btn" onClick={handleTestEmail} disabled={testing}>
                {testing ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
                {testing ? 'Sending...' : 'Send Test Email'}
              </button>
              {testStatus && (
                <div className={`ea-test-status ${testStatus.type}`}>
                  {testStatus.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  {testStatus.message}
                </div>
              )}
              <button className="ea-edit-config-btn" onClick={() => setShowConfigModal(true)}>
                Edit Configuration
              </button>
            </div>
          ) : (
            <div className="ea-no-config">
              <p>No email configured yet.</p>
              <button className="ea-setup-btn" onClick={() => setShowConfigModal(true)}>
                <Plus size={14} />
                Setup Email
              </button>
            </div>
          )}
        </div>

        <div className="ea-sidebar-section">
          <div className="ea-sidebar-header">
            <Send size={16} />
            <span>Recent Campaigns</span>
          </div>
          {campaignsLoading ? (
            <div className="ea-sidebar-loading">
              <Loader2 size={16} className="spin" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="ea-no-campaigns">
              <p>No campaigns sent yet.</p>
            </div>
          ) : (
            <div className="ea-campaign-list">
              {campaigns.slice(0, 5).map(c => (
                <div key={c._id} className="ea-campaign-item">
                  <div className="ea-campaign-info">
                    <span className="ea-campaign-name">{c.name}</span>
                    <span className="ea-campaign-stats">
                      {c.sentCount} sent · {c.failedCount} failed
                    </span>
                  </div>
                  <span className={`ea-campaign-badge ${c.status}`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showConfigModal && (
        <div className="ea-config-modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="ea-config-modal" onClick={e => e.stopPropagation()}>
            <div className="ea-config-modal-header">
              <h3>Email Configuration</h3>
              <button onClick={() => setShowConfigModal(false)}><X size={18} /></button>
            </div>

            <div className="ea-config-modal-body">
              <div className="ea-form-group">
                <label>Sender Email</label>
                <input
                  type="email"
                  value={configForm.email}
                  onChange={e => setConfigForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your.email@gmail.com"
                />
              </div>

              <div className="ea-form-group">
                <label>Authentication Method</label>
                <div className="ea-auth-tabs">
                  <button
                    className={configForm.authMethod === 'app_password' ? 'active' : ''}
                    onClick={() => setConfigForm(prev => ({ ...prev, authMethod: 'app_password' }))}
                  >
                    App Password
                  </button>
                  <button
                    className={configForm.authMethod === 'oauth2' ? 'active' : ''}
                    onClick={() => setConfigForm(prev => ({ ...prev, authMethod: 'oauth2' }))}
                  >
                    OAuth2
                  </button>
                </div>
              </div>

              {configForm.authMethod === 'app_password' ? (
                <>
                  <div className="ea-form-row">
                    <div className="ea-form-group">
                      <label>SMTP Host</label>
                      <input
                        type="text"
                        value={configForm.smtpHost}
                        onChange={e => setConfigForm(prev => ({ ...prev, smtpHost: e.target.value }))}
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div className="ea-form-group">
                      <label>SMTP Port</label>
                      <input
                        type="number"
                        value={configForm.smtpPort}
                        onChange={e => setConfigForm(prev => ({ ...prev, smtpPort: parseInt(e.target.value) }))}
                        placeholder="587"
                      />
                    </div>
                  </div>
                  <div className="ea-form-group">
                    <label>App Password</label>
                    <input
                      type="password"
                      value={configForm.appPassword}
                      onChange={e => setConfigForm(prev => ({ ...prev, appPassword: e.target.value }))}
                      placeholder={config?.hasAppPassword ? '•••••••• (saved — enter new to replace)' : '16-character app password'}
                    />
                    <span className="ea-form-hint">Generate from Google Account → Security → App Passwords</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="ea-form-group">
                    <label>Client ID</label>
                    <input
                      type="text"
                      value={configForm.clientId}
                      onChange={e => setConfigForm(prev => ({ ...prev, clientId: e.target.value }))}
                      placeholder="Google OAuth2 Client ID"
                    />
                  </div>
                  <div className="ea-form-group">
                    <label>Client Secret</label>
                    <input
                      type="password"
                      value={configForm.clientSecret}
                      onChange={e => setConfigForm(prev => ({ ...prev, clientSecret: e.target.value }))}
                      placeholder={config?.hasClientSecret ? '•••••••• (saved — enter new to replace)' : 'Google OAuth2 Client Secret'}
                    />
                  </div>
                  <div className="ea-form-group">
                    <label>Refresh Token</label>
                    <input
                      type="password"
                      value={configForm.refreshToken}
                      onChange={e => setConfigForm(prev => ({ ...prev, refreshToken: e.target.value }))}
                      placeholder={config?.hasRefreshToken ? '•••••••• (saved — enter new to replace)' : 'Google OAuth2 Refresh Token'}
                    />
                    <span className="ea-form-hint">Obtain via OAuth2 Playground with mail.google.com scope</span>
                  </div>
                </>
              )}

              {configStatus && (
                <div className={`ea-config-status-toast ${configStatus.type}`}>
                  {configStatus.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  {configStatus.message}
                </div>
              )}
            </div>

            <div className="ea-config-modal-footer">
              <button className="ea-cancel-btn" onClick={() => setShowConfigModal(false)}>Cancel</button>
              <button className="ea-save-config-btn" onClick={handleSaveConfig} disabled={configSaving}>
                {configSaving ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
                {configSaving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSendModal && (
        <div className="ea-config-modal-overlay" onClick={() => setShowSendModal(false)}>
          <div className="ea-send-modal" onClick={e => e.stopPropagation()}>
            <div className="ea-config-modal-header">
              <h3>Send Campaign</h3>
              <button onClick={() => setShowSendModal(false)}><X size={18} /></button>
            </div>

            <div className="ea-config-modal-body">
              {sendStatus ? (
                <div className="ea-send-result">
                  <CheckCircle2 size={40} style={{ color: '#16A34A' }} />
                  <h4>Campaign Complete</h4>
                  <div className="ea-send-result-stats">
                    <div className="ea-send-result-stat">
                      <span className="ea-send-result-num">{sendStatus.sentCount}</span>
                      <span className="ea-send-result-label">Sent</span>
                    </div>
                    <div className="ea-send-result-stat failed">
                      <span className="ea-send-result-num">{sendStatus.failedCount}</span>
                      <span className="ea-send-result-label">Failed</span>
                    </div>
                    <div className="ea-send-result-stat">
                      <span className="ea-send-result-num">{sendStatus.total}</span>
                      <span className="ea-send-result-label">Total</span>
                    </div>
                  </div>
                  <button className="ea-save-config-btn" onClick={() => setShowSendModal(false)}>
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div className="ea-form-group">
                    <label>Campaign Name</label>
                    <input
                      type="text"
                      value={campaignName}
                      onChange={e => setCampaignName(e.target.value)}
                      placeholder="Campaign name"
                    />
                  </div>

                  <div className="ea-form-group">
                    <label>Draft</label>
                    <div className="ea-send-draft-info">
                      <Mail size={14} />
                      <span>{sendDraft?.subject || 'Untitled Draft'}</span>
                    </div>
                  </div>

                  <div className="ea-form-group">
                    <label>Recipients</label>
                    <div className="ea-csv-upload">
                      <label className="ea-csv-upload-btn">
                        <Upload size={14} />
                        Upload CSV
                        <input type="file" accept=".csv" onChange={handleCsvUpload} style={{ display: 'none' }} />
                      </label>
                      <button className="ea-manual-add-btn" onClick={addManualRecipient}>
                        <Plus size={14} />
                        Add Manually
                      </button>
                    </div>
                  </div>

                  {recipients.length > 0 && (
                    <>
                      {sendDraft?.variables?.length > 0 && csvHeaders.length > 0 && (
                        <div className="ea-form-group">
                          <label>Variable Mapping</label>
                          <div className="ea-mapping-list">
                            {sendDraft.variables.map(v => (
                              <div key={v.id} className="ea-mapping-row">
                                <span className="ea-mapping-var">{v.label}</span>
                                <select
                                  value={variableMapping[v.id] || ''}
                                  onChange={e => setVariableMapping(prev => ({ ...prev, [v.id]: e.target.value }))}
                                >
                                  <option value="">— Not mapped —</option>
                                  {csvHeaders.map(h => (
                                    <option key={h} value={h}>{h}</option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="ea-recipient-list">
                        <div className="ea-recipient-count">
                          <Users size={14} />
                          {recipients.length} recipient{recipients.length !== 1 ? 's' : ''}
                        </div>
                        {recipients.slice(0, 10).map((r, idx) => (
                          <div key={idx} className="ea-recipient-row">
                            <input
                              type="email"
                              value={r.email}
                              onChange={e => updateManualRecipient(idx, 'email', e.target.value)}
                              placeholder="email@example.com"
                              className="ea-recipient-email"
                            />
                            <input
                              type="text"
                              value={r.name}
                              onChange={e => updateManualRecipient(idx, 'name', e.target.value)}
                              placeholder="Name"
                              className="ea-recipient-name"
                            />
                            <button className="ea-recipient-remove" onClick={() => removeRecipient(idx)}>
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        {recipients.length > 10 && (
                          <div className="ea-recipient-more">
                            + {recipients.length - 10} more...
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {sendError && (
                    <div className="ea-test-status error">
                      <AlertTriangle size={14} />
                      {sendError}
                    </div>
                  )}

                  {!config && (
                    <div className="ea-test-status error">
                      <AlertTriangle size={14} />
                      Configure your email settings before sending a campaign.
                    </div>
                  )}
                </>
              )}
            </div>

            {!sendStatus && !scheduleSuccess && (
              <>
                {showSchedulePicker && (
                  <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={14} style={{ color: 'var(--color-cyan)' }} />
                      Schedule Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduleDateTime}
                      onChange={(e) => setScheduleDateTime(e.target.value)}
                      min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button className="ea-cancel-btn" onClick={() => setShowSchedulePicker(false)}>Back</button>
                      <button
                        className="ea-save-config-btn"
                        onClick={handleScheduleCampaign}
                        disabled={scheduling || recipients.length === 0 || !config || !scheduleDateTime}
                        style={{ background: 'var(--color-cyan)' }}
                      >
                        {scheduling ? <Loader2 size={14} className="spin" /> : <Clock size={14} />}
                        {scheduling ? 'Scheduling...' : 'Confirm Schedule'}
                      </button>
                    </div>
                  </div>
                )}

                {!showSchedulePicker && (
                  <div className="ea-config-modal-footer">
                    <button className="ea-cancel-btn" onClick={() => setShowSendModal(false)}>Cancel</button>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        className="ea-cancel-btn"
                        onClick={() => setShowSchedulePicker(true)}
                        disabled={sending || recipients.length === 0 || !config}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Clock size={14} />
                        Schedule
                      </button>
                      <button
                        className="ea-save-config-btn"
                        onClick={handleSendCampaign}
                        disabled={sending || recipients.length === 0 || !config}
                      >
                        {sending ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
                        {sending ? 'Sending...' : `Send to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}`}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {scheduleSuccess && (
              <div className="ea-config-modal-footer" style={{ flexDirection: 'column', gap: '12px' }}>
                <div className="ea-test-status success" style={{ width: '100%' }}>
                  <CheckCircle2 size={14} />
                  Campaign scheduled for {new Date(scheduleSuccess.scheduledAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}
                </div>
                <button className="ea-save-config-btn" onClick={() => setShowSendModal(false)}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
