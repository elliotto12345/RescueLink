import AsyncStorage from "@react-native-async-storage/async-storage";
import { RECENT_REQUESTS } from "../data/sampleData";

const STORAGE_KEY = "serviceHistory";

export async function getServiceHistory() {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(RECENT_REQUESTS));
  return RECENT_REQUESTS;
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
