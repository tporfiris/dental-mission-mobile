// contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { Alert, AppState } from 'react-native';
import { simpleFirestoreSyncService } from '../services/SimpleFirestoreSync'; // ✅ ADD THIS IMPORT

interface AuthContextType {
  user: User | null;
  role: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>; // ✅ ADD THIS
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  login: async () => {}, // ✅ ADD THIS
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Session timeout
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  const resetSessionTimeout = () => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }
    
    sessionTimeoutRef.current = setTimeout(() => {
      if (user) {
        logout();
        Alert.alert(
          'Session Expired',
          'You have been logged out due to inactivity.',
          [{ text: 'OK' }]
        );
      }
    }, SESSION_TIMEOUT);
  };

  useEffect(() => {
    if (user) {
      resetSessionTimeout();
      
      // Reset timeout on any interaction
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active' && user) {
          resetSessionTimeout();
        }
      });
      
      return () => {
        subscription.remove();
        if (sessionTimeoutRef.current) {
          clearTimeout(sessionTimeoutRef.current);
        }
      };
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔐 Auth state changed:', firebaseUser?.email || 'undefined');
      
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Fetch role from Firestore 'users' collection
        try {
          console.log('📝 Fetching role for user:', firebaseUser.uid);
          
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const userRole = userData.role || 'clinician';
            
            console.log('✅ User role loaded:', userRole);
            setRole(userRole);
          } else {
            console.warn('⚠️ User document not found in Firestore for UID:', firebaseUser.uid);
            console.warn('⚠️ Creating default clinician role...');
            setRole('clinician');
          }
        } catch (error) {
          console.error('❌ Error fetching user role:', error);
          setRole('clinician');
        }
      } else {
        setUser(null);
        setRole(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // ✅ ADD THIS: Login function with sync integration
  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 Attempting login for:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      console.log('✅ Login successful');
      
      // Update sync service auth status
      console.log('🔄 Updating sync service auth status...');
      simpleFirestoreSyncService.updateAuthStatus();
      
      // ✅ REMOVE THIS LINE - sync will trigger automatically via onAuthStateChanged
      // await simpleFirestoreSyncService.forceSync();
      
      // Fetch user role
      console.log('📝 Fetching role for user:', userCredential.user.uid);
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userRole = userData.role || 'clinician';
        setRole(userRole);
        console.log('✅ User role loaded:', userRole);
      } else {
        setRole('clinician');
        console.warn('⚠️ User document not found, defaulting to clinician');
      }
      
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      throw new Error(error.message);
    }
  };
  
  // ✅ UPDATED: Logout function with sync cleanup
  const logout = async () => {
    try {
      console.log('👋 Logging out user...');
      
      // Stop sync service before logout
      console.log('⏹️ Stopping sync service...');
      simpleFirestoreSyncService.stopPeriodicSync();
      
      // Clear session timeout
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
      
      await signOut(auth);
      setUser(null);
      setRole(null);
      
      console.log('👋 User logged out');
    } catch (error) {
      console.error('❌ Logout error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};