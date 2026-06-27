import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "serviceHistory";

export async function getServiceHistory() {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return [];
}

export async function addServiceHistory(entry) {
  const history = await getServiceHistory();
  const updated = [entry, ...history];
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
