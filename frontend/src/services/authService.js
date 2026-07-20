import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  reload,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import api from "./api";
import { requestOtp, formatApiError } from "./otpService";

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export const registerUser = async (name, email, phone, password, role) => {
  const normalizedEmail = normalizeEmail(email);

  const userCredential = await createUserWithEmailAndPassword(
    auth,
    normalizedEmail,
    password,
  );
  const user = userCredential.user;
  console.log("Firebase UID:", user.uid); // Add this

  await setDoc(doc(db, "users", user.uid), {
    id: user.uid,
    name,
    email: normalizedEmail,
    phone,
    role,
    emailVerified: false,
    createdAt: new Date().toISOString(),
  });

  try {
    console.log("Sending OTP to:", normalizedEmail, "UID:", user.uid); // Add this
    const otpResult = await requestOtp(normalizedEmail, "register", user.uid);
    return {
      success: true,
      otpSent: otpResult.emailed,
      devOtp: otpResult.devOtp,
      user: {
        id: user.uid,
        name,
        email: normalizedEmail,
        phone,
        role,
      },
      message: "Account created. Check your email for the verification code.",
    };
  } catch (error) {
    console.log("OTP error:", error.message); // Add this
    const otpError = formatApiError(error);
    const wrapped = new Error(
      `Account created, but we could not send the verification email. ${otpError}`,
    );
    wrapped.code = "otp/send-failed";
    wrapped.uid = user.uid;
    wrapped.email = normalizedEmail;
    throw wrapped;
  }
};
export const markEmailVerified = async (uid) => {
  await updateDoc(doc(db, "users", uid), { emailVerified: true });
};

export const loginUser = async (email, password) => {
  const normalizedEmail = normalizeEmail(email);

  const userCredential = await signInWithEmailAndPassword(
    auth,
    normalizedEmail,
    password,
  );
  const user = userCredential.user;

  await reload(user);

  const userDoc = await getDoc(doc(db, "users", user.uid));
  const userData = userDoc.data();

  const isVerified = userData?.emailVerified || user.emailVerified;

  if (!isVerified) {
    throw {
      code: "auth/email-not-verified",
      message:
        "Please verify your email before logging in. We can send you a new code.",
      email: normalizedEmail,
      uid: user.uid,
    };
  }

  return { success: true, user: userData };
};

export const sendPasswordResetOTP = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  const otpResult = await requestOtp(normalizedEmail, "reset");
  return {
    success: true,
    emailed: otpResult.emailed,
    devOtp: otpResult.devOtp,
  };
};

export const resetPasswordWithOTP = async (email, otp, newPassword) => {
  const response = await api.post(
    "/api/otp/reset-password",
    {
      email: normalizeEmail(email),
      otp: String(otp).trim(),
      newPassword,
    },
    { timeout: 20000 },
  );
  return response.data;
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
