import React, { useState } from 'react';
import { User, Globe, Link, Mail, BookOpen, Star, Target, MessageSquare, ClipboardList, Clock, Layers, Monitor, Smartphone, Camera, FileUp } from 'lucide-react';
import { getAuthToken } from '../supabaseAuth';
import './TemplateBuilder.css';

const DEFAULT_TOGGLES = {
  fullName: true,
  profilePhoto: false,
  resume: false,
  rollNo: true,
  collegeEmail: true,
  github: false,
  linkedin: false,
  portfolio: false,
  projects: false,
  programPhase: true,
  meetingFreq: false,
  techSkills: true,
  softSkills: false,
  goals: false,
  learningDiff: true,
  keyStrengths: false,
  actionItems: true
};

export default function StudentTemplateBuilder() {
  const [toggles, setToggles] = useState(DEFAULT_TOGGLES);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [formTitle, setFormTitle] = useState('Student Evaluation Form');
  const [emailFormat, setEmailFormat] = useState('@[branch].sreenidhi.edu.in');

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
          templateType: 'student',
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
    if (!formatStr) return <input type="email" className="form-input" placeholder={placeholder + "@college.edu"} disabled />;

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

  const hasAnyBasic = toggles.fullName || toggles.rollNo || toggles.collegeEmail || toggles.github || toggles.linkedin || toggles.portfolio || toggles.projects || toggles.profilePhoto || toggles.resume;
  const hasAnyMentorship = toggles.programPhase || toggles.meetingFreq;
  const hasAnyRating = toggles.techSkills || toggles.softSkills || toggles.goals;
  const hasAnyFeedback = toggles.learningDiff || toggles.keyStrengths || toggles.actionItems;
  const hasAnyField = hasAnyBasic || hasAnyMentorship || hasAnyRating || hasAnyFeedback;

  return (
    <div className="template-builder-container">
      {showSuccess && (
        <div className="success-overlay">
          <video src="/Sucess.webm" autoPlay muted className="success-video" />
        </div>
      )}
      
      {/* LEFT PANEL - Sidebar Controls */}
      <div className="tb-sidebar">
        <div className="tb-sidebar-header">
          <h1 className="tb-sidebar-title">Student Template</h1>
          <p className="tb-sidebar-desc">Select the fields you want mentors to fill out.</p>
          
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
          <ToggleRow label="Roll Number" icon={<ClipboardList size={16}/>} active={toggles.rollNo} onClick={() => toggleField('rollNo')} />
          <ToggleRow label="College Email" icon={<Mail size={16}/>} active={toggles.collegeEmail} onClick={() => toggleField('collegeEmail')}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Email Format Template</label>
            <input 
              type="text" 
              className="form-input" 
              style={{ width: '100%', fontSize: '12px', padding: '6px 10px' }}
              placeholder="e.g. @[branch].college.edu"
              value={emailFormat}
              onChange={(e) => setEmailFormat(e.target.value)}
            />
          </ToggleRow>
          <ToggleRow label="GitHub URL" icon={<Globe size={16}/>} active={toggles.github} onClick={() => toggleField('github')} />
          <ToggleRow label="LinkedIn URL" icon={<Link size={16}/>} active={toggles.linkedin} onClick={() => toggleField('linkedin')} />
          <ToggleRow label="Portfolio" icon={<BookOpen size={16}/>} active={toggles.portfolio} onClick={() => toggleField('portfolio')} />
          <ToggleRow label="Projects" icon={<BookOpen size={16}/>} active={toggles.projects} onClick={() => toggleField('projects')} />
          <ToggleRow label="Resume / CV Upload" icon={<FileUp size={16}/>} active={toggles.resume} onClick={() => toggleField('resume')} />
        </div>

        {/* Category: Mentorship Tracking */}
        <div className="tb-category">
          <h3 className="tb-category-title">Mentorship Tracking</h3>
          <ToggleRow label="Program Phase" icon={<Layers size={16}/>} active={toggles.programPhase} onClick={() => toggleField('programPhase')} />
          <ToggleRow label="Meeting Frequency" icon={<Clock size={16}/>} active={toggles.meetingFreq} onClick={() => toggleField('meetingFreq')} />
        </div>

        {/* Category: Evaluation Metrics */}
        <div className="tb-category">
          <h3 className="tb-category-title">Evaluation Ratings (1-5)</h3>
          <ToggleRow label="Technical Skills" icon={<Star size={16}/>} active={toggles.techSkills} onClick={() => toggleField('techSkills')} />
          <ToggleRow label="Soft Skills" icon={<MessageSquare size={16}/>} active={toggles.softSkills} onClick={() => toggleField('softSkills')} />
          <ToggleRow label="Goal Achievement" icon={<Target size={16}/>} active={toggles.goals} onClick={() => toggleField('goals')} />
        </div>

        {/* Category: Qualitative Feedback */}
        <div className="tb-category">
          <h3 className="tb-category-title">Qualitative Feedback</h3>
          <ToggleRow label="Learning Difficulties" icon={<BookOpen size={16}/>} active={toggles.learningDiff} onClick={() => toggleField('learningDiff')} />
          <ToggleRow label="Key Strengths" icon={<Star size={16}/>} active={toggles.keyStrengths} onClick={() => toggleField('keyStrengths')} />
          <ToggleRow label="Action Items" icon={<Target size={16}/>} active={toggles.actionItems} onClick={() => toggleField('actionItems')} />
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
              <p className="form-paper-subtitle">Mentor Assessment Template</p>
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
                <h3 className="form-section-title">Basic Details</h3>
                
                {toggles.profilePhoto && (
                  <div className="form-field full" style={{ marginBottom: '24px' }}>
                    <div className="photo-box">
                      <Camera size={24} />
                      <span style={{ fontSize: '10px', marginTop: '4px' }}>Upload Photo</span>
                    </div>
                  </div>
                )}
                
                <div className="form-grid-2">
                  {toggles.fullName && <InputField label="Full Name" placeholder="e.g. John Doe" />}
                  {toggles.rollNo && <InputField label="Roll Number" placeholder="e.g. CS2024-001" />}
                  {toggles.collegeEmail && (
                    <div className="form-field full">
                      <label className="form-label">College Email</label>
                      {renderCompoundEmail(emailFormat, "john.doe")}
                    </div>
                  )}
                  {toggles.github && <InputField label="GitHub URL" placeholder="https://github.com/..." />}
                  {toggles.linkedin && <InputField label="LinkedIn URL" placeholder="https://linkedin.com/in/..." />}
                  {toggles.portfolio && <InputField label="Portfolio" placeholder="Link to portfolio..." full={!toggles.projects} />}
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

            {/* Mentorship Section */}
            {hasAnyMentorship && (
              <div className="form-section">
                <h3 className="form-section-title">Mentorship Details</h3>
                <div className="form-grid-2">
                  {toggles.programPhase && <InputField label="Program Phase" placeholder="e.g. Mid-term evaluation" />}
                  {toggles.meetingFreq && <InputField label="Meeting Frequency" placeholder="e.g. Weekly, Bi-weekly" />}
                </div>
              </div>
            )}

            {/* Ratings Section */}
            {hasAnyRating && (
              <div className="form-section">
                <h3 className="form-section-title">Performance Ratings</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {toggles.techSkills && <RatingField label="Technical Skill Progress" />}
                  {toggles.softSkills && <RatingField label="Soft Skills & Communication" />}
                  {toggles.goals && <RatingField label="Goal Achievement" />}
                </div>
              </div>
            )}

            {/* Feedback Section */}
            {hasAnyFeedback && (
              <div className="form-section">
                <h3 className="form-section-title">Qualitative Feedback</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {toggles.learningDiff && <TextareaField label="Identify any learning difficulties or challenges:" />}
                  {toggles.keyStrengths && <TextareaField label="Highlight the student's key strengths:" />}
                  {toggles.actionItems && <TextareaField label="Action Items / Next Steps:" />}
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
            <div key={num} className={`form-rating-dot ${num === 3 ? 'active' : ''}`}>{num}</div>
          ))}
        </div>
        <span style={{ fontSize: '12px', color: '#888' }}>Excellent</span>
      </div>
    </div>
  );
}


