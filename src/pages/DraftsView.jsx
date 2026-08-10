import React, { useState, useEffect } from 'react';
import { File, Calendar, Clock, CheckCircle2, AlertCircle, Link as LinkIcon, Copy, GraduationCap, Briefcase, Users, Trash2 } from 'lucide-react';
import { getAuthToken } from '../supabaseAuth';
import CustomCalendar from '../components/CustomCalendar';
import CustomTimePicker from '../components/CustomTimePicker';
import './DraftsView.css';

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

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch('http://localhost:5000/api/drafts', {
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

  const handleSelectDraft = (draft) => {
    setSelectedDraft(draft);
  };

  const handleDeleteDraft = async () => {
    if (!draftToDelete || !deleteVerify) return;
    setIsDeleting(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`http://localhost:5000/api/drafts/${draftToDelete.draftId}`, {
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
      const res = await fetch(`http://localhost:5000/api/drafts/${selectedDraft.draftId}/activate`, {
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
                value={`Http://localhost:5173/form/${encodeURIComponent(selectedDraft.title)}/${selectedDraft.draftId}`} 
                readOnly 
              />
              <button 
                className="copy-btn"
                onClick={() => navigator.clipboard.writeText(`http://localhost:5173/form/${encodeURIComponent(selectedDraft.title)}/${selectedDraft.draftId}`)}
              >
                <Copy size={16} />
              </button>
            </div>
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
    </div>
  );
}






