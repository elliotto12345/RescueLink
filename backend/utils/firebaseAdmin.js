const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

function parseServiceAccount(raw) {
  if (!raw) return null;

  const trimmed = raw.trim();

  if (!trimmed.startsWith("{")) {
    try {
      const decoded = Buffer.from(trimmed, "base64").toString("utf8");
      return JSON.parse(decoded);
    } catch {
      // fall through
    }
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    try {
      return JSON.parse(trimmed.replace(/\r?\n/g, "\\n"));
    } catch (error) {
      console.error("Firebase Admin parse failed:", error.message);
      return null;
    }
  }
}

function createAdminFacade() {
  return {
    auth: () => getAuth(),
    firestore: () => getFirestore(),
  };
}

function getFirebaseAdmin() {
  if (getApps().length) {
    return createAdminFacade();
  }

  const serviceAccount = parseServiceAccount(
    process.env.FIREBASE_SERVICE_ACCOUNT,
  );
  if (!serviceAccount) {
    return null;
  }

  try {
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(
        /\\n/g,
        "\n",
      );
    }

    initializeApp({
      credential: cert(serviceAccount),
    });

    return createAdminFacade();
  } catch (error) {
    console.error("Firebase Admin init failed:", error.message);
    return null;
  }
}

module.exports = { getFirebaseAdmin };
