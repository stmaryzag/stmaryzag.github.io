import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Phone, Shield, Lock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const Profile = () => {
  const { currentUser, userData, reloadUserData } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [phone, setPhone] = useState(userData?.ownPhone || '');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      if (newPassword) {
        if (newPassword.length < 6) {
          throw new Error('كلمة المرور يجب أن تكون 6 أحرف أو أرقام على الأقل');
        }
        if (currentUser) {
          await updatePassword(currentUser, newPassword);
        }
      }

      if (userData?.id) {
        await updateDoc(doc(db, 'users', userData.id), {
          ownPhone: phone
        });
      }

      await reloadUserData();
      setMsg({ type: 'success', text: 'تم تحديث البيانات بنجاح' });
      setNewPassword('');
    } catch (err: any) {
      console.error(err);
      setMsg({ type: 'error', text: err.message || 'حدث خطأ أثناء حفظ التعديلات' });
    } finally {
      setLoading(false);
    }
  };

  const promoteToAdmin = async () => {
    if (!userData?.id) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userData.id), {
        role: 'admin'
      });
      await reloadUserData();
      setMsg({ type: 'success', text: 'تم ترقية الحساب إلى مدير (Admin) بنجاح!' });
    } catch (err: any) {
      console.error(err);
      setMsg({ type: 'error', text: 'تعذر الترقية: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const getRoleName = (r?: string) => {
    switch (r) {
      case 'admin': return 'أدمن (مدير النظام)';
      case 'assistant': return 'مساعد (أمين خدمة)';
      case 'parent': return 'ولي أمر';
      default: return 'شماس';
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-slate-100 flex items-center justify-center border-2 border-blue-500 overflow-hidden mb-3">
          {userData?.photoUrl ? (
            <img src={userData.photoUrl} alt="profile" className="w-full h-full object-cover" />
          ) : (
            <User className="w-10 h-10 text-slate-400" />
          )}
        </div>
        <h2 className="text-xl font-bold text-slate-800">{userData?.fullName || 'مستخدم'}</h2>
        <p className="text-sm text-slate-500 mb-2">@{userData?.username || currentUser?.email}</p>
        <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded-full text-xs">
          {getRoleName(userData?.role)}
        </span>
      </div>

      {msg && (
        <div className={`p-4 rounded-2xl text-sm flex items-center gap-2 ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Role Upgrade Card if not admin */}
      {userData?.role !== 'admin' && (
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-3xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 text-sm">هل أنت مدير الخدمة؟</h4>
              <p className="text-xs text-amber-700">يمكنك ترقية هذا الحساب إلى مسؤول (Admin)</p>
            </div>
          </div>
          <button
            onClick={promoteToAdmin}
            disabled={loading}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0 shadow-sm"
          >
            تفعيل كـ Admin
          </button>
        </div>
      )}

      <form onSubmit={handleUpdate} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base border-b pb-3">
          <User className="w-5 h-5 text-blue-600" /> تعديل البيانات الشخصية
        </h3>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">رقم الهاتف</label>
          <div className="relative">
            <input
              type="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-left focus:outline-none focus:border-blue-500"
              placeholder="01xxxxxxxxx"
            />
            <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">تغيير كلمة المرور (اتركه فارغاً إذا لم ترغب في التغيير)</label>
          <div className="relative">
            <input
              type="password"
              dir="ltr"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-left focus:outline-none focus:border-blue-500"
              placeholder="••••••••"
            />
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-4"
        >
          {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'حفظ التعديلات'}
        </button>
      </form>
    </div>
  );
};
