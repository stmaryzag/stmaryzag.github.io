import { useNavigate } from 'react-router-dom';
import { Users, MapPin, Trophy, Activity, ChevronLeft, Clock, Star, Medal, Phone, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const AdminDashboard = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();

  if (userData?.role !== 'admin') {
    return <div className="p-6 text-center text-red-500 font-bold">صلاحيات غير كافية</div>;
  }

  const sections = [
    {
      title: 'إدارة الحسابات والشمامسة',
      desc: 'إضافة، تعديل، وإيقاف حسابات المستخدمين',
      icon: Users,
      color: 'bg-blue-500',
      path: '/admin/users'
    },
    {
      title: 'إدارة الأنشطة',
      desc: 'إضافة أنواع أنشطة ونقاطها',
      icon: Activity,
      color: 'bg-green-500',
      path: '/admin/activities'
    },
    {
      title: 'إضافة نقاط يدوياً',
      desc: 'تصحيح ومكافآت استثنائية',
      icon: Star,
      color: 'bg-yellow-500',
      path: '/admin/points'
    },
    {
      title: 'مراجعة طلبات التسجيل',
      desc: 'الموافقة على الأنشطة (الاعتراف، إلخ)',
      icon: Clock,
      color: 'bg-teal-500',
      path: '/admin/requests'
    },
    {
      title: 'قاعة الشرف',
      desc: 'أرشيف الفائزين شهرياً',
      icon: Medal,
      color: 'bg-amber-500',
      path: '/admin/hall-of-fame'
    },
    {
      title: 'نظام الافتقاد',
      desc: 'التوزيع الأسبوعي والزيارات المنزلية',
      icon: Phone,
      color: 'bg-orange-500',
      path: '/admin/afetqad'
    },
    {
      title: 'إدارة الإشعارات',
      desc: 'جدولة وإرسال التنبيهات',
      icon: Bell,
      color: 'bg-indigo-500',
      path: '/admin/notifications'
    },
    {
      title: 'إدارة مناطق الافتقاد',
      desc: 'المناطق الجغرافية لتوزيع الشمامسة',
      icon: MapPin,
      color: 'bg-orange-500',
      path: '/admin/areas'
    },
    {
      title: 'إدارة الفرق',
      desc: 'المنافسة والترتيب الجماعي',
      icon: Trophy,
      color: 'bg-purple-500',
      path: '/admin/teams'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 mb-2">لوحة تحكم الإدارة</h2>
        <p className="text-slate-500 text-sm">مرحباً {userData.fullName}، يمكنك إدارة النظام من هنا.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((sec, idx) => (
          <button
            key={idx}
            onClick={() => navigate(sec.path)}
            className="flex items-center p-4 bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all text-right group"
          >
            <div className={`w-12 h-12 rounded-full ${sec.color} text-white flex items-center justify-center shrink-0 ml-4 group-hover:scale-110 transition-transform`}>
              <sec.icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-800">{sec.title}</h3>
              <p className="text-xs text-slate-500 mt-1">{sec.desc}</p>
            </div>
            <ChevronLeft className="w-5 h-5 text-slate-400 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};
