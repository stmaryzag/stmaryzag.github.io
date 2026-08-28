import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/auth/Login';
import { FirstLoginSetup } from './pages/auth/FirstLoginSetup';
import { Home } from './pages/Home';
import { Notifications } from './pages/Notifications';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ManageAreas } from './pages/admin/ManageAreas';
import { ManageTeams } from './pages/admin/ManageTeams';
import { ManageActivities } from './pages/admin/ManageActivities';
import { ManageUsers } from './pages/admin/ManageUsers';
import { ManageRequests } from './pages/admin/ManageRequests';
import { ManualPoints } from './pages/admin/ManualPoints';
import { HallOfFame } from './pages/admin/HallOfFame';
import { ManageAfetqad } from './pages/admin/ManageAfetqad';
import { ManageNotifications } from './pages/admin/ManageNotifications';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/setup" element={<FirstLoginSetup />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/areas" element={<ManageAreas />} />
              <Route path="/admin/teams" element={<ManageTeams />} />
              <Route path="/admin/activities" element={<ManageActivities />} />
              <Route path="/admin/users" element={<ManageUsers />} />
              <Route path="/admin/requests" element={<ManageRequests />} />
              <Route path="/admin/points" element={<ManualPoints />} />
              <Route path="/admin/hall-of-fame" element={<HallOfFame />} />
              <Route path="/admin/afetqad" element={<ManageAfetqad />} />
              <Route path="/admin/notifications" element={<ManageNotifications />} />
              <Route path="/profile" element={<div className="p-4 text-center text-slate-500">الملف الشخصي قريباً...</div>} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
