import { sendOTP, verifyOTP } from "./api";

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function formatApiError(error) {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }

  if (!error.response) {
    return "Unable to reach the server. Check your connection and try again.";
  }

  return error.message || "Something went wrong. Please try again.";
}

/**
 * Request a verification code — generated and emailed by the backend only.
 */
export async function requestOtp(email, purpose = "register", uid = null) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error("Email is required");
  }

  const response = await sendOTP(normalizedEmail, purpose, uid);

  return {
    success: true,
    emailed: !response.data?.devOtp,
    devOtp: typeof __DEV__ !== "undefined" && __DEV__ ? response.data?.devOtp : null,
    message: response.data?.message || "Verification code sent to your email.",
  };
}

/**
 * Verify a code with the backend (source of truth).
 */
export async function confirmOtp(email, otp, purpose = "register", uid = null) {
  const response = await verifyOTP(
    normalizeEmail(email),
    String(otp).trim(),
    purpose,
    uid,
  );

  return {
    verified: Boolean(response.data?.verified),
    purpose: response.data?.purpose || purpose,
    verifiedOnServer: Boolean(response.data?.verifiedOnServer),
  };
}

export { formatApiError };
