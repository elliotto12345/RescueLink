import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/config";
import {
  sendMessage as emitChatMessage,
  emitMessagesRead,
  emitTypingStart,
  emitTypingStop,
} from "./socket";
import {
  appendCachedMessage,
  getCachedMessagesForRequests,
  mergeAndCacheMessages,
  setCachedMessages,
  updateCachedMessageReadState,
} from "./chatCacheService";

const LEGACY_MESSAGES_COLLECTION = "chatMessages";
const THREADS_COLLECTION = "chatThreads";
const CHATS_COLLECTION = "chats";

export const INITIAL_MESSAGE_LIMIT = 15;
export const MESSAGE_PAGE_SIZE = 15;

function formatMessageTime(isoDate) {
  return new Date(isoDate || Date.now()).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatListTime(isoDate) {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return formatMessageTime(isoDate);
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function normalizeMessage(raw, docId) {
  const text = (raw.text ?? raw.message ?? "").trim();
  const timestamp = raw.timestamp ?? raw.createdAt ?? new Date().toISOString();
  const isRead = raw.isRead ?? Boolean(raw.readAt);

  return {
    id: docId || raw.id,
    senderId: raw.senderId || "",
    receiverId: raw.receiverId ?? raw.recipientId ?? "",
    text,
    message: text,
    timestamp,
    createdAt: timestamp,
    requestId: raw.requestId || "",
    isRead,
    readAt: isRead ? raw.readAt || timestamp : null,
    time: formatMessageTime(timestamp),
    conversationId: raw.conversationId,
    senderName: raw.senderName,
    senderRole: raw.senderRole,
    driverId: raw.driverId,
    mechanicId: raw.mechanicId,
  };
}

function sortMessages(messages) {
  return [...messages].sort(
    (a, b) =>
      new Date(a.timestamp || a.createdAt || 0).getTime() -
      new Date(b.timestamp || b.createdAt || 0).getTime(),
  );
}

export function getMessageListKey(message) {
  if (!message?.id) {
    return `tmp-${message?.timestamp || message?.createdAt || Date.now()}`;
  }
  return message.requestId ? `${message.requestId}:${message.id}` : message.id;
}

function dedupeMessages(messages) {
  const map = new Map();
  messages.forEach((msg) => {
    const normalized = normalizeMessage(msg, msg.id);
    const key = getMessageListKey(normalized);
    if (key) map.set(key, normalized);
  });
  return sortMessages(Array.from(map.values()));
}

function messagesCollection(requestId) {
  return collection(db, CHATS_COLLECTION, requestId, "messages");
}

function mapFirestoreDoc(docSnap) {
  return normalizeMessage(docSnap.data(), docSnap.id);
}

async function ensureChatDocument(requestId, meta = {}) {
  if (!requestId) return;
  const chatRef = doc(db, CHATS_COLLECTION, requestId);
  const existing = await getDoc(chatRef);
  if (existing.exists()) return;

  await setDoc(chatRef, {
    requestId,
    driverId: meta.driverId || "",
    mechanicId: meta.mechanicId || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

async function fetchMessagesFromNewStructure(requestIds = [], messageLimit) {
  const uniqueRequestIds = Array.from(new Set(requestIds.filter(Boolean)));
  if (!uniqueRequestIds.length) return [];

  const allMessages = [];
  for (const requestId of uniqueRequestIds) {
    try {
      const messagesQuery = query(
        messagesCollection(requestId),
        orderBy("timestamp", "desc"),
        limit(messageLimit || INITIAL_MESSAGE_LIMIT),
      );
      const snapshot = await getDocs(messagesQuery);
      allMessages.push(...snapshot.docs.map(mapFirestoreDoc));
    } catch (error) {
      console.warn(`Firestore chat fetch failed for ${requestId}:`, error.message);
    }
  }
  return dedupeMessages(allMessages);
}

async function fetchLegacyMessages(requestIds = []) {
  if (!requestIds.length) return [];

  const chunks = [];
  for (let i = 0; i < requestIds.length; i += 10) {
    const slice = requestIds.slice(i, i + 10);
    const snapshot = await getDocs(
      query(
        collection(db, LEGACY_MESSAGES_COLLECTION),
        where("requestId", "in", slice),
      ),
    );
    chunks.push(...snapshot.docs.map(mapFirestoreDoc));
  }
  return dedupeMessages(chunks);
}

async function fetchRemoteMessages(requestIds = [], messageLimit = INITIAL_MESSAGE_LIMIT) {
  const fromNew = await fetchMessagesFromNewStructure(requestIds, messageLimit);
  if (fromNew.length > 0) {
    return fromNew.slice(-messageLimit);
  }
  const legacy = await fetchLegacyMessages(requestIds);
  return legacy.slice(-messageLimit);
}

async function cacheMessagesByRequest(messages) {
  const byRequest = new Map();
  messages.forEach((msg) => {
    if (!msg.requestId) return;
    if (!byRequest.has(msg.requestId)) byRequest.set(msg.requestId, []);
    byRequest.get(msg.requestId).push(msg);
  });

  await Promise.all(
    Array.from(byRequest.entries()).map(([requestId, msgs]) =>
      mergeAndCacheMessages(requestId, msgs),
    ),
  );
}

/**
 * Load cached messages only (instant, offline-friendly).
 */
export async function loadCachedMessagesOnly(requestIds = [], messageLimit = INITIAL_MESSAGE_LIMIT) {
  const cached = dedupeMessages(await getCachedMessagesForRequests(requestIds));
  return cached.slice(-messageLimit);
}

/**
 * Hybrid load: AsyncStorage first, then Firestore, then refresh cache.
 */
export async function loadHybridMessages(requestIds = [], messageLimit = INITIAL_MESSAGE_LIMIT) {
  if (!requestIds.length) {
    return { messages: [], source: "empty", error: null };
  }

  let cached = dedupeMessages(await getCachedMessagesForRequests(requestIds));
  let source = cached.length ? "cache" : "remote";
  let error = null;

  try {
    const remote = await fetchRemoteMessages(requestIds, messageLimit);
    const merged = dedupeMessages([...cached, ...remote]);
    await cacheMessagesByRequest(merged);
    cached = merged.slice(-messageLimit);
    source = remote.length ? (source === "cache" ? "hybrid" : "remote") : source;
  } catch (err) {
    error = err.message || "Could not fetch messages from server";
    console.warn("Hybrid remote load failed:", error);
    if (!cached.length) throw err;
    cached = cached.slice(-messageLimit);
  }

  return { messages: cached, source, error };
}

/**
 * Fetch latest from Firestore and refresh AsyncStorage cache.
 */
export async function syncRemoteMessages(requestIds = [], messageLimit = INITIAL_MESSAGE_LIMIT) {
  const remote = await fetchRemoteMessages(requestIds, messageLimit);
  await cacheMessagesByRequest(remote);
  return remote;
}

export async function fetchOlderConversationMessages(
  _conversationId,
  beforeTimestamp,
  requestIds = [],
  pageSize = MESSAGE_PAGE_SIZE,
) {
  if (!requestIds.length || !beforeTimestamp) return [];

  const olderMessages = [];

  for (const requestId of requestIds) {
    try {
      const olderQuery = query(
        messagesCollection(requestId),
        orderBy("timestamp", "desc"),
        startAfter(beforeTimestamp),
        limit(pageSize),
      );
      const snapshot = await getDocs(olderQuery);
      olderMessages.push(...snapshot.docs.map(mapFirestoreDoc));
    } catch (error) {
      console.warn(`Older messages fetch failed for ${requestId}:`, error.message);
    }
  }

  if (olderMessages.length) {
    const sorted = dedupeMessages(olderMessages).slice(0, pageSize);
    await cacheMessagesByRequest(sorted);
    return sorted;
  }

  const cutoff = new Date(beforeTimestamp).getTime();
  const legacy = await fetchLegacyMessages(requestIds);
  const filtered = legacy
    .filter((msg) => new Date(msg.timestamp || 0).getTime() < cutoff)
    .slice(-pageSize);
  await cacheMessagesByRequest(filtered);
  return filtered;
}

export async function saveMessageToFirestore(message, meta = {}) {
  const { requestId } = message;
  if (!requestId) throw new Error("requestId is required to save a message");

  await ensureChatDocument(requestId, meta);

  const payload = {
    senderId: message.senderId,
    receiverId: message.receiverId,
    text: message.text,
    timestamp: message.timestamp,
    requestId: message.requestId,
    isRead: message.isRead ?? false,
    conversationId: message.conversationId || "",
    senderName: message.senderName || "",
    senderRole: message.senderRole || "",
  };

  let saved;
  if (message.id) {
    const messageRef = doc(db, CHATS_COLLECTION, requestId, "messages", message.id);
    await setDoc(messageRef, payload, { merge: true });
    saved = normalizeMessage(payload, message.id);
  } else {
    const docRef = await addDoc(messagesCollection(requestId), payload);
    saved = normalizeMessage(payload, docRef.id);
  }

  await appendCachedMessage(requestId, saved);
  await updateDoc(doc(db, CHATS_COLLECTION, requestId), {
    updatedAt: new Date().toISOString(),
    lastMessage: saved.text,
    lastMessageAt: saved.timestamp,
  });

  return saved;
}

/**
 * Socket receive path: show instantly, persist to Firestore + cache.
 */
export async function persistIncomingMessage(socketPayload) {
  const normalized = normalizeMessage(socketPayload, socketPayload.id);
  if (!normalized.requestId || !normalized.id) {
    throw new Error("Incoming message must include requestId and id");
  }

  try {
    return await saveMessageToFirestore(normalized);
  } catch (error) {
    await appendCachedMessage(normalized.requestId, normalized);
    throw error;
  }
}

export function buildConversationId(driverId, mechanicId) {
  if (!driverId || !mechanicId) return null;
  return [String(driverId), String(mechanicId)].sort().join("_");
}

export function formatDateSeparator(isoDate) {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === now.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 6);
  if (date >= weekAgo) {
    return date.toLocaleDateString([], { weekday: "long" });
  }

  return date.toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function buildInvertedMessageItems(messages) {
  const sorted = sortMessages(messages);
  const items = [];

  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const msg = sorted[i];
    const newerMsg = sorted[i + 1];
    items.push({ type: "message", id: getMessageListKey(msg), message: msg });

    const dateKey = new Date(msg.timestamp || msg.createdAt || 0).toDateString();
    const newerDateKey = newerMsg
      ? new Date(newerMsg.timestamp || newerMsg.createdAt || 0).toDateString()
      : null;

    if (dateKey !== newerDateKey) {
      items.push({
        type: "date",
        id: `date-${dateKey}-${i}`,
        label: formatDateSeparator(msg.timestamp || msg.createdAt),
      });
    }
  }

  return items;
}

export async function ensureChatThread({
  conversationId,
  requestId,
  driverId,
  mechanicId,
  driverName,
  mechanicName,
  issue,
}) {
  const threadId = conversationId || requestId;
  if (!threadId) return null;

  const resolvedConversationId =
    conversationId || buildConversationId(driverId, mechanicId);

  const threadRef = doc(db, THREADS_COLLECTION, threadId);
  const existing = await getDoc(threadRef);

  if (existing.exists()) {
    const data = existing.data();
    if (requestId && data.activeRequestId !== requestId) {
      await updateDoc(threadRef, {
        activeRequestId: requestId,
        issue: issue || data.issue,
        updatedAt: new Date().toISOString(),
      });
    }
    return { id: threadId, ...data, conversationId: resolvedConversationId };
  }

  const payload = {
    conversationId: resolvedConversationId,
    activeRequestId: requestId || "",
    driverId: driverId || "",
    mechanicId: mechanicId || "",
    driverName: driverName || "Driver",
    mechanicName: mechanicName || "Mechanic",
    issue: issue || "Service request",
    lastMessage: "",
    lastMessageAt: new Date().toISOString(),
    lastSenderId: "",
    unreadCount: {},
    lastReadAt: {},
    createdAt: new Date().toISOString(),
  };

  await setDoc(threadRef, payload);
  return payload;
}

async function updateThreadOnMessage({
  conversationId,
  requestId,
  senderId,
  text,
  receiverId,
  driverId,
  mechanicId,
  driverName,
  mechanicName,
  issue,
}) {
  await ensureChatThread({
    conversationId,
    requestId,
    driverId,
    mechanicId,
    driverName,
    mechanicName,
    issue,
  });

  const threadRef = doc(db, THREADS_COLLECTION, conversationId);
  const threadSnap = await getDoc(threadRef);
  const thread = threadSnap.exists() ? threadSnap.data() : {};
  const unreadCount = { ...(thread.unreadCount || {}) };

  if (receiverId) {
    unreadCount[receiverId] = (unreadCount[receiverId] || 0) + 1;
  }

  await updateDoc(threadRef, {
    activeRequestId: requestId || thread.activeRequestId || "",
    lastMessage: text,
    lastMessageAt: new Date().toISOString(),
    lastSenderId: senderId,
    unreadCount,
    updatedAt: new Date().toISOString(),
  });
}

export async function sendChatMessage({
  conversationId,
  requestId,
  senderId,
  senderRole,
  senderName,
  recipientId,
  receiverId,
  message,
  driverId,
  mechanicId,
  driverName,
  mechanicName,
  issue,
}) {
  const resolvedConversationId =
    conversationId || buildConversationId(driverId, mechanicId);
  const resolvedReceiverId = receiverId || recipientId || "";
  const text = message?.trim();

  if (!requestId || !senderId || !text) {
    throw new Error("requestId, sender, and message text are required");
  }

  const timestamp = new Date().toISOString();
  const draft = normalizeMessage({
    senderId,
    receiverId: resolvedReceiverId,
    text,
    timestamp,
    requestId,
    isRead: false,
    conversationId: resolvedConversationId,
    senderName,
    senderRole,
    driverId,
    mechanicId,
  });

  const saved = await saveMessageToFirestore(draft, { driverId, mechanicId });

  if (resolvedConversationId) {
    await updateThreadOnMessage({
      conversationId: resolvedConversationId,
      requestId,
      senderId,
      text,
      receiverId: resolvedReceiverId,
      driverId,
      mechanicId,
      driverName,
      mechanicName,
      issue,
    });
  }

  const socketPayload = {
    ...saved,
    recipientId: resolvedReceiverId,
    message: saved.text,
    mechanicId,
    userId: driverId,
    senderRole,
  };

  emitChatMessage(socketPayload);
  return saved;
}

export function groupRequestsIntoConversations(requests, currentUserId, role) {
  const isProvider = role === "provider";
  const grouped = new Map();

  requests.forEach((request) => {
    const driverId = request.userId;
    const mechanicId = request.mechanicId;
    if (!driverId || !mechanicId) return;

    const conversationId = buildConversationId(driverId, mechanicId);
    const otherParty = isProvider
      ? { id: driverId, name: request.userName || "Driver", subtitle: "Driver" }
      : { id: mechanicId, name: request.mechanicName || "Mechanic", subtitle: "Mechanic" };

    const existing = grouped.get(conversationId);
    const requestUpdated = new Date(request.updatedAt || request.createdAt || 0).getTime();

    if (!existing) {
      grouped.set(conversationId, {
        conversationId,
        driverId,
        mechanicId,
        driverName: request.userName || "Driver",
        mechanicName: request.mechanicName || "Mechanic",
        activeRequestId: request.id,
        issue: request.issue || "Service request",
        lastMessageAt: request.updatedAt || request.createdAt,
        requestIds: [request.id],
        otherParty,
        status: request.status,
        unreadCount: 0,
      });
      return;
    }

    if (!existing.requestIds.includes(request.id)) {
      existing.requestIds.push(request.id);
    }
    if (requestUpdated >= new Date(existing.lastMessageAt || 0).getTime()) {
      existing.activeRequestId = request.id;
      existing.issue = request.issue || existing.issue;
      existing.status = request.status;
      existing.lastMessageAt = request.updatedAt || request.createdAt;
    }
  });

  return Array.from(grouped.values());
}

export async function buildThreadsFromRequests(requests, currentUserId, role) {
  const conversations = groupRequestsIntoConversations(requests, currentUserId, role);

  const threads = await Promise.all(
    conversations.map(async (conversation) => {
      const threadRef = doc(db, THREADS_COLLECTION, conversation.conversationId);
      const threadSnap = await getDoc(threadRef);
      const thread = threadSnap.exists() ? threadSnap.data() : null;

      return {
        ...conversation,
        lastMessage: thread?.lastMessage || conversation.issue || "Start a conversation",
        lastMessageAt: thread?.lastMessageAt || conversation.lastMessageAt,
        lastSenderId: thread?.lastSenderId || "",
        unreadCount: thread?.unreadCount?.[currentUserId] || 0,
        activeRequestId: thread?.activeRequestId || conversation.activeRequestId,
      };
    }),
  );

  return threads.sort(
    (a, b) =>
      new Date(b.lastMessageAt || 0).getTime() -
      new Date(a.lastMessageAt || 0).getTime(),
  );
}

export function filterThreads(threads, searchQuery) {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return threads;

  return threads.filter((thread) => {
    const haystack = [
      thread.otherParty?.name,
      thread.driverName,
      thread.mechanicName,
      thread.issue,
      thread.lastMessage,
      thread.otherParty?.subtitle,
      thread.name,
      thread.subtitle,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function mapThreadToListItem(thread, currentUserId, role) {
  const isProvider = role === "provider";
  const name = isProvider
    ? thread.driverName || thread.otherParty?.name || "Driver"
    : thread.mechanicName || thread.otherParty?.name || "Mechanic";

  return {
    conversationId: thread.conversationId,
    requestId: thread.activeRequestId,
    requestIds: thread.requestIds || [thread.activeRequestId].filter(Boolean),
    name,
    subtitle: thread.lastMessage || thread.issue || "Service chat",
    time: formatListTime(thread.lastMessageAt),
    unreadCount: thread.unreadCount?.[currentUserId] ?? thread.unreadCount ?? 0,
    otherParty: thread.otherParty || {
      id: isProvider ? thread.driverId : thread.mechanicId,
      name,
      subtitle: isProvider ? "Driver" : "Mechanic",
    },
    issue: thread.issue,
    status: thread.status,
    driverId: thread.driverId,
    mechanicId: thread.mechanicId,
    driverName: thread.driverName,
    mechanicName: thread.mechanicName,
  };
}

async function markMessagesReadInFirestore(requestIds, userId) {
  const now = new Date().toISOString();
  const messageIds = [];

  for (const requestId of requestIds) {
    try {
      const unreadQuery = query(
        messagesCollection(requestId),
        where("receiverId", "==", userId),
        where("isRead", "==", false),
      );
      const snapshot = await getDocs(unreadQuery);
      if (snapshot.empty) continue;

      const batch = writeBatch(db);
      snapshot.docs.forEach((docSnap) => {
        batch.update(docSnap.ref, { isRead: true, readAt: now });
        messageIds.push(docSnap.id);
      });
      await batch.commit();
      await updateCachedMessageReadState(requestId, messageIds, true);
    } catch (error) {
      console.warn(`Mark read failed for ${requestId}:`, error.message);
    }
  }

  return { readAt: now, messageIds };
}

export async function markThreadAsRead(conversationId, userId, otherUserId, requestIds = []) {
  if (!userId || !requestIds.length) return;

  const threadRef = conversationId ? doc(db, THREADS_COLLECTION, conversationId) : null;
  const now = new Date().toISOString();
  let notifyUserId = otherUserId;

  if (threadRef) {
    const threadSnap = await getDoc(threadRef);
    if (threadSnap.exists()) {
      const thread = threadSnap.data();
      if (!notifyUserId) {
        notifyUserId =
          userId === thread.driverId ? thread.mechanicId : thread.driverId;
      }
      await updateDoc(threadRef, {
        [`unreadCount.${userId}`]: 0,
        [`lastReadAt.${userId}`]: now,
        updatedAt: now,
      });
    }
  }

  const { readAt, messageIds } = await markMessagesReadInFirestore(requestIds, userId);

  if (messageIds.length) {
    emitMessagesRead({
      conversationId,
      readerId: userId,
      readAt,
      messageIds,
      notifyUserId,
      requestId: requestIds[0],
    });
  }
}

export function emitTyping(conversationId, userId, userName, isTyping, recipientId) {
  if (!conversationId || !userId) return;
  const payload = { conversationId, userId, userName, recipientId };
  if (isTyping) emitTypingStart(payload);
  else emitTypingStop(payload);
}

export function mergeConversationMessages(existing, incoming) {
  return dedupeMessages([...existing, ...incoming]);
}

/** @deprecated Real-time updates use Socket.IO; kept for compatibility. */
export function subscribeToRecentConversationMessages(
  _conversationId,
  onMessages,
  requestIds = [],
  messageLimit = INITIAL_MESSAGE_LIMIT,
) {
  loadHybridMessages(requestIds, messageLimit)
    .then(({ messages }) => onMessages(messages))
    .catch(() => onMessages([]));
  return () => {};
}
