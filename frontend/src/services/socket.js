import { io } from "socket.io-client";

const SOCKET_URL = "https://rescuelink-production-cb78.up.railway.app";

let socket = null;

export const connectSocket = (userId, role = "user") => {
  socket = io(SOCKET_URL, {
    transports: ["websocket"],
    query: { userId, role },
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
