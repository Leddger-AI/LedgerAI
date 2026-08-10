import React, { useState, useEffect } from 'react';
import { User, Link, Briefcase, Building, Calendar, Star, Target, MessageSquare, ClipboardList, Zap, Monitor, Smartphone, Camera, FileUp, Mail, Users, Tag, CheckSquare, Search, Plus, Trash2 } from 'lucide-react';
import './TemplateBuilder.css';
import { getAuthToken, getCurrentUser } from '../supabaseAuth';

const DEFAULT_TOGGLES = {
  teamTitle: false,
  teamLead: true,
  teamMembers: true,
  department: false,
  teamObjective: false,
  budgetCode: false
};

export default function TeamTemplateBuilder() {
  const [toggles, setToggles] = useState(DEFAULT_TOGGLES);
  const [previewMode, setPreviewMode] = useState('desktop');
  
  // Basic Form States
  const [formTitle, setFormTitle] = useState('Team Strategy Charter');
  
  // Advanced Team Title States
  const [titlePrefix, setTitlePrefix] = useState('');
  
  // Advanced Team Lead States
  const [leadRestriction, setLeadRestriction] = useState('all');
  const [autoAssignLead, setAutoAssignLead] = useState(false);
  
  // Advanced Team Members States
  const [minMembers, setMinMembers] = useState(2);
  const [maxMembers, setMaxMembers] = useState(10);
  const [crossFunctional, setCrossFunctional] = useState(true);

  // Advanced Department States
  const [deptInputMode, setDeptInputMode] = useState('free-text'); // 'free-text' or 'dropdown'
  const [savedDepartments, setSavedDepartments] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [newDeptInput, setNewDeptInput] = useState('');
  
  // Draft Generation State
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        if (await getCurrentUser()) {
          const token = await getAuthToken();
          const res = await fetch('http://localhost:5000/api/user/departments', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.departments) {
            setSavedDepartments(data.departments);
            setSelectedDepartments(data.departments); // Default all selected
          }
        }
      } catch (error) {
        console.error("Error fetching departments from backend:", error);
      }
    };
    fetchDepartments();
  }, []);

  const handleSaveDepartments = async (updatedDepts) => {
    try {
      if (await getCurrentUser()) {
        const token = await getAuthToken();
        await fetch('http://localhost:5000/api/user/departments', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ departments: updatedDepts })
        });
      }
    } catch (error) {
      console.error("Error saving departments to backend:", error);
    }
  };

  const handleAddDept = () => {
    if (newDeptInput.trim() && !savedDepartments.includes(newDeptInput.trim())) {
      const updatedDepts = [...savedDepartments, newDeptInput.trim()];
      setSavedDepartments(updatedDepts);
      setSelectedDepartments([...selectedDepartments, newDeptInput.trim()]);
      setNewDeptInput('');
      handleSaveDepartments(updatedDepts);
    }
  };

  const handleRemoveDept = (deptToRemove) => {
    const updatedDepts = savedDepartments.filter(d => d !== deptToRemove);
    setSavedDepartments(updatedDepts);
    setSelectedDepartments(selectedDepartments.filter(d => d !== deptToRemove));
    handleSaveDepartments(updatedDepts);
  };

  const toggleDeptSelection = (dept) => {
    if (selectedDepartments.includes(dept)) {
      setSelectedDepartments(selectedDepartments.filter(d => d !== dept));
    } else {
      setSelectedDepartments([...selectedDepartments, dept]);
    }
  };

  const toggleAllDepts = () => {
    if (selectedDepartments.length === savedDepartments.length) {
      setSelectedDepartments([]); // Deselect all
    } else {
      setSelectedDepartments([...savedDepartments]); // Select all
    }
  };

  const toggleField = (key) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const config = {
        toggles,
        titlePrefix,
        deptInputMode,
        selectedDepartments,
        leadRestriction,
        autoAssignLead,
        minMembers,
        maxMembers,
        crossFunctional
      };

      const token = await getAuthToken();
      
      const response = await fetch('http://localhost:5000/api/drafts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formTitle,
          templateType: 'team',
          config
        })
      });

      const data = await response.json();
      if (response.ok) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2500);
      } else {
        console.error('Failed to save draft:', data.error);
        alert('Failed to save draft.');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving draft.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasAnyField = Object.values(toggles).some(v => v);

  return (
    <div className="template-builder-container">
      {showSuccess && (
        <div className="success-overlay">
          <video src="/Sucess.webm" autoPlay muted className="success-video" />
        </div>
      )}
      
      {/* LEFT PANEL - FIELD SELECTOR */}
      <div className="tb-sidebar">
        <div className="tb-sidebar-header">
          <h1 className="tb-sidebar-title">Team Template</h1>
          <p className="tb-sidebar-desc">Configure the fields needed to assemble and define a team.</p>
          
          <div style={{ marginTop: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Form Title</label>
            <input 
              type="text" 
              className="form-input" 
              style={{ width: '100%', backgroundColor: '#FFFFFF', border: '1px solid #E5E5E5' }}
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
            />
          </div>

          <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '12px' }}>Save Form</h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="form-btn primary" 
                style={{ width: '100%' }}
                onClick={handleSaveDraft}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save as Draft'}
              </button>
            </div>
          </div>
        </div>

        {/* Category: Team Configuration */}
        <div className="tb-category">
          <h3 className="tb-category-title">Team Configuration</h3>
          
          <ToggleRow label="Team Name / Title" icon={<ClipboardList size={16}/>} active={toggles.teamTitle} onClick={() => toggleField('teamTitle')}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Naming Convention Prefix (Optional)</label>
            <input 
              type="text" 
              className="form-input" 
              style={{ width: '100%', fontSize: '12px', padding: '6px 10px' }}
              placeholder="e.g. [ENG]-"
              value={titlePrefix}
              onChange={(e) => setTitlePrefix(e.target.value)}
            />
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Force team names to start with a specific format.</p>
          </ToggleRow>
          
          <ToggleRow label="Department / Function" icon={<Building size={16}/>} active={toggles.department} onClick={() => toggleField('department')}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', marginTop: '4px' }}>Input Mode</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button 
                className={`form-btn ${deptInputMode === 'free-text' ? 'primary' : 'outline'}`} 
                style={{ flex: 1, fontSize: '11px', padding: '6px' }}
                onClick={() => setDeptInputMode('free-text')}
              >Free Text</button>
              <button 
                className={`form-btn ${deptInputMode === 'dropdown' ? 'primary' : 'outline'}`} 
                style={{ flex: 1, fontSize: '11px', padding: '6px' }}
                onClick={() => setDeptInputMode('dropdown')}
              >Dropdown Selection</button>
            </div>

            {deptInputMode === 'dropdown' && (
              <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
                <div style={{ padding: '12px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#FFFFFF' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>Add Department Option</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ flex: 1, fontSize: '12px', padding: '6px 10px' }}
                      placeholder="e.g. Sales"
                      value={newDeptInput}
                      onChange={e => setNewDeptInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddDept()}
                    />
                    <button 
                      className="form-btn primary" 
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={handleAddDept}
                    >Add</button>
                  </div>
                </div>

                <div style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Saved Options ({savedDepartments.length})</span>
                    <button 
                      style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={toggleAllDepts}
                    >
                      {selectedDepartments.length === savedDepartments.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  {savedDepartments.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#9CA3AF', fontSize: '11px', fontStyle: 'italic' }}>
                      No departments added yet. Add one above.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '180px', overflowY: 'auto' }}>
                      {savedDepartments.map(dept => (
                        <div key={dept} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 8px', borderBottom: '1px solid #E5E5E5', backgroundColor: '#FFFFFF', cursor: 'pointer' }} onClick={() => toggleDeptSelection(dept)}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#374151', cursor: 'pointer', flex: 1 }}>
                            <input 
                              type="checkbox" 
                              checked={selectedDepartments.includes(dept)}
                              onChange={() => {}} // Handled by div click
                              style={{ cursor: 'pointer' }}
                            />
                            {dept}
                          </label>
                          <button 
                            style={{ background: 'none', border: 'none', color: '#D1D5DB', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={(e) => { e.stopPropagation(); handleRemoveDept(dept); }}
                            onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                            onMouseLeave={e => e.currentTarget.style.color = '#D1D5DB'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </ToggleRow>
          <ToggleRow label="Budget Code" icon={<Tag size={16}/>} active={toggles.budgetCode} onClick={() => toggleField('budgetCode')} />
        </div>

        {/* Category: Team Membership */}
        <div className="tb-category">
          <h3 className="tb-category-title">Team Membership</h3>
          
          <ToggleRow label="Team Lead Assignment" icon={<Star size={16}/>} active={toggles.teamLead} onClick={() => toggleField('teamLead')}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', marginTop: '4px' }}>Lead Selection Rule</label>
            <select 
              className="form-select" 
              style={{ width: '100%', fontSize: '12px', padding: '6px 10px', marginBottom: '12px' }}
              value={leadRestriction}
              onChange={(e) => setLeadRestriction(e.target.value)}
            >
              <option value="all">Allow anyone</option>
              <option value="managers">Restrict to Managers & Directors</option>
            </select>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={autoAssignLead}
                onChange={(e) => setAutoAssignLead(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Auto-assign form filler as Lead
            </label>
          </ToggleRow>

          <ToggleRow label="Team Members Roster" icon={<Users size={16}/>} active={toggles.teamMembers} onClick={() => toggleField('teamMembers')}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Min Size</label>
                <input 
                  type="number" 
                  className="form-input" 
                  style={{ width: '100%', fontSize: '12px', padding: '6px 10px' }}
                  value={minMembers}
                  onChange={(e) => setMinMembers(e.target.value)}
                  min="1"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Max Size</label>
                <input 
                  type="number" 
                  className="form-input" 
                  style={{ width: '100%', fontSize: '12px', padding: '6px 10px' }}
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(e.target.value)}
                  min="2"
                />
              </div>
            </div>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={crossFunctional}
                onChange={(e) => setCrossFunctional(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Allow Cross-Functional Members
            </label>
          </ToggleRow>
        </div>

        {/* Category: Team Goals */}
        <div className="tb-category">
          <h3 className="tb-category-title">Strategic Goals</h3>
          <ToggleRow label="Team Objective / OKRs" icon={<Target size={16}/>} active={toggles.teamObjective} onClick={() => toggleField('teamObjective')} />
        </div>
      </div>

      {/* RIGHT PANEL - LIVE PREVIEW */}
      <div className="tb-preview-panel">
        
        {/* Floating Device Toggle */}
        <div className="device-toggle-container">
          <div 
            className={`device-toggle-btn ${previewMode === 'desktop' ? 'active' : ''}`}
            onClick={() => setPreviewMode('desktop')}
          >
            <Monitor size={16} />
          </div>
          <div 
            className={`device-toggle-btn ${previewMode === 'mobile' ? 'active' : ''}`}
            onClick={() => setPreviewMode('mobile')}
          >
            <Smartphone size={16} />
          </div>
        </div>

        <div className={`device-frame ${previewMode}`}>
          <div className="form-paper">
            
            <div className="form-paper-header">
              <h1 className="form-paper-title">{formTitle || 'Untitled Form'}</h1>
              <p className="form-paper-subtitle">Team Charter & Assembly</p>
            </div>

            {!hasAnyField && (
              <div className="form-empty-state">
                <Users size={48} />
                <p>Toggle fields on the left to build your team assembly template.</p>
              </div>
            )}

            {/* General Team Info Section */}
            {(toggles.teamTitle || toggles.department || toggles.budgetCode) && (
              <div className="form-section">
                <h3 className="form-section-title">General Information</h3>
                
                <div className="form-grid-2">
                  {toggles.teamTitle && (
                    <div className="form-field full">
                      <label className="form-label">Team Name</label>
                      <div className="compound-input-group">
                        {titlePrefix && <div className="compound-input-addon" style={{ backgroundColor: '#F1F5F9', fontWeight: 'bold' }}>{titlePrefix}</div>}
                        <input type="text" className="compound-input-field" placeholder="Enter team name..." style={{ flex: 1 }} disabled />
                      </div>
                    </div>
                  )}
                  {toggles.department && (
                    <div className="form-field full">
                      <label className="form-label">Department / Function</label>
                      {deptInputMode === 'free-text' ? (
                        <input type="text" className="form-input" placeholder="e.g. Engineering" disabled />
                      ) : (
                        <select className="form-select" disabled>
                          <option value="">Select department...</option>
                          {selectedDepartments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                  {toggles.budgetCode && <InputField label="Budget Code" placeholder="e.g. OPEX-2026" />}
                </div>
              </div>
            )}

            {/* Membership Section */}
            {(toggles.teamLead || toggles.teamMembers) && (
              <div className="form-section">
                <h3 className="form-section-title">Membership & Roles</h3>
                
                {toggles.teamLead && (
                  <div className="form-field full" style={{ marginBottom: '20px' }}>
                    <label className="form-label">
                      Team Lead
                      {leadRestriction === 'managers' && <span style={{ marginLeft: '8px', fontSize: '10px', color: '#16A34A', backgroundColor: '#DCFCE7', padding: '2px 6px', borderRadius: '4px' }}>Managers Only</span>}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#9CA3AF' }} />
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ paddingLeft: '36px' }}
                        placeholder={autoAssignLead ? "You (Auto-assigned)" : "Search employee directory..."}
                        disabled 
                      />
                    </div>
                  </div>
                )}
                
                {toggles.teamMembers && (
                  <div className="form-field full">
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Team Members</span>
                      <span style={{ fontWeight: 'normal', color: 'var(--text-muted)' }}>{minMembers} - {maxMembers} required</span>
                    </label>
                    <div style={{ border: '1px dashed #D1D5DB', borderRadius: '8px', padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px', backgroundColor: '#F9FAFB' }}>
                      <button style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: 'transparent', border: '1px dashed #9CA3AF', borderRadius: '16px', fontSize: '12px', color: '#6B7280', cursor: 'not-allowed' }}>
                        <Plus size={14} /> Add Member
                      </button>
                    </div>
                    {crossFunctional && (
                      <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Building size={12} /> Cross-functional members are allowed.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Strategic Goals Section */}
            {toggles.teamObjective && (
              <div className="form-section">
                <h3 className="form-section-title">Strategic Goals</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <TextareaField label="Team Objective / Charter:" placeholder="Describe the primary mission and expected outcomes of this team..." />
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

// Subcomponents for the Builder UI
function ToggleRow({ label, icon, active, onClick, children }) {
  return (
    <div className={`tb-toggle-row ${active ? 'active' : ''}`} style={children && active ? { flexDirection: 'column', alignItems: 'stretch', height: 'auto', padding: '12px', gap: 0 } : {}}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', cursor: 'pointer' }} onClick={onClick}>
        <div className="tb-toggle-label">
          {icon}
          {label}
        </div>
        <div className={`tb-switch ${active ? 'on' : ''}`}>
          <div className="tb-switch-thumb" />
        </div>
      </div>
      {active && children && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.05)', cursor: 'default' }} onClick={e => e.stopPropagation()}>
          {children}
        </div>
      )}
    </div>
  );
}

// Subcomponents for the Live Preview
function InputField({ label, placeholder, full }) {
  return (
    <div className={`form-field ${full ? 'full' : ''}`}>
      <label className="form-label">{label}</label>
      <input type="text" className="form-input" placeholder={placeholder} disabled />
    </div>
  );
}

function TextareaField({ label, placeholder }) {
  return (
    <div className="form-field full">
      <label className="form-label">{label}</label>
      <textarea className="form-textarea" placeholder={placeholder || "Type here..."} disabled style={{ minHeight: '80px' }} />
    </div>
  );
}


