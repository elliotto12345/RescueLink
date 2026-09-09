import { initializeApp, getApps } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
} from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyDAMKiuZMeLDXn1pJFpSPAdBXsg83fkKEE",
  authDomain: "rescuelink-7559e.firebaseapp.com",
  projectId: "rescuelink-7559e",
  storageBucket: "rescuelink-7559e.firebasestorage.app",
  messagingSenderId: "655493101526",
  appId: "1:655493101526:web:d0f8f13c226293efec1677",
};

const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth =
  getApps().length === 1
    ? initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      })
    : getAuth(app);

let db;
try {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
} catch {
  db = getFirestore(app);
}
export { db };

export default app;
