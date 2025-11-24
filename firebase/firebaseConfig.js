// Firebase configuration
// Replace with your actual Firebase config
const firebaseConfig = {
 apiKey: "AIzaSyCIbQQoHvsnX1-YFOLP926C2vfaf8-2e38",
  authDomain: "cashtrack-e30cb.firebaseapp.com",
  projectId: "cashtrack-e30cb",
  storageBucket: "cashtrack-e30cb.firebasestorage.app",
  messagingSenderId: "1007220160837",
  appId: "1:1007220160837:web:6b599ae745967b008aa62c",
  measurementId: "G-D4DYQGRTEE"
};

export { firebaseConfig };
export default firebaseConfig;

// Initialize Firebase Auth with AsyncStorage persistence
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);
