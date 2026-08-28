import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Star, History, PlusCircle, Trophy, User, X, Loader2, Phone, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

export const DeaconDashboard = () => {
  const { userData } = useAuth();
  const [pointsLog, setPointsLog] = useState<any[]>([]);
  const [team, setTeam] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [afetqadTasks, setAfetqadTasks] = useState<any[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Current month key (YYYY-MM)
  const currentMonth = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    if (!userData?.id) return;

    // Fetch Points Log
    const qPoints = query(collection(db, 'points_log'), where('deaconId', '==', userData.id));
    const unsubPoints = onSnapshot(qPoints, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPointsLog(data);
    });

    // Fetch Team Info
    if (userData.teamId) {
      getDoc(doc(db, 'teams', userData.teamId)).then((docSnap) => {
        if (docSnap.exists()) setTeam({ id: docSnap.id, ...docSnap.data() });
      });
    }

    // Fetch Active Activities that require approval
    const qActivities = query(collection(db, 'activity_types'), where('active', '==', true), where('requiresApproval', '==', true));
    const unsubActivities = onSnapshot(qActivities, (snapshot) => {
      setActivities(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Fetch Afetqad Assignments
    const getWeekKey = () => {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      return monday.toISOString().slice(0, 10);
    };

    const qAfetqad = query(
      collection(db, 'afetqad_assignments'), 
      where('callerId', '==', userData.id),
      where('weekKey', '==', getWeekKey())
    );
    const unsubAfetqad = onSnapshot(qAfetqad, async (snapshot) => {
      const tasks = await Promise.all(snapshot.docs.map(async d => {
        const docData = d.data();
        const targetSnap = await getDoc(doc(db, 'users', docData.targetId));
        return {
          id: d.id,
          ...docData,
          targetName: targetSnap.exists() ? targetSnap.data().fullName : 'مجهول',
          targetPhone: targetSnap.exists() ? targetSnap.data().phone : ''
        };
      }));
      setAfetqadTasks(tasks);
    });

    return () => {
      unsubPoints();
      unsubActivities();
      unsubAfetqad();
    };
  }, [userData]);

  const currentMonthPoints = pointsLog
    .filter(log => log.monthKey === currentMonth)
    .reduce((acc, curr) => acc + (curr.points || 0), 0);

  const handleRequestRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivity || !userData?.id) return;
    setRequestLoading(true);
    try {
      await addDoc(collection(db, 'registration_requests'), {
        deaconId: userData.id,
        activityTypeId: selectedActivity,
        date: new Date().toISOString(),
        status: 'pending'
      });
      setSuccessMsg('تم إرسال طلبك بنجاح، في انتظار الموافقة.');
      setIsModalOpen(false);
      setSelectedActivity('');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setRequestLoading(false);
    }
  };

  const markAfetqadDone = async (taskId: string) => {
    if(!window.confirm('هل قمت بالاتصال فعلاً؟ سيتم تسجيل النقاط الخاصة بالافتقاد.')) return;
    try {
      await updateDoc(doc(db, 'afetqad_assignments', taskId), {
        status: 'completed',
        completedAt: new Date().toISOString()
      });
      
      // Give points for afetqad (e.g. 2 points)
      await addDoc(collection(db, 'points_log'), {
        deaconId: userData?.id,
        reason: 'إتمام اتصال افتقاد',
        points: 2,
        date: new Date().toISOString(),
        addedBy: 'system',
        monthKey: currentMonth
      });
      
      setSuccessMsg('تم تسجيل الافتقاد وإضافة النقاط بنجاح!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile & Score Section */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
        {userData?.photoUrl ? (
          <img src={userData.photoUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover border-4 border-slate-50 shadow-sm" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border-4 border-slate-50">
            <User className="w-8 h-8 text-slate-400" />
          </div>
        )}
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-800">{userData?.fullName}</h2>
          <div className="flex items-center gap-1 mt-2 text-blue-600 font-bold bg-blue-50 w-max px-3 py-1 rounded-xl">
            <Star className="w-4 h-4 fill-blue-600" />
            <span className="text-lg">{currentMonthPoints}</span>
            <span className="text-xs font-normal text-blue-500 ml-1">نقطة (هذا الشهر)</span>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="bg-green-50 text-green-700 p-4 rounded-2xl border border-green-100 text-sm font-bold text-center">
          {successMsg}
        </div>
      )}

      {/* Team Progress */}
      {team && (
        <div className="bg-gradient-to-l from-purple-600 to-purple-500 p-6 rounded-3xl shadow-sm text-white flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-sm font-medium mb-1">فريقك: {team.name}</p>
            <div className="flex items-center gap-2 font-bold text-2xl">
              <Trophy className="w-6 h-6 text-yellow-300" />
              <span>{team.teamMonthlyPoints || 0} نقطة إجمالية</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 gap-4">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-white hover:bg-slate-50 border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center justify-between transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div className="text-right">
              <h3 className="font-bold text-slate-800 text-lg">طلب تسجيل نشاط</h3>
              <p className="text-sm text-slate-500">حضور قداس، اعتراف، أو نشاط آخر</p>
            </div>
          </div>
        </button>
      </div>

      {/* Afetqad Placeholder (Phase 5 Prep) */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <Phone className="w-5 h-5 text-orange-500" />
          <h3 className="font-bold text-slate-800">مهام الافتقاد هذا الأسبوع</h3>
        </div>
        <div className="space-y-3">
          {afetqadTasks.map(task => (
            <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <p className="font-bold text-slate-800">{task.targetName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <a href={`tel:${task.targetPhone}`} className="text-blue-600 font-bold text-sm bg-blue-50 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-blue-100 transition-colors">
                    <Phone className="w-3 h-3" /> {task.targetPhone}
                  </a>
                  {task.priority && <span className="text-red-600 font-bold text-xs bg-red-50 px-2 py-0.5 rounded-full">أولوية عالية</span>}
                </div>
              </div>
              <div>
                {task.status === 'completed' ? (
                  <span className="text-green-600 font-bold text-sm flex items-center gap-1 bg-green-50 px-4 py-2 rounded-xl">
                    <CheckCircle className="w-4 h-4" /> تم الاتصال
                  </span>
                ) : (
                  <button onClick={() => markAfetqadDone(task.id)} className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-xl transition-colors text-sm">
                    تأكيد إتمام الاتصال
                  </button>
                )}
              </div>
            </div>
          ))}
          {afetqadTasks.length === 0 && (
             <p className="text-center text-slate-500 text-sm py-4 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                لا يوجد مهام افتقاد مخصصة لك هذا الأسبوع.
             </p>
          )}
        </div>
      </div>

      {/* Points History */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-6">
          <History className="w-5 h-5 text-slate-400" />
          <h3 className="font-bold text-slate-800">سجل النشاط</h3>
        </div>
        <div className="space-y-4">
          {pointsLog.slice(0, 10).map((log, idx) => (
            <div key={log.id || idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div>
                <p className="font-bold text-slate-800">{log.reason}</p>
                <p className="text-xs text-slate-500 mt-1">{new Date(log.date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</p>
              </div>
              <div className={clsx("font-bold text-lg px-3 py-1 rounded-xl", log.points > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                {log.points > 0 ? '+' : ''}{log.points}
              </div>
            </div>
          ))}
          {pointsLog.length === 0 && (
            <p className="text-center text-slate-500 text-sm py-4">لا يوجد نشاط مسجل حتى الآن.</p>
          )}
        </div>
      </div>

      {/* Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800">تسجيل نشاط جديد</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-2 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRequestRegistration} className="p-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">اختر النشاط</label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {activities.map(act => (
                    <label key={act.id} className={clsx(
                      "flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all",
                      selectedActivity === act.id ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-200 hover:bg-slate-50"
                    )}>
                      <span className="font-bold text-slate-700">{act.name}</span>
                      <input 
                        type="radio" 
                        name="activity" 
                        value={act.id} 
                        checked={selectedActivity === act.id} 
                        onChange={(e) => setSelectedActivity(e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                    </label>
                  ))}
                  {activities.length === 0 && (
                    <p className="text-center text-sm text-slate-500">لا توجد أنشطة متاحة للتسجيل حالياً.</p>
                  )}
                </div>
              </div>
              <button 
                type="submit" 
                disabled={!selectedActivity || requestLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
              >
                {requestLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'إرسال الطلب للموافقة'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
