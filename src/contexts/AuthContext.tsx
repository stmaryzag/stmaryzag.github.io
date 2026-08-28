import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserData } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: UserData | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reloadUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (uid: string, firebaseUser?: FirebaseUser) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const userEmail = (firebaseUser?.email || currentUser?.email || '').toLowerCase();
        
        // Auto-upgrade to admin if email indicates admin or if requested
        if (data.role !== 'admin' && (userEmail.includes('admin') || userEmail.includes('pwamicky'))) {
          await updateDoc(docRef, { role: 'admin' });
          data.role = 'admin';
        }

        setUserData({ id: docSnap.id, ...data } as UserData);
      } else {
        // Document with Auth UID not found. Let's check if there is an existing doc with matching email/username
        const userEmail = (firebaseUser?.email || currentUser?.email || '').toLowerCase();
        const baseUsername = userEmail.split('@')[0] || 'admin';

        let existingDoc: any = null;
        try {
          const q = query(collection(db, 'users'), where('username', '==', baseUsername));
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            existingDoc = querySnap.docs[0];
          }
        } catch (e) {
          console.warn("Could not query existing username:", e);
        }

        if (existingDoc) {
          // Copy or link document to this UID
          const exData = existingDoc.data();
          const roleToSet = userEmail.includes('admin') || userEmail.includes('pwamicky') ? 'admin' : (exData.role || 'admin');
          const newProfile = {
            ...exData,
            role: roleToSet,
            email: userEmail,
            isFirstLogin: false
          };
          await setDoc(docRef, newProfile);
          setUserData({ id: uid, ...newProfile } as UserData);
        } else {
          // Check if any admins exist in users collection
          let shouldBeAdmin = true;
          try {
            const adminQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
            const adminSnap = await getDocs(adminQuery);
            if (!adminSnap.empty && !userEmail.includes('admin') && !userEmail.includes('pwamicky')) {
              shouldBeAdmin = false;
            }
          } catch (e) {
            console.warn("Admin check fallback:", e);
          }

          const defaultProfile = {
            username: baseUsername,
            role: shouldBeAdmin ? 'admin' : 'deacon',
            fullName: firebaseUser?.displayName || baseUsername || 'مدير النظام',
            email: userEmail,
            createdAt: new Date().toISOString(),
            isFirstLogin: false,
            photoUrl: firebaseUser?.photoURL || '',
            ownPhone: '01000000000',
            parentPhone: '',
            grade: '',
            areaId: '',
            teamId: '',
            assignedAssistantId: ''
          };

          await setDoc(docRef, defaultProfile);
          setUserData({ id: uid, ...defaultProfile } as UserData);
        }
      }
    } catch (error) {
      console.error("Error fetching or initializing user data:", error);
      // Fallback in memory so the app doesn't freeze
      setUserData({
        id: uid,
        username: 'admin',
        role: 'admin',
        fullName: 'مدير النظام',
        createdAt: new Date().toISOString(),
        isFirstLogin: false
      } as UserData);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserData(user.uid, user);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (usernameOrEmail: string, password: string) => {
    const trimmed = usernameOrEmail.trim();
    // If it already contains an '@' (like admin@gmail.com), use it directly.
    // Otherwise, append the default domain.
    const email = trimmed.includes('@') ? trimmed : `${trimmed}@deacons-app.local`;
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const reloadUserData = async () => {
    if (currentUser) {
      await fetchUserData(currentUser.uid);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, userData, loading, login, logout, reloadUserData }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
