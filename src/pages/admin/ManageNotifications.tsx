import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, doc, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, Loader2, Send } from 'lucide-react';

export const ManageNotifications = () => {
  const { userData } = useAuth();
  const [scheduled, setScheduled] = useState<any[]>([]);
  
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [colorTag, setColorTag] = useState('blue');
  const [audience, setAudience] = useState('all');
  const [sendDate, setSendDate] = useState('');
  const [sendTime, setSendTime] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  useEffect(() => {
    fetchScheduled();
  }, []);

  const fetchScheduled = async () => {
    const q = query(collection(db, 'notifications_scheduled'), orderBy('sendAt', 'desc'));
    const snap = await getDocs(q);
    setScheduled(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body || !sendDate || !sendTime) return;
    setLoading(true);
    try {
      const sendAtIso = new Date(`${sendDate}T${sendTime}`).toISOString();
      await addDoc(collection(db, 'notifications_scheduled'), {
        title,
        body,
        colorTag,
        audience,
        sendAt: sendAtIso,
        createdBy: userData?.id,
        createdAt: new Date().toISOString(),
        sent: false
      });
      setTitle('');
      setBody('');
      setSendDate('');
      setSendTime('');
      await fetchScheduled();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Simulate Cloud Scheduler cron job
  const handleDispatch = async () => {
    if (!window.confirm('تشغيل موزع الإشعارات سيقوم بإرسال كل الإشعارات المستحقة الآن (تاريخها أقدم من أو يساوي الوقت الحالي) ولم يتم إرسالها بعد. هل تريد المتابعة؟')) return;
    setDispatching(true);
    try {
      const now = new Date().toISOString();
      const q = query(collection(db, 'notifications_scheduled'), where('sent', '==', false), where('sendAt', '<=', now));
      const snap = await getDocs(q);
      
      const dueNotifications = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (dueNotifications.length === 0) {
        alert('لا توجد إشعارات مستحقة الإرسال في الوقت الحالي.');
        setDispatching(false);
        return;
      }
      
      for (const notif of dueNotifications) {
        // Resolve audience
        let targetUsers: any[] = [];
        if (notif.audience === 'all') {
           const uQ = query(collection(db, 'users'), where('role', 'in', ['deacon', 'parent', 'assistant']));
           const uSnap = await getDocs(uQ);
           targetUsers = uSnap.docs.map(d => d.id);
        } else if (notif.audience === 'deacons') {
           const uQ = query(collection(db, 'users'), where('role', '==', 'deacon'));
           const uSnap = await getDocs(uQ);
           targetUsers = uSnap.docs.map(d => d.id);
        } else if (notif.audience === 'parents') {
           const uQ = query(collection(db, 'users'), where('role', '==', 'parent'));
           const uSnap = await getDocs(uQ);
           targetUsers = uSnap.docs.map(d => d.id);
        }
        
        // Write to Inbox
        for (const uId of targetUsers) {
          await addDoc(collection(db, 'notifications_inbox'), {
            userId: uId,
            title: notif.title,
            body: notif.body,
            colorTag: notif.colorTag,
            createdAt: now,
            read: false
          });
        }
        
        // Mark as sent
        await updateDoc(doc(db, 'notifications_scheduled', notif.id), {
          sent: true,
          actualSentAt: now
        });
      }
      
      await fetchScheduled();
      alert(`تم إرسال ${dueNotifications.length} مجموعة إشعارات بنجاح!`);
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء التوزيع.');
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">إدارة الإشعارات</h2>
            <p className="text-sm text-slate-500">جدولة وإرسال التنبيهات للشمامسة وأولياء الأمور</p>
          </div>
        </div>
        <button 
          onClick={handleDispatch}
          disabled={dispatching}
          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          {dispatching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          تشغيل موزع الإشعارات (للمستحقة)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-max">
          <h3 className="font-bold text-slate-800 mb-4">جدولة إشعار جديد</h3>
          <form onSubmit={handleSchedule} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">العنوان</label>
              <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-slate-50" placeholder="مثال: تذكير بالقداس" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">النص</label>
              <textarea required value={body} onChange={e => setBody(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-xl bg-slate-50" placeholder="محتوى الإشعار..."></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">اللون المميز</label>
              <select value={colorTag} onChange={e => setColorTag(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-slate-50">
                <option value="blue">أزرق (عادي)</option>
                <option value="green">أخضر (نجاح/مكافأة)</option>
                <option value="red">أحمر (هام جداً/تنبيه)</option>
                <option value="yellow">أصفر (تذكير)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">المستهدفين</label>
              <select value={audience} onChange={e => setAudience(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-slate-50">
                <option value="all">الجميع</option>
                <option value="deacons">الشمامسة فقط</option>
                <option value="parents">أولياء الأمور فقط</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">التاريخ</label>
                <input required type="date" value={sendDate} onChange={e => setSendDate(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-slate-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الوقت</label>
                <input required type="time" value={sendTime} onChange={e => setSendTime(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-slate-50" />
              </div>
            </div>
            <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors mt-4">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ الجدولة'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-slate-800">الإشعارات المجدولة / المرسلة</h3>
          {scheduled.map(notif => (
            <div key={notif.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex gap-4">
                <div className={`w-2 rounded-full ${notif.colorTag === 'red' ? 'bg-red-500' : notif.colorTag === 'green' ? 'bg-green-500' : notif.colorTag === 'yellow' ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
                <div>
                  <h4 className="font-bold text-slate-800">{notif.title}</h4>
                  <p className="text-sm text-slate-500 mt-1">{notif.body}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    موعد الإرسال: {new Date(notif.sendAt).toLocaleString('ar-EG', { dateStyle: 'long', timeStyle: 'short' })}
                    <span className="mx-2">•</span>
                    المستهدف: {notif.audience === 'all' ? 'الجميع' : notif.audience === 'deacons' ? 'الشمامسة' : 'أولياء الأمور'}
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-left">
                {notif.sent ? (
                  <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-xl text-xs font-bold">تم الإرسال</span>
                ) : (
                  <span className="inline-block bg-orange-100 text-orange-700 px-3 py-1 rounded-xl text-xs font-bold">مجدول للانتظار</span>
                )}
              </div>
            </div>
          ))}
          {scheduled.length === 0 && (
             <div className="text-center p-8 bg-slate-50 rounded-2xl text-slate-500 border border-slate-200 border-dashed">
                لا توجد إشعارات مجدولة.
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
