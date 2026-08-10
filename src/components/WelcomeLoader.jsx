import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export default function WelcomeLoader({ subtitle = "Preparing your dashboard..." }) {
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
        <DotLottieReact
          src="https://lottie.host/1e266534-1942-42ff-8b36-0a9474fce4e0/c9HW2kSXBv.lottie"
          loop
          autoplay
          speed={0.5}
        />
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
