import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ user, authReady, children }) {
  const location = useLocation();

  // Supabase hasn't finished checking auth yet — show a loader, don't redirect
  if (!authReady) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#FAFAFA',
        color: '#141414',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '15px',
        fontWeight: 500,
        gap: '12px'
      }}>
        <div style={{
          width: '20px',
          height: '20px',
          border: '2.5px solid #E0E0E0',
          borderTopColor: '#141414',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite'
        }} />
        Loading...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Auth is ready but user is not logged in — redirect to landing
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}
