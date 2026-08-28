import { useState, useEffect } from 'react';
import { collection, onSnapshot, setDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { createAuthUser } from '../../lib/adminAuth';
import { Users, Plus, Loader2, ShieldCheck, User } from 'lucide-react';
import { Role } from '../../types';

export const ManageUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // New user form state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('deacon');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(data);
    });
    return () => unsub();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const email = `${username}@deacons-app.local`;

    try {
      // 1. Create user in Firebase Auth via Secondary App
      const authUser = await createAuthUser(email, password);

      // 2. Add user doc to Firestore with auth uid
      await setDoc(doc(db, 'users', authUser.uid), {
        username,
        role,
        fullName,
        createdAt: new Date().toISOString(),
        isFirstLogin: true, // Will force them to setup profile
        // Empty optional fields ready for later updates
        photoUrl: '',
        ownPhone: '',
        parentPhone: '',
        grade: '',
        areaId: '',
        teamId: '',
        assignedAssistantId: ''
      });

      setSuccessMsg(`تم إضافة ${fullName} بنجاح كـ ${role}`);
      setFullName('');
      setUsername('');
      setPassword('');
      setRole('deacon');
      
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('اسم المستخدم هذا مستخدم بالفعل (البريد الوهمي مكرر)');
      } else if (err.code === 'auth/weak-password') {
        setError('كلمة المرور ضعيفة جداً (يجب أن تكون 6 أحرف على الأقل)');
      } else {
        setError('حدث خطأ أثناء إضافة المستخدم');
      }
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (r: string) => {
    switch(r) {
      case 'admin': return 'bg-red-100 text-red-700';
      case 'assistant': return 'bg-orange-100 text-orange-700';
      case 'parent': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getRoleName = (r: string) => {
    switch(r) {
      case 'admin': return 'أدمن';
      case 'assistant': return 'مساعد';
      case 'parent': return 'ولي أمر';
      default: return 'شماس';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">إدارة الحسابات والشمامسة</h2>
            <p className="text-sm text-slate-500">العدد الإجمالي: {users.length}</p>
          </div>
        </div>

        <form onSubmit={handleAddUser} className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
          <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
            <Plus className="w-5 h-5"/> إضافة حساب جديد
          </h3>
          
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{error}</div>}
          {successMsg && <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm border border-green-100">{successMsg}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">الاسم الكامل</label>
              <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">اسم الدخول (Username)</label>
              <input type="text" required dir="ltr" value={username} onChange={e => setUsername(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 text-left" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">كلمة المرور (المبدئية)</label>
              <input type="text" required dir="ltr" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 text-left" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">الدور (Role)</label>
              <select value={role} onChange={e => setRole(e.target.value as Role)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500">
                <option value="deacon">شماس</option>
                <option value="assistant">مساعد</option>
                <option value="parent">ولي أمر</option>
                <option value="admin">أدمن</option>
              </select>
            </div>
          </div>
          
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 mt-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'إنشاء الحساب'}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(u => (
          <div key={u.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-start gap-3">
            {u.photoUrl ? (
              <img src={u.photoUrl} alt="profile" className="w-12 h-12 rounded-full object-cover border border-slate-200" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-slate-400" />
              </div>
            )}
            <div className="flex-1">
              <h4 className="font-bold text-slate-800">{u.fullName}</h4>
              <p className="text-xs text-slate-500 mb-2">@{u.username}</p>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${getRoleColor(u.role)}`}>
                {getRoleName(u.role)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
