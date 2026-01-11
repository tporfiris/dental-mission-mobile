// contexts/AuthContext.tsx
// ✅ UPDATED: Office tracking + Secure token storage + Better logout handling
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
  USER_PROFILE: 'dental_user_profile',
};

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
  user: User | null;
  userProfile: UserProfile | null;
  role: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  role: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Session timeout
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  // ✅ Secure token storage functions
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

  // ✅ Store user session securely (with profile)
  const storeUserSession = async (firebaseUser: User, userRole: string, profile: UserProfile) => {
    try {
      const token = await firebaseUser.getIdToken();
      const refreshToken = firebaseUser.refreshToken;

      await Promise.all([
        storeSecureData(SECURE_KEYS.AUTH_TOKEN, token),
        storeSecureData(SECURE_KEYS.REFRESH_TOKEN, refreshToken || ''),
        storeSecureData(SECURE_KEYS.USER_ID, firebaseUser.uid),
        storeSecureData(SECURE_KEYS.USER_ROLE, userRole),
        storeSecureData(SECURE_KEYS.USER_PROFILE, JSON.stringify(profile)),
      ]);

      console.log('✅ User session stored securely');
    } catch (error) {
      console.error('❌ Error storing user session:', error);
    }
  };

  // ✅ Clear user session
  const clearUserSession = async () => {
    try {
      await Promise.all([
        deleteSecureData(SECURE_KEYS.AUTH_TOKEN),
        deleteSecureData(SECURE_KEYS.REFRESH_TOKEN),
        deleteSecureData(SECURE_KEYS.USER_ID),
        deleteSecureData(SECURE_KEYS.USER_ROLE),
        deleteSecureData(SECURE_KEYS.USER_PROFILE),
      ]);

      console.log('✅ User session cleared');
    } catch (error) {
      console.error('❌ Error clearing user session:', error);
    }
  };

  // ✅ Check for stored session on app start
  const restoreSession = async () => {
    try {
      const storedUserId = await getSecureData(SECURE_KEYS.USER_ID);
      const storedRole = await getSecureData(SECURE_KEYS.USER_ROLE);
      const storedProfile = await getSecureData(SECURE_KEYS.USER_PROFILE);

      if (storedUserId && storedRole) {
        console.log('📱 Found stored session, waiting for Firebase auth...');
        return { 
          userId: storedUserId, 
          role: storedRole,
          profile: storedProfile ? JSON.parse(storedProfile) : null
        };
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

  // ✅ NEW: Load user profile with office information
  const loadUserProfile = async (firebaseUser: User): Promise<UserProfile | null> => {
    try {
      // First, try to get user profile from new 'users' collection
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Fetch office details
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
            console.warn('⚠️ Could not load office details:', officeError);
          }
        }
        
        const fullProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          fullName: userData.fullName || '',
          officeId: userData.officeId || '',
          officeName,
          officeLocation,
          role: userData.role || 'clinician',
        };
        
        console.log('✅ User profile loaded:', {
          email: userData.email,
          role: userData.role,
          office: officeName || userData.officeId
        });
        
        return fullProfile;
      } else {
        // Fallback: Try legacy 'clinicians' collection
        console.log('ℹ️ User doc not found, checking clinicians collection...');
        const clinicianDoc = await getDoc(doc(db, 'clinicians', firebaseUser.uid));
        
        if (clinicianDoc.exists()) {
          const userData = clinicianDoc.data();
          
          // Create a minimal profile for legacy users
          const legacyProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            fullName: userData.full_name || '',
            officeId: 'legacy',
            role: userData.role || 'clinician',
          };
          
          console.log('✅ Legacy user profile loaded:', userData.role);
          return legacyProfile;
        } else {
          console.warn('⚠️ No user document found - new registration?');
          return null;
        }
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
      return null;
    }
  };

  // ✅ UPDATED: Auth state listener with office tracking
  useEffect(() => {
    // Try to restore session first
    const storedSession = restoreSession();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔐 Auth state changed:', firebaseUser?.email || 'logged out');
      
      if (firebaseUser) {
        setUser(firebaseUser);
        
        try {
          // Load full user profile with office info
          const profile = await loadUserProfile(firebaseUser);
          
          if (profile) {
            setUserProfile(profile);
            setRole(profile.role);
            
            // Store session securely
            await storeUserSession(firebaseUser, profile.role, profile);
          } else {
            // No profile found, try cached data
            const stored = await storedSession;
            if (stored?.profile) {
              setUserProfile(stored.profile);
              setRole(stored.role);
              console.log('📦 Using cached profile');
            } else {
              // Default values for new users
              setRole('clinician');
              console.warn('⚠️ No profile found, using defaults');
            }
          }
        } catch (error) {
          console.error('❌ Error fetching user profile:', error);
          
          // Try to load cached profile
          try {
            const cachedProfile = await getSecureData(SECURE_KEYS.USER_PROFILE);
            const cachedRole = await getSecureData(SECURE_KEYS.USER_ROLE);
            
            if (cachedProfile) {
              setUserProfile(JSON.parse(cachedProfile));
              console.log('📦 Using cached profile');
            }
            
            if (cachedRole) {
              setRole(cachedRole);
              console.log('📦 Using cached role:', cachedRole);
            } else {
              setRole('clinician'); // Default role
            }
          } catch (cacheError) {
            console.error('❌ Error loading cached profile:', cacheError);
            setRole('clinician'); // Default role
          }
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setRole(null);
        
        // Clear cached data on logout
        await clearUserSession();
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // ✅ UPDATED: Login with office profile loading
  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 Attempting login for:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      console.log('✅ Login successful');
      
      // Update sync service auth status
      console.log('🔄 Updating sync service auth status...');
      simpleFirestoreSyncService.updateAuthStatus();
      
      // Load user profile
      const profile = await loadUserProfile(userCredential.user);
      
      if (profile) {
        setUserProfile(profile);
        setRole(profile.role);
        
        // Store session securely
        await storeUserSession(userCredential.user, profile.role, profile);
        
        console.log('✅ User profile loaded:', profile.role);
      } else {
        console.warn('⚠️ User document not found, defaulting to clinician');
        setRole('clinician');
      }
      
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      throw new Error(error.message);
    }
  };
  
  // ✅ Logout with complete cleanup
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
      setUserProfile(null);
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
    <AuthContext.Provider value={{ user, userProfile, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};