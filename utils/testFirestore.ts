// utils/testFirestore.ts
import { db, auth } from '../firebaseConfig';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

export const testFirestoreConnection = async () => {
  try {
    console.log('🧪 Testing Firestore connection...');
    console.log('🔐 Current user:', auth.currentUser?.email);
    console.log('🔐 User ID:', auth.currentUser?.uid);
    
    if (!auth.currentUser) {
      console.log('❌ No authenticated user');
      return false;
    }

    // Test 1: Try to write a simple document
    const testDocRef = doc(db, 'test', 'connection-test');
    
    console.log('📝 Attempting to write test document...');
    await setDoc(testDocRef, {
      message: 'Hello from mobile app',
      timestamp: serverTimestamp(),
      userId: auth.currentUser.uid,
      userEmail: auth.currentUser.email,
      testTime: new Date().toISOString()
    });
    
    console.log('✅ Write successful!');
    
    // Test 2: Try to read the document back
    console.log('📖 Attempting to read test document...');
    const docSnap = await getDoc(testDocRef);
    
    if (docSnap.exists()) {
      console.log('✅ Read successful!', docSnap.data());
      return true;
    } else {
      console.log('❌ Document not found after write');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Firestore test failed:', error);
    
    if (error instanceof Error) {
      console.log('🔍 Detailed error:', {
        name: error.name,
        message: error.message,
        code: (error as any).code,
        stack: error.stack?.split('\n')[0] // First line of stack trace
      });
    }
    
    return false;
  }
};