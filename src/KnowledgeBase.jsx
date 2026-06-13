import React, { useState, useEffect } from 'react';
import { Sparkles, Upload, FileText, Send, Trash2, Shield, User, HelpCircle, Layers, CheckCircle2, ChevronRight, Eye } from 'lucide-react';

export default function KnowledgeBase() {
  const [activeSubTab, setActiveSubTab] = useState('file'); // 'file' | 'slack'
  
  // File upload state
  const [file, setFile] = useState(null);
  const [scope, setScope] = useState('team');
  const [ownerId, setOwnerId] = useState('U12345');
  const [teamId, setTeamId] = useState('T67890');
  const [chunkSize, setChunkSize] = useState(3000);
  const [chunkOverlap, setChunkOverlap] = useState(300);
  
  // Slack ingestion state
  const [slackThreadTs, setSlackThreadTs] = useState(() => (Date.now() / 1000).toFixed(4));
  const [slackMessagesJson, setSlackMessagesJson] = useState(
    JSON.stringify([
      {
        "user_id": "U12345",
        "text": "Hi team, what is the server address for the new Project Phoenix database?",
        "timestamp": "1718283600"
      },
      {
        "user_id": "U67890",
        "text": "It is db-prod-phoenix.cluster-xyz.us-east-1.rds.amazonaws.com. Port is 5432.",
        "timestamp": "1718283720"
      },
      {
        "user_id": "U12345",
        "text": "Thanks! Do we have TLS 1.3 enforced on it?",
        "timestamp": "1718283840"
      },
      {
        "user_id": "U67890",
        "text": "Yes, sslmode is set to verify-full, and TLS 1.3 is strictly required by the security group rules.",
        "timestamp": "1718283960"
      }
    ], null, 2)
  );

  // General state
  const [documents, setDocuments] = useState([]);
  const [selectedDocDetails, setSelectedDocDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Fetch document registry on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/kb/documents');
      if (!response.ok) throw new Error('Failed to fetch document registry.');
      const data = await response.json();
      setDocuments(data);
    } catch (err) {
      console.error(err);
      // Fallback local mock data for static frontend stability
      setDocuments([
        {
          document_id: "example-doc-123",
          source_type: "file",
          file_name: "Project_Phoenix_Architecture.txt",
          scope: "team",
          owner_id: "U12345",
          team_id: "T67890",
          created_at: new Date().toISOString(),
          tags: ["database", "phoenix", "postgres", "ssl"],
          total_chunks: 1
        }
      ]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleFileSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to ingest.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setSelectedDocDetails(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('scope', scope);
    formData.append('owner_id', ownerId);
    formData.append('team_id', teamId);
    formData.append('chunk_size_tokens', chunkSize.toString());
    formData.append('chunk_overlap_tokens', chunkOverlap.toString());

    try {
      const response = await fetch('http://localhost:8000/api/kb/ingest/file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to ingest file.');
      }

      const result = await response.json();
      setSuccessMessage(`File "${file.name}" successfully processed and ingested!`);
      setSelectedDocDetails(result);
      setFile(null);
      // Reset input element
      const fileInput = document.getElementById('kb-file-input');
      if (fileInput) fileInput.value = '';
      
      fetchDocuments();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSlackSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setSelectedDocDetails(null);

    try {
      let messages;
      try {
        messages = JSON.parse(slackMessagesJson);
      } catch (pErr) {
        throw new Error('Invalid JSON format in Slack messages. Check syntax.');
      }

      const payload = {
        thread_ts: slackThreadTs,
        messages: messages,
        scope: scope,
        owner_id: ownerId,
        team_id: teamId
      };

      const response = await fetch('http://localhost:8000/api/kb/ingest/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to ingest Slack thread.');
      }

      const result = await response.json();
      setSuccessMessage(`Slack Thread ${slackThreadTs} successfully compiled, chunked, and ingested!`);
      setSelectedDocDetails(result);
      fetchDocuments();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (docId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8000/api/kb/documents/${docId}`);
      if (!response.ok) throw new Error('Failed to retrieve document details.');
      const data = await response.json();
      setSelectedDocDetails(data);
      setSuccessMessage(null);
    } catch (err) {
      setError(err.message);
      // Fallback details mockup for frontend safety
      setSelectedDocDetails({
        document_id: docId,
        file_name: "Project_Phoenix_Architecture.txt",
        source_type: "file",
        scope: "team",
        owner_id: "U12345",
        team_id: "T67890",
        created_at: new Date().toISOString(),
        chunks: [
          {
            chunk_id: `${docId}_chunk_0`,
            content: "Project Phoenix is our next-generation backend overhaul. We are migrating databases from legacy servers to a modern PostgreSQL database. Security is our primary concern. We must enable TLS 1.3 for all database connections. In addition, we need to optimize performance.",
            tokens_count: 52,
            metadata: {
              document_id: docId,
              scope: "team",
              owner_id: "U12345",
              team_id: "T67890",
              tags: ["database", "phoenix", "postgres", "ssl"],
              source_type: "file",
              created_at: new Date().toISOString()
            }
          }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDoc = async (docId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this document and its chunk metadata?')) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8000/api/kb/documents/${docId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete document.');
      
      setSuccessMessage('Document successfully removed from Knowledge Base registry.');
      if (selectedDocDetails && selectedDocDetails.document_id === docId) {
        setSelectedDocDetails(null);
      }
      fetchDocuments();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="kb-dashboard-container">
      {/* Header title */}
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Sparkles size={20} style={{ color: 'var(--color-cyan)' }} />
            Slack Intelligent Knowledge Base — Ingestion & Chunking
          </h2>
          <p className="section-subtitle">Phase 1 Ingestion Engine: Structuring documents and Slack threads with auto-tagging</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="kb-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start', marginBottom: '24px' }}>
        
        {/* Left Side: Ingestion Forms */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} style={{ color: 'var(--color-cyan)' }} />
            Ingestion Pipeline Console
          </h3>

          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '20px', gap: '16px' }}>
            <button
              className={`tab-btn ${activeSubTab === 'file' ? 'active-sub' : ''}`}
              style={{
                background: 'none', border: 'none', color: activeSubTab === 'file' ? 'var(--color-cyan)' : 'var(--text-secondary)',
                paddingBottom: '10px', borderBottom: activeSubTab === 'file' ? '2px solid var(--color-cyan)' : 'none', cursor: 'pointer',
                fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px'
              }}
              onClick={() => setActiveSubTab('file')}
            >
              <Upload size={14} /> File Ingestion
            </button>
            <button
              className={`tab-btn ${activeSubTab === 'slack' ? 'active-sub' : ''}`}
              style={{
                background: 'none', border: 'none', color: activeSubTab === 'slack' ? 'var(--color-cyan)' : 'var(--text-secondary)',
                paddingBottom: '10px', borderBottom: activeSubTab === 'slack' ? '2px solid var(--color-cyan)' : 'none', cursor: 'pointer',
                fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px'
              }}
              onClick={() => setActiveSubTab('slack')}
            >
              <Send size={14} /> Slack Thread Ingestion
            </button>
          </div>

          {/* SHARED METADATA CONTROLS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Scope Access Control</label>
              <select 
                value={scope} 
                onChange={(e) => setScope(e.target.value)}
                style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
              >
                <option value="personal">Personal (User Restricted)</option>
                <option value="team">Team (Channel Restricted)</option>
                <option value="org">Organization (Global)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Slack Team ID</label>
              <input 
                type="text" 
                value={teamId} 
                onChange={(e) => setTeamId(e.target.value)}
                style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '13px' }} 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Owner Slack User ID</label>
              <input 
                type="text" 
                value={ownerId} 
                onChange={(e) => setOwnerId(e.target.value)}
                style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '13px' }} 
              />
            </div>
            {activeSubTab === 'file' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Chunk Target (Tokens)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select 
                    value={chunkSize} 
                    onChange={(e) => setChunkSize(parseInt(e.target.value))}
                    style={{ flex: 1, padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                  >
                    <option value={2000}>2000 tokens</option>
                    <option value={3000}>3000 tokens</option>
                    <option value={4000}>4000 tokens</option>
                  </select>
                </div>
              </div>
            )}
            {activeSubTab === 'slack' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Slack Thread TS</label>
                <input 
                  type="text" 
                  value={slackThreadTs} 
                  onChange={(e) => setSlackThreadTs(e.target.value)}
                  style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '13px' }} 
                />
              </div>
            )}
          </div>

          {/* TAB 1: FILE FORM */}
          {activeSubTab === 'file' && (
            <form onSubmit={handleFileSubmit}>
              <div 
                style={{ 
                  border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '30px 20px', 
                  textAlign: 'center', cursor: 'pointer', marginBottom: '20px', backgroundColor: 'rgba(255,255,255,0.01)',
                  transition: 'var(--transition-smooth)'
                }}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => document.getElementById('kb-file-input').click()}
              >
                <Upload size={32} style={{ color: 'var(--color-cyan)', opacity: 0.8, marginBottom: '12px' }} />
                <div style={{ fontSize: '14px', color: '#fff', fontWeight: '500', marginBottom: '4px' }}>
                  {file ? file.name : 'Select or Drop your Document'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Accepts .txt, .pdf, or .docx text files
                </div>
                <input 
                  id="kb-file-input" 
                  type="file" 
                  accept=".txt,.pdf,.docx" 
                  style={{ display: 'none' }} 
                  onChange={handleFileChange} 
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="table-action-btn"
                style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px' }}
              >
                {loading ? 'Processing Document...' : 'Run Ingestion Pipeline'}
              </button>
            </form>
          )}

          {/* TAB 2: SLACK THREAD FORM */}
          {activeSubTab === 'slack' && (
            <form onSubmit={handleSlackSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Simulated Slack Thread Messages (JSON Array)
                </label>
                <textarea
                  value={slackMessagesJson}
                  onChange={(e) => setSlackMessagesJson(e.target.value)}
                  rows={8}
                  style={{
                    width: '100%', padding: '12px', backgroundColor: '#090d16', border: '1px solid var(--border-color)',
                    borderRadius: '6px', color: '#00f0ff', fontFamily: 'monospace', fontSize: '12px', resize: 'vertical'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="table-action-btn"
                style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px' }}
              >
                {loading ? 'Compiling Slack Conversation...' : 'Compile & Ingest Slack Thread'}
              </button>
            </form>
          )}
          
          {error && (
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--color-danger-glow)', border: '1px solid var(--color-danger)', borderRadius: '6px', color: 'var(--color-pink)', fontSize: '13px' }}>
              Error: {error}
            </div>
          )}

          {successMessage && (
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--color-success-glow)', border: '1px solid var(--color-success)', borderRadius: '6px', color: 'var(--color-success)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              {successMessage}
            </div>
          )}
        </div>

        {/* Right Side: Active Document Registry & Chunk Database */}
        <div className="glass-panel" style={{ padding: '24px', maxHeight: '530px', overflowY: 'auto' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} style={{ color: 'var(--color-purple)' }} />
              Ingested Documents Registry
            </span>
            <button 
              onClick={fetchDocuments}
              style={{ background: 'none', border: 'none', color: 'var(--color-cyan)', fontSize: '12px', cursor: 'pointer' }}
            >
              Refresh DB
            </button>
          </h3>

          {documents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              No documents currently indexed in vector registry. Ingest a document or thread to get started.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {documents.map((doc) => (
                <div
                  key={doc.document_id}
                  onClick={() => handleViewDetails(doc.document_id)}
                  style={{
                    padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)',
                    backgroundColor: 'rgba(255,255,255,0.01)', cursor: 'pointer', transition: 'var(--transition-smooth)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.01)'}
                >
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{
                        fontSize: '10px', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold',
                        backgroundColor: doc.source_type === 'file' ? 'rgba(181, 95, 230, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                        color: doc.source_type === 'file' ? 'var(--color-purple)' : 'var(--color-cyan)'
                      }}>
                        {doc.source_type}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Scope: <strong style={{ color: '#fff' }}>{doc.scope}</strong>
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {doc.source_type === 'file' ? doc.file_name : `Slack Thread ID: ${doc.document_id.replace('slack_thread_', '')}`}
                    </div>
                    
                    {doc.tags && doc.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                        {doc.tags.map((t, idx) => (
                          <span key={idx} style={{ fontSize: '9px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', padding: '1px 5px', borderRadius: '3px' }}>
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <div>{doc.total_chunks} chunk(s)</div>
                    </div>
                    <Trash2 
                      size={16} 
                      className="delete-icon-hover"
                      style={{ cursor: 'pointer', color: 'var(--text-muted)', transition: 'color 0.2s' }}
                      onClick={(e) => handleDeleteDoc(doc.document_id, e)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail view showing generated chunks, raw contents, tokens and schemas */}
      {selectedDocDetails && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>
                Ingested Document Meta-Analysis & Chunks Preview
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Document ID: <code style={{ color: 'var(--color-cyan)' }}>{selectedDocDetails.document_id}</code>
              </p>
            </div>
            <div style={{ textAlign: 'right', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Created at: </span>
              <span>{new Date(selectedDocDetails.created_at || Date.now()).toLocaleString()}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {selectedDocDetails.chunks && selectedDocDetails.chunks.map((chunk, idx) => (
              <div key={idx} style={{ backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '16px' }}>
                
                {/* Chunk Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-cyan)' }}>
                      Chunk #{idx + 1}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                      Token Est: <strong style={{ color: '#fff' }}>{chunk.tokens_count}</strong>
                    </span>
                  </div>
                  
                  {/* Semantic tags */}
                  {chunk.metadata && chunk.metadata.tags && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {chunk.metadata.tags.map((tag, tIdx) => (
                        <span key={tIdx} style={{ fontSize: '10px', backgroundColor: 'rgba(6, 182, 212, 0.12)', color: 'var(--color-cyan)', border: '1px solid rgba(6,182,212,0.2)', padding: '1px 6px', borderRadius: '4px', fontWeight: '500' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Chunk Text Content */}
                <pre style={{
                  padding: '12px', backgroundColor: '#060810', borderRadius: '4px', fontSize: '12.5px', color: '#d1d5db',
                  lineHeight: '1.6', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.02)', whiteSpace: 'pre-wrap'
                }}>
                  {chunk.content}
                </pre>

                {/* Metadata Schema Inspector */}
                <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <details>
                    <summary style={{ cursor: 'pointer', color: 'var(--color-purple)', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Eye size={12} /> Inspect Metadata Schema JSON
                    </summary>
                    <pre style={{ marginTop: '6px', padding: '8px', backgroundColor: '#090d16', borderRadius: '4px', color: '#a78bfa', fontSize: '11px' }}>
                      {JSON.stringify(chunk.metadata, null, 2)}
                    </pre>
                  </details>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
