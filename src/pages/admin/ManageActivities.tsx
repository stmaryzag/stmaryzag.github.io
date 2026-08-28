import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Activity, Plus, Trash2, Loader2, Check, X } from 'lucide-react';

export const ManageActivities = () => {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [points, setPoints] = useState('10');
  const [requiresApproval, setRequiresApproval] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'activity_types'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActivities(data);
    });
    return () => unsub();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'activity_types'), { 
        name: name.trim(),
        defaultPoints: parseInt(points) || 0,
        active: true,
        requiresApproval
      });
      setName('');
      setPoints('10');
      setRequiresApproval(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا النشاط؟')) {
      await deleteDoc(doc(db, 'activity_types', id));
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await updateDoc(doc(db, 'activity_types', id), { active: !current });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-green-100 text-green-600 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">إدارة أنواع الأنشطة</h2>
        </div>

        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">اسم النشاط</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: قداس الجمعة، حصة الألحان"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">النقاط الافتراضية</label>
              <input
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-green-500"
              />
            </div>
          </div>
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <p className="font-medium text-slate-800">يطلب موافقة الأدمن/المساعد؟</p>
              <p className="text-xs text-slate-500">يحتاج تأكيد لكي تُحتسب النقاط (مثل: اعتراف، حضور متأخر)</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={requiresApproval} onChange={() => setRequiresApproval(!requiresApproval)} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>
          
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            إضافة النشاط
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activities.map((activity) => (
          <div key={activity.id} className={`bg-white p-5 rounded-xl border ${activity.active ? 'border-slate-100' : 'border-red-200 bg-slate-50 opacity-75'} shadow-sm flex flex-col gap-3 transition-colors`}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">{activity.name}</h3>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg">
                    {activity.defaultPoints} نقطة
                  </span>
                  {activity.requiresApproval && (
                    <span className="px-2 py-1 bg-yellow-50 text-yellow-700 text-xs font-bold rounded-lg">
                      يحتاج موافقة
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(activity.id)}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            
            <div className="pt-3 border-t border-slate-100 mt-2">
              <button 
                onClick={() => toggleActive(activity.id, activity.active)}
                className={`text-sm font-medium flex items-center gap-2 ${activity.active ? 'text-slate-500 hover:text-red-600' : 'text-green-600'}`}
              >
                {activity.active ? <><X className="w-4 h-4"/> إيقاف النشاط مؤقتاً</> : <><Check className="w-4 h-4"/> تفعيل النشاط</>}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
