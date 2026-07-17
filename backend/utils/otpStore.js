const { getFirebaseAdmin } = require("./firebaseAdmin");

const COLLECTION = "otpCodes";

function docId(email, purpose) {
  return `${email}__${purpose}`;
}

async function saveOtpRecord(email, purpose, data) {
  const admin = getFirebaseAdmin();
  if (!admin) return false;

  try {
    await admin
      .firestore()
      .collection(COLLECTION)
      .doc(docId(email, purpose))
      .set({
        email,
        purpose,
        ...data,
      });
    return true;
  } catch (error) {
    console.error("OTP Firestore save failed:", error.message);
    return false;
  }
}

async function getOtpRecord(email, purpose) {
  const admin = getFirebaseAdmin();
  if (!admin) return null;

  try {
    const snap = await admin
      .firestore()
      .collection(COLLECTION)
      .doc(docId(email, purpose))
      .get();
    return snap.exists ? snap.data() : null;
  } catch (error) {
    console.error("OTP Firestore read failed:", error.message);
    return null;
  }
}

async function deleteOtpRecord(email, purpose) {
  const admin = getFirebaseAdmin();
  if (!admin) return;

  try {
    await admin
      .firestore()
      .collection(COLLECTION)
      .doc(docId(email, purpose))
      .delete();
  } catch (error) {
    console.error("OTP Firestore delete failed:", error.message);
  }
}

module.exports = {
  saveOtpRecord,
  getOtpRecord,
  deleteOtpRecord,
};
