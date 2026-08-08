import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import './GitHubAuthRedirect.css';

export default function GitHubAuthRedirect({ onCompleteLogin, loading }) {
  const navigate = useNavigate();

  const handleAuthorize = async () => {
    // Call the login handler (mock or real) passed from App.jsx
    await onCompleteLogin();
  };

  return (
    <div className="gh-auth-page">
      <div className="gh-auth-container">
        <div className="gh-auth-header">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.699-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
          </svg>
          Authorize Leddger AI
        </div>
        
        <div className="gh-auth-body">
          <div className="gh-auth-logos">
            <img src="https://avatars.githubusercontent.com/u/9919?s=200&v=4" alt="GitHub Avatar" className="gh-auth-avatar" />
            <div className="gh-auth-link-line"></div>
            <img src="/logo.webp" alt="Leddger AI" className="gh-auth-app-logo" />
          </div>
          
          <h2 className="gh-auth-title">Continue to Leddger AI</h2>
          <p className="gh-auth-desc">Leddger AI would like to access your GitHub account to sync your repositories and developer metrics.</p>
          
          <div className="gh-auth-status">
            <Check size={16} />
            Your account is already connected
          </div>
          
          <div className="gh-auth-actions">
            <button 
              className="gh-btn gh-btn-primary" 
              onClick={handleAuthorize}
              disabled={loading}
            >
              {loading ? 'Authorizing...' : 'Authorize and Continue'}
            </button>
            <button 
              className="gh-btn gh-btn-secondary"
              onClick={() => navigate('/login')}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
