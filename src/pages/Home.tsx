import { useAuth } from '../contexts/AuthContext';
import { DeaconDashboard } from './dashboard/DeaconDashboard';
import { ParentDashboard } from './dashboard/ParentDashboard';
import { AssistantDashboard } from './dashboard/AssistantDashboard';
import { AdminDashboard } from './admin/AdminDashboard';

export const Home = () => {
  const { userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-500 gap-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm">جاري التحميل...</p>
      </div>
    );
  }

  if (!userData || userData.role === 'admin') {
    return <AdminDashboard />;
  }

  if (userData.role === 'deacon') {
    return <DeaconDashboard />;
  }

  if (userData.role === 'parent') {
    return <ParentDashboard />;
  }
  
  if (userData.role === 'assistant') {
    return <AssistantDashboard />;
  }

  return <AdminDashboard />;
};

