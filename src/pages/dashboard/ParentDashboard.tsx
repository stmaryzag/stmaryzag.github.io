import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Star, History, Trophy, User } from 'lucide-react';
import clsx from 'clsx';

export const ParentDashboard = () => {
  const { userData } = useAuth();
  
  const [childData, setChildData] = useState<any>(null);
  const [pointsLog, setPointsLog] = useState<any[]>([]);
  const [team, setTeam] = useState<any>(null);
  
  // Current month key (YYYY-MM)
  const currentMonth = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    if (!userData?.parentOfDeaconId) return;

    // Fetch Child User Data
    const childRef = doc(db, 'users', userData.parentOfDeaconId);
    getDoc(childRef).then(snap => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setChildData(data);
        
        // Fetch Child's Team Info
        if (data.teamId) {
          getDoc(doc(db, 'teams', data.teamId)).then((docSnap) => {
            if (docSnap.exists()) setTeam({ id: docSnap.id, ...docSnap.data() });
          });
        }
      }
    });

    // Fetch Points Log for Child
    const qPoints = query(collection(db, 'points_log'), where('deaconId', '==', userData.parentOfDeaconId));
    const unsubPoints = onSnapshot(qPoints, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPointsLog(data);
    });

    return () => {
      unsubPoints();
    };
  }, [userData]);

  if (!userData?.parentOfDeaconId) {
    return (
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center min-h-[40vh] flex flex-col items-center justify-center">
        <h2 className="text-lg font-bold text-slate-800 mb-2">لم يتم ربط حسابك بشماس</h2>
        <p className="text-slate-500 text-sm">يرجى التواصل مع الإدارة لربط حسابك بحساب ابنك.</p>
      </div>
    );
  }

  if (!childData) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">جاري التحميل...</div>
    );
  }

  const currentMonthPoints = pointsLog
    .filter(log => log.monthKey === currentMonth)
    .reduce((acc, curr) => acc + (curr.points || 0), 0);

  return (
    <div className="space-y-6">
      {/* Read-Only Header */}
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-3xl flex items-center justify-center text-blue-700 text-sm font-bold text-center">
        وضع المشاهدة (حساب ولي أمر)
      </div>

      {/* Child Profile & Score Section */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
        {childData?.photoUrl ? (
          <img src={childData.photoUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover border-4 border-slate-50 shadow-sm" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border-4 border-slate-50">
            <User className="w-8 h-8 text-slate-400" />
          </div>
        )}
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-800">{childData?.fullName}</h2>
          <div className="flex items-center gap-1 mt-2 text-blue-600 font-bold bg-blue-50 w-max px-3 py-1 rounded-xl">
            <Star className="w-4 h-4 fill-blue-600" />
            <span className="text-lg">{currentMonthPoints}</span>
            <span className="text-xs font-normal text-blue-500 ml-1">نقطة (هذا الشهر)</span>
          </div>
        </div>
      </div>

      {/* Team Progress */}
      {team && (
        <div className="bg-gradient-to-l from-purple-600 to-purple-500 p-6 rounded-3xl shadow-sm text-white flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-sm font-medium mb-1">فريق ابنك: {team.name}</p>
            <div className="flex items-center gap-2 font-bold text-2xl">
              <Trophy className="w-6 h-6 text-yellow-300" />
              <span>{team.teamMonthlyPoints || 0} نقطة إجمالية</span>
            </div>
          </div>
        </div>
      )}

      {/* Points History */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-6">
          <History className="w-5 h-5 text-slate-400" />
          <h3 className="font-bold text-slate-800">سجل النشاط لابنك</h3>
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
    </div>
  );
};
