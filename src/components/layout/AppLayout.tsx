import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, User, Bell, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export const AppLayout = () => {
  const { userData, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userData?.id) return;
    const q = query(collection(db, 'notifications_inbox'), where('userId', '==', userData.id), where('read', '==', false));
    const unsub = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });
    return () => unsub();
  }, [userData]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'الرئيسية', icon: Home, path: '/' },
    { label: 'الإشعارات', icon: Bell, path: '/notifications', badge: unreadCount },
    ...(userData?.role === 'admin' ? [{ label: 'الإدارة', icon: Shield, path: '/admin' }] : []),
    { label: 'حسابي', icon: User, path: '/profile' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {userData?.photoUrl ? (
            <img src={userData.photoUrl} alt={userData.fullName} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">
              {userData?.fullName?.charAt(0) || 'ش'}
            </div>
          )}
          <div>
            <h1 className="font-bold text-slate-800 text-sm">{userData?.fullName}</h1>
            <p className="text-xs text-slate-500 capitalize">{userData?.role === 'deacon' ? 'شماس' : userData?.role === 'admin' ? 'أدمن' : userData?.role === 'assistant' ? 'مساعد' : 'ولي أمر'}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-20 p-4">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 pb-safe">
        <div className="flex items-center justify-around p-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={clsx(
                  "relative flex flex-col items-center justify-center p-2 w-16 gap-1 rounded-xl transition-colors",
                  isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <div className="relative">
                  <Icon className={clsx("w-6 h-6", isActive && "fill-blue-50")} />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
