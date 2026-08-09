import { useState, useEffect } from 'react';

export default function CandidateAvatar({ githubUsername, manualAvatar }) {
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    if (!githubUsername) {
      setAvatarUrl(null);
      return;
    }

    const fetchGithubAvatar = async () => {
      try {
        const response = await fetch(`https://api.github.com/users/${githubUsername}`);
        if (response.ok) {
          const data = await response.json();
          setAvatarUrl(data.avatar_url);
        } else {
          setAvatarUrl(null);
        }
      } catch (err) {
        setAvatarUrl(null);
      }
    };

    fetchGithubAvatar();
  }, [githubUsername]);

  const displaySrc = manualAvatar || avatarUrl;

  if (displaySrc) {
    return (
      <img
        src={displaySrc}
        alt="Candidate Avatar"
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          objectFit: 'cover',
          border: '2px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25)',
          flexShrink: 0
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        backgroundColor: '#1A1D1D',
        border: '2px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: '14px',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25)',
        flexShrink: 0
      }}
    >
      {githubUsername ? githubUsername.substring(0, 2).toUpperCase() : '??'}
    </div>
  );
}
