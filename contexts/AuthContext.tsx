// contexts/AuthContext-DUAL.tsx
// ✅ DUAL AUTH: Mission codes for clinicians + Firebase auth for admin
import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { simpleFirestoreSyncService } from '../services/SimpleFirestoreSync';
import * as SecureStore from 'expo-secure-store';

// Pre-configured clinician codes
const CLINICIAN_CODES: { [code: string]: UserProfile } = {
  'ALICE-2026': {
    uid: 'user_alice_123',
    email: 'alice@dental.com',
    fullName: 'Dr. Alice Smith',
    officeId: 'office_main',
    officeName: 'Main Office',
    role: 'clinician',
  },
  'BOB-2026': {
    uid: 'user_bob_456',
    email: 'bob@dental.com',
    fullName: 'Dr. Bob Jones',
    officeId: 'office_main',
    officeName: 'Main Office',
    role: 'clinician',
  },
  // Add all 30 clinicians...
};

const CURRENT_CODE_KEY = 'dental_current_code';
const AUTH_MODE_KEY = 'dental_auth_mode'; // 'code' or 'firebase'

interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  officeId: string;
  officeName?: string;
  officeLocation?: string;
  role: string;
}

interface AuthContextType {
  user: any;
  userProfile: UserProfile | null;
  role: string | null;
  loading: boolean;
  authMode: 'code' | 'firebase' | null;
  loginWithCode: (code: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  role: null,
  loading: true,
  authMode: null,
  loginWithCode: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'code' | 'firebase' | null>(null);

  // ✅ Load user profile from Firestore (for Firebase admin login)
  const loadFirebaseProfile = async (firebaseUser: any): Promise<UserProfile | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        let officeName = '';
        let officeLocation = '';
        
        if (userData.officeId) {
          try {
            const officeDoc = await getDoc(doc(db, 'offices', userData.officeId));
            if (officeDoc.exists()) {
              const officeData = officeDoc.data();
              officeName = officeData.name;
              officeLocation = officeData.location;
            }
          } catch (officeError) {
            console.warn('⚠️ Could not load office details');
          }
        }
        
        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          fullName: userData.fullName || '',
          officeId: userData.officeId || '',
          officeName,
          officeLocation,
          role: userData.role || 'clinician',
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error loading Firebase profile:', error);
      return null;
    }
  };

  // ✅ Try to restore code-based session
  useEffect(() => {
    const autoLogin = async () => {
      try {
        const savedMode = await SecureStore.getItemAsync(AUTH_MODE_KEY);
        
        if (savedMode === 'code') {
          // Try code-based login
          const lastCode = await SecureStore.getItemAsync(CURRENT_CODE_KEY);
          
          if (lastCode) {
            console.log('🔄 Auto-login with mission code...');
            
            const profile = CLINICIAN_CODES[lastCode.toUpperCase()];
            
            if (profile) {
              setUser({ uid: profile.uid });
              setUserProfile(profile);
              setRole(profile.role);
              setAuthMode('code');
              console.log('✅ Code auto-login successful:', profile.fullName);
            } else {
              console.log('⚠️ Stored code no longer valid');
              await SecureStore.deleteItemAsync(CURRENT_CODE_KEY);
              await SecureStore.deleteItemAsync(AUTH_MODE_KEY);
            }
          }
        }
        // Firebase auth handled by onAuthStateChanged below
      } catch (error) {
        console.error('Error during auto-login:', error);
      } finally {
        setLoading(false);
      }
    };

    autoLogin();
  }, []);

  // ✅ Listen to Firebase auth state (for admin login)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔐 Firebase auth state:', firebaseUser?.email || 'logged out');
      
      if (firebaseUser) {
        // Firebase login (admin)
        setUser(firebaseUser);
        setAuthMode('firebase');
        
        const profile = await loadFirebaseProfile(firebaseUser);
        if (profile) {
          setUserProfile(profile);
          setRole(profile.role);
          
          // Store auth mode
          await SecureStore.setItemAsync(AUTH_MODE_KEY, 'firebase');
        }
      } else {
        // Only clear if not in code mode
        const savedMode = await SecureStore.getItemAsync(AUTH_MODE_KEY);
        if (savedMode !== 'code') {
          setUser(null);
          setUserProfile(null);
          setRole(null);
          setAuthMode(null);
        }
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // ✅ Login with mission code (clinicians)
  const loginWithCode = async (code: string) => {
    try {
      console.log('🔐 Mission code login attempt:', code.toUpperCase());

      const profile = CLINICIAN_CODES[code.toUpperCase()];

      if (!profile) {
        throw new Error('Invalid code. Please check your code and try again.');
      }

      // Store code and mode
      await SecureStore.setItemAsync(CURRENT_CODE_KEY, code.toUpperCase());
      await SecureStore.setItemAsync(AUTH_MODE_KEY, 'code');

      // Set user state
      setUser({ uid: profile.uid });
      setUserProfile(profile);
      setRole(profile.role);
      setAuthMode('code');

      console.log('✅ Mission code login successful:', profile.fullName);

    } catch (error: any) {
      console.error('❌ Login failed:', error.message);
      throw error;
    }
  };

  // ✅ Logout (both modes)
  const logout = async () => {
    try {
      console.log('👋 Logging out...');

      const currentMode = await SecureStore.getItemAsync(AUTH_MODE_KEY);

      // Clear code-based auth
      if (currentMode === 'code') {
        await SecureStore.deleteItemAsync(CURRENT_CODE_KEY);
      }

      // Clear auth mode
      await SecureStore.deleteItemAsync(AUTH_MODE_KEY);

      // Clear Firebase auth (if logged in via Firebase)
      if (auth.currentUser) {
        await auth.signOut();
      }

      // Clear state
      setUser(null);
      setUserProfile(null);
      setRole(null);
      setAuthMode(null);

      console.log('✅ Logged out');
    } catch (error) {
      console.error('❌ Logout error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile, 
      role, 
      loading, 
      authMode,
      loginWithCode, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};