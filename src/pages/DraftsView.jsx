import React, { useState, useEffect } from 'react';
import { File, Calendar, Clock, CheckCircle2, AlertCircle, Link as LinkIcon, Copy, GraduationCap, Briefcase, Users, Trash2, Inbox } from 'lucide-react';
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

        {!selectedDraft ? (
          <button 
            className="activate-btn" 
            disabled={true}
          >
            <LinkIcon size={16} />
            Select a draft to schedule
          </button>
        ) : selectedDraft.status === 'draft' ? (
          <button 
            className="activate-btn" 
            onClick={handleActivateDraft}
            disabled={isActivating || !expiryDate || !expiryTime}
          >
            <LinkIcon size={16} />
            {isActivating ? 'Generating Link...' : 'Activate & Generate Link'}
          </button>
        ) : (
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






