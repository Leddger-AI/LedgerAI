import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginDashboard.css';

export default function LoginDashboard({
  onGoogleLogin,
  onEmailLogin,
  onEmailSignUp,
  onDemoMode,
  loading,
  error,
}) {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const displayError = localError || error;

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setInfoMsg('');
    if (!email.trim() || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      if (isSignUp) {
        if (!onEmailSignUp) return;
        const result = await onEmailSignUp(email.trim(), password);
        if (result?.needsConfirmation) {
          setInfoMsg('Account created! Please check your email to confirm your address before signing in.');
          setIsSignUp(false);
        }
      } else {
        if (!onEmailLogin) return;
        await onEmailLogin(email.trim(), password);
      }
    } catch (err) {
      setLocalError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const isBusy = loading || submitting;

  return (
    <div className="login-page">
      <div className="login-bg-blob"></div>
      <div className="login-bg-blob-2"></div>

      <div className="login-container">
        <div className="login-logo">
          <img src="/logo.webp" alt="Leddger Logo" style={{ width: '96px', height: '96px' }} />
        </div>

        <p className="login-subtitle">
          {isSignUp
            ? 'Create your Leddger AI account to get started.'
            : 'Sign in to Leddger AI to access your workspace.'}
        </p>

        {displayError && (
          <div className="login-alert login-alert-error" role="alert">
            {displayError}
          </div>
        )}
        {infoMsg && (
          <div className="login-alert login-alert-info" role="status">
            {infoMsg}
          </div>
        )}

        <form className="login-form" onSubmit={handleEmailSubmit}>
          <div className="login-input-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              className="login-input"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isBusy}
              autoComplete="email"
            />
          </div>

          <div className="login-input-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              className="login-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isBusy}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
          </div>

          <button type="submit" className="login-btn login-btn-primary" disabled={isBusy}>
            {submitting ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In with Email'}
          </button>

          <button
            type="button"
            className="login-toggle-mode"
            onClick={() => {
              setIsSignUp((v) => !v);
              setLocalError('');
              setInfoMsg('');
            }}
            disabled={isBusy}
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </form>

        <div className="login-divider">or continue with</div>

        <div className="login-buttons">
          <button
            type="button"
            className="login-btn login-btn-google"
            onClick={onGoogleLogin}
            disabled={isBusy}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <button
            type="button"
            className="login-btn login-btn-github"
            onClick={() => navigate('/auth/github')}
            disabled={isBusy}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.699-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            Continue with GitHub
          </button>

          {onDemoMode && (
            <button
              type="button"
              className="login-btn login-btn-demo"
              onClick={() => {
                onDemoMode();
                navigate('/dashboard');
              }}
              disabled={isBusy}
            >
              Try Demo Mode
            </button>
          )}
        </div>

        <div className="login-footer">
          By signing in, you agree to our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.
        </div>
      </div>
    </div>
  );
}
