import React, { useState } from 'react';
import './CollaboratorNetwork.css';
import { GitBranch, ArrowRight } from 'lucide-react';

export default function CollaboratorNetwork() {
  const [username, setUsername] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  // Initial avatars for the cluster
  const [avatars, setAvatars] = useState([
    { id: 1, url: 'https://avatars.githubusercontent.com/u/201550648?v=4' }, // ChitkulLakshya
    { id: 2, url: 'https://avatars.githubusercontent.com/u/193770087?v=4' }, // eesha264
    { id: 3, url: 'https://avatars.githubusercontent.com/u/190446018?v=4' }  // thanmayeereddykotha
  ]);

  const [successProfile, setSuccessProfile] = useState(null);

  const handleJoin = () => {
    if (!username.trim()) return;
    setIsAdding(true);

    setTimeout(() => {
      // Show the fetched profile as a success message, DO NOT modify the core avatars
      setSuccessProfile({
        username: username.trim(),
        url: `https://github.com/${username.trim()}.png`
      });
      setUsername('');
      setIsAdding(false);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessProfile(null);
      }, 5000);
    }, 800);
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
