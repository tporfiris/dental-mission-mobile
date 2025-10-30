// contexts/AuthContext.tsx - UPDATED to use 'users' collection
import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { Alert, AppState } from 'react-native';

interface AuthContextType {
  user: User | null;
  role: string | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);


  // Add session timeout
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
      console.log('🔐 Auth state changed:', firebaseUser?.email);
      
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Fetch role from Firestore 'users' collection
        try {
          console.log('📝 Fetching role for user:', firebaseUser.uid);
          
          // FIXED: Using 'users' collection instead of 'clinicians'
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const userRole = userData.role || 'clinician'; // Default to clinician if no role
            
            console.log('✅ User role loaded:', userRole);
            setRole(userRole);
          } else {
            console.warn('⚠️ User document not found in Firestore for UID:', firebaseUser.uid);
            console.warn('⚠️ Creating default clinician role...');
            
            // Default to clinician if no document exists
            setRole('clinician');
            
            // Optionally create the document (uncomment if you want auto-creation)
            // await setDoc(userDocRef, { 
            //   role: 'clinician',
            //   email: firebaseUser.email,
            //   createdAt: serverTimestamp()
            // });
          }
        } catch (error) {
          console.error('❌ Error fetching user role:', error);
          setRole('clinician'); // Default role on error
        }
      } else {
        setUser(null);
        setRole(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setRole(null);
      console.log('👋 User logged out');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};