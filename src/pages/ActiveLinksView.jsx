import React, { useState, useEffect } from 'react';
import { Send, Clock, Copy, ExternalLink, Link2, AlertCircle } from 'lucide-react';
import { getAuthToken } from '../supabaseAuth';
import './ActiveLinksView.css';

const FormPreviewCard = ({ draft }) => {
  const { title, expiresAt, config, draftId } = draft;
  const isExpired = new Date(expiresAt) < new Date();
  
  // Try to parse the config safely
  let fields = [];
  try {
    const parsedConfig = typeof config === 'string' ? JSON.parse(config) : config;
    fields = parsedConfig.fields || [];
  } catch (e) {
    console.error("Failed to parse config for draft", draftId);
  }

  // Generate live link
  const liveLink = `http://localhost:5173/form/${encodeURIComponent(title)}/${draftId}`;

  return (
    <div className="form-preview-card">
      <div className="form-preview-header">
        <h3 className="form-preview-title">{title}</h3>
        <div className="form-preview-meta" style={{ 
          backgroundColor: isExpired ? '#FEF2F2' : '#ECFDF5',
          color: isExpired ? '#991B1B' : '#065F46'
        }}>
          {isExpired ? <AlertCircle size={14} /> : <Clock size={14} />}
          {isExpired ? 'Expired' : `Expires: ${new Date(expiresAt).toLocaleString()}`}
        </div>
      </div>
      
      <div className="form-preview-body">
        {fields.slice(0, 3).map((field, index) => (
          <div key={index} className="mini-field">
            <span className="mini-field-label">{field.label || 'Question'}</span>
            {field.type === 'textarea' ? (
              <div className="mini-field-textarea"></div>
            ) : field.type === 'select' || field.type === 'radio' ? (
              <div className="mini-field-input" style={{ backgroundColor: '#F1F5F9' }}></div>
            ) : (
              <div className="mini-field-input"></div>
            )}
          </div>
        ))}
        {fields.length > 3 && (
          <div style={{ fontSize: '11px', color: '#94A3B8', textAlign: 'center', marginTop: '4px' }}>
            + {fields.length - 3} more fields
          </div>
        )}
        {fields.length === 0 && (
          <div style={{ fontSize: '11px', color: '#94A3B8', textAlign: 'center' }}>No fields defined</div>
        )}
      </div>
      
      <div className="form-preview-footer">
        <div className="form-preview-link-box">
          <input 
            type="text" 
            className="form-preview-link-input" 
            value={liveLink} 
            readOnly 
          />
          <button 
            className="form-preview-copy-btn"
            title="Copy Link"
            onClick={() => navigator.clipboard.writeText(liveLink)}
          >
            <Copy size={14} />
          </button>
          <a 
            href={`/form/${encodeURIComponent(title)}/${draftId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="form-preview-copy-btn"
            style={{ backgroundColor: '#F8FAFC', color: '#0F172A', border: '1px solid #CBD5E1' }}
            title="Open in new tab"
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default function ActiveLinksView() {
  const [activeDrafts, setActiveDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveDrafts();
  }, []);

  const fetchActiveDrafts = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('http://localhost:5000/api/drafts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch drafts');
      
      const data = await response.json();
      
      // Filter only drafts that have been activated (status === 'active')
      const active = data.drafts.filter(d => d.status === 'active' || (d.status !== 'draft' && d.expiresAt));
      setActiveDrafts(active);
    } catch (err) {
      console.error("Error fetching active links:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="active-links-container">
      <div className="active-links-main">
        <div className="active-links-header">
          <h2>Active Forms</h2>
          <p>Monitor your active forms, grab their live links, and check their expiration status.</p>
        </div>

        {loading ? (
          <div className="empty-state">
            <p>Loading your active links...</p>
          </div>
        ) : activeDrafts.length > 0 ? (
          <div className="active-links-grid">
            {activeDrafts.map(draft => (
              <FormPreviewCard key={draft._id || draft.draftId} draft={draft} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Link2 size={48} style={{ color: '#CBD5E1' }} />
            <h3>No Active Links Yet</h3>
            <p>Go to your Drafts, select a template, set a schedule, and activate it to generate a live link.</p>
          </div>
        )}
      </div>
    </div>
  );
}
