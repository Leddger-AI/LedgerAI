import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './TemplateBuilder.css'; // Re-use styles

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function PublicFormView() {
  const { title, draftId } = useParams();
  
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/forms/${draftId}`);
        const data = await response.json();
        
        if (response.status === 410) {
          setError('This form link has expired.');
        } else if (!response.ok) {
          setError(data.error || 'Failed to load form.');
        } else {
          setConfig(data.config);
          
          // Init form data based on config
          const initialData = {};
          if (data.config.toggles.teamTitle) initialData.teamTitle = data.config.titlePrefix || '';
          if (data.config.toggles.department) initialData.department = '';
          if (data.config.toggles.teamLead) initialData.teamLead = data.config.autoAssignLead ? 'Auto-assigned' : '';
          if (data.config.toggles.teamObjective) initialData.objective = '';
          
          setFormData(initialData);
        }
      } catch (err) {
        setError('Error connecting to server.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchForm();
  }, [draftId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/forms/${draftId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submittedData: formData })
      });
      
      const data = await response.json();
      if (response.ok) {
        setSubmitted(true);
      } else {
        alert(data.error || 'Failed to submit form.');
      }
    } catch (err) {
      alert('Error submitting form.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading form...</div>;
  
  if (error) return (
    <div style={{ padding: '60px', textAlign: 'center' }}>
      <h2 style={{ color: '#EF4444' }}>Link Expired or Invalid</h2>
      <p style={{ color: '#6B7280' }}>{error}</p>
    </div>
  );

  if (submitted) return (
    <div style={{ padding: '60px', textAlign: 'center' }}>
      <h2 style={{ color: '#10B981' }}>Success!</h2>
      <p style={{ color: '#6B7280' }}>Your form has been successfully submitted and saved.</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F3F4F6', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '40px 20px' }}>
      <div style={{ backgroundColor: '#FFFFFF', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '100%', maxWidth: '700px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: '#111827' }}>{decodeURIComponent(title)}</h1>
        <p style={{ color: '#6B7280', marginBottom: '32px' }}>Please fill out the required fields below.</p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {config.toggles.teamTitle && (
            <div className="form-field">
              <label className="form-label">Team Name</label>
              <input 
                type="text" 
                className="form-input" 
                required
                value={formData.teamTitle}
                onChange={e => setFormData({ ...formData, teamTitle: e.target.value })}
              />
            </div>
          )}

          {config.toggles.department && config.deptInputMode === 'dropdown' && (
            <div className="form-field">
              <label className="form-label">Department</label>
              <select 
                className="form-select" 
                required
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
              >
                <option value="">Select a department...</option>
                {config.selectedDepartments?.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          )}
          
          {config.toggles.department && config.deptInputMode === 'free-text' && (
            <div className="form-field">
              <label className="form-label">Department</label>
              <input 
                type="text" 
                className="form-input"
                required
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
          )}

          {config.toggles.teamLead && (
            <div className="form-field">
              <label className="form-label">Team Lead</label>
              <input 
                type="text" 
                className="form-input" 
                required
                disabled={config.autoAssignLead}
                value={formData.teamLead}
                onChange={e => setFormData({ ...formData, teamLead: e.target.value })}
              />
            </div>
          )}

          {config.toggles.teamObjective && (
            <div className="form-field">
              <label className="form-label">Team Objective / Charter</label>
              <textarea 
                className="form-textarea" 
                required
                value={formData.objective}
                onChange={e => setFormData({ ...formData, objective: e.target.value })}
              />
            </div>
          )}

          <div style={{ marginTop: '16px' }}>
            <button type="submit" className="form-btn primary" style={{ width: '100%', padding: '12px' }} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Form'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
