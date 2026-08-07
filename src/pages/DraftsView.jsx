import React, { useState, useEffect } from 'react';
import { File, Calendar, Clock, CheckCircle2, AlertCircle, Link as LinkIcon, Copy } from 'lucide-react';
import { auth } from '../firebaseAuth';
import './DraftsView.css';

export default function DraftsView() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDraft, setSelectedDraft] = useState(null);
  
  const [expiryDate, setExpiryDate] = useState('');
  const [expiryTime, setExpiryTime] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const res = await fetch('http://localhost:5000/api/drafts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
    setExpiryDate('');
    setExpiryTime('');
  };

  const handleActivateDraft = async () => {
    if (!expiryDate || !expiryTime) {
      alert('Please select both a date and time.');
      return;
    }

    setIsActivating(true);
    try {
      // Combine date and time into local ISO
      const dateTimeString = `${expiryDate}T${expiryTime}:00`;
      const dateObj = new Date(dateTimeString);
      
      const token = await auth.currentUser?.getIdToken();
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
        // Update local state
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
            {drafts.map(draft => (
              <div 
                key={draft.draftId} 
                className={`draft-card ${selectedDraft?.draftId === draft.draftId ? 'selected' : ''}`}
                onClick={() => handleSelectDraft(draft)}
              >
                <div className="draft-card-title">{draft.title}</div>
                <div className="draft-card-meta">
                  <span>{new Date(draft.createdAt).toLocaleDateString()}</span>
                  {getStatusBadge(draft.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR - Scheduler */}
      <div className="drafts-sidebar-panel">
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1E293B', marginBottom: '16px' }}>Draft Configuration</h3>

        {selectedDraft ? (
          <div className="scheduler-container">
            <h3 className="scheduler-title">{selectedDraft.title}</h3>
            
            {selectedDraft.status === 'draft' ? (
              <div className="scheduler-form">
                <div className="form-group">
                  <label><Calendar size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }}/> Expiration Date</label>
                  <input 
                    type="date" 
                    className="scheduler-input" 
                    value={expiryDate} 
                    onChange={e => setExpiryDate(e.target.value)} 
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div className="form-group">
                  <label><Clock size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }}/> Expiration Time</label>
                  <input 
                    type="time" 
                    className="scheduler-input" 
                    value={expiryTime} 
                    onChange={e => setExpiryTime(e.target.value)} 
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
              </div>
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
                    value={`http://localhost:5173/form/${encodeURIComponent(selectedDraft.title)}/${selectedDraft.draftId}`} 
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
        ) : (
          <div className="empty-state">
            <File size={48} />
            <h3>No Draft Selected</h3>
            <p>Select a draft from the main panel to schedule.</p>
          </div>
        )}
      </div>


    </div>
  );
}
