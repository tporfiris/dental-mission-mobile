// firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "my-key",
  authDomain: "dentalmissionapp.firebaseapp.com",
  projectId: "dentalmissionapp",
  storageBucket: "dentalmissionapp.appspot.com",
  messagingSenderId: "my-id",
  appId: "my-id"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
