const express = require("express");
const router = express.Router();
const { getFirebaseAdmin } = require("../utils/firebaseAdmin");
const {
  isEmailConfigured,
  mapSmtpError,
  sendMail,
} = require("../utils/mailer");
const { buildOtpEmail, APP_NAME, SUPPORT_EMAIL } = require("../utils/otpEmail");
const {
  saveOtpRecord,
  getOtpRecord,
  deleteOtpRecord,
} = require("../utils/otpStore");

const otpStore = {};

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function storeKey(email, purpose) {
  return `${normalizeEmail(email)}:${purpose}`;
}

function isDevMode() {
  return process.env.NODE_ENV !== "production";
}

async function persistOtp(email, purpose, record) {
  otpStore[storeKey(email, purpose)] = record;
  await saveOtpRecord(email, purpose, {
    otp: record.otp,
    verified: record.verified,
    sentAt: record.sentAt,
    expiresAt: record.expiry,
    ...(record.verifiedAt ? { verifiedAt: record.verifiedAt } : {}),
  });
}

async function loadOtp(email, purpose) {
  const key = storeKey(email, purpose);
  const cached = otpStore[key];
  if (cached) return cached;

  const remote = await getOtpRecord(email, purpose);
  if (!remote) return null;

  const record = {
    otp: String(remote.otp),
    purpose: remote.purpose || purpose,
    verified: Boolean(remote.verified),
    sentAt: remote.sentAt || Date.now(),
    expiry: remote.expiresAt || Date.now(),
    verifiedAt: remote.verifiedAt,
  };

  otpStore[key] = record;
  return record;
}

async function clearOtp(email, purpose) {
  delete otpStore[storeKey(email, purpose)];
  await deleteOtpRecord(email, purpose);
}

async function assertFirebaseUserExists(email) {
  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    const error = new Error(
      "Account lookup is unavailable. Configure FIREBASE_SERVICE_ACCOUNT on the server.",
    );
    error.status = 503;
    throw error;
  }

  try {
    return await firebaseAdmin.auth().getUserByEmail(email);
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      const notFound = new Error("No account found with this email.");
      notFound.status = 404;
      throw notFound;
    }
    throw error;
  }
}

async function markRegistrationVerified(uid) {
  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin || !uid) {
    return false;
  }

  await firebaseAdmin.auth().updateUser(uid, { emailVerified: true });

  try {
    await firebaseAdmin
      .firestore()
      .collection("users")
      .doc(uid)
      .set({ emailVerified: true }, { merge: true });
  } catch (firestoreError) {
    console.error("Firestore emailVerified update failed:", firestoreError.message);
  }

  return true;
}

router.get("/status", (req, res) => {
  res.json({
    emailConfigured: isEmailConfigured(),
    firebaseAdminConfigured: Boolean(getFirebaseAdmin()),
    fromAddress: process.env.GMAIL_USER || null,
    replyToAddress: SUPPORT_EMAIL || process.env.GMAIL_USER || null,
    appName: APP_NAME,
  });
});

router.post("/send", async (req, res) => {
  try {
    const { email, purpose = "register", uid } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    if (!["register", "reset"].includes(purpose)) {
      return res.status(400).json({ error: "Invalid verification purpose." });
    }

    const normalizedEmail = normalizeEmail(email);

    if (purpose === "reset") {
      await assertFirebaseUserExists(normalizedEmail);
    } else if (getFirebaseAdmin()) {
      const userRecord = await assertFirebaseUserExists(normalizedEmail);
      if (uid && userRecord.uid !== uid) {
        return res.status(400).json({
          error: "This verification request does not match the account.",
        });
      }
    }

    const existing = await loadOtp(normalizedEmail, purpose);
    if (existing && Date.now() - existing.sentAt < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil(
        (RESEND_COOLDOWN_MS - (Date.now() - existing.sentAt)) / 1000,
      );
      return res.status(429).json({
        error: `Please wait ${waitSeconds}s before requesting a new code.`,
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const record = {
      otp,
      purpose,
      verified: false,
      sentAt: Date.now(),
      expiry: Date.now() + OTP_EXPIRY_MS,
    };

    await persistOtp(normalizedEmail, purpose, record);

    if (!isEmailConfigured()) {
      if (!isDevMode()) {
        await clearOtp(normalizedEmail, purpose);
        return res.status(503).json({
          error:
            "Email service is not configured. Set GMAIL_USER and GMAIL_PASSWORD on the server.",
        });
      }

      console.log(`[DEV OTP] ${purpose} code for ${normalizedEmail}: ${otp}`);
      return res.json({
        message: "OTP generated (development mode)",
        devOtp: otp,
      });
    }

    const { subject, html, text } = buildOtpEmail(otp, purpose);

    await sendMail({
      to: normalizedEmail,
      subject,
      html,
      text,
    });

    res.json({
      message:
        purpose === "reset"
          ? "Password reset code sent to your email."
          : "Verification code sent to your email.",
    });
  } catch (error) {
    console.error("OTP send error:", error);

    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }

    res.status(500).json({
      error: mapSmtpError(error),
    });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const { email, otp, purpose = "register", uid } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    if (!["register", "reset"].includes(purpose)) {
      return res.status(400).json({ error: "Invalid verification purpose." });
    }

    const normalizedEmail = normalizeEmail(email);
    const code = String(otp).trim();
    const stored = await loadOtp(normalizedEmail, purpose);

    if (!stored || stored.purpose !== purpose) {
      return res
        .status(400)
        .json({ error: "Code not found. Please request a new one." });
    }

    if (Date.now() > stored.expiry) {
      await clearOtp(normalizedEmail, purpose);
      return res
        .status(400)
        .json({ error: "Code has expired. Please request a new one." });
    }

    if (stored.otp !== code) {
      return res.status(400).json({ error: "Invalid code. Please try again." });
    }

    if (purpose === "register") {
      let verifiedOnServer = false;

      if (uid) {
        try {
          verifiedOnServer = await markRegistrationVerified(uid);
        } catch (adminError) {
          console.error("Registration verify admin error:", adminError);
        }
      }

      await clearOtp(normalizedEmail, purpose);

      return res.json({
        message: "Email verified successfully",
        verified: true,
        purpose,
        verifiedOnServer,
      });
    }

    stored.verified = true;
    stored.verifiedAt = Date.now();
    await persistOtp(normalizedEmail, purpose, stored);

    res.json({
      message: "Code verified successfully",
      verified: true,
      purpose,
    });
  } catch (error) {
    console.error("OTP verify error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res
        .status(400)
        .json({ error: "Email, code, and new password are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    const normalizedEmail = normalizeEmail(email);
    const code = String(otp).trim();
    const stored = await loadOtp(normalizedEmail, "reset");

    if (
      !stored ||
      stored.purpose !== "reset" ||
      !stored.verified ||
      stored.otp !== code
    ) {
      return res
        .status(400)
        .json({ error: "Invalid or expired reset code. Request a new one." });
    }

    if (Date.now() > stored.expiry) {
      await clearOtp(normalizedEmail, "reset");
      return res
        .status(400)
        .json({ error: "Reset code has expired. Please request a new one." });
    }

    const firebaseAdmin = getFirebaseAdmin();
    if (!firebaseAdmin) {
      return res.status(503).json({
        error:
          "Password reset service is not configured. Set FIREBASE_SERVICE_ACCOUNT on the server.",
      });
    }

    const userRecord = await firebaseAdmin.auth().getUserByEmail(normalizedEmail);
    await firebaseAdmin.auth().updateUser(userRecord.uid, {
      password: newPassword,
    });

    await clearOtp(normalizedEmail, "reset");

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Password reset error:", error);

    if (error.code === "auth/user-not-found") {
      return res.status(404).json({ error: "No account found for this email." });
    }

    res.status(500).json({ error: "Failed to reset password." });
  }
});

module.exports = router;
