import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_PREFIX = "rescuelink_chat_";
const THREADS_PREFIX = "rescuelink_chat_threads_";
export const MAX_CACHED_MESSAGES = 100;

function cacheKey(requestId) {
  return `${CACHE_PREFIX}${requestId}`;
}

function threadsListKey(userId) {
  return `${THREADS_PREFIX}${userId}`;
}

export async function getAllCachedRequestIds() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return keys
      .filter((key) => key.startsWith(CACHE_PREFIX))
      .map((key) => key.slice(CACHE_PREFIX.length));
  } catch {
    return [];
  }
}

export async function getCachedThreadList(userId) {
  if (!userId) return [];

  try {
    const raw = await AsyncStorage.getItem(threadsListKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Thread list cache read failed:", error.message);
    return [];
  }
}

export async function setCachedThreadList(userId, threads) {
  if (!userId) return;

  try {
    await AsyncStorage.setItem(threadsListKey(userId), JSON.stringify(threads));
  } catch (error) {
    console.warn("Thread list cache write failed:", error.message);
  }
}

export async function upsertCachedThread(userId, thread) {
  if (!userId || !thread?.conversationId) return;

  const existing = await getCachedThreadList(userId);
  const map = new Map(existing.map((entry) => [entry.conversationId, entry]));
  const prev = map.get(thread.conversationId) || {};
  map.set(thread.conversationId, {
    ...prev,
    ...thread,
    requestIds: Array.from(
      new Set([...(prev.requestIds || []), ...(thread.requestIds || [])].filter(Boolean)),
    ),
  });

  const sorted = Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.lastMessageAt || b.time || 0).getTime() -
      new Date(a.lastMessageAt || a.time || 0).getTime(),
  );
  await setCachedThreadList(userId, sorted);
}

export async function getCachedMessages(requestId) {
  if (!requestId) return [];

  try {
    const raw = await AsyncStorage.getItem(cacheKey(requestId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Chat cache read failed:", error.message);
    return [];
  }
}

export async function setCachedMessages(requestId, messages) {
  if (!requestId) return;

  try {
    const sorted = [...messages].sort(
      (a, b) =>
        new Date(a.timestamp || a.createdAt || 0).getTime() -
        new Date(b.timestamp || b.createdAt || 0).getTime(),
    );
    const trimmed = sorted.slice(-MAX_CACHED_MESSAGES);
    await AsyncStorage.setItem(cacheKey(requestId), JSON.stringify(trimmed));
  } catch (error) {
    console.warn("Chat cache write failed:", error.message);
  }
}

export async function mergeAndCacheMessages(requestId, incomingMessages) {
  if (!requestId || !incomingMessages?.length) return;

  const existing = await getCachedMessages(requestId);
  const map = new Map(existing.map((msg) => [msg.id, msg]));
  incomingMessages.forEach((msg) => {
    if (msg?.id) map.set(msg.id, msg);
  });
  await setCachedMessages(requestId, Array.from(map.values()));
}

export async function appendCachedMessage(requestId, message) {
  if (!requestId || !message?.id) return;
  await mergeAndCacheMessages(requestId, [message]);
}

export async function getCachedMessagesForRequests(requestIds = []) {
  const uniqueIds = Array.from(new Set(requestIds.filter(Boolean)));
  const chunks = await Promise.all(uniqueIds.map((id) => getCachedMessages(id)));
  return chunks.flat();
}

export async function updateCachedMessageReadState(requestId, messageIds, isRead = true) {
  if (!requestId || !messageIds?.length) return;

  const cached = await getCachedMessages(requestId);
  const idSet = new Set(messageIds);
  const updated = cached.map((msg) =>
    idSet.has(msg.id) ? { ...msg, isRead, readAt: isRead ? new Date().toISOString() : null } : msg,
  );
  await setCachedMessages(requestId, updated);
}
