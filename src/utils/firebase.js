import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyDAMKiuZMeLDXn1pJFpSPAdBXsg83fkKEE",
  authDomain: "rescuelink-7559e.firebaseapp.com",
  projectId: "rescuelink-7559e",
  storageBucket: "rescuelink-7559e.firebasestorage.app",
  messagingSenderId: "655493101526",
  appId: "1:655493101526:web:d0f8f13c226293efec1677",
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);

export default app;
