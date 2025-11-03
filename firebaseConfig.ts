// firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyC9SoLgaPlSfqexjujaYD9eDifpQuDUWxg",
  authDomain: "dentalmissionapp.firebaseapp.com",
  projectId: "dentalmissionapp",
  storageBucket: "dentalmissionapp.appspot.com",
  messagingSenderId: "983357842520",
  appId: "1:983357842520:ios:210d20911ffb13337bd62d"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
