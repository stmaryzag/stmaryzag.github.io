import { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Loader2, Camera, Upload } from 'lucide-react';

export const FirstLoginSetup = () => {
  const { currentUser, userData, reloadUserData } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [photoBase64, setPhotoBase64] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      return;
    }

    if (!photoBase64) {
      setError('يجب رفع صورة شخصية');
      return;
    }

    if (!phone || phone.length < 10) {
      setError('رقم الهاتف غير صحيح');
      return;
    }

    if (!currentUser || !userData) return;

    setLoading(true);
    try {
      // 1. Update Password in Firebase Auth
      await updatePassword(currentUser, newPassword);

      // 2. Update user doc in Firestore
      const userRef = doc(db, 'users', userData.id);
      await updateDoc(userRef, {
        photoUrl: photoBase64,
        ownPhone: phone
      });

      // 3. Reload user data and navigate
      await reloadUserData();
      navigate('/');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        setError('يجب تسجيل الدخول مرة أخرى لتغيير كلمة المرور. يرجى تسجيل الخروج والدخول مجدداً.');
      } else {
        setError('حدث خطأ أثناء حفظ البيانات');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center px-4 py-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-6">
        <h2 className="text-center text-2xl font-extrabold text-slate-900">
          إعداد الحساب لأول مرة
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          يرجى إكمال بياناتك لتتمكن من استخدام التطبيق
        </p>
      </div>

      <div className="bg-white py-6 px-4 shadow-sm rounded-2xl border border-slate-100 sm:mx-auto sm:w-full sm:max-w-md">
        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100 text-center">
              {error}
            </div>
          )}

          {/* Photo Upload */}
          <div className="flex flex-col items-center justify-center gap-3">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 cursor-pointer overflow-hidden relative group hover:border-blue-500 transition-colors"
            >
              {photoBase64 ? (
                <img src={photoBase64} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-8 h-8 text-slate-400 group-hover:text-blue-500" />
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload className="w-6 h-6 text-white" />
              </div>
            </div>
            <span className="text-sm font-medium text-slate-700">اضغط لرفع صورة شخصية (إجباري)</span>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              رقم الهاتف الشخصي
            </label>
            <input
              type="tel"
              required
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01xxxxxxxxx"
              className="appearance-none block w-full px-3 py-3 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-left"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              كلمة المرور الجديدة
            </label>
            <input
              type="password"
              required
              dir="ltr"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="appearance-none block w-full px-3 py-3 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-left"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              تأكيد كلمة المرور
            </label>
            <input
              type="password"
              required
              dir="ltr"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="appearance-none block w-full px-3 py-3 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-left"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ ومتابعة'}
          </button>
        </form>
      </div>
    </div>
  );
};
