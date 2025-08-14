// utils/debugFirebase.ts
import { db, auth } from '../firebaseConfig';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

export const debugFirebaseConfig = () => {
  console.log('🔧 Firebase Configuration Debug');
  console.log('================================');
  
  // Check authentication
  console.log('🔐 Auth Status:');
  console.log('  - Current User:', auth.currentUser?.email || 'None');
  console.log('  - User ID:', auth.currentUser?.uid || 'None');
  console.log('  - Auth Domain:', auth.app.options.authDomain);
  console.log('  - Project ID:', auth.app.options.projectId);
  
  // Check Firestore
  console.log('📄 Firestore Status:');
  console.log('  - App Name:', db.app.name);
  console.log('  - Project ID:', db.app.options.projectId);
  console.log('  - Database ID:', (db as any)._delegate?._databaseId?.database || 'default');
  
  // Check if using emulator
  const firestoreSettings = (db as any)._delegate?._settings;
  if (firestoreSettings?.host?.includes('localhost') || firestoreSettings?.host?.includes('127.0.0.1')) {
    console.log('  - Using Emulator:', firestoreSettings.host);
  } else {
    console.log('  - Using Production Firestore');
  }
  
  console.log('================================');
};