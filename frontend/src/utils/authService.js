import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  reload,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

// Register
export const registerUser = async (name, email, phone, password, role) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    // Send verification email
    await sendEmailVerification(user);

    // Save to Firestore
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
  } catch (error) {
    throw error;
  }
};

// Login
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    // Reload user to get latest verification status
    await reload(user);

    // Check if email is verified
    if (!user.emailVerified) {
      await signOut(auth);
      throw {
        code: "auth/email-not-verified",
        message:
          "Please verify your email before logging in. Check your inbox for the verification link.",
      };
    }

    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data();

    return {
      success: true,
      user: userData,
    };
  } catch (error) {
    throw error;
  }
};

// Resend verification email
export const resendVerificationEmail = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      await sendEmailVerification(user);
      return { success: true };
    }
    throw new Error("No user found");
  } catch (error) {
    throw error;
  }
};

// Logout
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    throw error;
  }
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};
