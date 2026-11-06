import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Send, Mail, Clock, FileSpreadsheet, Trash2, RefreshCw,
  Settings, Loader2, AlertTriangle, CheckCircle2, Plus, X,
  Zap, Users, Upload, Eye, FileUp, Save
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import DOMPurify from 'dompurify';
import { getAuthToken } from './supabaseAuth';
import {
  extractVars, normHeader, canonicalizeTemplate, autoMapVariables, substitutePreview as substitutePreviewShared,
} from './utils/templateBind';
import './EmailAutomationView.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Local aliases keep every existing call-site untouched
const substitutePreview = substitutePreviewShared;

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

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
  tmp.innerHTML = DOMPurify.sanitize(html || '');
  return tmp.textContent || tmp.innerText || '';
}

// Draft bodyHtml is stored raw server-side — sanitize at every render sink
// so a malicious draft or CSV-mapped variable can't execute scripts here.
function safeHtml(html, fallback = '<p>No content</p>') {
  return DOMPurify.sanitize(html || fallback);
}

function recipientValues(recipient, draft, mapping, sender) {
  const name = String(recipient.name || '').trim();
  const nameParts = name.split(/\s+/).filter(Boolean);
  const builtins = {
    email: recipient.email,
    email_address: recipient.email,
    name,
    first_name: nameParts[0] || '',
    last_name: nameParts.slice(1).join(' '),
    sender_name: sender?.label || sender?.email || '',
  };
  const values = {};
  for (const variable of draft?.variables || []) {
    const column = mapping[variable.id];
    const direct = recipient.variables?.[variable.id];
    const fromColumn = column ? recipient.variables?.[column] : undefined;
    const value = direct !== undefined && String(direct).trim() ? direct
      : fromColumn !== undefined && String(fromColumn).trim() ? fromColumn
        : builtins[variable.id];
    if (value !== undefined && String(value).trim()) values[variable.id] = value;
  }
  return values;
}

function missingVariables(draft, recipients, mapping, sender) {
  return (draft?.variables || []).filter(variable =>
    recipients.some(recipient => recipientValues(recipient, draft, mapping, sender)[variable.id] === undefined)
  );
}

export default function EmailAutomationView() {
  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [draftsError, setDraftsError] = useState(null);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [draftDetail, setDraftDetail] = useState(null);
  const [draftDetailLoading, setDraftDetailLoading] = useState(false);

  const [config, setConfig] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
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
  const [quarantinedCount, setQuarantinedCount] = useState(0);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [variableMapping, setVariableMapping] = useState({});
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null);
  const [trackingCampaignId, setTrackingCampaignId] = useState(null);
  const sendRequestId = useRef(null);
  const scheduleRequestId = useRef(null);
  const [sendError, setSendError] = useState(null);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [minScheduleDateTime, setMinScheduleDateTime] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(null);

  // Inline template composer (create draft right here — Body page stays optional)
  const [showComposer, setShowComposer] = useState(false);
  const [composerSubject, setComposerSubject] = useState('');
  const [composerBody, setComposerBody] = useState('');
  const [composerSaving, setComposerSaving] = useState(false);
  const [composerError, setComposerError] = useState(null);

  // Attached Excel (CSV/XLSX, all columns) shared by composer + send modal
  const [attachedFile, setAttachedFile] = useState(null); // { name, headers, rows }
  const [attachedLoading, setAttachedLoading] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);

  // Autocomplete: type d1... or {{d1... to insert attached headers as pills
  const [autoSuggest, setAutoSuggest] = useState(true);
  const [suggest, setSuggest] = useState(null); // { field, query, brace }
  const composerSubjectRef = useRef(null);
  const composerBodyRef = useRef(null);

  const refreshSuggest = (field) => {
    if (!autoSuggest) { setSuggest(null); return; }
    const el = field === 'subject' ? composerSubjectRef.current : composerBodyRef.current;
    const headers = attachedFile?.headers || [];
    if (!el || headers.length === 0) { setSuggest(null); return; }
    const pos = el.selectionStart ?? (field === 'subject' ? composerSubject.length : composerBody.length);
    const text = (field === 'subject' ? composerSubject : composerBody).slice(0, pos);
    const brace = /{{([\w.]*)$/.exec(text);
    const word = brace ? null : /([A-Za-z][\w.]{1,})$/.exec(text);
    const query = brace ? brace[1] : word ? word[1] : '';
    if (!query) { setSuggest(null); return; }
    const q = query.toLowerCase().replace(/_/g, '');
    const matches = headers.filter(h => {
      const n = normHeader(h).replace(/_/g, '');
      return n.includes(q);
    }).slice(0, 6);
    setSuggest(matches.length ? { field, query, brace: !!brace, matches } : null);
  };

  const applySuggestion = (header) => {
    if (!suggest) return;
    const { field } = suggest;
    const el = field === 'subject' ? composerSubjectRef.current : composerBodyRef.current;
    const get = field === 'subject' ? composerSubject : composerBody;
    const set = field === 'subject' ? setComposerSubject : setComposerBody;
    const pos = el?.selectionStart ?? get.length;
    const before = get.slice(0, pos);
    const after = get.slice(pos);
    const m = /{{[\w.]*$/.exec(before) || /[A-Za-z][\w.]*$/.exec(before);
    const start = m ? pos - m[0].length : pos;
    const insert = `{{${normHeader(header)}}}`;
    const next = before.slice(0, start) + insert + after;
    set(next);
    setSuggest(null);
    requestAnimationFrame(() => {
      if (el) {
        const c = start + insert.length;
        el.focus();
        try { el.setSelectionRange(c, c); } catch { /* ignore */ }
      }
    });
  };

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
      const res = await fetch(`${API_BASE_URL}/api/email/accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const list = data.accounts || [];
      setAccounts(list);
      const def = list.find(a => a.isDefault) || list[0] || null;
      setConfig(def);
      if (def) {
        setSelectedAccountId(def.id);
        setConfigForm(prev => ({
          ...prev,
          email: def.email || '',
          authMethod: def.authMethod || 'app_password',
          smtpHost: def.smtpHost || 'smtp.gmail.com',
          smtpPort: def.smtpPort || 587,
          clientId: def.clientId || '',
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
      if (!configForm.email) { setConfigStatus({ type: 'error', message: 'Sender email is required.' }); return; }
      const payload = {
        email: configForm.email,
        authMethod: configForm.authMethod,
        smtpHost: configForm.smtpHost,
        smtpPort: parseInt(configForm.smtpPort) || 587,
      };
      if (configForm.authMethod === 'app_password') {
        if (configForm.appPassword) payload.appPassword = configForm.appPassword;
        else if (!config) { setConfigStatus({ type: 'error', message: 'App password is required.' }); setConfigSaving(false); return; }
      } else {
        if (configForm.clientId) payload.clientId = configForm.clientId;
        if (configForm.clientSecret) payload.clientSecret = configForm.clientSecret;
        if (configForm.refreshToken) payload.refreshToken = configForm.refreshToken;
        if (!config && (!payload.clientId || !payload.clientSecret || !payload.refreshToken)) {
          setConfigStatus({ type: 'error', message: 'Client ID, secret and refresh token are required.' }); setConfigSaving(false); return;
        }
      }
      const isUpdate = !!(config && config.id);
      const url = isUpdate
        ? `${API_BASE_URL}/api/email/accounts/${config.id}`
        : `${API_BASE_URL}/api/email/accounts`;
      const res = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save config');
      await fetchConfig();
      setConfigStatus({ type: 'success', message: 'Email account saved!' });
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
      const accountId = selectedAccountId || (config && config.id);
      const url = accountId
        ? `${API_BASE_URL}/api/email/accounts/${accountId}/test`
        : `${API_BASE_URL}/api/email/test`;
      const res = await fetch(url, {
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
    const timer = setTimeout(() => {
      fetchDrafts();
      fetchConfig();
      fetchCampaigns();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchDrafts, fetchConfig, fetchCampaigns]);

  useEffect(() => {
    if (!trackingCampaignId) return undefined;
    let cancelled = false;
    let timer;
    const refresh = async () => {
      try {
        const token = await getAuthToken();
        if (!token) throw new Error('Session expired');
        const res = await fetch(`${API_BASE_URL}/api/email/campaigns/${trackingCampaignId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Could not load campaign progress');
        const { campaign } = await res.json();
        if (cancelled) return;
        setSendStatus(campaign);
        if (['sent', 'partial', 'failed', 'needs_review', 'cancelled'].includes(campaign.status)) {
          setTrackingCampaignId(null);
          fetchCampaigns();
        } else timer = setTimeout(refresh, 2500);
      } catch (err) {
        if (!cancelled) { setSendError(err.message); timer = setTimeout(refresh, 5000); }
      }
    };
    refresh();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [trackingCampaignId, fetchCampaigns]);

  const handleDraftClick = (draft) => {
    setSelectedDraft(draft._id);
    fetchDraftDetail(draft._id);
  };

  const openSendModal = async (draft) => {
    let fullDraft = draft;
    if (!draft.bodyHtml) {
      try {
        const token = await getAuthToken();
        const res = await fetch(`${API_BASE_URL}/api/email/drafts/${draft._id}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Could not load the email template');
        fullDraft = (await res.json()).draft;
      } catch (err) { setDraftsError(err.message); return; }
    }
    const usedVariables = extractVars(fullDraft.subject, fullDraft.bodyHtml);
    fullDraft = { ...fullDraft, variables: usedVariables.map(id => ({ id, label: `{{${id}}}` })) };
    setSendDraft(fullDraft);
    setCampaignName(`Campaign — ${draft.subject || 'Untitled'}`);
    if (!selectedAccountId && config && config.id) setSelectedAccountId(config.id);
    setSendStatus(null);
    setTrackingCampaignId(null);
    sendRequestId.current = crypto.randomUUID();
    scheduleRequestId.current = crypto.randomUUID();
    setSendError(null);
    setShowSchedulePicker(false);
    setScheduleDateTime('');
    setMinScheduleDateTime('');
    setScheduleSuccess(null);
    setPreviewIdx(0);
    // Reuse the attached Excel if present — no re-upload needed
    if (attachedFile && attachedFile.rows.length > 0) {
      applySpreadsheetData(attachedFile.headers, attachedFile.rows, fullDraft);
    } else {
      setRecipients([]);
      setQuarantinedCount(0);
      setCsvHeaders([]);
      setVariableMapping({});
    }
    setShowSendModal(true);
  };

  // Shared: turn headers+row-objects into recipients + auto variable mapping
  const applySpreadsheetData = (headers, rows, draftOverride) => {
    const draft = draftOverride || sendDraft;
    setSendError(null);
    setCsvHeaders(headers);
    const emailCol = headers.find(f => normHeader(f).includes('email'));
    const nameCol = headers.find(f => normHeader(f).includes('name') && !normHeader(f).includes('company'));
    const parsed = rows.map(row => ({
      email: emailCol ? String(row[emailCol] ?? '').trim() : '',
      name: nameCol ? String(row[nameCol] ?? '').trim() : '',
      variables: { ...row },
    }));
    const valid = parsed.filter(r => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email));
    setQuarantinedCount(parsed.length - valid.length);
    if (valid.length > 500) {
      setRecipients([]);
      setSendError('A campaign supports up to 500 valid recipients. Split this file into smaller campaigns.');
      return;
    }
    setRecipients(valid);
    setPreviewIdx(0);
    const vars = draft?.variables || [];
    if (vars.length && headers.length) {
      setVariableMapping(autoMapVariables(vars.map(v => v.id), headers));
    } else {
      setVariableMapping({});
    }
  };

  // Parse CSV/XLSX/XLS with ALL columns preserved
  const parseSpreadsheetFile = (file) => new Promise((resolve, reject) => {
    const name = (file.name || '').toLowerCase();
    if (name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (!results.meta?.fields) return reject(new Error('No headers found'));
          resolve({ headers: results.meta.fields, rows: results.data });
        },
        error: reject,
      });
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
          if (!json.length) return reject(new Error('No rows found'));
          resolve({ headers: Object.keys(json[0]), rows: json });
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error('Use .csv, .xlsx or .xls'));
    }
  });

  const handleAttachFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedLoading(true);
    try {
      const { headers, rows } = await parseSpreadsheetFile(file);
      setAttachedFile({ name: file.name, headers, rows });
      applySpreadsheetData(headers, rows);
    } catch (err) {
      setSendError(err.message || 'Failed to parse file');
    } finally {
      setAttachedLoading(false);
      if (e.target.value) e.target.value = '';
    }
  };

  const handleComposerSave = async () => {
    setComposerSaving(true);
    setComposerError(null);
    try {
      const token = await getAuthToken();
      if (!token) { setComposerError('Not authenticated.'); return; }
      if (!composerSubject.trim() && !composerBody.trim()) { setComposerError('Write a subject or body first.'); return; }
      const subject = canonicalizeTemplate(composerSubject);
      const body = canonicalizeTemplate(composerBody);
      const varIds = extractVars(subject, body);
      const bodyHtml = body.split('\n').map(l => `<p>${escapeHtml(l) || '<br>'}</p>`).join('');
      const res = await fetch(`${API_BASE_URL}/api/email/drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          subject,
          bodyHtml,
          variables: varIds.map(id => ({ id, label: `{{${id}}}` })),
          dataSourceType: attachedFile ? 'upload' : 'none',
          dataSourceFile: attachedFile ? attachedFile.name : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save template');
      setComposerSubject('');
      setComposerBody('');
      setShowComposer(false);
      fetchDrafts();
      if (data.draft) {
        const full = { ...data.draft, variables: varIds.map(id => ({ id, label: `{{${id}}}` })) };
        openSendModal(full);
      }
    } catch (err) {
      setComposerError(err.message);
    } finally {
      setComposerSaving(false);
    }
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const name = (file.name || '').toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      // Excel path: reuse shared parser so XLSX works at send time too
      setAttachedLoading(true);
      parseSpreadsheetFile(file)
        .then(({ headers, rows }) => {
          setAttachedFile({ name: file.name, headers, rows });
          applySpreadsheetData(headers, rows);
        })
        .catch((err) => setSendError(err.message || 'Failed to parse file'))
        .finally(() => setAttachedLoading(false));
      if (e.target.value) e.target.value = '';
      return;
    }
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        if (results.meta?.fields) {
          setAttachedFile({ name: file.name, headers: results.meta.fields, rows: results.data });
          applySpreadsheetData(results.meta.fields, results.data);
        }
      }
    });
    if (e.target.value) e.target.value = '';
  };

  const addManualRecipient = () => {
    if (recipients.length >= 500) { setSendError('A campaign supports up to 500 recipients.'); return; }
    setRecipients(prev => [...prev, { email: '', name: '', variables: {} }]);
  };

  const updateManualRecipient = (idx, field, value) => {
    setRecipients(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const updateManualVariable = (idx, id, value) => {
    setRecipients(prev => prev.map((r, i) => i === idx
      ? { ...r, variables: { ...r.variables, [id]: value } } : r));
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
      if (recipients.some(r => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email))) { setSendError('Correct invalid recipient email addresses before sending.'); return; }
      const sender = accounts.find(a => a.id === selectedAccountId) || config;
      const unmappedSend = missingVariables(sendDraft, recipients, variableMapping, sender);
      if (unmappedSend.length > 0) { setSendError(`Fill or map these variables before sending: ${unmappedSend.map(v => v.label || v.id).join(', ')}`); return; }
      const finalRecipients = recipients.map(r => ({
        email: r.email, name: r.name,
        variables: recipientValues(r, sendDraft, variableMapping, sender),
      }));
      const res = await fetch(`${API_BASE_URL}/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          draftId: sendDraft._id,
          recipients: finalRecipients,
          campaignName: campaignName || `Campaign ${new Date().toLocaleDateString()}`,
          accountId: selectedAccountId || (config && config.id) || undefined,
          requestId: sendRequestId.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send campaign');
      setSendStatus({ status: data.status || 'queued', sentCount: 0, failedCount: 0, recipients: finalRecipients });
      setTrackingCampaignId(data.campaignId);
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
      if (recipients.some(r => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email))) { setSendError('Correct invalid recipient email addresses before scheduling.'); return; }
      if (!scheduleDateTime) { setSendError('Pick a date and time.'); return; }
      const sender = accounts.find(a => a.id === selectedAccountId) || config;
      const unmappedSched = missingVariables(sendDraft, recipients, variableMapping, sender);
      if (unmappedSched.length > 0) { setSendError(`Fill or map these variables before scheduling: ${unmappedSched.map(v => v.label || v.id).join(', ')}`); return; }

      const finalRecipients = recipients.map(r => ({
        email: r.email, name: r.name,
        variables: recipientValues(r, sendDraft, variableMapping, sender),
      }));

      const res = await fetch(`${API_BASE_URL}/api/email/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          draftId: sendDraft._id,
          recipients: finalRecipients,
          campaignName: campaignName || `Scheduled Campaign ${new Date().toLocaleDateString()}`,
          scheduledAt: new Date(scheduleDateTime).toISOString(),
          accountId: selectedAccountId || (config && config.id) || undefined,
          requestId: scheduleRequestId.current,
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
            <p className="ea-subtitle">Create templates, attach Excel, preview and send — Body page stays optional</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="ea-refresh-btn" onClick={() => setShowComposer(v => !v)}>
              <Plus size={16} />
              {showComposer ? 'Close composer' : 'New template'}
            </button>
            <button className="ea-refresh-btn" onClick={fetchDrafts} disabled={draftsLoading}>
              <RefreshCw size={16} className={draftsLoading ? 'spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {showComposer && (
          <div className="ea-draft-detail" style={{ marginBottom: '16px' }}>
            <div className="ea-draft-detail-header">
              <h3>New email template</h3>
            </div>
            <div className="ea-form-group">
              <label>Subject (type d1.. or {'{{'} to auto-insert Excel columns)</label>
              <input
                ref={composerSubjectRef}
                type="text"
                value={composerSubject}
                onChange={e => { setComposerSubject(e.target.value); requestAnimationFrame(() => refreshSuggest('subject')); }}
                onSelect={() => refreshSuggest('subject')}
                onClick={() => refreshSuggest('subject')}
                onKeyUp={() => refreshSuggest('subject')}
                placeholder="Quick question about {{company_name}}"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px' }}
              />
            </div>
            <div className="ea-form-group">
              <label>Body (type d1.. or {'{{'} to auto-insert Excel columns)</label>
              <textarea
                ref={composerBodyRef}
                value={composerBody}
                onChange={e => { setComposerBody(e.target.value); requestAnimationFrame(() => refreshSuggest('body')); }}
                onSelect={() => refreshSuggest('body')}
                onClick={() => refreshSuggest('body')}
                onKeyUp={() => refreshSuggest('body')}
                placeholder={'Hello {{first_name}}, ...'}
                rows={6}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'inherit' }}
              />
              {suggest && (
                <div className="ea-mapping-list" style={{ marginTop: '8px' }}>
                  {suggest.matches.map(h => {
                    const row = attachedFile.rows[0] || {};
                    return (
                      <div key={h} className="ea-mapping-row" style={{ cursor: 'pointer' }} onClick={() => applySuggestion(h)}>
                        <span className="ea-mapping-var">{`{{${h}}}`}</span>
                        <span style={{ fontSize: '12px', opacity: 0.7 }}>{String(row[h] ?? '').slice(0, 40) || '—'}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginTop: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={autoSuggest} onChange={e => { setAutoSuggest(e.target.checked); setSuggest(null); }} />
                Auto-suggest Excel columns while typing
              </label>
            </div>
            <div className="ea-form-group">
              <label>Excel (CSV/XLSX — all columns kept, auto-mapped)</label>
              <div className="ea-csv-upload">
                <label className="ea-csv-upload-btn">
                  <FileUp size={14} />
                  {attachedLoading ? 'Parsing...' : attachedFile ? attachedFile.name : 'Attach file'}
                  <input type="file" accept=".csv,.xlsx,.xls" onChange={handleAttachFile} style={{ display: 'none' }} />
                </label>
                {attachedFile && (
                  <span className="ea-chip"><FileSpreadsheet size={12} />{attachedFile.headers.length} cols · {attachedFile.rows.length} rows</span>
                )}
              </div>
            </div>
            {composerError && (
              <div className="ea-test-status error"><AlertTriangle size={14} />{composerError}</div>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button className="ea-cancel-btn" onClick={() => setShowComposer(false)}>Cancel</button>
              <button className="ea-save-config-btn" onClick={handleComposerSave} disabled={composerSaving}>
                {composerSaving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                {composerSaving ? 'Saving...' : 'Save & continue to send'}
              </button>
            </div>
          </div>
        )}

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
            <p>Create a template above with “New template”, or in the Body editor — both land here.</p>
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
                    {stripHtml(draft.bodyPreview || '').substring(0, 120) || 'No content'}
                    {stripHtml(draft.bodyPreview || '').length > 120 ? '...' : ''}
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

        {draftDetailLoading && !draftDetail && (
          <div className="ea-draft-detail">
            <div className="ea-sidebar-loading">
              <Loader2 size={16} className="spin" /> Loading draft…
            </div>
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
              dangerouslySetInnerHTML={{ __html: safeHtml(draftDetail.bodyHtml) }}
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
                  <span className={`ea-campaign-badge ${c.status === 'sent' && (c.failedCount || c.suppressedCount) ? 'partial' : c.status}`}>
                    {c.status === 'sent' && (c.failedCount || c.suppressedCount) ? 'partial' : c.status}
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
                  <h4>Campaign {sendStatus.status === 'needs_review' ? 'Needs Review' : sendStatus.status}</h4>
                  {['queued', 'sending', 'scheduled'].includes(sendStatus.status) && <p>Delivery is in progress. You can close this window and check Recent Campaigns or Sent Emails.</p>}
                  {sendStatus.status === 'needs_review' && <p>One or more delivery results are uncertain. Review them in Sent Emails before retrying.</p>}
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
                      <span className="ea-send-result-num">{sendStatus.suppressedCount || 0}</span>
                      <span className="ea-send-result-label">Suppressed</span>
                    </div>
                    <div className="ea-send-result-stat">
                      <span className="ea-send-result-num">{sendStatus.recipients?.length ?? sendStatus.totalRecipients ?? 0}</span>
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
                    <label>Sender Account</label>
                    <select
                      value={selectedAccountId || ''}
                      onChange={e => setSelectedAccountId(e.target.value || null)}
                    >
                      {accounts.length === 0 && <option value="">No accounts — add one in Settings</option>}
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.email}{a.isDefault ? ' (default)' : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div className="ea-form-group">
                    <label>Recipients (Excel: CSV/XLSX, all columns kept)</label>
                    <div className="ea-csv-upload">
                      <label className="ea-csv-upload-btn">
                        <Upload size={14} />
                        {attachedLoading ? 'Parsing...' : 'Upload File'}
                        <input type="file" accept=".csv,.xlsx,.xls" onChange={handleCsvUpload} style={{ display: 'none' }} />
                      </label>
                      <button className="ea-manual-add-btn" onClick={addManualRecipient}>
                        <Plus size={14} />
                        Add Manually
                      </button>
                    </div>
                    {attachedFile && (
                      <div className="ea-chip" style={{ marginTop: '8px' }}>
                        <FileSpreadsheet size={12} />
                        {attachedFile.name} · {attachedFile.headers.length} cols · {attachedFile.rows.length} rows
                      </div>
                    )}
                  </div>

                  {recipients.length > 0 && sendDraft && (
                    <div className="ea-form-group">
                      <label><Eye size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> Preview with real row</label>
                      <div className="ea-draft-detail" style={{ margin: 0 }}>
                        <div style={{ fontWeight: 700, marginBottom: '6px' }}>
                          {(() => {
                            const r = recipients[Math.min(previewIdx, recipients.length - 1)];
                            const sender = accounts.find(a => a.id === selectedAccountId) || config;
                            return substitutePreview(sendDraft.subject, recipientValues(r, sendDraft, variableMapping, sender), false) || 'Untitled';
                          })()}
                        </div>
                        <div
                          dangerouslySetInnerHTML={{ __html: safeHtml((() => {
                            const r = recipients[Math.min(previewIdx, recipients.length - 1)];
                            const sender = accounts.find(a => a.id === selectedAccountId) || config;
                            return substitutePreview(sendDraft.bodyHtml || '', recipientValues(r, sendDraft, variableMapping, sender));
                          })()) }}
                        />
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '10px' }}>
                          <button className="ea-cancel-btn" disabled={previewIdx === 0} onClick={() => setPreviewIdx(i => Math.max(0, i - 1))}>Prev</button>
                          <span style={{ fontSize: '12px' }}>{Math.min(previewIdx + 1, recipients.length)} / {recipients.length} · {recipients[Math.min(previewIdx, recipients.length - 1)]?.email}</span>
                          <button className="ea-cancel-btn" disabled={previewIdx >= recipients.length - 1} onClick={() => setPreviewIdx(i => Math.min(recipients.length - 1, i + 1))}>Next</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {recipients.length > 0 && (
                    <>
                      {sendDraft?.variables?.length > 0 && csvHeaders.length > 0 && (
                        <div className="ea-form-group">
                          <label>Variable Mapping (unfilled values must be mapped before sending)</label>
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
                          <div key={idx} className="ea-recipient-entry">
                            <div className="ea-recipient-row">
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
                              <button className="ea-recipient-remove" onClick={() => removeRecipient(idx)} aria-label={`Remove ${r.email || 'recipient'}`}>
                                <X size={14} />
                              </button>
                            </div>
                            {(csvHeaders.length === 0 || Object.keys(r.variables || {}).length === 0) && (sendDraft.variables || []).some(v => !['email', 'email_address', 'sender_name'].includes(v.id)) && (
                              <div className="ea-manual-variable-fields">
                                {(sendDraft.variables || []).filter(v => !['email', 'email_address', 'sender_name'].includes(v.id)).map(v => (
                                  <label key={v.id}>
                                    <span>{v.id.replace(/_/g, ' ')}</span>
                                    <input type="text" value={r.variables?.[v.id] ?? recipientValues(r, sendDraft, {}, accounts.find(a => a.id === selectedAccountId) || config)[v.id] ?? ''}
                                      onChange={e => updateManualVariable(idx, v.id, e.target.value)} />
                                  </label>
                                ))}
                              </div>
                            )}
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

                  {recipients.length > 0 && sendDraft && (
                    <div className="ea-test-status" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <Users size={14} />
                      {(() => {
                        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        const valid = recipients.filter(r => re.test(r.email || '')).length;
                        const sender = accounts.find(a => a.id === selectedAccountId) || config;
                        const unmapped = missingVariables(sendDraft, recipients, variableMapping, sender);
                        return (
                          <span>
                            {recipients.length + quarantinedCount} rows · {valid} valid emails · {quarantinedCount} quarantined · {recipients.length - valid} need correction
                            {unmapped.length > 0
                              ? ` · UNMAPPED: ${unmapped.map(v => v.label || v.id).join(', ')}`
                              : ' · all pills bound'}
                          </span>
                        );
                      })()}
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
                      min={minScheduleDateTime}
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
                        onClick={() => {
                          const earliest = new Date(Date.now() + 60000);
                          setMinScheduleDateTime(new Date(earliest.getTime() - earliest.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
                          setShowSchedulePicker(true);
                        }}
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
