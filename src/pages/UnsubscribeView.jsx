import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function UnsubscribeView() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const token = params.get('token');

  const unsubscribe = async () => {
    setStatus('loading'); setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/email/unsubscribe`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not unsubscribe');
      setStatus('done');
    } catch (err) { setError(err.message); setStatus('idle'); }
  };

  return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f3ebd8' }}>
    <section style={{ maxWidth: 460, width: '100%', padding: 32, borderRadius: 16, background: '#fff' }}>
      <h1>Email preferences</h1>
      {status === 'done' ? <p>You have been unsubscribed from this sender.</p> : <>
        <p>Stop receiving campaign emails from this sender.</p>
        {!token && <p role="alert">This unsubscribe link is invalid.</p>}
        {error && <p role="alert">{error}</p>}
        <button disabled={!token || status === 'loading'} onClick={unsubscribe}>{status === 'loading' ? 'Unsubscribing...' : 'Unsubscribe'}</button>
      </>}
    </section>
  </main>;
}
