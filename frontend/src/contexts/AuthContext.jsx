import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import { fetchUserProfile } from "../services/authService";
import {
  markMechanicOnline,
  markMechanicOffline,
} from "../services/mechanicPresence";
import { saveUser, getUser, clearSession } from "../services/storage";
import { ROLES } from "../constants/roles";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await fetchUserProfile(firebaseUser.uid);
        const isVerified = profile?.emailVerified || firebaseUser.emailVerified;
        if (isVerified && profile) {
          setUser(profile);
          await saveUser(profile, profile.id);
        } else {
          setUser(null);
        }
      } else {
        const cached = await getUser();
        setUser(cached);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user?.id || user.role !== ROLES.PROVIDER) {
      return;
    }

    const userId = user.id;
    markMechanicOnline(userId);

    const heartbeat = setInterval(() => {
      markMechanicOnline(userId);
    }, 60000);

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") {
        markMechanicOffline(userId);
      } else if (state === "active") {
        markMechanicOnline(userId);
      }
    });

    return () => {
      clearInterval(heartbeat);
      appStateSub.remove();
    };
  }, [user?.id, user?.role]);

  const signIn = async (profile) => {
    setUser(profile);
    await saveUser(profile, profile.id);
    if (profile.role === ROLES.PROVIDER) {
      await markMechanicOnline(profile.id);
    }
  };

  const signOut = async () => {
    if (user?.role === ROLES.PROVIDER && user?.id) {
      await markMechanicOffline(user.id);
    }
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
