import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Users, CheckCircle, Clock, Loader2, CreditCard, CheckCircle2, XCircle, UserCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SubscriptionRecord } from '../../types';

export const AssistantDashboard = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  
  const [deacons, setDeacons] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<Record<string, SubscriptionRecord>>({});
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  
  const [selectedActivity, setSelectedActivity] = useState('');
  const [attendanceLoadingId, setAttendanceLoadingId] = useState<string | null>(null);
  const [subLoading, setSubLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const now = new Date();
  const todayDateStr = now.toISOString().slice(0, 10);
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Fetch Deacons & Activities
  useEffect(() => {
    if (!userData?.id) return;
    
    // Fetch only assigned deacons (or all if admin)
    let qDeacons = query(collection(db, 'users'), where('role', '==', 'deacon'));
    if (userData.role === 'assistant') {
      qDeacons = query(collection(db, 'users'), where('role', '==', 'deacon'), where('assignedAssistantId', '==', userData.id));
    }
    
    const unsubDeacons = onSnapshot(qDeacons, (snap) => {
      setDeacons(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Fetch active activities
    const qActivities = query(collection(db, 'activity_types'), where('active', '==', true));
    const unsubActivities = onSnapshot(qActivities, (snap) => {
      const acts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setActivities(acts);
      if (acts.length > 0 && !selectedActivity) {
        setSelectedActivity(acts[0].id);
      }
    });

    // Fetch subscriptions for current month
    const qSubs = query(collection(db, 'subscriptions'), where('monthKey', '==', currentMonthKey));
    const unsubSubs = onSnapshot(qSubs, (snap) => {
      const subMap: Record<string, SubscriptionRecord> = {};
      snap.docs.forEach(docSnap => {
        const data = docSnap.data() as SubscriptionRecord;
        subMap[data.deaconId] = { ...data, id: docSnap.id };
      });
      setSubscriptions(subMap);
    });

    return () => {
      unsubDeacons();
      unsubActivities();
      unsubSubs();
    };
  }, [userData, currentMonthKey]);

  // Fetch today's attendance for selected activity
  useEffect(() => {
    if (!selectedActivity) return;
    const fetchTodayAttendance = async () => {
      try {
        const q = query(
          collection(db, 'attendance_records'),
          where('activityTypeId', '==', selectedActivity)
        );
        const snap = await getDocs(q);
        const map: Record<string, boolean> = {};
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.date && data.date.startsWith(todayDateStr)) {
            map[data.deaconId] = true;
          }
        });
        setAttendanceMap(map);
      } catch (e) {
        console.error(e);
      }
    };
    fetchTodayAttendance();
  }, [selectedActivity, todayDateStr]);

  const handleToggleAttendance = async (deacon: any) => {
    if (!selectedActivity) {
      alert('يرجى اختيار النشاط أولاً');
      return;
    }

    setAttendanceLoadingId(deacon.id);
    const isAttended = !!attendanceMap[deacon.id];
    const activity = activities.find(a => a.id === selectedActivity);
    const points = activity?.defaultPoints || 0;

    try {
      if (!isAttended) {
        // Record Attendance & Points
        const recordDate = `${todayDateStr}T${new Date().toTimeString().slice(0, 8)}Z`;
        await addDoc(collection(db, 'attendance_records'), {
          deaconId: deacon.id,
          activityTypeId: selectedActivity,
          activityName: activity?.name || 'نشاط',
          date: recordDate,
          status: 'confirmed',
          recordedBy: userData?.id,
          recordedByName: userData?.fullName || 'الخادم',
          timestamp: new Date().toISOString()
        });

        await addDoc(collection(db, 'points_log'), {
          deaconId: deacon.id,
          activityTypeId: selectedActivity,
          reason: `حضور: ${activity?.name || 'نشاط'}`,
          points,
          date: recordDate,
          addedBy: userData?.id,
          monthKey: currentMonthKey
        });

        setAttendanceMap(prev => ({ ...prev, [deacon.id]: true }));
        setSuccessMsg(`تم تسجيل حضور ${deacon.fullName} (+${points} نقطة) ✅`);
      } else {
        // Cancel attendance: Delete attendance record & remove points log
        const qAtt = query(
          collection(db, 'attendance_records'),
          where('deaconId', '==', deacon.id),
          where('activityTypeId', '==', selectedActivity)
        );
        const attSnap = await getDocs(qAtt);
        for (const d of attSnap.docs) {
          const data = d.data();
          if (data.date && data.date.startsWith(todayDateStr)) {
            await deleteDoc(doc(db, 'attendance_records', d.id));
          }
        }

        // Delete points log
        const qPts = query(
          collection(db, 'points_log'),
          where('deaconId', '==', deacon.id)
        );
        const ptsSnap = await getDocs(qPts);
        let deletedPointsCount = 0;
        for (const d of ptsSnap.docs) {
          const data = d.data();
          const matchesAct = (data.activityTypeId === selectedActivity) || (data.reason && data.reason.includes(activity?.name));
          const matchesDate = data.date && data.date.startsWith(todayDateStr);
          if (matchesAct && matchesDate) {
            deletedPointsCount += (data.points || 0);
            await deleteDoc(doc(db, 'points_log', d.id));
          }
        }

        if (deletedPointsCount === 0 && points > 0) {
          await addDoc(collection(db, 'points_log'), {
            deaconId: deacon.id,
            activityTypeId: selectedActivity,
            reason: `خصم لإلغاء حضور: ${activity?.name || 'نشاط'}`,
            points: -points,
            date: new Date().toISOString(),
            addedBy: userData?.id,
            monthKey: currentMonthKey
          });
        }

        setAttendanceMap(prev => {
          const next = { ...prev };
          delete next[deacon.id];
          return next;
        });
        setSuccessMsg(`تم إلغاء حضور ${deacon.fullName} وخصم النقاط بنجاح (-${points} نقطة)`);
      }

      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (error: any) {
      console.error(error);
      alert('حدث خطأ أثناء تعديل الحضور: ' + error.message);
    } finally {
      setAttendanceLoadingId(null);
    }
  };

  const handleToggleSubPayment = async (deacon: any) => {
    setSubLoading(deacon.id);
    const subDocId = `${deacon.id}_${currentMonthKey}`;
    const isPaid = !!subscriptions[deacon.id]?.paid;

    try {
      await setDoc(doc(db, 'subscriptions', subDocId), {
        deaconId: deacon.id,
        deaconName: deacon.fullName,
        monthKey: currentMonthKey,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        amount: 30,
        paid: !isPaid,
        paidAt: !isPaid ? new Date().toISOString() : null,
        recordedBy: userData?.id,
        recordedByName: userData?.fullName || 'الخادم'
      }, { merge: true });

      setSuccessMsg(isPaid ? `تم إلغاء سداد اشتراك ${deacon.fullName}` : `تم تسجيل دفع اشتراك 30 ج لـ ${deacon.fullName}`);
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ: ' + err.message);
    } finally {
      setSubLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-6 rounded-3xl shadow-sm">
        <h2 className="text-xl font-bold mb-1">لوحة تحكم الخادم</h2>
        <p className="text-blue-100 text-xs">تسجيل الحضور السريع، متابعة اشتراك الـ 30ج، وطلبات الأنشطة للشمامسة المخصصين لك.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button 
          onClick={() => navigate('/admin/attendance')}
          className="bg-white hover:bg-teal-50/50 p-5 rounded-3xl border border-slate-100 flex items-center gap-4 transition-all shadow-sm text-right group"
        >
          <div className="p-3 bg-teal-600 text-white rounded-2xl group-hover:scale-105 transition-transform">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">تسجيل الحضور الفوري</h3>
            <p className="text-xs text-slate-500 mt-0.5">تحضير فردي وسريع بضغطة واحدة</p>
          </div>
        </button>

        <button 
          onClick={() => navigate('/admin/requests')}
          className="bg-white hover:bg-blue-50/50 p-5 rounded-3xl border border-slate-100 flex items-center gap-4 transition-all shadow-sm text-right group"
        >
          <div className="p-3 bg-blue-500 text-white rounded-2xl group-hover:scale-105 transition-transform">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">طلبات التسجيل المعلقة</h3>
            <p className="text-xs text-slate-500 mt-0.5">مراجعة طلبات أنشطة واعترافات الشمامسة</p>
          </div>
        </button>

        <button 
          onClick={() => navigate('/admin/subscriptions')}
          className="bg-white hover:bg-emerald-50/50 p-5 rounded-3xl border border-slate-100 flex items-center gap-4 transition-all shadow-sm text-right group"
        >
          <div className="p-3 bg-emerald-600 text-white rounded-2xl group-hover:scale-105 transition-transform">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">كشف الاشتراكات (30 ج)</h3>
            <p className="text-xs text-slate-500 mt-0.5">استعراض سجل تحصيل جميع الشهور</p>
          </div>
        </button>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-base">تسجيل الحضور واشتراك الشمامسة</h3>
          </div>
          <select 
            value={selectedActivity}
            onChange={(e) => setSelectedActivity(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-xs font-bold text-slate-700"
          >
            <option value="">-- اختر نشاط اليوم لتسجيل الحضور --</option>
            {activities.map(a => (
              <option key={a.id} value={a.id}>{a.name} (+{a.defaultPoints} نقطة)</option>
            ))}
          </select>
        </div>

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200 text-xs font-bold text-center">
            {successMsg}
          </div>
        )}

        <div className="space-y-3">
          {deacons.map(deacon => {
            const isSubPaid = !!subscriptions[deacon.id]?.paid;
            const isSubBusy = subLoading === deacon.id;
            const isAttended = !!attendanceMap[deacon.id];
            const isAttendanceBusy = attendanceLoadingId === deacon.id;

            return (
              <div key={deacon.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors gap-3">
                <div className="flex items-center gap-3">
                  {deacon.photoUrl ? (
                    <img src={deacon.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold shrink-0">
                      {deacon.fullName?.charAt(0) || 'ش'}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{deacon.fullName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-slate-400 font-mono" dir="ltr">@{deacon.username}</span>
                      {deacon.ownPhone && (
                        <span className="text-[11px] text-slate-500 font-mono" dir="ltr">{deacon.ownPhone}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* Subscription 30 EGP toggle button */}
                  <button
                    onClick={() => handleToggleSubPayment(deacon)}
                    disabled={isSubBusy}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      isSubPaid 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {isSubBusy ? (
                      <span className="animate-spin text-xs">⏳</span>
                    ) : isSubPaid ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        اشتراك الشهر (30ج): مدفوع
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                        دفع اشتراك 30 ج
                      </>
                    )}
                  </button>

                  {/* Attendance toggle button with points deduction on cancel */}
                  <button
                    onClick={() => handleToggleAttendance(deacon)}
                    disabled={isAttendanceBusy || !selectedActivity}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-xs ${
                      isAttended
                        ? 'bg-emerald-600 hover:bg-rose-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                    title={isAttended ? 'اضغط لإلغاء الحضور وخصم النقاط' : 'اضغط لتسجيل الحضور'}
                  >
                    {isAttendanceBusy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isAttended ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        حاضر (إلغاء وخصم)
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        تسجيل حضور
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}

          {deacons.length === 0 && (
            <p className="text-center text-slate-400 py-6 text-sm">لا يوجد شمامسة مخصصين لك حالياً.</p>
          )}
        </div>
      </div>
    </div>
  );
};
