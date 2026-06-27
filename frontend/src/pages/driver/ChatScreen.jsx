import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { connectSocket, sendMessage } from "../../services/socket";
import { getUser } from "../../services/storage";
import { getMechanics } from "../../services/api";

function MechanicChatList({ navigation, onSelectMechanic }) {
  const [mechanics, setMechanics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMechanics()
      .then((response) => {
        const list = response.data?.mechanics || response.data || [];
        setMechanics(Array.isArray(list) ? list : []);
      })
      .catch(() => setMechanics([]))
      .finally(() => setLoading(false));
  }, []);
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.listHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.listHeaderCenter}>
          <Text style={styles.listTitle}>Messages 💬</Text>
          <Text style={styles.listSubtitle}>
            Choose a mechanic to start chatting
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {loading ? (
          <Text style={styles.emptyListText}>Loading conversations...</Text>
        ) : mechanics.length === 0 ? (
          <Text style={styles.emptyListText}>
            No conversations yet. Request help to connect with a mechanic.
          </Text>
        ) : (
          mechanics.map((mechanic) => (
          <TouchableOpacity
            key={mechanic.id}
            style={styles.listItem}
            onPress={() => onSelectMechanic(mechanic)}
          >
            <View style={styles.mechanicAvatar}>
              <Text style={styles.mechanicAvatarText}>
                {mechanic.name.charAt(0)}
              </Text>
            </View>
            <View style={styles.listItemContent}>
              <View style={styles.listItemTop}>
                <Text style={styles.listItemName} numberOfLines={1}>
                  {mechanic.name}
                </Text>
                <Text style={styles.listItemTime}>
                  {mechanic.lastMessageTime || ""}
                </Text>
              </View>
              <View style={styles.listItemBottom}>
                <Text style={styles.listItemPreview} numberOfLines={1}>
                  {mechanic.lastMessage || "No messages yet"}
                </Text>
                {(mechanic.unread ?? 0) > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{mechanic.unread}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.listItemMeta} numberOfLines={1}>
                ⭐ {mechanic.rating} · {mechanic.specialties?.[0]}
              </Text>
            </View>
          </TouchableOpacity>
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MechanicChatThread({ mechanic, onBack }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollViewRef = useRef();

  useEffect(() => {
    initSocket();
  }, [mechanic.id]);

  const initSocket = async () => {
    const user = await getUser();
    const socket = connectSocket(user?.id);

    socket.off("receiveMessage");
    socket.on("receiveMessage", (data) => {
      if (data.sender !== "user" && data.mechanicId === mechanic.id) {
        setMessages((prev) => [...prev, data]);
      }
    });
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    const user = await getUser();
    const messageData = {
      id: messages.length + 1,
      sender: "user",
      senderId: user?.id,
      mechanicId: mechanic.id,
      message: newMessage.trim(),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, messageData]);
    sendMessage(messageData);
    setNewMessage("");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerBack}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.mechanicAvatarSmall}>
            <Text style={styles.mechanicAvatarText}>
              {mechanic.name.charAt(0)}
            </Text>
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.mechanicName} numberOfLines={1}>
              {mechanic.name}
            </Text>
            <Text style={styles.mechanicStatus} numberOfLines={1}>
              🟢 {mechanic.status === "busy" ? "Busy" : "Available"}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.callBtn}>
          <Text style={styles.callText}>📞</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
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
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeText}>Today</Text>
          </View>

          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageRow,
                msg.sender === "user"
                  ? styles.messageRowUser
                  : styles.messageRowMechanic,
              ]}
            >
              {msg.sender === "mechanic" && (
                <View style={styles.smallAvatar}>
                  <Text style={styles.smallAvatarText}>
                    {mechanic.name.charAt(0)}
                  </Text>
                </View>
              )}
              <View
                style={[
                  styles.messageBubble,
                  msg.sender === "user"
                    ? styles.userBubble
                    : styles.mechanicBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    msg.sender === "user"
                      ? styles.userMessageText
                      : styles.mechanicMessageText,
                  ]}
                >
                  {msg.message}
                </Text>
                <Text
                  style={[
                    styles.messageTime,
                    msg.sender === "user"
                      ? styles.userMessageTime
                      : styles.mechanicMessageTime,
                  ]}
                >
                  {msg.time}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !newMessage.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!newMessage.trim()}
          >
            <Text style={styles.sendButtonText}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function ChatScreen({ navigation, route }) {
  const directMechanic = route.params?.mechanic ?? null;
  const [selectedMechanic, setSelectedMechanic] = useState(directMechanic);
  const [openedFromList, setOpenedFromList] = useState(false);

  useEffect(() => {
    if (route.params?.mechanic) {
      setSelectedMechanic(route.params.mechanic);
      setOpenedFromList(false);
    }
  }, [route.params?.mechanic]);

  const handleSelectMechanic = (mechanic) => {
    setOpenedFromList(true);
    setSelectedMechanic(mechanic);
  };

  const handleBackFromThread = () => {
    if (openedFromList || !directMechanic) {
      setSelectedMechanic(null);
      setOpenedFromList(false);
      navigation.setParams({ mechanic: undefined });
      return;
    }
    navigation.goBack();
  };

  if (selectedMechanic) {
    return (
      <MechanicChatThread
        mechanic={selectedMechanic}
        onBack={handleBackFromThread}
      />
    );
  }

  return (
    <MechanicChatList
      navigation={navigation}
      onSelectMechanic={handleSelectMechanic}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  flex: {
    flex: 1,
  },
  listHeader: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  listHeaderCenter: {
    marginTop: 8,
  },
  listTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1F2937",
  },
  listSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
    flexWrap: "wrap",
  },
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
  listItemContent: {
    flex: 1,
    flexShrink: 1,
  },
  listItemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  listItemName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
  },
  listItemTime: {
    fontSize: 12,
    color: "#9CA3AF",
    flexShrink: 0,
  },
  listItemBottom: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 8,
  },
  listItemPreview: {
    flex: 1,
    fontSize: 14,
    color: "#6B7280",
  },
  listItemMeta: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
  unreadBadge: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 8,
  },
  headerBack: {
    flexShrink: 0,
  },
  backText: {
    fontSize: 16,
    color: "#2563EB",
    fontWeight: "600",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  headerTextWrap: {
    flex: 1,
    flexShrink: 1,
  },
  mechanicAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  mechanicAvatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  mechanicAvatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  mechanicName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1F2937",
  },
  mechanicStatus: {
    fontSize: 12,
    color: "#16A34A",
  },
  callBtn: {
    flexShrink: 0,
  },
  callText: {
    fontSize: 24,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  dateBadge: {
    alignSelf: "center",
    backgroundColor: "#E5E7EB",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 8,
  },
  dateBadgeText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  messageRowMechanic: {
    justifyContent: "flex-start",
  },
  smallAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  smallAvatarText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  messageBubble: {
    maxWidth: "75%",
    borderRadius: 18,
    padding: 12,
    flexShrink: 1,
  },
  userBubble: {
    backgroundColor: "#2563EB",
    borderBottomRightRadius: 4,
  },
  mechanicBubble: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    flexWrap: "wrap",
  },
  userMessageText: {
    color: "#fff",
  },
  mechanicMessageText: {
    color: "#1F2937",
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  userMessageTime: {
    color: "#BFDBFE",
    textAlign: "right",
  },
  mechanicMessageTime: {
    color: "#9CA3AF",
  },
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
    flexShrink: 0,
  },
  sendButtonDisabled: {
    backgroundColor: "#BFDBFE",
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 18,
  },
});
