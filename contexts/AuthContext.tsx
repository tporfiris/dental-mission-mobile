// contexts/AuthContext.tsx
// ✅ UPDATED: Better logout handling + Secure token storage with expo-secure-store
import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { Alert, AppState } from 'react-native';
import { simpleFirestoreSyncService } from '../services/SimpleFirestoreSync';
import * as SecureStore from 'expo-secure-store';

// Secure storage keys
const SECURE_KEYS = {
  AUTH_TOKEN: 'dental_auth_token',
  REFRESH_TOKEN: 'dental_refresh_token',
  USER_ID: 'dental_user_id',
  USER_ROLE: 'dental_user_role',
};

interface AuthContextType {
  user: User | null;
  role: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  login: async () => {},
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

  // ✅ NEW: Secure token storage functions
  const storeSecureData = async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`Error storing secure data (${key}):`, error);
    }
  };

  const getSecureData = async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`Error retrieving secure data (${key}):`, error);
      return null;
    }
  };

  const deleteSecureData = async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`Error deleting secure data (${key}):`, error);
    }
  };

  // ✅ NEW: Store user session securely
  const storeUserSession = async (firebaseUser: User, userRole: string) => {
    try {
      const token = await firebaseUser.getIdToken();
      const refreshToken = firebaseUser.refreshToken;

      await Promise.all([
        storeSecureData(SECURE_KEYS.AUTH_TOKEN, token),
        storeSecureData(SECURE_KEYS.REFRESH_TOKEN, refreshToken || ''),
        storeSecureData(SECURE_KEYS.USER_ID, firebaseUser.uid),
        storeSecureData(SECURE_KEYS.USER_ROLE, userRole),
      ]);

      console.log('✅ User session stored securely');
    } catch (error) {
      console.error('❌ Error storing user session:', error);
    }
  };

  // ✅ NEW: Clear user session
  const clearUserSession = async () => {
    try {
      await Promise.all([
        deleteSecureData(SECURE_KEYS.AUTH_TOKEN),
        deleteSecureData(SECURE_KEYS.REFRESH_TOKEN),
        deleteSecureData(SECURE_KEYS.USER_ID),
        deleteSecureData(SECURE_KEYS.USER_ROLE),
      ]);

      console.log('✅ User session cleared');
    } catch (error) {
      console.error('❌ Error clearing user session:', error);
    }
  };

  // ✅ NEW: Check for stored session on app start
  const restoreSession = async () => {
    try {
      const storedUserId = await getSecureData(SECURE_KEYS.USER_ID);
      const storedRole = await getSecureData(SECURE_KEYS.USER_ROLE);

      if (storedUserId && storedRole) {
        console.log('📱 Found stored session, waiting for Firebase auth...');
        // The onAuthStateChanged listener will handle the actual user restoration
        return { userId: storedUserId, role: storedRole };
      }
      return null;
    } catch (error) {
      console.error('❌ Error restoring session:', error);
      return null;
    }
  };

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

  // ✅ UPDATED: Auth state listener with secure storage
  useEffect(() => {
    // Try to restore session first
    restoreSession();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔐 Auth state changed:', firebaseUser?.email || 'undefined');
      
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Fetch role from Firestore 'users' collection
        try {
          console.log('📝 Fetching role for user:', firebaseUser.uid);
          
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          let userRole = 'clinician'; // default
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            userRole = userData.role || 'clinician';
            console.log('✅ User role loaded from Firestore:', userRole);
          } else {
            console.warn('⚠️ User document not found in Firestore for UID:', firebaseUser.uid);
            console.warn('⚠️ Using default clinician role...');
          }
          
          setRole(userRole);
          
          // ✅ Store session securely
          await storeUserSession(firebaseUser, userRole);
          
        } catch (error) {
          console.error('❌ Error fetching user role:', error);
          setRole('clinician');
        }
      } else {
        setUser(null);
        setRole(null);
        // Clear stored session when user logs out
        await clearUserSession();
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // ✅ UPDATED: Login with secure storage
  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 Attempting login for:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      console.log('✅ Login successful');
      
      // Update sync service auth status
      console.log('🔄 Updating sync service auth status...');
      simpleFirestoreSyncService.updateAuthStatus();
      
      // Fetch user role
      console.log('📝 Fetching role for user:', userCredential.user.uid);
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      let userRole = 'clinician'; // default
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        userRole = userData.role || 'clinician';
        console.log('✅ User role loaded:', userRole);
      } else {
        console.warn('⚠️ User document not found, defaulting to clinician');
      }
      
      setRole(userRole);
      
      // ✅ Store session securely
      await storeUserSession(userCredential.user, userRole);
      
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      throw new Error(error.message);
    }
  };
  
  // ✅ UPDATED: Logout with secure storage cleanup
  const logout = async () => {
    try {
      console.log('👋 Logging out user...');
      
      // 1. Stop sync service FIRST
      console.log('⏹️ Stopping sync service...');
      simpleFirestoreSyncService.stopPeriodicSync();
      
      // 2. Small delay to ensure sync fully stops
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // 3. Clear session timeout
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
      
      // 4. Clear secure storage
      await clearUserSession();
      
      // 5. Clear local state BEFORE Firebase signOut
      setUser(null);
      setRole(null);
      
      // 6. Finally sign out from Firebase
      await signOut(auth);
      
      console.log('👋 User logged out successfully');
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