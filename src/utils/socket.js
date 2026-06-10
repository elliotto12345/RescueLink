import { io } from "socket.io-client";

const SOCKET_URL = "https://rescuelink-production-cb78.up.railway.app";

let socket = null;

export const connectSocket = (userId) => {
  socket = io(SOCKET_URL, {
    transports: ["websocket"],
    query: { userId },
  });

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
  }
};

export const sendLocation = (data) => {
  if (socket) socket.emit("sendLocation", data);
};

export const sendMessage = (data) => {
  if (socket) socket.emit("sendMessage", data);
};

export const updateStatus = (data) => {
  if (socket) socket.emit("updateStatus", data);
};
