import { Navigate, useLocation } from 'react-router-dom';
import WelcomeLoader from './WelcomeLoader.jsx';

export default function ProtectedRoute({ user, authReady, children }) {
  const location = useLocation();

  // Supabase hasn't finished checking auth yet — show welcome animation
  if (!authReady) {
    return <WelcomeLoader subtitle="Verifying your session..." />;
  }

  // Auth is ready but user is not logged in — redirect to landing
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}
