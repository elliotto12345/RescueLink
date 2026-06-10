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
import { getSocket, connectSocket, sendMessage } from "../utils/socket";
import { getUser } from "../utils/storage";

const initialMessages = [
  {
    id: 1,
    sender: "mechanic",
    message:
      "Hello! I have accepted your request. I am on my way to your location.",
    time: "10:46 AM",
  },
  {
    id: 2,
    sender: "user",
    message: "Thank you! I am at the Total filling station on the main road.",
    time: "10:47 AM",
  },
  {
    id: 3,
    sender: "mechanic",
    message:
      "Perfect, I can see your location. I will be there in about 8 minutes.",
    time: "10:47 AM",
  },
];

export default function ChatScreen({ navigation }) {
  const [messages, setMessages] = useState(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const scrollViewRef = useRef();

  useEffect(() => {
    initSocket();
  }, []);

  const initSocket = async () => {
    const user = await getUser();
    const socket = connectSocket(user?.id);

    socket.on("receiveMessage", (data) => {
      if (data.sender !== "user") {
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

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.mechanicAvatar}>
            <Text style={styles.mechanicAvatarText}>K</Text>
          </View>
          <View>
            <Text style={styles.mechanicName}>Kwame Mensah</Text>
            <Text style={styles.mechanicStatus}>🟢 On the way</Text>
          </View>
        </View>
        <TouchableOpacity>
          <Text style={styles.callText}>📞</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Date Badge */}
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
                  <Text style={styles.smallAvatarText}>K</Text>
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

        {/* Input */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  flex: {
    flex: 1,
  },
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
  backText: {
    fontSize: 16,
    color: "#2563EB",
    fontWeight: "600",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mechanicAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
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
  },
  sendButtonDisabled: {
    backgroundColor: "#BFDBFE",
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 18,
  },
});
