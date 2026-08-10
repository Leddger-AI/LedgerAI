import React, { useRef, useState, useEffect } from 'react';
import Papa from 'papaparse';
import { 
  Paperclip, AlignLeft, ChevronDown, Bold, Italic, Underline, 
  List, ListOrdered, Sparkles, Variable, X, UploadCloud, FileSpreadsheet
} from 'lucide-react';
import './EmailBodyEditor.css';

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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        if (results.meta && results.meta.fields) {
          const newHeaders = results.meta.fields.filter(f => f).map(field => ({
            id: field.toLowerCase().replace(/\s+/g, '_'),
            label: `{{${field}}}`
          }));

          setVariables(prev => {
            const existingIds = new Set(prev.map(v => v.id));
            const toAdd = newHeaders.filter(h => !existingIds.has(h.id));
            return [...prev, ...toAdd];
          });
        }
      }
    });
    
    // Reset file input so user can upload same file again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      <div className="email-editor-header">
        <h2 className="section-title" style={{ fontSize: '18px', fontWeight: '600', color: '#0F172A', marginBottom: '16px' }}>Write Email Body</h2>
      </div>

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
        
        {/* CSV Upload Data Source Card */}
        <div className="data-source-card">
          <h3 className="data-source-title">
            <FileSpreadsheet size={16} /> Data Source
          </h3>
          <p className="data-source-desc">Upload a CSV sheet to automatically add its columns to your Variables dropdown.</p>
          
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className="upload-csv-btn">
            <UploadCloud size={16} /> Import Variables
          </label>
          
          {variables.length > DEFAULT_VARIABLES.length && (
            <div className="imported-vars-success">
              ✓ Added {variables.length - DEFAULT_VARIABLES.length} custom variables!
            </div>
          )}
        </div>
        
        </div>
        {/* End Sidebar Column */}
      </div>
      {/* End Sidebar Wrapper */}

    </div>
  );
}
