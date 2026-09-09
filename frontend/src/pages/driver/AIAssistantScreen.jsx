import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import { getUser } from "../../services/storage";
import {
  getAiConversations,
  createAiConversation,
  upsertAiConversation,
  buildConversationTitle,
} from "../../services/aiChatService";
import { colors, radius } from "../../constants/theme";

const OPENROUTER_API_KEY =
  "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";

function formatListTime(isoDate) {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function AIConversationList({ conversations, loading, onOpen, onNewChat, onBack }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.listHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.listTitle}>AI Assistant</Text>
        <TouchableOpacity onPress={onNewChat}>
          <Text style={styles.newChatText}>+ New</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.listSubtitle}>
        Your saved conversations with RescueLink AI
      </Text>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <Text style={styles.emptyListText}>
              No AI chats yet. Tap + New to start one.
            </Text>
          )
        }
        renderItem={({ item }) => {
          const lastMessage =
            item.messages?.[item.messages.length - 1]?.message || "";
          return (
            <TouchableOpacity style={styles.listItem} onPress={() => onOpen(item)}>
              <View style={styles.aiListAvatar}>
                <Text style={styles.aiListAvatarText}>🤖</Text>
              </View>
              <View style={styles.listItemContent}>
                <View style={styles.listItemTopRow}>
                  <Text style={styles.listItemName} numberOfLines={1}>
                    {item.title || "AI conversation"}
                  </Text>
                  <Text style={styles.listItemTime}>
                    {formatListTime(item.updatedAt)}
                  </Text>
                </View>
                <Text style={styles.listItemPreview} numberOfLines={2}>
                  {lastMessage}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

function AIChatThread({ conversation, userId, onBack, onConversationUpdate }) {
  const [messages, setMessages] = useState(conversation.messages || []);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef();

  useEffect(() => {
    setMessages(conversation.messages || []);
  }, [conversation.id]);

  const persistConversation = async (updatedMessages) => {
    const payload = {
      ...conversation,
      messages: updatedMessages,
      title: buildConversationTitle(updatedMessages),
      updatedAt: new Date().toISOString(),
    };
    await upsertAiConversation(userId, payload);
    onConversationUpdate(payload);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: "user",
      message: newMessage.trim(),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    const currentMessage = newMessage.trim();
    setNewMessage("");
    setLoading(true);
    await persistConversation(updatedMessages);

    const conversationHistory = updatedMessages
      .filter((m) => m.sender === "user" || m.sender === "ai")
      .map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.message,
      }));

    try {
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "openrouter/free",
          messages: [
            {
              role: "system",
              content:
                "You are RescueLink AI Assistant, an expert vehicle roadside assistant. Answer directly, warmly, and naturally like ChatGPT. If greeted, reply with a short friendly greeting. For car breakdown problems, explain likely causes clearly, give immediate safety precautions, never recommend dangerous DIY work, and reassure them that a verified mechanic is on the way. Do not output any thought processes, analysis, or scratchpad.",
            },
            ...conversationHistory,
          ],
          max_tokens: 350,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": "https://rescuelink.app",
            "X-Title": "RescueLink",
          },
          timeout: 25000,
        },
      );

      const replyText =
        response.data.choices?.[0]?.message?.content?.trim() ||
        "I'm here to help. What seems to be the issue with your vehicle?";

      const aiReply = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        message: replyText,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      const withReply = [...updatedMessages, aiReply];
      setMessages(withReply);
      await persistConversation(withReply);
    } catch (error) {
      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: "ai",
        message:
          "Error: " +
          (error.response?.data?.error?.message ||
            error.message ||
            "Unable to connect."),
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      const withError = [...updatedMessages, errorMsg];
      setMessages(withError);
      await persistConversation(withError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backText}>← Chats</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>🤖</Text>
          <View>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {conversation.title || "AI Assistant"}
            </Text>
            <Text style={styles.headerSubtitle}>RescueLink AI</Text>
          </View>
        </View>
        <View style={{ width: 50 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageRow,
                msg.sender === "user"
                  ? styles.messageRowUser
                  : styles.messageRowAI,
              ]}
            >
              {msg.sender === "ai" && (
                <View style={styles.aiAvatar}>
                  <Text style={styles.aiAvatarText}>🤖</Text>
                </View>
              )}
              <View
                style={[
                  styles.messageBubble,
                  msg.sender === "user" ? styles.userBubble : styles.aiBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    msg.sender === "user"
                      ? styles.userMessageText
                      : styles.aiMessageText,
                  ]}
                >
                  {msg.message}
                </Text>
                <Text
                  style={[
                    styles.messageTime,
                    msg.sender === "user"
                      ? styles.userMessageTime
                      : styles.aiMessageTime,
                  ]}
                >
                  {msg.time}
                </Text>
              </View>
            </View>
          ))}

          {loading && (
            <View style={styles.messageRowAI}>
              <View style={styles.aiAvatar}>
                <Text style={styles.aiAvatarText}>🤖</Text>
              </View>
              <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.loadingText}>Analysing your issue...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickPromptsContainer}
          contentContainerStyle={styles.quickPrompts}
        >
          {[
            "My car won't start 🔋",
            "Engine is overheating 🌡️",
            "Flat tyre 🛞",
            "Strange noise from engine ⚙️",
            "Check engine light is on 🚨",
          ].map((prompt, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickPrompt}
              onPress={() => setNewMessage(prompt)}
            >
              <Text style={styles.quickPromptText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Describe your vehicle issue..."
            placeholderTextColor="#9CA3AF"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || loading) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!newMessage.trim() || loading}
          >
            <Text style={styles.sendButtonText}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function AIAssistantScreen({ navigation }) {
  const [userId, setUserId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConversation, setActiveConversation] = useState(null);

  const loadConversations = useCallback(async (uid) => {
    const id = uid || userId;
    if (!id) return;
    setLoading(true);
    const stored = await getAiConversations(id);
    setConversations(stored);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    getUser().then((user) => {
      if (!user?.id) return;
      setUserId(user.id);
      loadConversations(user.id);
    });
  }, [loadConversations]);

  useFocusEffect(
    useCallback(() => {
      if (userId && !activeConversation) {
        loadConversations(userId);
      }
    }, [userId, activeConversation, loadConversations]),
  );

  const handleNewChat = async () => {
    if (!userId) return;
    const conversation = createAiConversation();
    await upsertAiConversation(userId, conversation);
    setConversations(await getAiConversations(userId));
    setActiveConversation(conversation);
  };

  const handleOpenConversation = (conversation) => {
    setActiveConversation(conversation);
  };

  const handleConversationUpdate = async (updated) => {
    setActiveConversation(updated);
    if (userId) {
      setConversations(await getAiConversations(userId));
    }
  };

  if (activeConversation && userId) {
    return (
      <AIChatThread
        conversation={activeConversation}
        userId={userId}
        onBack={() => {
          setActiveConversation(null);
          loadConversations(userId);
        }}
        onConversationUpdate={handleConversationUpdate}
      />
    );
  }

  return (
    <AIConversationList
      conversations={conversations}
      loading={loading}
      onOpen={handleOpenConversation}
      onNewChat={handleNewChat}
      onBack={() => navigation.goBack()}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  flex: { flex: 1 },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  listTitle: { fontSize: 20, fontWeight: "bold", color: "#1F2937" },
  listSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 12,
  },
  newChatText: { fontSize: 16, color: "#2563EB", fontWeight: "700" },
  centered: { paddingVertical: 40, alignItems: "center" },
  emptyListText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 14,
  },
  aiListAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  aiListAvatarText: { fontSize: 24 },
  listItemContent: { flex: 1 },
  listItemTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  listItemName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
  },
  listItemTime: { fontSize: 12, color: "#2563EB" },
  listItemPreview: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backText: { fontSize: 16, color: "#2563EB", fontWeight: "600" },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  headerEmoji: { fontSize: 32 },
  headerTitle: { fontSize: 16, fontWeight: "bold", color: "#1F2937" },
  headerSubtitle: { fontSize: 12, color: "#16A34A" },
  messagesList: { flex: 1 },
  messagesContent: { padding: 16, gap: 12 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  messageRowUser: { justifyContent: "flex-end" },
  messageRowAI: { justifyContent: "flex-start" },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  aiAvatarText: { fontSize: 18 },
  messageBubble: { maxWidth: "75%", borderRadius: 18, padding: 12 },
  userBubble: { backgroundColor: "#2563EB", borderBottomRightRadius: 4 },
  aiBubble: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  messageText: { fontSize: 15, lineHeight: 22 },
  userMessageText: { color: "#fff" },
  aiMessageText: { color: "#1F2937" },
  messageTime: { fontSize: 11, marginTop: 4 },
  userMessageTime: { color: "#BFDBFE", textAlign: "right" },
  aiMessageTime: { color: "#9CA3AF" },
  loadingBubble: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingText: { fontSize: 14, color: "#6B7280" },
  quickPromptsContainer: {
    maxHeight: 50,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  quickPrompts: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  quickPrompt: {
    backgroundColor: "#EFF6FF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  quickPromptText: { fontSize: 13, color: "#2563EB", fontWeight: "600" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1F2937",
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { backgroundColor: "#BFDBFE" },
  sendButtonText: { color: "#fff", fontSize: 18 },
});
