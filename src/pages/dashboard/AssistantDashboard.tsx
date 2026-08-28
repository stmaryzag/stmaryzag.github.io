import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Users, CheckCircle, Clock, Search, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AssistantDashboard = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  
  const [deacons, setDeacons] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  
  const [selectedActivity, setSelectedActivity] = useState('');
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch Deacons & Activities
  useEffect(() => {
    const fetchData = async () => {
      if (!userData?.id) return;
      
      // Fetch only assigned deacons (or all if admin)
      let qDeacons = query(collection(db, 'users'), where('role', '==', 'deacon'));
      if (userData.role === 'assistant') {
        qDeacons = query(collection(db, 'users'), where('role', '==', 'deacon'), where('assignedAssistantId', '==', userData.id));
      }
      
      const snapDeacons = await getDocs(qDeacons);
      setDeacons(snapDeacons.docs.map(d => ({ id: d.id, ...d.data() })));

      // Fetch active activities
      const qActivities = query(collection(db, 'activity_types'), where('active', '==', true));
      const snapActivities = await getDocs(qActivities);
      setActivities(snapActivities.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    
    fetchData();
  }, [userData]);

  const handleRecordAttendance = async (deaconId: string) => {
    if (!selectedActivity) {
      alert('يرجى اختيار النشاط أولاً');
      return;
    }

    setAttendanceLoading(true);
    try {
      const activity = activities.find(a => a.id === selectedActivity);
      const points = activity?.defaultPoints || 0;
      
      // Add Attendance Record
      await addDoc(collection(db, 'attendance_records'), {
        deaconId,
        activityTypeId: selectedActivity,
        date: new Date().toISOString(),
        status: 'confirmed',
        recordedBy: userData?.id,
        timestamp: new Date().toISOString()
      });

      // Add Points Log
      await addDoc(collection(db, 'points_log'), {
        deaconId,
        reason: `حضور: ${activity?.name || 'نشاط'}`,
        points,
        date: new Date().toISOString(),
        addedBy: userData?.id,
        monthKey: new Date().toISOString().slice(0, 7)
      });

      setSuccessMsg('تم تسجيل الحضور والنقاط بنجاح');
      setTimeout(() => setSuccessMsg(''), 2000);
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء تسجيل الحضور');
    } finally {
      setAttendanceLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 mb-2">لوحة تحكم المساعد</h2>
        <p className="text-slate-500 text-sm">تسجيل الحضور السريع ومتابعة الشمامسة المخصصين لك.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button 
          onClick={() => navigate('/admin/requests')}
          className="bg-blue-50 hover:bg-blue-100 p-5 rounded-2xl border border-blue-100 flex items-center gap-4 transition-colors text-right"
        >
          <div className="p-3 bg-blue-500 text-white rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-blue-900">طلبات التسجيل المعلقة</h3>
            <p className="text-xs text-blue-700 mt-1">مراجعة طلبات أنشطة الشمامسة</p>
          </div>
        </button>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-400" />
            <h3 className="font-bold text-slate-800 text-lg">تسجيل الحضور السريع</h3>
          </div>
          <select 
            value={selectedActivity}
            onChange={(e) => setSelectedActivity(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
          >
            <option value="">-- اختر نشاط اليوم --</option>
            {activities.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.defaultPoints} نقطة)</option>
            ))}
          </select>
        </div>

        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-xl border border-green-100 text-sm font-bold text-center">
            {successMsg}
          </div>
        )}

        <div className="space-y-3">
          {deacons.map(deacon => (
            <div key={deacon.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                {deacon.photoUrl ? (
                  <img src={deacon.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">
                    {deacon.fullName?.charAt(0) || 'ش'}
                  </div>
                )}
                <div>
                  <p className="font-bold text-slate-800">{deacon.fullName}</p>
                  <p className="text-xs text-slate-500">@{deacon.username}</p>
                </div>
              </div>
              <button
                onClick={() => handleRecordAttendance(deacon.id)}
                disabled={attendanceLoading || !selectedActivity}
                className="px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {attendanceLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                حضور
              </button>
            </div>
          ))}
          {deacons.length === 0 && (
            <p className="text-center text-slate-500 py-6">لا يوجد شمامسة مخصصين لك حالياً.</p>
          )}
        </div>
      </div>
    </div>
  );
};
