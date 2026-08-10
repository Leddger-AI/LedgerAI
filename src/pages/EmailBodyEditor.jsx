import React, { useRef, useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { 
  Paperclip, AlignLeft, ChevronDown, Bold, Italic, Underline, 
  List, ListOrdered, Sparkles, Variable, X, UploadCloud, FileSpreadsheet,
  Cloud, Loader2, FileUp, AlertTriangle, Save, CheckCircle2
} from 'lucide-react';
import { getAuthToken } from '../supabaseAuth';
import './EmailBodyEditor.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DEFAULT_VARIABLES = [
  { id: 'company_name', label: '{{company_name}}' },
  { id: 'first_name', label: '{{first_name}}' },
  { id: 'last_name', label: '{{last_name}}' },
  { id: 'email_address', label: '{{email_address}}' },
  { id: 'recent_topic', label: '{{recent_topic}}' },
  { id: 'product_name', label: '{{product_name}}' },
  { id: 'sender_name', label: '{{sender_name}}' },
];

const SignalBars = ({ level }) => {
  // level: 'high' (green, 3 bars), 'med' (yellow, 2 bars), 'low' (red, 1 bar), 'none' (grey, 0 active)
  let color1 = '#E2E8F0', color2 = '#E2E8F0', color3 = '#E2E8F0';
  
  if (level === 'high') { color1 = '#10B981'; color2 = '#10B981'; color3 = '#10B981'; }
  else if (level === 'med') { color1 = '#F59E0B'; color2 = '#F59E0B'; }
  else if (level === 'low') { color1 = '#EF4444'; }

  return (
    <div className="signal-bars">
      <div className="signal-bar" style={{ backgroundColor: color1 }} />
      <div className="signal-bar" style={{ backgroundColor: color2 }} />
      <div className="signal-bar" style={{ backgroundColor: color3 }} />
    </div>
  );
};

export default function EmailBodyEditor() {
  const subjectRef = useRef(null);
  const bodyRef = useRef(null);
  
  const [showVariables, setShowVariables] = useState(false);
  const [activeEditor, setActiveEditor] = useState(null);
  const [savedSelection, setSavedSelection] = useState(null);

  const [variables, setVariables] = useState(DEFAULT_VARIABLES);
  const fileInputRef = useRef(null);

  const [dataSourceTab, setDataSourceTab] = useState('upload');
  const [cloudFiles, setCloudFiles] = useState([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState(null);
  const [cloudSelectedId, setCloudSelectedId] = useState(null);
  const [cloudImporting, setCloudImporting] = useState(false);
  const [importSource, setImportSource] = useState(null);
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  const [metrics, setMetrics] = useState({
    subjectLength: 0,
    wordCount: 0,
    readingTime: 0,
    personalization: 0,
  });

  const calculateMetrics = () => {
    let subLen = 0;
    if (subjectRef.current) {
      subLen = subjectRef.current.innerText.trim().length;
    }
    
    let words = 0;
    let personalCount = 0;
    if (bodyRef.current) {
      const text = bodyRef.current.innerText.trim();
      words = text ? text.split(/\s+/).length : 0;
      
      // Count pills for personalization score
      const pills = bodyRef.current.querySelectorAll('.variable-pill');
      personalCount = pills.length * 15; // mock calculation
      if (personalCount > 99) personalCount = 99;
    }
    
    const readTimeSeconds = Math.ceil((words / 240) * 60);

    setMetrics({
      subjectLength: subLen,
      wordCount: words,
      readingTime: readTimeSeconds,
      personalization: personalCount
    });
  };

  useEffect(() => {
    // Initialize default content for demo purposes
    if (bodyRef.current && !bodyRef.current.innerHTML) {
      bodyRef.current.innerHTML = `
        <p style="margin:0 0 16px 0;">Hello <span class="variable-pill" contenteditable="false">{{first_name}}</span> !</p>
        <p style="margin:0 0 16px 0; line-height: 1.6;">I've been following <span class="variable-pill" contenteditable="false">{{company_name}}</span> for a while and loved your recent post about <span class="variable-pill" contenteditable="false">{{recent_topic}}</span>. It really resonated with how we approach growth at our agency. I'm reaching because I help companies like <span class="variable-pill" contenteditable="false">{{company_name}}</span> scale their outbound systems without the technical headache.</p>
        <p style="margin:0 0 16px 0;">Do you have 15 minutes next Tuesday to chat?</p>
        <p style="margin:0;">Best, <span class="variable-pill" contenteditable="false">{{sender_name}}</span></p>
      `;
    }
    if (subjectRef.current && !subjectRef.current.innerHTML) {
      subjectRef.current.innerHTML = `Idea for <span class="variable-pill" contenteditable="false">{{company_name}}</span> !`;
    }
    calculateMetrics();
  }, []);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel.getRangeAt && sel.rangeCount) {
      setSavedSelection(sel.getRangeAt(0));
    }
  };

  const restoreSelection = () => {
    if (savedSelection) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedSelection);
    }
  };

  const handleBlur = (editorType) => {
    setActiveEditor(editorType);
    saveSelection();
  };

  const addVariablesFromHeaders = (headers) => {
    const newVars = headers.filter(f => f).map(field => ({
      id: field.toLowerCase().replace(/\s+/g, '_'),
      label: `{{${field}}}`
    }));
    setVariables(prev => {
      const existingIds = new Set(prev.map(v => v.id));
      const toAdd = newVars.filter(h => !existingIds.has(h.id));
      return [...prev, ...toAdd];
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    setImportSource(file.name);

    if (fileName.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
          if (results.meta && results.meta.fields) {
            addVariablesFromHeaders(results.meta.fields);
          }
        }
      });
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const wb = XLSX.read(data, { type: 'array' });
          const firstSheet = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          if (rows.length > 0) {
            addVariablesFromHeaders(rows[0]);
          }
        } catch (err) {
          console.error('Excel parse error:', err);
        }
      };
      reader.readAsArrayBuffer(file);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fetchCloudFiles = useCallback(async () => {
    setCloudLoading(true);
    setCloudError(null);
    try {
      const token = await getAuthToken();
      if (!token) {
        setCloudError('Not authenticated.');
        setCloudLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/api/spreadsheets/metadata`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch files');
      const data = await res.json();
      setCloudFiles(data.spreadsheets || []);
    } catch (err) {
      console.error('Error fetching cloud files:', err);
      setCloudError('Failed to load files.');
    } finally {
      setCloudLoading(false);
    }
  }, []);

  const handleCloudFileSelect = async (fileId, fileName) => {
    setCloudSelectedId(fileId);
    setCloudImporting(true);
    setCloudError(null);
    try {
      const token = await getAuthToken();
      if (!token) {
        setCloudError('Not authenticated.');
        return;
      }
      const res = await fetch(`${API_BASE_URL}/api/spreadsheets/${fileId}/headers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch headers');
      const data = await res.json();
      if (data.headers && data.headers.length > 0) {
        addVariablesFromHeaders(data.headers);
        setImportSource(fileName);
        setShowRosterModal(false);
      } else {
        setCloudError('No headers found in this spreadsheet.');
      }
    } catch (err) {
      console.error('Error fetching cloud headers:', err);
      setCloudError('Failed to load headers.');
    } finally {
      setCloudImporting(false);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      const token = await getAuthToken();
      if (!token) {
        setSaveStatus({ type: 'error', message: 'Not authenticated. Please sign in.' });
        return;
      }
      const subject = subjectRef.current?.innerText || '';
      const bodyHtml = bodyRef.current?.innerHTML || '';
      const res = await fetch(`${API_BASE_URL}/api/email/drafts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject,
          bodyHtml,
          variables,
          dataSourceType: importSource ? (showRosterModal ? 'roster_studio' : 'upload') : 'none',
          dataSourceFile: importSource || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save draft');
      const data = await res.json();
      setSaveStatus({ type: 'success', message: 'Draft saved successfully!' });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error('Error saving draft:', err);
      setSaveStatus({ type: 'error', message: 'Failed to save draft.' });
    } finally {
      setSaving(false);
    }
  };

  const insertVariable = (variable) => {
    restoreSelection();
    
    // Fallback to body if no editor active
    if (!activeEditor && bodyRef.current) {
      bodyRef.current.focus();
      saveSelection();
    }
    
    const html = <span class="variable-pill" contenteditable="false"> + variable.label + </span>&nbsp;;
    document.execCommand('insertHTML', false, html);
    setShowVariables(false);
    calculateMetrics();
  };

  const formatText = (command, value = null) => {
    document.execCommand(command, false, value);
    if (bodyRef.current) {
      bodyRef.current.focus();
    }
    calculateMetrics();
  };

  // Helpers to determine signal strength
  const getSubjectLevel = (len) => len > 0 && len < 60 ? 'high' : len > 60 ? 'med' : 'none';
  const getWordLevel = (words) => words > 100 && words < 400 ? 'med' : words > 0 ? 'high' : 'none';
  const getReadTimeLevel = (sec) => sec < 30 ? 'low' : sec < 90 ? 'med' : sec > 0 ? 'high' : 'none';
  const getPersonalLevel = (score) => score > 60 ? 'high' : score > 20 ? 'med' : 'none';

  return (
    <div className="email-editor-container">
      <div className="email-editor-layout">
        <div className="editor-card">
          {/* Subject Line */}
          <div className="subject-container">
            <div 
              className="subject-input"
              contentEditable
              ref={subjectRef}
              onBlur={() => handleBlur('subject')}
              onFocus={() => setActiveEditor('subject')}
              onInput={calculateMetrics}
              placeholder="Subject..."
              suppressContentEditableWarning={true}
            />
          </div>

          {/* Body Editor */}
          <div className="body-container">
            <div 
              className="body-input"
              contentEditable
              ref={bodyRef}
              onBlur={() => handleBlur('body')}
              onFocus={() => setActiveEditor('body')}
              onInput={calculateMetrics}
              placeholder="Type your email here..."
              suppressContentEditableWarning={true}
            />
          </div>

          {/* Toolbar */}
          <div className="editor-toolbar">
            <div className="toolbar-left">
              <button className="tool-btn" title="Attach file">
                <Paperclip size={18} />
              </button>
              <div className="toolbar-divider" />
              <button className="tool-btn" title="Align" onClick={() => formatText('justifyLeft')}>
                <AlignLeft size={18} />
                <ChevronDown size={14} style={{ marginLeft: '-2px' }} />
              </button>
              <div className="toolbar-divider" />
              <button className="tool-btn" title="Bold" onClick={() => formatText('bold')}>
                <Bold size={18} />
              </button>
              <button className="tool-btn" title="Italic" onClick={() => formatText('italic')}>
                <Italic size={18} />
              </button>
              <button className="tool-btn" title="Underline" onClick={() => formatText('underline')}>
                <Underline size={18} />
              </button>
              <div className="toolbar-divider" />
              <button className="tool-btn" title="Bullet List" onClick={() => formatText('insertUnorderedList')}>
                <List size={18} />
              </button>
              <button className="tool-btn" title="Numbered List" onClick={() => formatText('insertOrderedList')}>
                <ListOrdered size={18} />
              </button>
            </div>

            <div className="toolbar-right">
              <button
                className={`save-draft-btn ${saving ? 'saving' : ''}`}
                onClick={handleSaveDraft}
                disabled={saving}
              >
                {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button className="ai-btn">
                <Sparkles size={16} />
                AI Tools
                <ChevronDown size={14} />
              </button>
              
              <div className="variables-dropdown-container">
                <button 
                  className="variables-btn"
                  onClick={() => setShowVariables(!showVariables)}
                >
                  <Variable size={16} />
                  Variables
                  <ChevronDown size={14} />
                </button>
                
                {showVariables && (
                  <div className="variables-dropdown">
                    {variables.map(v => (
                      <div 
                        key={v.id} 
                        className="variable-option"
                        onMouseDown={(e) => {
                          e.preventDefault(); // Prevent losing focus
                          insertVariable(v);
                        }}
                      >
                        {v.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="sidebar-column">
          {/* Check Template Sidebar */}
          <div className="check-template-sidebar">
          <button className="check-template-btn">Check Template</button>
          
          <div className="metric-row">
            <span className="metric-label">Subject Length</span>
            <div className="metric-value-container">
              <span className="metric-value">: {metrics.subjectLength}</span>
              <SignalBars level={getSubjectLevel(metrics.subjectLength)} />
            </div>
          </div>
          
          <div className="metric-row">
            <span className="metric-label">Word Count</span>
            <div className="metric-value-container">
              <span className="metric-value">: {metrics.wordCount}</span>
              <SignalBars level={getWordLevel(metrics.wordCount)} />
            </div>
          </div>

          <div className="metric-row">
            <span className="metric-label">Reading Time</span>
            <div className="metric-value-container">
              <span className="metric-value">: {metrics.readingTime}</span>
              <SignalBars level={getReadTimeLevel(metrics.readingTime)} />
            </div>
          </div>

          <div className="metric-row">
            <span className="metric-label">Number of Links</span>
            <div className="metric-value-container">
              <span className="metric-value">: 0</span>
              <SignalBars level="none" />
            </div>
          </div>

          <div className="metric-row">
            <span className="metric-label">Question Count</span>
            <div className="metric-value-container">
              <span className="metric-value">: 0</span>
              <SignalBars level="none" />
            </div>
          </div>

          <div className="metric-row">
            <span className="metric-label">Spammy Word Count</span>
            <div className="metric-value-container">
              <span className="metric-value">: 0</span>
              <SignalBars level="none" />
            </div>
          </div>

          <div className="metric-row" style={{ marginBottom: 0 }}>
            <span className="metric-label">Personalization</span>
            <div className="metric-value-container">
              <span className="metric-value">: {metrics.personalization}</span>
              <SignalBars level={getPersonalLevel(metrics.personalization)} />
            </div>
          </div>
        </div>
        
        {/* Data Source Card */}
        <div className="data-source-card">
          <h3 className="data-source-title">
            <FileSpreadsheet size={16} /> Data Source
          </h3>
          <p className="data-source-desc">Import variables from a local file or your Roster Studio cloud spreadsheets.</p>

          {/* Source Option Buttons */}
          <div className="ds-options-row">
            <button
              className={`ds-option-btn ${dataSourceTab === 'upload' ? 'active' : ''}`}
              onClick={() => setDataSourceTab('upload')}
            >
              <FileUp size={18} /> Upload File
            </button>
            <button
              className={`ds-option-btn ${dataSourceTab === 'roster' ? 'active' : ''}`}
              onClick={() => {
                setDataSourceTab('roster');
                setShowRosterModal(true);
                if (cloudFiles.length === 0 && !cloudLoading) fetchCloudFiles();
              }}
            >
              <Cloud size={18} /> Roster Studio
            </button>
          </div>

          {/* Upload Section */}
          {dataSourceTab === 'upload' && (
            <>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                ref={fileInputRef}
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="upload-csv-btn">
                <UploadCloud size={16} /> Import Variables
              </label>
            </>
          )}

          {/* Roster Studio Section — shows selected file or prompt */}
          {dataSourceTab === 'roster' && (
            <div className="ds-roster-selected">
              {cloudSelectedId && importSource ? (
                <div className="ds-roster-chip">
                  <FileSpreadsheet size={14} />
                  <span>{importSource}</span>
                  <button onClick={() => setShowRosterModal(true)}>Change</button>
                </div>
              ) : (
                <button className="ds-roster-pick-btn" onClick={() => {
                  setShowRosterModal(true);
                  if (cloudFiles.length === 0 && !cloudLoading) fetchCloudFiles();
                }}>
                  <Cloud size={16} /> Select a Spreadsheet
                </button>
              )}
            </div>
          )}

          {/* Roster Studio Modal */}
          {showRosterModal && (
            <div className="ds-modal-overlay" onClick={() => !cloudImporting && setShowRosterModal(false)}>
              <div className="ds-modal" onClick={(e) => e.stopPropagation()}>
                <div className="ds-modal-header">
                  <h3>Select a Roster Studio Spreadsheet</h3>
                  <X size={18} className="ds-modal-close" onClick={() => !cloudImporting && setShowRosterModal(false)} />
                </div>
                <div className="ds-modal-body">
                  {cloudLoading ? (
                    <div className="ds-cloud-loading">
                      <Loader2 size={24} className="ds-spinner" />
                      <span>Loading your files...</span>
                    </div>
                  ) : cloudError ? (
                    <div className="ds-cloud-error">
                      <AlertTriangle size={16} />
                      <span>{cloudError}</span>
                      <button className="ds-retry-btn" onClick={fetchCloudFiles}>Retry</button>
                    </div>
                  ) : cloudFiles.length === 0 ? (
                    <div className="ds-cloud-empty">
                      <FileSpreadsheet size={32} />
                      <p>No saved spreadsheets yet.</p>
                      <span>Create one in Roster Studio first.</span>
                    </div>
                  ) : (
                    <div className="ds-cloud-list">
                      {cloudFiles.map((file) => (
                        <div
                          key={file._id}
                          className={`ds-cloud-item ${cloudSelectedId === file._id ? 'selected' : ''}`}
                          onClick={() => !cloudImporting && handleCloudFileSelect(file._id, file.name)}
                        >
                          <FileSpreadsheet size={16} />
                          <div className="ds-cloud-item-info">
                            <span className="ds-cloud-item-name">{file.name}</span>
                            <span className="ds-cloud-item-meta">{file.sheetCount} {file.sheetCount === 1 ? 'sheet' : 'sheets'}</span>
                          </div>
                          {cloudImporting && cloudSelectedId === file._id && (
                            <Loader2 size={14} className="ds-spinner" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="ds-modal-actions">
                  <button className="ds-modal-btn cancel" onClick={() => setShowRosterModal(false)}>Close</button>
                </div>
              </div>
            </div>
          )}

          {/* Import Status */}
          {variables.length > DEFAULT_VARIABLES.length && (
            <div className="imported-vars-success">
              <span>✓ Added {variables.length - DEFAULT_VARIABLES.length} custom variables{importSource ? ` from ${importSource}` : ''}!</span>
              <button
                className="ds-clear-btn"
                onClick={() => {
                  setVariables(DEFAULT_VARIABLES);
                  setImportSource(null);
                  setCloudSelectedId(null);
                }}
              >
                <X size={12} /> Clear
              </button>
            </div>
          )}
        </div>
        </div>
        {/* End Sidebar Column */}
      </div>
      {/* End Sidebar Wrapper */}

      {saveStatus && (
        <div className={`save-toast ${saveStatus.type}`}>
          {saveStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {saveStatus.message}
        </div>
      )}

    </div>
  );
}
