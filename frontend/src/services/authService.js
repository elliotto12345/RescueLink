import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  reload,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";

export const registerUser = async (name, email, phone, password, role) => {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  const user = userCredential.user;

  await sendEmailVerification(user);

  await setDoc(doc(db, "users", user.uid), {
    id: user.uid,
    name,
    email,
    phone,
    role,
    createdAt: new Date().toISOString(),
  });

  return {
    success: true,
    user: { id: user.uid, name, email, phone, role },
    message:
      "Account created! Please check your email to verify your account before logging in.",
  };
};

export const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password,
  );
  const user = userCredential.user;

  await reload(user);

  if (!user.emailVerified) {
    await signOut(auth);
    throw {
      code: "auth/email-not-verified",
      message:
        "Please verify your email before logging in. Check your inbox for the verification link.",
    };
  }

  const userDoc = await getDoc(doc(db, "users", user.uid));
  const userData = userDoc.data();

  return { success: true, user: userData };
};

export const resetPassword = async (email) => {
  await sendPasswordResetEmail(auth, email);
  return { success: true };
};

export const resendVerificationEmail = async () => {
  const user = auth.currentUser;
  if (user) {
    await sendEmailVerification(user);
    return { success: true };
  }
  throw new Error("No user found");
};

export const logoutUser = async () => {
  await signOut(auth);
  return { success: true };
};

export const getCurrentUser = () => auth.currentUser;

export const fetchUserProfile = async (uid) => {
  const userDoc = await getDoc(doc(db, "users", uid));
  return userDoc.exists() ? userDoc.data() : null;
};
