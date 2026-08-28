import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, setDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { createAuthUser } from '../../lib/adminAuth';
import { 
  Users, Plus, Loader2, User, Search, Edit3, CheckCircle, 
  AlertCircle, Download, Phone, MapPin, Calendar
} from 'lucide-react';
import { Role, UserData } from '../../types';

export const ManageUsers = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Single user add state
  const [showAddForm, setShowAddForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('deacon');

  // Edit user state
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserData));
      setUsers(data);
    });

    const unsubAreas = onSnapshot(collection(db, 'areas'), (snapshot) => {
      setAreas(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubTeams = onSnapshot(collection(db, 'teams'), (snapshot) => {
      setTeams(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubUsers();
      unsubAreas();
      unsubTeams();
    };
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const email = `${username.trim()}@deacons-app.local`;

    try {
      const authUser = await createAuthUser(email, password);

      await setDoc(doc(db, 'users', authUser.uid), {
        username: username.trim(),
        role,
        fullName: fullName.trim(),
        createdAt: new Date().toISOString(),
        isFirstLogin: true,
        photoUrl: '',
        ownPhone: '',
        parentPhone: '',
        dadPhone: '',
        momPhone: '',
        address: '',
        grade: '',
        areaId: '',
        teamId: '',
        assignedAssistantId: '',
        tempPassword: password
      });

      setSuccessMsg(`تم إنشاء حساب ${fullName} بنجاح كـ ${getRoleName(role)}`);
      setFullName('');
      setUsername('');
      setPassword('');
      setRole('deacon');
      setShowAddForm(false);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('اسم المستخدم هذا مسجل بالفعل');
      } else if (err.code === 'auth/weak-password') {
        setError('كلمة المرور يجب أن تكون 6 أحرف أو أرقام على الأقل');
      } else {
        setError(err.message || 'حدث خطأ أثناء إضافة المستخدم');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditLoading(true);
    try {
      const userRef = doc(db, 'users', editingUser.id);
      await updateDoc(userRef, {
        fullName: editingUser.fullName || '',
        ownPhone: editingUser.ownPhone || '',
        dadPhone: editingUser.dadPhone || '',
        momPhone: editingUser.momPhone || '',
        parentPhone: editingUser.parentPhone || editingUser.dadPhone || editingUser.momPhone || '',
        address: editingUser.address || '',
        birthDate: editingUser.birthDate || '',
        grade: editingUser.grade || '',
        areaId: editingUser.areaId || '',
        teamId: editingUser.teamId || '',
        role: editingUser.role || 'deacon'
      });
      setSuccessMsg(`تم تحديث بيانات ${editingUser.fullName} بنجاح`);
      setEditingUser(null);
    } catch (err: any) {
      console.error(err);
      setError('تعذر حفظ التعديلات: ' + err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف حساب ${name} من قاعدة البيانات؟`)) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      setSuccessMsg(`تم حذف ${name} بنجاح`);
    } catch (err: any) {
      console.error(err);
      setError('فشل في حذف المستخدم: ' + err.message);
    }
  };

  const downloadCSV = () => {
    const header = "الاسم,اسم الدخول,الرتبة,الهاتف,هاتف الوالدين,تاريخ الميلاد,العنوان,الصف الدراسي\n";
    const rows = users.map(u => 
      `"${u.fullName || ''}","${u.username || ''}","${getRoleName(u.role)}","${u.ownPhone || ''}","${u.parentPhone || u.dadPhone || u.momPhone || ''}","${u.birthDate || ''}","${(u.address || '').replace(/"/g, '""')}","${u.grade || ''}"`
    ).join("\n");

    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `تقرير_بيانات_الشمامسة_${new Date().toLocaleDateString('ar-EG')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRoleColor = (r: string) => {
    switch (r) {
      case 'admin': return 'bg-red-50 text-red-700 border-red-200';
      case 'assistant': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'parent': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getRoleName = (r: string) => {
    switch (r) {
      case 'admin': return 'أدمن';
      case 'assistant': return 'مساعد';
      case 'parent': return 'ولي أمر';
      default: return 'شماس';
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      (u.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.address || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.ownPhone || '').includes(searchQuery) ||
      (u.parentPhone || '').includes(searchQuery);

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">إدارة حسابات الشمامسة والمستخدمين</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              إجمالي الحسابات المسجلة بقاعدة البيانات: <span className="font-bold text-blue-600">{users.length}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={downloadCSV}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            تصدير البيانات (Excel/CSV)
          </button>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            إضافة حساب جديد
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Add Single User Form */}
      {showAddForm && (
        <form onSubmit={handleAddUser} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
            <Plus className="w-5 h-5 text-blue-600" /> إضافة مستخدم جديد
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">الاسم الكامل</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="مثال: بيشوي عماد جرجس"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">اسم الدخول (Username)</label>
              <input
                type="text"
                required
                dir="ltr"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="bishoy.emad"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm text-left"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">كلمة المرور المبدئية</label>
              <input
                type="text"
                required
                dir="ltr"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="123456"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm text-left"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">الدور (Role)</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as Role)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm font-medium"
              >
                <option value="deacon">شماس</option>
                <option value="assistant">مساعد (خادم)</option>
                <option value="parent">ولي أمر</option>
                <option value="admin">أدمن (مدير)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ وإنشاء'}
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم، اسم المستخدم، الهاتف، العنوان..."
            className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="all">كل الأدوار</option>
            <option value="deacon">الشمامسة فقط</option>
            <option value="assistant">المساعدين</option>
            <option value="parent">أولياء الأمور</option>
            <option value="admin">المدراء (Admins)</option>
          </select>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((u) => {
          const userArea = areas.find(a => a.id === u.areaId)?.name;
          const userTeam = teams.find(t => t.id === u.teamId)?.name;

          return (
            <div key={u.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between hover:border-slate-200 transition-colors">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    {u.photoUrl ? (
                      <img src={u.photoUrl} alt={u.fullName} className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                        <User className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm leading-tight">{u.fullName}</h4>
                      <p className="text-xs text-slate-500 mt-0.5" dir="ltr">@{u.username}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getRoleColor(u.role)}`}>
                    {getRoleName(u.role)}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl mb-3">
                  {u.birthDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>الميلاد: {u.birthDate}</span>
                    </div>
                  )}
                  {(u.ownPhone || u.parentPhone || u.dadPhone || u.momPhone) && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span dir="ltr">{u.ownPhone || u.parentPhone || u.dadPhone || u.momPhone}</span>
                    </div>
                  )}
                  {u.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{u.address}</span>
                    </div>
                  )}
                  {(userArea || userTeam) && (
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 font-medium">
                      {userArea && <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded-md text-[10px]">المنطقة: {userArea}</span>}
                      {userTeam && <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md text-[10px]">الفريق: {userTeam}</span>}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  onClick={() => setEditingUser(u)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" /> تعديل واستكمال
                </button>
                <button
                  onClick={() => handleDeleteUser(u.id, u.fullName)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1"
                >
                  حذف
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 text-slate-500">
          <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="font-bold text-slate-700 mb-1">لا توجد حسابات مسجلة</p>
          <p className="text-xs text-slate-400">يمكنك الضغط على زر "إضافة حساب جديد" لإنشاء مستخدم</p>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 my-8 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" /> تعديل بيانات: {editingUser.fullName}
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">الاسم الكامل</label>
                <input
                  type="text"
                  value={editingUser.fullName || ''}
                  onChange={e => setEditingUser({ ...editingUser, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">هاتف الشماس</label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={editingUser.ownPhone || ''}
                    onChange={e => setEditingUser({ ...editingUser, ownPhone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-left"
                    placeholder="01xxxxxxxxx"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">تاريخ الميلاد</label>
                  <input
                    type="text"
                    value={editingUser.birthDate || ''}
                    onChange={e => setEditingUser({ ...editingUser, birthDate: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                    placeholder="يوم/شهر/سنة"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">هاتف الأب</label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={editingUser.dadPhone || ''}
                    onChange={e => setEditingUser({ ...editingUser, dadPhone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-left"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">هاتف الأم</label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={editingUser.momPhone || ''}
                    onChange={e => setEditingUser({ ...editingUser, momPhone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-left"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">العنوان السكني</label>
                <input
                  type="text"
                  value={editingUser.address || ''}
                  onChange={e => setEditingUser({ ...editingUser, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">الصف الدراسي</label>
                  <input
                    type="text"
                    value={editingUser.grade || ''}
                    onChange={e => setEditingUser({ ...editingUser, grade: e.target.value })}
                    placeholder="أولى إعدادي..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">المنطقة</label>
                  <select
                    value={editingUser.areaId || ''}
                    onChange={e => setEditingUser({ ...editingUser, areaId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="">بدون منطقة</option>
                    {areas.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">الفريق</label>
                  <select
                    value={editingUser.teamId || ''}
                    onChange={e => setEditingUser({ ...editingUser, teamId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="">بدون فريق</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2"
                >
                  {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
