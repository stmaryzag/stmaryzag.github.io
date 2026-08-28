import { useAuth } from '../contexts/AuthContext';
import { DeaconDashboard } from './dashboard/DeaconDashboard';
import { ParentDashboard } from './dashboard/ParentDashboard';
import { AssistantDashboard } from './dashboard/AssistantDashboard';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export const Home = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (userData?.role === 'admin') {
      navigate('/admin');
    }
  }, [userData, navigate]);

  if (!userData) return null;

  if (userData.role === 'deacon') {
    return <DeaconDashboard />;
  }

  if (userData.role === 'parent') {
    return <ParentDashboard />;
  }
  
  if (userData.role === 'assistant') {
    return <AssistantDashboard />;
  }

  // Admin is handled via redirect
  return null;
};
