import api from "./api";
import { getApiBaseUrl } from "../constants/apiConfig";

export function getPaymentErrorMessage(error) {
  const serverMessage = error.response?.data?.error;
  if (serverMessage) return serverMessage;

  const code = error.code;
  const isNetwork =
    code === "ERR_NETWORK" ||
    code === "ECONNABORTED" ||
    error.message === "Network Error";

  if (isNetwork) {
    return `Cannot reach the payment server at ${getApiBaseUrl()}. Use the same Wi-Fi as this computer, keep the backend running on port 5000, and retry.`;
  }

  return error.message || "Could not start Paystack checkout.";
}

export function initializePayment(payload) {
  return api.post("/api/payments/initialize", payload, { timeout: 30000 });
}

export function chargeMobileMoney(payload) {
  return api.post("/api/payments/charge-momo", payload, { timeout: 30000 });
}

export async function waitForPaystackSuccess(reference, { timeoutMs = 90000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let last = null;

  while (Date.now() < deadline) {
    const verified = await verifyPayment(reference);
    last = verified.data;
    if (last?.paid) return last;
    if (last?.status === "failed" || last?.status === "abandoned") {
      throw new Error("This Mobile Money payment was not completed.");
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  throw new Error(
    last?.displayText ||
      "Timed out waiting for Mobile Money approval. Check your phone and try again.",
  );
}

export function verifyPayment(reference) {
  return api.get(`/api/payments/verify/${encodeURIComponent(reference)}`, {
    timeout: 30000,
  });
}

export function extractPaystackReference(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return (
      parsed.searchParams.get("reference") ||
      parsed.searchParams.get("trxref") ||
      null
    );
  } catch {
    const match = String(url).match(/[?&](?:reference|trxref)=([^&]+)/i);
    return match ? decodeURIComponent(match[1]) : null;
  }
}

export function isPaystackCallbackUrl(url, callbackUrl) {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (
    lower.includes("checkout.paystack.com") ||
    lower.includes("js.paystack.co")
  ) {
    return false;
  }
  if (url.includes("cancelled=1")) return true;
  if (callbackUrl && url.startsWith(callbackUrl)) return true;
  return (
    url.includes("/paystack/callback") ||
    /[?&](?:reference|trxref)=/.test(url)
  );
}

export function isPaystackCancelledUrl(url) {
  return Boolean(url && url.includes("cancelled=1"));
}
