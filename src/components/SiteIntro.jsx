import React, { useEffect, useRef, useState } from 'react';

// Site-entry intro: plays on every full visit + reload (App mounts once per
// document load, so in-app route changes never replay it).
// WebM first (smallest), fast MP4 fallback, poster while buffering.
// Skippable: click anywhere, Skip button, or auto-dismiss on end/timeout.
const MAX_INTRO_MS = 8000;

export default function SiteIntro({ onDone }) {
  const [visible, setVisible] = useState(true);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setVisible(false);
    if (onDone) onDone();
  };

  useEffect(() => {
    const t = setTimeout(finish, MAX_INTRO_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <div
      onClick={finish}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#f3ebd8',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
      }}
    >
      <video
        autoPlay
        muted
        playsInline
        preload="auto"
        poster="/animations/starting-poster.jpg"
        onEnded={finish}
        onError={finish}
        style={{ width: 'min(640px, 78vw)', height: 'auto', maxHeight: '70vh', objectFit: 'contain', border: 'none', outline: 'none', boxShadow: 'none', background: '#f3ebd8' }}
      >
        <source src="/animations/starting.webm" type="video/webm" />
        <source src="/animations/starting-fast.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
