import { io } from "socket.io-client";
import { getApiBaseUrl } from "../constants/apiConfig";

const SOCKET_URL = getApiBaseUrl();

let socket = null;
let socketUserId = null;

export const connectSocket = (userId, role = "user") => {
  const normalizedId = userId != null ? String(userId) : null;

  if (socket?.connected && socketUserId === normalizedId) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
    socketUserId = null;
  }

  socket = io(SOCKET_URL, {
    transports: ["websocket"],
    query: { userId: normalizedId, role },
  });
  socketUserId = normalizedId;

  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    socketUserId = null;
  }
};

const emitWhenConnected = (event, data) => {
  if (!socket) return;

  if (socket.connected) {
    socket.emit(event, data);
    return;
  }

  socket.once("connect", () => {
    socket.emit(event, data);
  });
};

export const sendLocation = (data) => {
  if (socket) socket.emit("sendLocation", data);
};

export const sendMessage = (data) => {
  emitWhenConnected("sendMessage", data);
};

export const emitTypingStart = (data) => {
  emitWhenConnected("typingStart", data);
};

export const emitTypingStop = (data) => {
  emitWhenConnected("typingStop", data);
};

export const emitMessagesRead = (data) => {
  emitWhenConnected("messagesRead", data);
};

export const updateStatus = (data) => {
  if (socket) socket.emit("updateStatus", data);
};

export const emitNewRequest = (data) => {
  if (socket) socket.emit("newRequest", data);
};

export const emitAcceptRequest = (data) => {
  if (socket) socket.emit("acceptRequest", data);
};

export const emitDeclineRequest = (data) => {
  if (socket) socket.emit("declineRequest", data);
};

export const emitCancelRequest = (data) => {
  if (socket) socket.emit("cancelRequest", data);
};

export const emitMechanicOnTheWay = (data) => {
  emitWhenConnected("mechanicOnTheWay", data);
};

export const emitMechanicArrived = (data) => {
  emitWhenConnected("mechanicArrived", data);
};

export const emitDriverArrived = (data) => {
  emitWhenConnected("driverArrived", data);
};

export const emitServiceComplete = (data) => {
  emitWhenConnected("serviceComplete", data);
};
