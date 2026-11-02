import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Wait until Supabase has finished checking the saved session
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-400">Loading your account...</p>
      </div>
    );
  }

  // Not logged in: redirect to login and remember where the user was going
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}