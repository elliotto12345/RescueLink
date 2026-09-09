import { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { connectSocket, getSocket } from "../../services/socket";
import { ROLES } from "../../constants/roles";
import {
  buildChatNotificationKey,
  getActiveChatConversationId,
  notifyChatOnce,
} from "../../utils/chatNotifications";
import { navigate } from "../../navigation/navigationRef";

function belongsToUser(data, userId) {
  if (data.senderId === userId) return false;

  const receiverId = data.receiverId ?? data.recipientId;
  if (receiverId) return receiverId === userId;

  return true;
}

function openChatFromMessage(data, user) {
  const isProvider = user.role === ROLES.PROVIDER;
  const senderName = data.senderName || (isProvider ? "Driver" : "Mechanic");

  navigate("Chat", {
    conversationId: data.conversationId,
    requestId: data.requestId,
    ...(isProvider
      ? { driver: { id: data.senderId, name: senderName } }
      : { mechanic: { id: data.senderId, name: senderName } }),
  });
}

export default function GlobalChatNotificationListener() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const socket = getSocket() || connectSocket(user.id, user.role);

    const handleReceive = (data) => {
      if (!data || !belongsToUser(data, user.id)) return;

      const conversationId = data.conversationId || null;
      if (conversationId && conversationId === getActiveChatConversationId()) {
        return;
      }

      const preview = String(data.text || data.message || "New message").trim();
      const senderName = data.senderName || "Someone";
      const key = buildChatNotificationKey(data.id, conversationId);

      notifyChatOnce(
        key,
        `New message from ${senderName}`,
        preview.length > 120 ? `${preview.slice(0, 117)}...` : preview,
        [
          {
            text: "Open Chat",
            onPress: () => openChatFromMessage(data, user),
          },
          { text: "Dismiss", style: "cancel" },
        ],
      );
    };

    socket.on("receiveMessage", handleReceive);

    return () => {
      socket.off("receiveMessage", handleReceive);
    };
  }, [user?.id, user?.role]);

  return null;
}
