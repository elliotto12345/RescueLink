import { Alert } from "react-native";

const shownKeys = new Set();

export function buildNotificationKey(requestId, event) {
  if (!requestId || !event) return null;
  return `${requestId}:${event}`;
}

export function clearNotificationKeysForRequest(requestId) {
  if (!requestId) return;
  const prefix = `${requestId}:`;
  for (const key of shownKeys) {
    if (key.startsWith(prefix)) {
      shownKeys.delete(key);
    }
  }
}

export function notifyRequestOnce(key, title, message, buttons) {
  if (!key || shownKeys.has(key)) return false;
  shownKeys.add(key);
  Alert.alert(title, message, buttons);
  return true;
}
