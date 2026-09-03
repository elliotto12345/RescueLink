import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Appearance,
  StatusBar,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { connectSocket, getSocket } from "../../services/socket";
import {
  sendChatMessage,
  loadCachedMessagesOnly,
  syncRemoteMessages,
  persistIncomingMessage,
  fetchOlderConversationMessages,
  markThreadAsRead,
  emitTyping,
  buildThreadsFromRequests,
  filterThreads,
  mapThreadToListItem,
  ensureChatThread,
  buildConversationId,
  buildInvertedMessageItems,
  mergeConversationMessages,
  normalizeMessage,
  INITIAL_MESSAGE_LIMIT,
  MESSAGE_PAGE_SIZE,
} from "../../services/chatService";
import {
  fetchMechanicServiceRequests,
  fetchDriverServiceRequests,
  getActiveServiceRequest,
} from "../../services/requestService";
import { getUser } from "../../services/storage";
import { ROLES } from "../../constants/roles";
import { colors, radius } from "../../constants/theme";

const TYPING_DEBOUNCE_MS = 1200;

function ReadReceipt({ message }) {
  if (message.isRead || message.readAt) {
    return <Text style={styles.readReceipt}>✓✓</Text>;
  }
  return <Text style={styles.readReceipt}>✓</Text>;
}

function DateSeparator({ label }) {
  return (
    <View style={styles.dateSeparatorWrap}>
      <View style={styles.dateSeparator}>
        <Text style={styles.dateSeparatorText}>{label}</Text>
      </View>
    </View>
  );
}

function ChatThread({
  conversationId,
  requestId,
  requestIds = [],
  otherParty,
  currentUser,
  threadMeta,
  onBack,
}) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [syncingRemote, setSyncingRemote] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [otherTyping, setOtherTyping] = useState(false);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const loadingOlderRef = useRef(false);
  const hasMoreRef = useRef(true);

  const resolvedRequestIds = useMemo(
    () => (requestIds.length ? requestIds : requestId ? [requestId] : []),
    [requestIds, requestId],
  );

  const listItems = useMemo(
    () => buildInvertedMessageItems(messages),
    [messages],
  );

  const mergeMessages = useCallback((incoming) => {
    setMessages((prev) => mergeConversationMessages(prev, incoming));
  }, []);

  const belongsToConversation = useCallback(
    (data) => {
      if (data.conversationId) return data.conversationId === conversationId;
      if (data.requestId) return resolvedRequestIds.includes(data.requestId);
      return false;
    },
    [conversationId, resolvedRequestIds],
  );

  useEffect(() => {
    if (!conversationId || !currentUser?.id || !resolvedRequestIds.length)
      return;

    let cancelled = false;

    setHasMore(true);
    hasMoreRef.current = true;
    setMessages([]);
    setLoadingInitial(true);
    setSyncingRemote(false);
    setLoadError(null);

    ensureChatThread({
      conversationId,
      requestId,
      driverId: threadMeta?.driverId,
      mechanicId: threadMeta?.mechanicId,
      driverName: threadMeta?.driverName,
      mechanicName: threadMeta?.mechanicName,
      issue: threadMeta?.issue,
    }).catch(() => {});

    markThreadAsRead(
      conversationId,
      currentUser.id,
      otherParty?.id,
      resolvedRequestIds,
    ).catch(() => {});

    const loadMessages = async () => {
      let hadCached = false;
      try {
        const cached = await loadCachedMessagesOnly(
          resolvedRequestIds,
          INITIAL_MESSAGE_LIMIT,
        );
        if (cancelled) return;

        if (cached.length) {
          hadCached = true;
          setMessages(cached);
          setLoadingInitial(false);
          setSyncingRemote(true);
        }

        const remote = await syncRemoteMessages(
          resolvedRequestIds,
          INITIAL_MESSAGE_LIMIT,
        );
        if (cancelled) return;

        setMessages((prev) => mergeConversationMessages(prev, remote));
        setLoadingInitial(false);
        setSyncingRemote(false);

        if (
          remote.length < INITIAL_MESSAGE_LIMIT &&
          cached.length < INITIAL_MESSAGE_LIMIT
        ) {
          setHasMore(false);
          hasMoreRef.current = false;
        }
      } catch (error) {
        if (cancelled) return;
        setLoadingInitial(false);
        setSyncingRemote(false);
        if (!hadCached) {
          setLoadError(error.message || "Could not load messages");
        } else {
          setLoadError("Showing cached messages. Could not sync with server.");
        }
      }
    };

    loadMessages();

    const socket =
      getSocket() || connectSocket(currentUser.id, currentUser.role);

    const handleReceive = async (data) => {
      if (!belongsToConversation(data)) return;

      const normalized = normalizeMessage(data, data.id);
      setMessages((prev) => mergeConversationMessages(prev, [normalized]));

      try {
        await persistIncomingMessage(normalized);
      } catch (error) {
        console.warn("Could not persist incoming message:", error.message);
      }

      if (normalized.senderId !== currentUser.id) {
        markThreadAsRead(
          conversationId,
          currentUser.id,
          otherParty?.id,
          resolvedRequestIds,
        ).catch(() => {});
      }
    };

    const handleTypingStart = (data) => {
      if (
        (data.conversationId && data.conversationId !== conversationId) ||
        data.userId === currentUser.id
      ) {
        return;
      }
      if (
        !data.conversationId &&
        data.requestId &&
        !resolvedRequestIds.includes(data.requestId)
      ) {
        return;
      }
      setOtherTyping(true);
    };

    const handleTypingStop = (data) => {
      if (
        (data.conversationId && data.conversationId !== conversationId) ||
        data.userId === currentUser.id
      ) {
        return;
      }
      if (
        !data.conversationId &&
        data.requestId &&
        !resolvedRequestIds.includes(data.requestId)
      ) {
        return;
      }
      setOtherTyping(false);
    };

    const handleMessagesRead = (data) => {
      if (data.conversationId && data.conversationId !== conversationId) return;
      if (
        !data.conversationId &&
        data.requestId &&
        !resolvedRequestIds.includes(data.requestId)
      ) {
        return;
      }
      setMessages((prev) =>
        prev.map((msg) => {
          if (data.messageIds?.includes(msg.id)) {
            return { ...msg, isRead: true, readAt: data.readAt };
          }
          if (
            msg.senderId === currentUser.id &&
            !msg.isRead &&
            !msg.readAt &&
            data.readerId !== currentUser.id
          ) {
            return { ...msg, isRead: true, readAt: data.readAt };
          }
          return msg;
        }),
      );
    };

    socket.off("receiveMessage");
    socket.off("typingStart");
    socket.off("typingStop");
    socket.off("messagesRead");
    socket.on("receiveMessage", handleReceive);
    socket.on("typingStart", handleTypingStart);
    socket.on("typingStop", handleTypingStop);
    socket.on("messagesRead", handleMessagesRead);

    return () => {
      cancelled = true;
      socket.off("receiveMessage", handleReceive);
      socket.off("typingStart", handleTypingStart);
      socket.off("typingStop", handleTypingStop);
      socket.off("messagesRead", handleMessagesRead);
      if (isTypingRef.current) {
        emitTyping(
          conversationId,
          currentUser.id,
          currentUser.name,
          false,
          otherParty?.id,
        );
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [
    conversationId,
    requestId,
    resolvedRequestIds,
    currentUser?.id,
    currentUser?.role,
    currentUser?.name,
    otherParty?.id,
    threadMeta,
    mergeMessages,
    belongsToConversation,
  ]);

  const handleLoadOlder = useCallback(async () => {
    if (!hasMoreRef.current || loadingOlderRef.current || messages.length === 0)
      return;

    loadingOlderRef.current = true;
    setLoadingOlder(true);

    try {
      const oldest = [...messages].sort(
        (a, b) =>
          new Date(a.timestamp || a.createdAt || 0).getTime() -
          new Date(b.timestamp || b.createdAt || 0).getTime(),
      )[0];

      const older = await fetchOlderConversationMessages(
        conversationId,
        oldest.timestamp || oldest.createdAt,
        resolvedRequestIds,
        MESSAGE_PAGE_SIZE,
      );

      if (older.length === 0) {
        setHasMore(false);
        hasMoreRef.current = false;
      } else {
        mergeMessages(older);
        if (older.length < MESSAGE_PAGE_SIZE) {
          setHasMore(false);
          hasMoreRef.current = false;
        }
      }
    } catch (error) {
      console.error("Could not load older messages:", error);
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [conversationId, messages, mergeMessages, resolvedRequestIds]);

  const handleTypingChange = (text) => {
    setNewMessage(text);
    if (!conversationId || !currentUser?.id) return;

    if (!isTypingRef.current && text.trim()) {
      isTypingRef.current = true;
      emitTyping(
        conversationId,
        currentUser.id,
        currentUser.name,
        true,
        otherParty?.id,
      );
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        emitTyping(
          conversationId,
          currentUser.id,
          currentUser.name,
          false,
          otherParty?.id,
        );
      }
    }, TYPING_DEBOUNCE_MS);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !requestId || !conversationId || sending) return;

    if (isTypingRef.current) {
      isTypingRef.current = false;
      emitTyping(
        conversationId,
        currentUser.id,
        currentUser.name,
        false,
        otherParty?.id,
      );
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    setSending(true);
    try {
      const saved = await sendChatMessage({
        conversationId,
        requestId,
        senderId: currentUser.id,
        senderRole: currentUser.role === ROLES.PROVIDER ? "provider" : "driver",
        senderName: currentUser.name,
        receiverId: otherParty.id,
        message: newMessage.trim(),
        driverId: threadMeta?.driverId,
        mechanicId: threadMeta?.mechanicId,
        driverName: threadMeta?.driverName,
        mechanicName: threadMeta?.mechanicName,
        issue: threadMeta?.issue,
      });
      setMessages((prev) => mergeConversationMessages(prev, [saved]));
      setNewMessage("");
    } catch (error) {
      console.error("Could not send message:", error);
      setLoadError(error.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const isOwnMessage = (msg) => msg.senderId === currentUser?.id;

  const renderItem = ({ item }) => {
    if (item.type === "date") {
      return <DateSeparator label={item.label} />;
    }

    const msg = item.message;
    return (
      <View
        style={[
          styles.messageRow,
          isOwnMessage(msg) ? styles.messageRowOwn : styles.messageRowOther,
        ]}
      >
        {!isOwnMessage(msg) && (
          <View style={styles.smallAvatar}>
            <Text style={styles.smallAvatarText}>
              {otherParty.name?.charAt(0) || "?"}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isOwnMessage(msg) ? styles.ownBubble : styles.otherBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isOwnMessage(msg)
                ? styles.ownMessageText
                : styles.otherMessageText,
            ]}
          >
            {msg.text || msg.message}
          </Text>
          <View style={styles.messageMeta}>
            <Text
              style={[
                styles.messageTime,
                isOwnMessage(msg)
                  ? styles.ownMessageTime
                  : styles.otherMessageTime,
              ]}
            >
              {msg.time}
            </Text>
            {isOwnMessage(msg) && <ReadReceipt message={msg} />}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerBack}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarText}>
              {otherParty.name?.charAt(0) || "?"}
            </Text>
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.partyName} numberOfLines={1}>
              {otherParty.name}
            </Text>
            <Text style={styles.partyStatus} numberOfLines={1}>
              {otherTyping ? "typing..." : "online"}
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {loadingInitial ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingStateText}>Loading messages...</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyThread}>
            <Text style={styles.emptyThreadText}>
              {loadError ||
                "No messages yet. Say hello to start the conversation."}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={listItems}
            inverted
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadOlder}
            onEndReachedThreshold={0.2}
            maintainVisibleContentPosition={{
              minIndexForVisible: 1,
              autoscrollToTopThreshold: 20,
            }}
            ListFooterComponent={
              loadingOlder ? (
                <View style={styles.loadingOlder}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : hasMore && messages.length >= INITIAL_MESSAGE_LIMIT ? (
                <View style={styles.loadingOlder}>
                  <Text style={styles.loadOlderHint}>
                    Scroll up for older messages
                  </Text>
                </View>
              ) : null
            }
          />
        )}

        {syncingRemote && (
          <View style={styles.syncBanner}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.syncBannerText}>
              Syncing latest messages...
            </Text>
          </View>
        )}

        {loadError && messages.length > 0 && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{loadError}</Text>
          </View>
        )}

        {otherTyping && (
          <View style={styles.typingBar}>
            <Text style={styles.typingText}>
              {otherParty.name} is typing...
            </Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Message"
            placeholderTextColor={colors.textMuted}
            value={newMessage}
            onChangeText={handleTypingChange}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!newMessage.trim() || sending}
          >
            <Text style={styles.sendButtonText}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ChatList({ navigation, currentUser, role, onOpenThread }) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadThreads = useCallback(async () => {
    if (!currentUser?.id) return;

    setLoading(true);
    try {
      const isProvider = role === ROLES.PROVIDER;
      const requests = isProvider
        ? await fetchMechanicServiceRequests(currentUser.id)
        : await fetchDriverServiceRequests(currentUser.id);

      const active = !isProvider ? await getActiveServiceRequest() : null;
      const requestMap = new Map(requests.map((r) => [r.id, r]));

      if (active?.requestId && !requestMap.has(active.requestId)) {
        requestMap.set(active.requestId, {
          id: active.requestId,
          userId: currentUser.id,
          userName: currentUser.name,
          mechanicId: active.mechanic?.id,
          mechanicName: active.mechanic?.name,
          issue: active.service || active.issue,
          status: active.status,
          createdAt: active.createdAt,
          updatedAt: active.updatedAt,
        });
      }

      const built = await buildThreadsFromRequests(
        Array.from(requestMap.values()),
        currentUser.id,
        role,
      );
      setThreads(
        built.map((t) => mapThreadToListItem(t, currentUser.id, role)),
      );
    } catch {
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, currentUser?.name, role]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  const filteredThreads = useMemo(
    () => filterThreads(threads, searchQuery),
    [threads, searchQuery],
  );

  const totalUnread = useMemo(
    () => threads.reduce((sum, t) => sum + (t.unreadCount || 0), 0),
    [threads],
  );

  const subtitle =
    role === ROLES.PROVIDER
      ? "One chat per driver — history stays together"
      : "One chat per mechanic — history stays together";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.listHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.listTitleRow}>
          <Text style={styles.listTitle}>Messages</Text>
          {totalUnread > 0 && (
            <View style={styles.totalUnreadBadge}>
              <Text style={styles.totalUnreadText}>
                {totalUnread > 99 ? "99+" : totalUnread}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.listSubtitle}>{subtitle}</Text>

        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredThreads}
        keyExtractor={(item) => item.conversationId}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <Text style={styles.emptyListText}>Loading conversations...</Text>
          ) : (
            <Text style={styles.emptyListText}>
              {searchQuery.trim()
                ? "No conversations match your search."
                : role === ROLES.PROVIDER
                  ? "No service chats yet. Accept a job to start messaging."
                  : "No chats yet. Request help to connect with a mechanic."}
            </Text>
          )
        }
        renderItem={({ item: thread }) => (
          <TouchableOpacity
            style={styles.listItem}
            onPress={() =>
              onOpenThread({
                conversationId: thread.conversationId,
                requestId: thread.requestId,
                requestIds: thread.requestIds,
                otherParty: thread.otherParty,
                threadMeta: {
                  driverId:
                    role === ROLES.PROVIDER ? thread.driverId : currentUser.id,
                  mechanicId:
                    role === ROLES.PROVIDER
                      ? currentUser.id
                      : thread.mechanicId,
                  driverName:
                    role === ROLES.PROVIDER
                      ? thread.driverName
                      : currentUser.name,
                  mechanicName:
                    role === ROLES.PROVIDER
                      ? currentUser.name
                      : thread.mechanicName,
                  issue: thread.issue,
                },
              })
            }
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{thread.name.charAt(0)}</Text>
            </View>
            <View style={styles.listItemContent}>
              <View style={styles.listItemTopRow}>
                <Text style={styles.listItemName} numberOfLines={1}>
                  {thread.name}
                </Text>
                <Text style={styles.listItemTime}>{thread.time}</Text>
              </View>
              <View style={styles.listItemBottomRow}>
                <Text style={styles.listItemPreview} numberOfLines={1}>
                  {thread.subtitle}
                </Text>
                {thread.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>
                      {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

function buildThreadFromRoute(route, currentUser) {
  const routeRequestId = route.params?.requestId;
  const routeOtherParty = route.params?.otherParty;
  const routeMechanic = route.params?.mechanic;
  const routeDriver = route.params?.driver;

  if (!routeRequestId && !route.params?.conversationId) return null;
  if (!routeOtherParty && !routeMechanic && !routeDriver) return null;

  const other =
    routeOtherParty ||
    (routeMechanic
      ? {
          id: routeMechanic.id,
          name: routeMechanic.name,
          subtitle: "Your mechanic",
        }
      : { id: routeDriver?.id, name: routeDriver?.name, subtitle: "Driver" });

  const driverId =
    routeDriver?.id ||
    (currentUser?.role !== ROLES.PROVIDER ? currentUser?.id : other.id);
  const mechanicId =
    routeMechanic?.id ||
    (currentUser?.role === ROLES.PROVIDER ? currentUser?.id : other.id);

  const conversationId =
    route.params?.conversationId || buildConversationId(driverId, mechanicId);

  return {
    conversationId,
    requestId: routeRequestId,
    requestIds:
      route.params?.requestIds || (routeRequestId ? [routeRequestId] : []),
    otherParty: other,
    threadMeta: {
      driverId,
      mechanicId,
      driverName:
        routeDriver?.name ||
        (currentUser?.role !== ROLES.PROVIDER ? currentUser?.name : other.name),
      mechanicName:
        routeMechanic?.name ||
        (currentUser?.role === ROLES.PROVIDER ? currentUser?.name : other.name),
      issue: route.params?.issue || other.subtitle,
    },
  };
}

export default function ChatScreen({ navigation, route }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeThread, setActiveThread] = useState(null);

  const routeRequestId = route.params?.requestId;

  useEffect(() => {
    getUser().then((user) => {
      setCurrentUser(user);
      if (user?.id) {
        connectSocket(user.id, user.role);
      }
    });
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const thread = buildThreadFromRoute(route, currentUser);
    if (thread) setActiveThread(thread);
  }, [route, currentUser]);

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.emptyListText}>Loading chat...</Text>
      </SafeAreaView>
    );
  }

  if (activeThread) {
    return (
      <ChatThread
        conversationId={activeThread.conversationId}
        requestId={activeThread.requestId}
        requestIds={activeThread.requestIds}
        otherParty={activeThread.otherParty}
        threadMeta={activeThread.threadMeta}
        currentUser={currentUser}
        onBack={() => {
          if (routeRequestId || route.params?.conversationId) {
            navigation.goBack();
            return;
          }
          setActiveThread(null);
        }}
      />
    );
  }

  return (
    <ChatList
      navigation={navigation}
      currentUser={currentUser}
      role={currentUser.role}
      onOpenThread={setActiveThread}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  listHeader: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  listTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  listTitle: { fontSize: 22, fontWeight: "bold", color: colors.text },
  listSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 12,
  },
  totalUnreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  totalUnreadText: { color: colors.white, fontSize: 11, fontWeight: "bold" },
  searchInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.inputBg,
  },
  emptyListText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 14,
  },
  listItemContent: { flex: 1 },
  listItemTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  listItemBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  listItemName: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
    flex: 1,
  },
  listItemTime: { fontSize: 12, color: colors.primary },
  listItemPreview: { fontSize: 14, color: colors.textSecondary, flex: 1 },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: { color: colors.white, fontSize: 11, fontWeight: "bold" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 8,
  },
  headerBack: { flexShrink: 0 },
  backText: { fontSize: 16, color: colors.primary, fontWeight: "600" },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTextWrap: { flex: 1 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.white, fontSize: 16, fontWeight: "bold" },
  partyName: { fontSize: 15, fontWeight: "bold", color: colors.text },
  partyStatus: { fontSize: 12, color: colors.textSecondary },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingStateText: { fontSize: 14, color: colors.textSecondary },
  syncBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 6,
    backgroundColor: colors.primaryLight,
  },
  syncBannerText: { fontSize: 12, color: colors.textSecondary },
  errorBanner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.emergencyLight,
  },
  errorBannerText: {
    fontSize: 12,
    color: colors.emergency,
    textAlign: "center",
  },
  messagesList: { flex: 1 },
  messagesContent: { paddingHorizontal: 16, paddingVertical: 12 },
  loadingOlder: {
    alignItems: "center",
    paddingVertical: 12,
  },
  loadOlderHint: { fontSize: 12, color: colors.textMuted },
  emptyThread: {
    flex: 1,
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyThreadText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
  dateSeparatorWrap: {
    alignItems: "center",
    marginVertical: 10,
  },
  dateSeparator: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  dateSeparatorText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginVertical: 2,
  },
  messageRowOwn: { justifyContent: "flex-end" },
  messageRowOther: { justifyContent: "flex-start" },
  smallAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  smallAvatarText: { color: colors.white, fontSize: 12, fontWeight: "bold" },
  messageBubble: {
    maxWidth: "78%",
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ownBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  otherBubble: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  messageText: { fontSize: 15, lineHeight: 22 },
  ownMessageText: { color: colors.white },
  otherMessageText: { color: colors.text },
  messageMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  messageTime: { fontSize: 11 },
  ownMessageTime: { color: "#BFDBFE" },
  otherMessageTime: { color: colors.textMuted },
  readReceipt: { fontSize: 10, color: "#BFDBFE", fontWeight: "600" },
  typingBar: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: colors.background,
  },
  typingText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
    backgroundColor: colors.inputBg,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { backgroundColor: "#BFDBFE" },
  sendButtonText: { color: colors.white, fontSize: 18 },
});
