import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, MapPin, Trophy, Activity, ChevronLeft, Clock, Star, Medal, 
  Phone, Bell, CreditCard, Cake, Sparkles, Send, CheckCircle2,
  AlertCircle, Award, UserCheck
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { UserData } from '../../types';

export const AdminDashboard = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();

  const [deacons, setDeacons] = useState<UserData[]>([]);
  const [todaysBirthdays, setTodaysBirthdays] = useState<UserData[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<UserData[]>([]);
  const [congratsSent, setCongratsSent] = useState<Record<string, boolean>>({});
  const [congratsLoading, setCongratsLoading] = useState<string | null>(null);

  // Subscriptions quick count for current month
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [paidSubsCount, setPaidSubsCount] = useState(0);

  useEffect(() => {
    // Fetch all deacons to monitor birthdays
    const q = query(collection(db, 'users'), where('role', '==', 'deacon'));
    const unsub = onSnapshot(q, (snap) => {
      const allDeacons = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserData));
      setDeacons(allDeacons);

      // Calculate Birthdays
      const todayDay = now.getDate();
      const todayMonth = now.getMonth() + 1;

      const todayList: UserData[] = [];
      const upcomingList: UserData[] = [];

      allDeacons.forEach(deacon => {
        if (!deacon.birthDate) return;
        // parse birthDate (handles format YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY)
        let bDay = 0;
        let bMonth = 0;
        const cleanDate = deacon.birthDate.trim();

        if (cleanDate.includes('-')) {
          const parts = cleanDate.split('-');
          if (parts.length === 3) {
            if (parts[0].length === 4) { // YYYY-MM-DD
              bMonth = parseInt(parts[1], 10);
              bDay = parseInt(parts[2], 10);
            } else { // DD-MM-YYYY
              bDay = parseInt(parts[0], 10);
              bMonth = parseInt(parts[1], 10);
            }
          }
        } else if (cleanDate.includes('/')) {
          const parts = cleanDate.split('/');
          if (parts.length === 3) {
            bDay = parseInt(parts[0], 10);
            bMonth = parseInt(parts[1], 10);
          }
        }

        if (bDay === todayDay && bMonth === todayMonth) {
          todayList.push(deacon);
        } else if (bMonth === todayMonth && bDay > todayDay && bDay <= todayDay + 7) {
          upcomingList.push(deacon);
        }
      });

      setTodaysBirthdays(todayList);
      setUpcomingBirthdays(upcomingList);
    });

    // Fetch subscription count
    const qSubs = query(collection(db, 'subscriptions'), where('monthKey', '==', currentMonthKey), where('paid', '==', true));
    const unsubSubs = onSnapshot(qSubs, (snap) => {
      setPaidSubsCount(snap.size);
    });

    return () => {
      unsub();
      unsubSubs();
    };
  }, [currentMonthKey]);

  // Send Birthday Notification to Deacon
  const handleSendBirthdayGreeting = async (deacon: UserData) => {
    setCongratsLoading(deacon.id);
    try {
      const message = `رسالة من كنيسة السيدة العذراء وماريوحنا الرسول خورس الشمامسة : كل سنة وانت طيب يا ${deacon.fullName} نتمنى لك النجاح دائما 🎉🎂`;
      
      await addDoc(collection(db, 'notifications_inbox'), {
        userId: deacon.id,
        title: '🎂 تهنئة خاصة بعيد ميلادك المبارك',
        body: message,
        date: new Date().toISOString(),
        read: false,
        type: 'birthday',
        icon: 'Cake'
      });

      // Also add points reward for birthday!
      await addDoc(collection(db, 'points_log'), {
        deaconId: deacon.id,
        reason: 'هدية عيد الميلاد المبارك 🎂',
        points: 10,
        date: new Date().toISOString(),
        addedBy: userData?.id || 'admin',
        monthKey: currentMonthKey
      });

      setCongratsSent(prev => ({ ...prev, [deacon.id]: true }));
    } catch (e) {
      console.error(e);
    } finally {
      setCongratsLoading(null);
    }
  };

  const sections = [
    {
      title: 'تسجيل الحضور السريع والجماعي',
      desc: 'تحضير الشمامسة بنقرة واحدة وتوزيع نقاط القداسات والأنشطة',
      icon: UserCheck,
      color: 'bg-teal-600',
      badge: 'جديد وسريع',
      path: '/admin/attendance'
    },
    {
      title: 'الاشتراكات الشهرية (30 ج)',
      desc: 'متابعة وتسجيل دفع 30 جنيه شهرياً لكل شماس',
      icon: CreditCard,
      color: 'bg-emerald-600',
      badge: `${paidSubsCount} / ${deacons.length} مسدد`,
      path: '/admin/subscriptions'
    },
    {
      title: 'إدارة المستويات والرتب (User Levels)',
      desc: 'تحديد نقاط ومسميات الرتب والترقيات لجميع الشمامسة',
      icon: Award,
      color: 'bg-amber-600',
      path: '/admin/levels'
    },
    {
      title: 'إدارة الحسابات والشمامسة',
      desc: 'إضافة وتعديل الحسابات واستيراد Excel محلياً',
      icon: Users,
      color: 'bg-blue-500',
      badge: `${deacons.length} شماس`,
      path: '/admin/users'
    },
    {
      title: 'إدارة الأنشطة والقداسات',
      desc: 'تحديد الأنشطة ونقاط الحضور والاعتراف',
      icon: Activity,
      color: 'bg-teal-500',
      path: '/admin/activities'
    },
    {
      title: 'إضافة نقاط يدوياً',
      desc: 'تصحيح ومكافآت استثنائية ونقاط إضافية',
      icon: Star,
      color: 'bg-yellow-500',
      path: '/admin/points'
    },
    {
      title: 'مراجعة طلبات التسجيل',
      desc: 'الموافقة على طلبات الأنشطة والاعتراف',
      icon: Clock,
      color: 'bg-indigo-500',
      path: '/admin/requests'
    },
    {
      title: 'قاعة الشرف والأوائل',
      desc: 'أرشيف الفائزين وترتيب الشمامسة شهرياً',
      icon: Medal,
      color: 'bg-amber-500',
      path: '/admin/hall-of-fame'
    },
    {
      title: 'نظام الافتقاد الأسبوعي',
      desc: 'التوزيع الأسبوعي والزيارات الهاتفية والمنزلية',
      icon: Phone,
      color: 'bg-orange-500',
      path: '/admin/afetqad'
    },
    {
      title: 'إدارة الإشعارات والتنبيهات',
      desc: 'إرسال التنبيهات العامة والمجدولة',
      icon: Bell,
      color: 'bg-purple-500',
      path: '/admin/notifications'
    },
    {
      title: 'إدارة مناطق الافتقاد',
      desc: 'المناطق الجغرافية لتوزيع الشمامسة',
      icon: MapPin,
      color: 'bg-rose-500',
      path: '/admin/areas'
    },
    {
      title: 'إدارة الفرق والمجموعات',
      desc: 'المنافسة والتنافس الجماعي بين المجموعات',
      icon: Trophy,
      color: 'bg-cyan-600',
      path: '/admin/teams'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-lg border border-blue-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-block px-3 py-1 bg-blue-500/30 text-blue-200 text-xs font-bold rounded-full mb-2">
              لوحة التحكم الإدارية المركزية
            </span>
            <h2 className="text-2xl font-black">خورس شمامسة كنيسة العذراء وماريوحنا</h2>
            <p className="text-xs text-blue-200/80 mt-1">
              مرحباً {userData?.fullName || 'بك'} • يمكنك إدارة كل أقسام الخدمة والاشتراكات والمتابعة بسهولة
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 text-center">
              <span className="text-[10px] text-blue-200 block font-bold">إجمالي الشمامسة</span>
              <span className="text-xl font-black">{deacons.length}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 text-center">
              <span className="text-[10px] text-emerald-200 block font-bold">اشتراك الشهر (30ج)</span>
              <span className="text-xl font-black text-emerald-300">{paidSubsCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Birthday Monitoring Hub (قسم متابعة وتذكير أعياد الميلاد) */}
      <div className="bg-gradient-to-br from-amber-50 via-orange-50/50 to-pink-50/40 p-5 md:p-6 rounded-3xl border border-amber-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-sm">
              <Cake className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                تذكير ومتابعة أعياد ميلاد الشمامسة
                {todaysBirthdays.length > 0 && (
                  <span className="px-2.5 py-0.5 bg-rose-500 text-white rounded-full text-xs animate-pulse">
                    {todaysBirthdays.length} اليوم!
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                إرسال رسالة التهنئة الرسمية وإشعار الشماس تلقائياً
              </p>
            </div>
          </div>
        </div>

        {/* Today's Birthdays List */}
        {todaysBirthdays.length > 0 ? (
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              أعياد ميلاد اليوم المباركة:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {todaysBirthdays.map(d => (
                <div key={d.id} className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {d.photoUrl ? (
                      <img src={d.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-amber-300" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                        🎂
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{d.fullName}</p>
                      <p className="text-xs text-amber-700 font-medium">تاريخ الميلاد: {d.birthDate}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSendBirthdayGreeting(d)}
                    disabled={congratsSent[d.id] || congratsLoading === d.id}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                      congratsSent[d.id]
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-500 hover:bg-amber-600 text-white'
                    }`}
                  >
                    {congratsLoading === d.id ? (
                      <span className="animate-spin text-xs">⏳</span>
                    ) : congratsSent[d.id] ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> تم إرسال التهنئة
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" /> إرسال تهنئة + 10 نقاط
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white/80 p-3.5 rounded-2xl border border-amber-100 text-xs text-slate-600 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Cake className="w-4 h-4 text-amber-500" /> لا يوجد أعياد ميلاد شمامسة اليوم.
            </span>
            {upcomingBirthdays.length > 0 && (
              <span className="font-bold text-amber-800">
                يوجد {upcomingBirthdays.length} شماس يحتفلون خلال الـ 7 أيام القادمة.
              </span>
            )}
          </div>
        )}

        {/* Upcoming Birthdays this week */}
        {upcomingBirthdays.length > 0 && (
          <div className="pt-1">
            <p className="text-[11px] font-bold text-slate-500 mb-2">أعياد الميلاد القادمة خلال هذا الأسبوع:</p>
            <div className="flex flex-wrap gap-2">
              {upcomingBirthdays.map(d => (
                <div key={d.id} className="bg-white/90 px-3 py-1.5 rounded-xl border border-amber-100 text-xs text-slate-700 flex items-center gap-2 font-medium">
                  <span>🎂 {d.fullName}</span>
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">({d.birthDate})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Sections Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((sec, idx) => (
          <button
            key={idx}
            onClick={() => navigate(sec.path)}
            className="flex items-center p-5 bg-white rounded-3xl shadow-sm border border-slate-100 hover:border-blue-300 hover:shadow-md transition-all text-right group"
          >
            <div className={`w-13 h-13 rounded-2xl ${sec.color} text-white flex items-center justify-center shrink-0 ml-4 group-hover:scale-105 transition-transform shadow-sm`}>
              <sec.icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-base">{sec.title}</h3>
                {sec.badge && (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-extrabold rounded-md">
                    {sec.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{sec.desc}</p>
            </div>
            <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0 mr-2" />
          </button>
        ))}
      </div>
    </div>
  );
};
