import { Alert } from "react-native";

const shownKeys = new Set();
let activeConversationId = null;

export function setActiveChatConversationId(conversationId) {
  activeConversationId = conversationId || null;
}

export function getActiveChatConversationId() {
  return activeConversationId;
}

export function buildChatNotificationKey(messageId, conversationId) {
  if (messageId) return `chat:${messageId}`;
  if (conversationId) return `chat:conv:${conversationId}:${Date.now()}`;
  return null;
}

export function notifyChatOnce(key, title, message, buttons) {
  if (!key || shownKeys.has(key)) return false;
  shownKeys.add(key);
  Alert.alert(title, message, buttons);
  return true;
}
