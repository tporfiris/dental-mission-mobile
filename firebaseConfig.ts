// firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "my-apiKey",
  authDomain: "dentalmissionapp.firebaseapp.com",
  projectId: "dentalmissionapp",
  storageBucket: "dentalmissionapp.appspot.com",
  messagingSenderId: "my-SenderID",
  appId: "my-appID"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
