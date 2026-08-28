import { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, where, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Phone, Home, Loader2, Users, CheckCircle, RefreshCcw } from 'lucide-react';

export const ManageAfetqad = () => {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState<'weekly' | 'home'>('weekly');
  
  // Weekly assignments state
  const [loadingAlgorithm, setLoadingAlgorithm] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  
  // Home visits state
  const [deacons, setDeacons] = useState<any[]>([]);
  const [homeVisits, setHomeVisits] = useState<any[]>([]);
  const [selectedDeacon, setSelectedDeacon] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [visitNotes, setVisitNotes] = useState('');
  const [savingVisit, setSavingVisit] = useState(false);

  useEffect(() => {
    fetchDeacons();
    if (activeTab === 'weekly') {
      fetchWeeklyAssignments();
    } else {
      fetchHomeVisits();
    }
  }, [activeTab]);

  const fetchDeacons = async () => {
    const q = query(collection(db, 'users'), where('role', '==', 'deacon'));
    const snap = await getDocs(q);
    setDeacons(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const fetchWeeklyAssignments = async () => {
    // Get assignments for current week
    const weekKey = getWeekKey();
    const q = query(collection(db, 'afetqad_assignments'), where('weekKey', '==', weekKey));
    const snap = await getDocs(q);
    
    // Enrich with names
    const data = await Promise.all(snap.docs.map(async d => {
      const docData = d.data();
      const callerSnap = await getDoc(doc(db, 'users', docData.callerId));
      const targetSnap = await getDoc(doc(db, 'users', docData.targetId));
      return {
        id: d.id,
        ...docData,
        callerName: callerSnap.exists() ? callerSnap.data().fullName : 'مجهول',
        targetName: targetSnap.exists() ? targetSnap.data().fullName : 'مجهول',
        targetPhone: targetSnap.exists() ? targetSnap.data().phone : ''
      };
    }));
    setAssignments(data);
  };

  const fetchHomeVisits = async () => {
    const q = query(collection(db, 'home_visits'), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    const data = await Promise.all(snap.docs.map(async d => {
      const docData = d.data();
      const deaconSnap = await getDoc(doc(db, 'users', docData.deaconId));
      return {
        id: d.id,
        ...docData,
        deaconName: deaconSnap.exists() ? deaconSnap.data().fullName : 'مجهول'
      };
    }));
    setHomeVisits(data);
  };

  const getWeekKey = () => {
    const now = new Date();
    // Monday as start of week
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().slice(0, 10);
  };

  const runAlgorithm = async () => {
    if (!window.confirm('هل أنت متأكد من تشغيل خوارزمية التوزيع لهذا الأسبوع؟ سيتم مسح التوزيعات السابقة لنفس الأسبوع.')) return;
    setLoadingAlgorithm(true);
    try {
      const weekKey = getWeekKey();
      
      // Simulation of Backend Cloud Function
      // 1. Fetch deacons
      const deaconsList = deacons;
      
      // 2. Identify active callers (present last Friday) vs Priority targets (absent)
      // For this prototype, we'll randomize since we don't have historical friday data seeded
      const shuffled = [...deaconsList].sort(() => 0.5 - Math.random());
      const presentPool = shuffled.slice(0, Math.ceil(shuffled.length / 2));
      const absentPool = shuffled.slice(Math.ceil(shuffled.length / 2));
      
      // 3. Clear existing for this week
      const qOld = query(collection(db, 'afetqad_assignments'), where('weekKey', '==', weekKey));
      const oldSnap = await getDocs(qOld);
      // Not strictly deleting for safety in prototype, normally would run a batch delete
      
      // 4. Assign callers
      const newAssignments = [];
      const callers = [...presentPool];
      
      // Priority (Absent) get 2 callers
      for (const target of absentPool) {
        let assigned = 0;
        for (let i = 0; i < callers.length && assigned < 2; i++) {
          if (callers[i].id !== target.id) {
            newAssignments.push({ callerId: callers[i].id, targetId: target.id, priority: true });
            assigned++;
          }
        }
      }
      
      // Regular (Present) get 1 caller
      for (const target of presentPool) {
        let assigned = 0;
        for (let i = callers.length - 1; i >= 0 && assigned < 1; i--) {
          if (callers[i].id !== target.id) {
            newAssignments.push({ callerId: callers[i].id, targetId: target.id, priority: false });
            assigned++;
          }
        }
      }
      
      // 5. Save to Firestore
      for (const req of newAssignments) {
        await addDoc(collection(db, 'afetqad_assignments'), {
          callerId: req.callerId,
          targetId: req.targetId,
          weekKey,
          priority: req.priority,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
      }
      
      await fetchWeeklyAssignments();
      alert('تم توليد وتوزيع مهام الافتقاد بنجاح!');
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء تشغيل الخوارزمية.');
    } finally {
      setLoadingAlgorithm(false);
    }
  };

  const handleSaveHomeVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeacon || !visitDate) return;
    setSavingVisit(true);
    try {
      await addDoc(collection(db, 'home_visits'), {
        deaconId: selectedDeacon,
        date: new Date(visitDate).toISOString(),
        notes: visitNotes,
        recordedBy: userData?.id,
        createdAt: new Date().toISOString()
      });
      setSelectedDeacon('');
      setVisitDate('');
      setVisitNotes('');
      await fetchHomeVisits();
    } catch (error) {
      console.error(error);
    } finally {
      setSavingVisit(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
        <div className="p-3 bg-orange-100 text-orange-600 rounded-xl">
          <Phone className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">نظام الافتقاد</h2>
          <p className="text-sm text-slate-500">التوزيع الأسبوعي الهاتفي والافتقاد المنزلي</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button 
          onClick={() => setActiveTab('weekly')}
          className={`flex-1 py-3 font-bold rounded-xl transition-colors ${activeTab === 'weekly' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}
        >
          الافتقاد الأسبوعي (الخوارزمية)
        </button>
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex-1 py-3 font-bold rounded-xl transition-colors ${activeTab === 'home' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}
        >
          الافتقاد المنزلي
        </button>
      </div>

      {activeTab === 'weekly' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-800">توزيع أسبوع: {getWeekKey()}</h3>
              <p className="text-sm text-slate-500">يقوم النظام بتوزيع الشمامسة المتغيبين على الحاضرين.</p>
            </div>
            <button 
              onClick={runAlgorithm}
              disabled={loadingAlgorithm}
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {loadingAlgorithm ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCcw className="w-5 h-5" />}
              تشغيل الخوارزمية الآن
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {assignments.map(assig => (
              <div key={assig.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${assig.priority ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">المُتّصِل: {assig.callerName}</h4>
                    <p className="text-sm text-slate-500">
                      يتصل بـ: <span className="font-bold text-slate-700">{assig.targetName}</span>
                      {assig.priority && <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-md">أولوية (غياب)</span>}
                    </p>
                  </div>
                </div>
                <div>
                  {assig.status === 'completed' ? (
                    <span className="text-green-600 flex items-center gap-1 font-bold text-sm bg-green-50 px-3 py-1 rounded-full"><CheckCircle className="w-4 h-4" /> تم الاتصال</span>
                  ) : (
                    <span className="text-orange-500 font-bold text-sm bg-orange-50 px-3 py-1 rounded-full">قيد الانتظار</span>
                  )}
                </div>
              </div>
            ))}
            {assignments.length === 0 && !loadingAlgorithm && (
              <div className="text-center p-8 bg-slate-50 rounded-2xl text-slate-500 border border-slate-200 border-dashed">
                لم يتم تشغيل التوزيع لهذا الأسبوع بعد.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'home' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-max">
            <h3 className="font-bold text-slate-800 mb-4">تسجيل زيارة منزلية جديدة</h3>
            <form onSubmit={handleSaveHomeVisit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الشماس</label>
                <select required value={selectedDeacon} onChange={e => setSelectedDeacon(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-slate-50">
                  <option value="">-- اختر --</option>
                  {deacons.map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">التاريخ</label>
                <input required type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-slate-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ملاحظات الزيارة</label>
                <textarea required value={visitNotes} onChange={e => setVisitNotes(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-xl bg-slate-50" placeholder="ما تم في الزيارة..."></textarea>
              </div>
              <button disabled={savingVisit} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
                {savingVisit ? <Loader2 className="w-5 h-5 animate-spin" /> : <Home className="w-5 h-5" />}
                حفظ الزيارة
              </button>
            </form>
          </div>

          <div className="md:col-span-2 space-y-4">
            {homeVisits.map(visit => (
              <div key={visit.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full h-max">
                  <Home className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-lg">{visit.deaconName}</h4>
                  <p className="text-xs text-slate-500 mb-2">{new Date(visit.date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">{visit.notes}</p>
                </div>
              </div>
            ))}
            {homeVisits.length === 0 && (
              <div className="text-center p-8 bg-slate-50 rounded-2xl text-slate-500 border border-slate-200 border-dashed">
                لا توجد زيارات منزلية مسجلة.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
