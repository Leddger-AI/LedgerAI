import { useEffect, useRef, useState } from 'react';

// Site-entry intro: plays on every full visit + reload (App mounts once per
// document load, so in-app route changes never replay it).
// Transparent WebM blends with the overlay; MP4 fallback is composited onto
// the same cream so the video frame never appears as a separate rectangle.
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
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return undefined;
    }
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
        onEnded={finish}
        onError={finish}
        style={{ width: 'min(640px, 78vw)', height: 'auto', maxHeight: '70vh', objectFit: 'contain', border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
      >
        <source src="/animations/starting-transparent.webm" type="video/webm" />
        <source src="/animations/starting-seamless.mp4" type="video/mp4" />
      </video>
      <button
        type="button"
        onClick={(event) => { event.stopPropagation(); finish(); }}
        style={{ position: 'absolute', right: 'max(20px, env(safe-area-inset-right))', bottom: 'max(20px, env(safe-area-inset-bottom))', minWidth: 72, minHeight: 44, border: '1px solid #141414', borderRadius: 6, background: '#f3ebd8', color: '#141414', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
      >Skip</button>
    </div>
  );
}
