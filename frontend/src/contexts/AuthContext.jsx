import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import { fetchUserProfile } from "../services/authService";
import { saveUser, getUser, clearSession } from "../services/storage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.emailVerified) {
        const profile = await fetchUserProfile(firebaseUser.uid);
        if (profile) {
          setUser(profile);
          await saveUser(profile, profile.id);
        }
      } else {
        const cached = await getUser();
        setUser(cached);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (profile) => {
    setUser(profile);
    await saveUser(profile, profile.id);
  };

  const signOut = async () => {
    setUser(null);
    await clearSession();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
