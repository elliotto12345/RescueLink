import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "serviceHistory";

function dedupeHistory(history = []) {
  const seen = new Map();
  history.forEach((entry) => {
    if (!entry?.id || seen.has(entry.id)) return;
    seen.set(entry.id, entry);
  });
  return Array.from(seen.values());
}

export async function getServiceHistory() {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored) {
    return dedupeHistory(JSON.parse(stored));
  }
  return [];
}

export async function addServiceHistory(entry) {
  const history = await getServiceHistory();
  const withoutDuplicate = history.filter((request) => request.id !== entry.id);
  const updated = dedupeHistory([entry, ...withoutDuplicate]);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export async function markServiceRated(id) {
  const history = await getServiceHistory();
  const updated = history.map((request) =>
    request.id === id ? { ...request, rated: true } : request,
  );
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
