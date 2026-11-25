import React, { useState, useEffect } from 'react';
import './CollaboratorNetwork.css';
import { GitBranch, ArrowRight } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function CollaboratorNetwork() {
  const [username, setUsername] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Initial avatars for the cluster
  const [avatars, setAvatars] = useState([
    { id: 1, url: 'https://avatars.githubusercontent.com/u/201550648?v=4' }, // ChitkulLakshya
    { id: 2, url: 'https://avatars.githubusercontent.com/u/193770087?v=4' }, // eesha264
    { id: 3, url: 'https://avatars.githubusercontent.com/u/190446018?v=4' }  // thanmayeereddykotha
  ]);

  const [successProfile, setSuccessProfile] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/collaborators`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.collaborators?.length > 0) {
          setAvatars((prev) => {
            const seen = new Set(prev.map((a) => a.url));
            const extra = data.collaborators
              .filter((c) => c.avatarUrl && !seen.has(c.avatarUrl))
              .map((c) => ({ id: c._id || c.username, url: c.avatarUrl, username: c.username }));
            return [...prev, ...extra].slice(0, 12);
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleJoin = async () => {
    if (!username.trim()) return;
    setIsAdding(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not find GitHub user');
      }
      const collab = data.collaborator;
      setSuccessProfile({
        username: collab.username,
        url: collab.avatarUrl,
        repos: collab.publicRepos,
        languages: collab.topLanguages || [],
      });
      setAvatars((prev) =>
        prev.some((a) => a.url === collab.avatarUrl)
          ? prev
          : [...prev, { id: collab._id || collab.username, url: collab.avatarUrl }]
      );
      setUsername('');
      setTimeout(() => setSuccessProfile(null), 5000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to verify GitHub username');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <section className="cn-light-section" id="collaborator-network">
      
      {/* Huge Background Typography */}
      <div className="cn-huge-text-bg">
        <div className="cn-huge-line1">THE CODEBASE</div>
        <div className="cn-huge-line2">IS OPEN.</div>
      </div>

      {/* Floating Badge (Left) */}
      <div className="cn-floating-badge">
        <span className="cn-dot"></span>
        LEDGER AI
      </div>

      <div className="cn-light-container">
        
        {/* Main Card */}
        <div className="cn-glass-card">
          
          {/* Card Header */}
          <div className="cn-card-top">
            <div className="cn-top-left">
              <GitBranch size={18} />
              <span>OPEN SOURCE</span>
            </div>
            <div className="cn-pill-badge">
              CONTRIBUTOR #{String(400 + avatars.length).padStart(3, '0')}
            </div>
          </div>

          <div className="cn-divider"></div>

          {/* Input Section */}
          <div className="cn-input-area">
            <label className="cn-input-label">GITHUB USERNAME</label>
            <div className="cn-input-row">
              <input 
                type="text" 
                className="cn-clean-input" 
                placeholder="e.g. torvalds" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                disabled={isAdding}
              />
              <button 
                className={`cn-join-btn ${username.trim() ? 'active' : ''}`}
                onClick={handleJoin}
                disabled={!username.trim() || isAdding}
              >
                {isAdding ? <div className="cn-spinner"></div> : <ArrowRight size={28} />}
              </button>
            </div>
            {successProfile && (
              <div className="cn-success-popup">
                <img src={successProfile.url} alt="Profile" className="cn-success-avatar" />
                <div className="cn-success-message">
                  <strong>@{successProfile.username}</strong> has been granted repository access!
                </div>
              </div>
            )}
          </div>

          <div className="cn-divider"></div>

          {/* Card Footer: Avatars Cluster & Tag */}
          <div className="cn-card-bottom">
            <div className="cn-avatar-cluster">
              {avatars.map((av, idx) => (
                <img 
                  key={av.id} 
                  src={av.url} 
                  alt="Collaborator" 
                  className={`cn-cluster-avatar ${av.isNew ? 'cn-avatar-enter' : ''}`}
                  style={{ zIndex: 10 - idx }}
                />
              ))}
            </div>
            <div className="cn-endorsed-label">
              ENDORSED BY CORE
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
