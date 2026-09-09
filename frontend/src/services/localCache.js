import AsyncStorage from "@react-native-async-storage/async-storage";

const LEGACY_PAYMENT_HISTORY = "cache:paymentHistory";

const KEYS = {
  driverRequests: (userId) => `cache:driverRequests:${userId}`,
  paymentHistory: (userId) => `cache:paymentHistory:${userId}`,
  completedInvoices: "cache:completedInvoices",
};

async function readJson(key, fallback = null) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function getCachedDriverRequests(userId) {
  if (!userId) return [];
  return (await readJson(KEYS.driverRequests(userId), [])) || [];
}

export async function setCachedDriverRequests(userId, requests) {
  if (!userId) return;
  await writeJson(KEYS.driverRequests(userId), requests || []);
}

export async function getCachedPaymentHistory(userId) {
  if (!userId) {
    return (await readJson(LEGACY_PAYMENT_HISTORY, [])) || [];
  }
  const scoped = (await readJson(KEYS.paymentHistory(userId), null)) ?? null;
  if (scoped !== null) return scoped;
  const legacy = (await readJson(LEGACY_PAYMENT_HISTORY, [])) || [];
  if (legacy.length) {
    await writeJson(KEYS.paymentHistory(userId), legacy);
  }
  return legacy;
}

export async function addCachedPayment(userId, entry) {
  const history = await getCachedPaymentHistory(userId);
  const updated = [
    { ...entry, cachedAt: new Date().toISOString() },
    ...history.filter((item) => item.reference !== entry.reference),
  ].slice(0, 50);
  if (userId) {
    await writeJson(KEYS.paymentHistory(userId), updated);
  } else {
    await writeJson(LEGACY_PAYMENT_HISTORY, updated);
  }
  return updated;
}

export async function saveCompletedInvoice(requestId, invoiceData) {
  if (!requestId || !invoiceData) return;
  const all = (await readJson(KEYS.completedInvoices, {})) || {};
  all[requestId] = { ...invoiceData, savedAt: new Date().toISOString() };
  await writeJson(KEYS.completedInvoices, all);
}

export async function getCompletedInvoice(requestId) {
  if (!requestId) return null;
  const all = (await readJson(KEYS.completedInvoices, {})) || {};
  return all[requestId] || null;
}
