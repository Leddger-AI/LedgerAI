import React, { useState } from 'react';
import { User, Link, Briefcase, Building, Calendar, Star, Target, MessageSquare, ClipboardList, Zap, Monitor, Smartphone, Camera, FileUp, Mail } from 'lucide-react';
import { getAuthToken } from '../supabaseAuth';
import './TemplateBuilder.css';

const DEFAULT_TOGGLES = {
  fullName: true,
  profilePhoto: false,
  resume: false,
  employeeId: true,
  companyEmail: true,
  linkedin: false,
  portfolio: false,
  projects: false,
  jobTitle: true,
  department: true,
  reviewPeriod: false,
  jobKnowledge: true,
  qualityWork: true,
  leadership: false,
  accomplishments: true,
  improvements: true,
  smartGoals: false
};

export default function EmployeeTemplateBuilder() {
  const [toggles, setToggles] = useState(DEFAULT_TOGGLES);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [formTitle, setFormTitle] = useState('Performance Review Form');
  const [emailFormat, setEmailFormat] = useState('@[department].company.com');

  // Draft Generation State
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const toggleField = (key) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const config = {
        toggles,
        emailFormat
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
          templateType: 'employee',
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

  const renderCompoundEmail = (formatStr, placeholder = "john.doe") => {
    if (!formatStr) return <input type="email" className="form-input" placeholder={placeholder + "@company.com"} disabled />;

    const parts = formatStr.split(/(\[.*?\])/g).filter(Boolean);
    
    return (
      <div className="compound-input-group">
        <input type="text" className="compound-input-field" placeholder={placeholder} style={{ flex: 2 }} disabled />
        
        {parts.map((part, index) => {
          if (part.startsWith('[') && part.endsWith(']')) {
            const fieldName = part.slice(1, -1);
            return (
              <input 
                key={index}
                type="text" 
                className="compound-input-field" 
                placeholder={fieldName} 
                style={{ flex: 1, minWidth: '60px', borderLeft: '1px solid #E5E5E5', borderRight: '1px solid #E5E5E5' }} 
                disabled
              />
            );
          }
          return (
            <div key={index} className="compound-input-addon">
              {part}
            </div>
          );
        })}
      </div>
    );
  };

  const hasAnyBasic = toggles.fullName || toggles.employeeId || toggles.companyEmail || toggles.linkedin || toggles.portfolio || toggles.projects || toggles.profilePhoto || toggles.resume;
  const hasAnyEmployment = toggles.jobTitle || toggles.department || toggles.reviewPeriod;
  const hasAnyRating = toggles.jobKnowledge || toggles.qualityWork || toggles.leadership;
  const hasAnyFeedback = toggles.accomplishments || toggles.improvements || toggles.smartGoals;
  const hasAnyField = hasAnyBasic || hasAnyEmployment || hasAnyRating || hasAnyFeedback;

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
          <h1 className="tb-sidebar-title">Employee Template</h1>
          <p className="tb-sidebar-desc">Select the fields you want managers to fill out.</p>
          
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

        {/* Category: Basic Details */}
        <div className="tb-category">
          <h3 className="tb-category-title">Basic Details</h3>
          <ToggleRow label="Profile Photo" icon={<Camera size={16}/>} active={toggles.profilePhoto} onClick={() => toggleField('profilePhoto')} />
          <ToggleRow label="Full Name" icon={<User size={16}/>} active={toggles.fullName} onClick={() => toggleField('fullName')} />
          <ToggleRow label="Employee ID" icon={<ClipboardList size={16}/>} active={toggles.employeeId} onClick={() => toggleField('employeeId')} />
          <ToggleRow label="Company Email" icon={<Mail size={16}/>} active={toggles.companyEmail} onClick={() => toggleField('companyEmail')}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Email Format Template</label>
            <input 
              type="text" 
              className="form-input" 
              style={{ width: '100%', fontSize: '12px', padding: '6px 10px' }}
              placeholder="e.g. @[department].company.com"
              value={emailFormat}
              onChange={(e) => setEmailFormat(e.target.value)}
            />
          </ToggleRow>
          <ToggleRow label="Department" icon={<Briefcase size={16}/>} active={toggles.department} onClick={() => toggleField('department')} />
          <ToggleRow label="Portfolio" icon={<Briefcase size={16}/>} active={toggles.portfolio} onClick={() => toggleField('portfolio')} />
          <ToggleRow label="Projects" icon={<Briefcase size={16}/>} active={toggles.projects} onClick={() => toggleField('projects')} />
          <ToggleRow label="Resume / CV Upload" icon={<FileUp size={16}/>} active={toggles.resume} onClick={() => toggleField('resume')} />
        </div>

        {/* Category: Employment Details */}
        <div className="tb-category">
          <h3 className="tb-category-title">Employment Details</h3>
          <ToggleRow label="Job Title" icon={<Briefcase size={16}/>} active={toggles.jobTitle} onClick={() => toggleField('jobTitle')} />
          <ToggleRow label="Review Period" icon={<Calendar size={16}/>} active={toggles.reviewPeriod} onClick={() => toggleField('reviewPeriod')} />
        </div>

        {/* Category: Evaluation Metrics */}
        <div className="tb-category">
          <h3 className="tb-category-title">Performance Ratings (1-5)</h3>
          <ToggleRow label="Job Knowledge" icon={<Star size={16}/>} active={toggles.jobKnowledge} onClick={() => toggleField('jobKnowledge')} />
          <ToggleRow label="Quality of Work" icon={<Star size={16}/>} active={toggles.qualityWork} onClick={() => toggleField('qualityWork')} />
          <ToggleRow label="Leadership & Initiative" icon={<Zap size={16}/>} active={toggles.leadership} onClick={() => toggleField('leadership')} />
        </div>

        {/* Category: Qualitative Feedback */}
        <div className="tb-category">
          <h3 className="tb-category-title">Qualitative Feedback</h3>
          <ToggleRow label="Key Accomplishments" icon={<Star size={16}/>} active={toggles.accomplishments} onClick={() => toggleField('accomplishments')} />
          <ToggleRow label="Areas for Improvement" icon={<MessageSquare size={16}/>} active={toggles.improvements} onClick={() => toggleField('improvements')} />
          <ToggleRow label="SMART Goals" icon={<Target size={16}/>} active={toggles.smartGoals} onClick={() => toggleField('smartGoals')} />
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
              <p className="form-paper-subtitle">Employee Assessment Template</p>
            </div>

            {!hasAnyField && (
              <div className="form-empty-state">
                <ClipboardList size={48} />
                <p>Toggle fields on the left to build your template.</p>
              </div>
            )}

            {/* Basic Details Section */}
            {hasAnyBasic && (
              <div className="form-section">
                <h3 className="form-section-title">Employee Details</h3>
                
                {toggles.profilePhoto && (
                  <div className="form-field full" style={{ marginBottom: '24px' }}>
                    <div className="photo-box">
                      <Camera size={24} />
                      <span style={{ fontSize: '10px', marginTop: '4px' }}>Upload Photo</span>
                    </div>
                  </div>
                )}
                
                <div className="form-grid-2">
                  {toggles.fullName && <InputField label="Full Name" placeholder="e.g. Jane Smith" />}
                  {toggles.employeeId && <InputField label="Employee ID" placeholder="e.g. EMP-1042" />}
                  {toggles.companyEmail && (
                    <div className="form-field full">
                      <label className="form-label">Company Email</label>
                      {renderCompoundEmail(emailFormat, "jane.smith")}
                    </div>
                  )}
                  {toggles.department && <InputField label="Department" placeholder="e.g. Engineering" />}
                  {toggles.portfolio && <InputField label="Portfolio" placeholder="https://..." full={!toggles.projects} />}
                  {toggles.projects && <InputField label="Projects" placeholder="Link to projects..." full={!toggles.portfolio} />}
                  {toggles.resume && (
                    <div className="form-field full">
                      <label className="form-label">Resume / CV Upload</label>
                      <div className="upload-box">
                        <FileUp size={24} />
                        <div>Drag and drop your resume here, or click to browse</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Employment Section */}
            {hasAnyEmployment && (
              <div className="form-section">
                <h3 className="form-section-title">Employment Information</h3>
                <div className="form-grid-2">
                  {toggles.jobTitle && <InputField label="Job Title" placeholder="e.g. Senior Developer" />}
                  {toggles.department && <InputField label="Department" placeholder="e.g. Engineering" />}
                  {toggles.reviewPeriod && <InputField label="Review Period" placeholder="e.g. Q3 2026" full />}
                </div>
              </div>
            )}

            {/* Ratings Section */}
            {hasAnyRating && (
              <div className="form-section">
                <h3 className="form-section-title">Performance Ratings</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {toggles.jobKnowledge && <RatingField label="Job Knowledge & Expertise" />}
                  {toggles.qualityWork && <RatingField label="Quality & Accuracy of Work" />}
                  {toggles.leadership && <RatingField label="Leadership & Initiative" />}
                </div>
              </div>
            )}

            {/* Feedback Section */}
            {hasAnyFeedback && (
              <div className="form-section">
                <h3 className="form-section-title">Review Details</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {toggles.accomplishments && <TextareaField label="Key Accomplishments & Highlights:" />}
                  {toggles.improvements && <TextareaField label="Areas for Improvement:" />}
                  {toggles.smartGoals && <TextareaField label="SMART Goals for Next Cycle:" />}
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

function TextareaField({ label }) {
  return (
    <div className="form-field full">
      <label className="form-label">{label}</label>
      <textarea className="form-textarea" placeholder="Type feedback here..." disabled />
    </div>
  );
}

function RatingField({ label }) {
  return (
    <div className="form-field full">
      <label className="form-label">{label}</label>
      <div className="form-rating-container">
        <span style={{ fontSize: '12px', color: '#888' }}>Needs Work</span>
        <div className="form-rating-scale">
          <div className="form-rating-line"></div>
          {[1, 2, 3, 4, 5].map(num => (
            <div key={num} className={`form-rating-dot ${num === 4 ? 'active' : ''}`}>{num}</div>
          ))}
        </div>
        <span style={{ fontSize: '12px', color: '#888' }}>Excellent</span>
      </div>
    </div>
  );
}


