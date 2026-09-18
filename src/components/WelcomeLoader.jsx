import React, { useEffect, useState } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

// Vendored animation: public/animations/welcome.lottie (same file that lived
// on lottie.host). Local = no CDN AbortError, works offline, instant load.
// CSS spinner is fallback only if the local file itself fails.
export default function WelcomeLoader({ subtitle = "Preparing your dashboard..." }) {
  const [lottieFailed, setLottieFailed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLottieFailed(true), 8000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#F2E8D5',
      color: '#141414',
      fontFamily: 'Inter, system-ui, sans-serif',
      gap: '8px',
      padding: '24px'
    }}>
      <div style={{ width: '500px', height: '500px' }}>
        {lottieFailed ? (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
          }}>
            <div style={{
              width: '64px', height: '64px',
              border: '6px solid rgba(20,20,20,0.1)',
              borderTopColor: '#141414',
              borderRadius: '50%',
              animation: 'welcome-spin 1s linear infinite',
            }} />
            <style>{'@keyframes welcome-spin { to { transform: rotate(360deg); } }'}</style>
          </div>
        ) : (
          <DotLottieReact
            src="/animations/welcome.lottie"
            loop
            autoplay
          />
        )}
      </div>
      <h2 style={{
        fontSize: '22px',
        fontWeight: 700,
        fontFamily: 'var(--font-display, Inter)',
        margin: 0,
        letterSpacing: '-0.02em'
      }}>
        Setting things up for you
      </h2>
      <p style={{
        fontSize: '14px',
        color: '#888',
        margin: 0,
        fontWeight: 400
      }}>
        {subtitle}
      </p>
    </div>
  );
}
