import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = () => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // If user data exists but they haven't finished first login setup
  // isFirstLogin can be determined if they don't have a phone number or photo (based on requirements)
  const isFirstLogin = userData && (!userData.photoUrl || !userData.ownPhone);

  if (isFirstLogin && window.location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }

  if (!isFirstLogin && window.location.pathname === '/setup') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
