import AsyncStorage from "@react-native-async-storage/async-storage";

const conversationsKey = (userId) => `cache:aiConversations:${userId}`;

function welcomeMessage() {
  return {
    id: "ai-welcome",
    sender: "ai",
    message:
      "Hi! I am your RescueLink AI Assistant 🤖\n\nDescribe your vehicle issue and I will help you understand what might be wrong and what to do while you wait for your mechanic.",
    time: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

export async function getAiConversations(userId) {
  if (!userId) return [];
  try {
    const raw = await AsyncStorage.getItem(conversationsKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveAiConversations(userId, conversations) {
  if (!userId) return;
  await AsyncStorage.setItem(
    conversationsKey(userId),
    JSON.stringify(conversations || []),
  );
}

export function buildConversationTitle(messages) {
  const firstUser = messages.find((m) => m.sender === "user");
  if (!firstUser?.message) return "New conversation";
  const text = firstUser.message.trim();
  return text.length > 42 ? `${text.slice(0, 42)}…` : text;
}

export function createAiConversation() {
  const now = new Date().toISOString();
  return {
    id: `ai-${Date.now()}`,
    title: "New conversation",
    updatedAt: now,
    messages: [welcomeMessage()],
  };
}

export async function upsertAiConversation(userId, conversation) {
  const all = await getAiConversations(userId);
  const map = new Map(all.map((entry) => [entry.id, entry]));
  map.set(conversation.id, conversation);
  const sorted = Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.updatedAt || 0).getTime() -
      new Date(a.updatedAt || 0).getTime(),
  );
  await saveAiConversations(userId, sorted);
  return sorted;
}

export async function getAiConversation(userId, conversationId) {
  const all = await getAiConversations(userId);
  return all.find((entry) => entry.id === conversationId) || null;
}
