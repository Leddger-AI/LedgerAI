import React, { useState, useEffect } from 'react';
import { File, Calendar, Clock, CheckCircle2, AlertCircle, Link as LinkIcon, Copy, GraduationCap, Briefcase, Users, Trash2, Inbox, Send, XCircle } from 'lucide-react';
import { getAuthToken } from '../supabaseAuth';
import CustomCalendar from '../components/CustomCalendar';
import CustomTimePicker from '../components/CustomTimePicker';
import './DraftsView.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function DraftsView() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [draftToDelete, setDraftToDelete] = useState(null);
  const [deleteVerify, setDeleteVerify] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [expiryDate, setExpiryDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryTime, setExpiryTime] = useState('07:00');
  const [isActivating, setIsActivating] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [showSubmissions, setShowSubmissions] = useState(false);

  // Schedule state
  const [scheduleMode, setScheduleMode] = useState(false);
  const [goesLiveDate, setGoesLiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [goesLiveTime, setGoesLiveTime] = useState('09:00');
  const [isScheduling, setIsScheduling] = useState(false);
  const [isCancellingSchedule, setIsCancellingSchedule] = useState(false);

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/drafts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setDrafts(data.drafts || []);
      }
    } catch (err) {
      console.error('Failed to fetch drafts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDraft = async () => {
    if (!draftToDelete || !deleteVerify) return;
    setIsDeleting(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/drafts/${draftToDelete.draftId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setDrafts(prev => prev.filter(d => d.draftId !== draftToDelete.draftId));
        if (selectedDraft?.draftId === draftToDelete.draftId) setSelectedDraft(null);
        setDraftToDelete(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
      setDeleteVerify(false);
    }
  };

  const handleActivateDraft = async () => {
    if (!expiryDate || !expiryTime) {
      alert('Please select both a date and time.');
      return;
    }

    setIsActivating(true);
    try {
      const dateTimeString = `${expiryDate}T${expiryTime}:00`;
      const dateObj = new Date(dateTimeString);
      
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/drafts/${selectedDraft.draftId}/activate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ expiresAt: dateObj.toISOString() })
      });
      
      const data = await res.json();
      if (res.ok) {
        setDrafts(prev => prev.map(d => d.draftId === selectedDraft.draftId ? data.draft : d));
        setSelectedDraft(data.draft);
      } else {
        alert(data.error || 'Failed to activate draft');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while activating draft.');
    } finally {
      setIsActivating(false);
    }
  };

  const getTemplateIcon = (draft) => {
    let type = draft.templateType;
    if (!type || type === 'unknown') {
      if (draft.title.toLowerCase().includes('student')) type = 'student';
      else if (draft.title.toLowerCase().includes('employee') || draft.title.toLowerCase().includes('hr')) type = 'employee';
      else if (draft.title.toLowerCase().includes('team')) type = 'team';
    }
    
    switch(type) {
      case 'student': return <GraduationCap size={16} className="draft-type-icon" />;
      case 'employee': return <Briefcase size={16} className="draft-type-icon" />;
      case 'team': return <Users size={16} className="draft-type-icon" />;
      default: return <File size={16} className="draft-type-icon" />;
    }
  };

  const fetchSubmissions = async (draftId) => {
    setSubmissionsLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/submissions/${draftId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const handleSelectDraft = (draft) => {
    setSelectedDraft(draft);
    setSubmissions([]);
    setShowSubmissions(false);
    setScheduleMode(false);
  };

  const handleScheduleDraft = async () => {
    if (!goesLiveDate || !goesLiveTime || !expiryDate || !expiryTime) {
      alert('Please select both go-live and expiry date/time.');
      return;
    }

    const goesLiveStr = `${goesLiveDate}T${goesLiveTime}:00`;
    const expiryStr = `${expiryDate}T${expiryTime}:00`;
    const goesLiveObj = new Date(goesLiveStr);
    const expiryObj = new Date(expiryStr);

    if (goesLiveObj <= new Date()) {
      alert('Go-live time must be in the future.');
      return;
    }
    if (expiryObj <= goesLiveObj) {
      alert('Expiry must be after the go-live time.');
      return;
    }

    setIsScheduling(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/drafts/${selectedDraft.draftId}/schedule`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          goesLiveAt: goesLiveObj.toISOString(),
          expiresAt: expiryObj.toISOString()
        })
      });

      const data = await res.json();
      if (res.ok) {
        setDrafts(prev => prev.map(d => d.draftId === selectedDraft.draftId ? data.draft : d));
        setSelectedDraft(data.draft);
      } else {
        alert(data.error || 'Failed to schedule draft');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while scheduling draft.');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleCancelSchedule = async () => {
    setIsCancellingSchedule(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/drafts/${selectedDraft.draftId}/schedule`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        setDrafts(prev => prev.map(d => d.draftId === selectedDraft.draftId ? data.draft : d));
        setSelectedDraft(data.draft);
      } else {
        alert(data.error || 'Failed to cancel schedule');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while cancelling schedule.');
    } finally {
      setIsCancellingSchedule(false);
    }
  };

  const handleViewSubmissions = () => {
    if (!selectedDraft) return;
    setShowSubmissions(true);
    fetchSubmissions(selectedDraft.draftId);
  };

  const filteredDrafts = drafts.filter(draft => {
    if (typeFilter === 'all') return true;
    return draft.templateType === typeFilter || (!draft.templateType && getTemplateIcon(draft).props.className === 'draft-type-icon');
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="status-badge active">Active</span>;
      case 'expired':
        return <span className="status-badge expired">Expired</span>;
      case 'scheduled':
        return <span className="status-badge" style={{ background: 'rgba(6, 182, 212, 0.1)', color: '#06B6D4' }}>Scheduled</span>;
      default:
        return <span className="status-badge draft">Draft</span>;
    }
  };

  return (
    <div className="drafts-container">
      {/* MAIN PANEL - Drafts List */}
      <div className="drafts-main-panel">
        <div className="drafts-header">
          <h2>Your Saved Drafts</h2>
          <p>Select a draft to schedule its expiration and generate a public link.</p>
        </div>
        
        <div className="drafts-filter-toggle">
          <button 
            className={`drafts-filter-btn ${typeFilter === 'student' ? 'active' : ''}`}
            onClick={() => setTypeFilter('student')}
          ><GraduationCap size={16} /></button>
          <button 
            className={`drafts-filter-btn ${typeFilter === 'employee' ? 'active' : ''}`}
            onClick={() => setTypeFilter('employee')}
          ><Briefcase size={16} /></button>
          <button 
            className={`drafts-filter-btn ${typeFilter === 'team' ? 'active' : ''}`}
            onClick={() => setTypeFilter('team')}
          ><Users size={16} /></button>
        </div>

        {loading ? (
          <p style={{ color: '#64748B', fontSize: '13px' }}>Loading drafts...</p>
        ) : drafts.length === 0 ? (
          <div className="empty-state">
            <File size={48} />
            <h3>No Drafts Yet</h3>
            <p>You haven't saved any drafts. Create one in the template builder.</p>
          </div>
        ) : (
          <div className="draft-list">
            {filteredDrafts.map(draft => (
              <div 
                key={draft.draftId} 
                className={`draft-card ${selectedDraft?.draftId === draft.draftId ? 'selected' : ''}`}
                onClick={() => handleSelectDraft(draft)}
              >
                <div className="draft-card-title-row">
                  {getTemplateIcon(draft)}
                  <div className="draft-card-title">{draft.title}</div>
                </div>
                <div className="draft-card-meta">
                  <span>{new Date(draft.createdAt).toLocaleDateString()}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {getStatusBadge(draft.status)}
                    <button 
                      className="draft-delete-icon" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDraftToDelete(draft);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR - Scheduler */}
      <div className="drafts-sidebar-panel">

        {/* Mode Toggle: Activate Now vs Schedule */}
        {selectedDraft && selectedDraft.status === 'draft' && (
          <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
            <button
              onClick={() => setScheduleMode(false)}
              style={{
                flex: 1, padding: '10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                background: !scheduleMode ? '#0F172A' : '#F8FAFC',
                color: !scheduleMode ? '#fff' : '#64748B'
              }}
            >
              <LinkIcon size={14} />
              Activate Now
            </button>
            <button
              onClick={() => setScheduleMode(true)}
              style={{
                flex: 1, padding: '10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                background: scheduleMode ? '#0F172A' : '#F8FAFC',
                color: scheduleMode ? '#fff' : '#64748B'
              }}
            >
              <Clock size={14} />
              Schedule
            </button>
          </div>
        )}

        {/* Schedule Mode: Go-Live + Expiry pickers */}
        {selectedDraft && selectedDraft.status === 'draft' && scheduleMode ? (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Send size={13} style={{ color: '#06B6D4' }} />
                Goes Live At
              </label>
              <CustomCalendar
                value={goesLiveDate}
                onChange={(val) => setGoesLiveDate(new Date(val).toISOString().split('T')[0])}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <CustomTimePicker
                value={goesLiveTime}
                onChange={(val) => setGoesLiveTime(val)}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={13} style={{ color: '#EF4444' }} />
                Expires At
              </label>
              <CustomCalendar
                value={expiryDate}
                onChange={(val) => setExpiryDate(new Date(val).toISOString().split('T')[0])}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <CustomTimePicker
                value={expiryTime}
                onChange={(val) => setExpiryTime(val)}
              />
            </div>

            <button
              className="activate-btn"
              onClick={handleScheduleDraft}
              disabled={isScheduling || !goesLiveDate || !goesLiveTime || !expiryDate || !expiryTime}
              style={{ background: '#06B6D4' }}
            >
              <Clock size={16} />
              {isScheduling ? 'Scheduling...' : 'Schedule Activation'}
            </button>
          </>
        ) : selectedDraft && selectedDraft.status === 'draft' ? (
          <>
            {/* Activate Now Mode: Expiry picker only */}
            <div style={{ marginBottom: '16px' }}>
              <CustomCalendar
                value={expiryDate}
                onChange={(val) => setExpiryDate(new Date(val).toISOString().split('T')[0])}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <CustomTimePicker
                value={expiryTime}
                onChange={(val) => setExpiryTime(val)}
              />
            </div>
            <button
              className="activate-btn"
              onClick={handleActivateDraft}
              disabled={isActivating || !expiryDate || !expiryTime}
            >
              <LinkIcon size={16} />
              {isActivating ? 'Generating Link...' : 'Activate & Generate Link'}
            </button>
          </>
        ) : selectedDraft && selectedDraft.status === 'scheduled' ? (
          <div className="live-link-panel">
            <div className="live-link-title" style={{ color: '#06B6D4' }}>
              <Clock size={16} />
              Scheduled
            </div>
            <div style={{ fontSize: '12px', color: '#475569', marginBottom: '8px' }}>
              <strong>Goes live at:</strong><br />
              {selectedDraft.goesLiveAt ? new Date(selectedDraft.goesLiveAt).toLocaleString() : '—'}
            </div>
            <div style={{ fontSize: '12px', color: '#475569', marginBottom: '12px' }}>
              <strong>Expires at:</strong><br />
              {selectedDraft.expiresAt ? new Date(selectedDraft.expiresAt).toLocaleString() : '—'}
            </div>
            <div className="live-link-box">
              <input
                type="text"
                className="live-link-input"
                value={`${window.location.origin}/form/${encodeURIComponent(selectedDraft.title)}/${selectedDraft.draftId}`}
                readOnly
              />
              <button
                className="copy-btn"
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/form/${encodeURIComponent(selectedDraft.title)}/${selectedDraft.draftId}`)}
              >
                <Copy size={16} />
              </button>
            </div>
            <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '8px', marginBottom: '12px' }}>
              Link will be accessible to applicants at the scheduled go-live time.
            </p>
            <button
              onClick={handleCancelSchedule}
              disabled={isCancellingSchedule}
              style={{ width: '100%', padding: '10px', background: 'none', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: isCancellingSchedule ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: isCancellingSchedule ? 0.6 : 1 }}
            >
              <XCircle size={16} />
              {isCancellingSchedule ? 'Cancelling...' : 'Cancel Schedule'}
            </button>
          </div>
        ) : selectedDraft ? (
          <div className="live-link-panel">
            <div className="live-link-title">
              {selectedDraft.status === 'active' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {selectedDraft.status === 'active' ? 'Link is Live' : 'Link Expired'}
            </div>
            <p style={{ fontSize: '12px', color: '#064E3B', marginBottom: '12px' }}>
              Expires at: {new Date(selectedDraft.expiresAt).toLocaleString()}
            </p>
            <div className="live-link-box">
              <input
                type="text"
                className="live-link-input"
                value={`${window.location.origin}/form/${encodeURIComponent(selectedDraft.title)}/${selectedDraft.draftId}`}
                readOnly
              />
              <button
                className="copy-btn"
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/form/${encodeURIComponent(selectedDraft.title)}/${selectedDraft.draftId}`)}
              >
                <Copy size={16} />
              </button>
            </div>
            <button
              className="view-submissions-btn"
              onClick={handleViewSubmissions}
              style={{ marginTop: '12px', width: '100%', padding: '10px', background: '#0F172A', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Inbox size={16} />
              View Submissions
            </button>
          </div>
        ) : (
          <button
            className="activate-btn"
            disabled={true}
          >
            <LinkIcon size={16} />
            Select a draft to schedule
          </button>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {draftToDelete && (
        <div className="delete-modal-overlay">
          <div className="delete-modal-card">
            <h3 className="delete-modal-title">Delete Draft</h3>
            <p className="delete-modal-desc">
              Are you sure you want to delete the draft <strong>"{draftToDelete.title}"</strong>? 
              This action cannot be undone. Any generated links will stop working immediately.
            </p>
            
            <label className="delete-modal-checkbox">
              <input 
                type="checkbox" 
                checked={deleteVerify}
                onChange={(e) => setDeleteVerify(e.target.checked)}
              />
              <span>I understand that this deletion is permanent.</span>
            </label>
            
            <div className="delete-modal-actions">
              <button 
                className="delete-modal-btn cancel"
                onClick={() => {
                  setDraftToDelete(null);
                  setDeleteVerify(false);
                }}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className="delete-modal-btn confirm"
                onClick={handleDeleteDraft}
                disabled={!deleteVerify || isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSubmissions && selectedDraft && (
        <div className="delete-modal-overlay" onClick={() => setShowSubmissions(false)}>
          <div className="delete-modal-card" style={{ maxWidth: '600px', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="delete-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Inbox size={18} />
                Submissions — {selectedDraft.title}
              </h3>
              <button onClick={() => setShowSubmissions(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#94A3B8' }}>&times;</button>
            </div>

            {submissionsLoading ? (
              <p style={{ color: '#64748B', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Loading submissions...</p>
            ) : submissions.length === 0 ? (
              <p style={{ color: '#94A3B8', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>No submissions yet for this form.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {submissions.map((sub, idx) => (
                  <div key={sub.submissionId} style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Submission #{idx + 1}</span>
                      <span style={{ fontSize: '11px', color: '#94A3B8' }}>{new Date(sub.submittedAt).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                      {Object.entries(sub.submittedData || {}).map(([key, value]) => (
                        <div key={key} style={{ display: 'flex', gap: '8px', padding: '2px 0' }}>
                          <span style={{ fontWeight: 600, minWidth: '120px', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}:</span>
                          <span>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}






