const express = require("express");
const http = require("http");
const cors = require("cors");
const socketIO = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Store connected users
const connectedUsers = {};
const onlineUsers = require("./state/onlineUsers");

function notifyUser(userId, event, data) {
  if (userId == null) return;
  const socketId = connectedUsers[String(userId)];
  if (socketId) {
    io.to(socketId).emit(event, data);
  }
}

// Test Route
app.get("/", (req, res) => {
  res.json({ message: "RescueLink Backend is Alive 🚀" });
});

// Socket.IO
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  const role = socket.handshake.query.role || "user";
  console.log(`User ${userId} connected:`, socket.id);

  if (userId) {
    connectedUsers[String(userId)] = socket.id;
    onlineUsers.setOnline(userId, role);
  }

  // User shares location
  socket.on("sendLocation", (data) => {
    console.log("Location received:", data);
    io.emit("receiveLocation", data);
  });

  // Mechanic accepts request — notify the driver only
  socket.on("acceptRequest", (data) => {
    console.log("Request accepted:", data);
    notifyUser(data.userId, "requestAccepted", data);
  });

  // Mechanic declines request — notify the driver only
  socket.on("declineRequest", (data) => {
    console.log("Request declined:", data);
    notifyUser(data.userId, "requestDeclined", data);
  });

  // Driver cancels pending request — notify the assigned mechanic only
  socket.on("cancelRequest", (data) => {
    console.log("Request cancelled:", data);
    notifyUser(data.mechanicId, "requestCancelled", data);
  });

  // Status update
  socket.on("updateStatus", (data) => {
    console.log("Status updated:", data);
    io.emit("statusUpdated", data);
  });

  // Chat message
  socket.on("sendMessage", (data) => {
    console.log("Message received:", data);
    io.emit("receiveMessage", data);
  });

  // New request created — notify the assigned mechanic only
  socket.on("newRequest", (data) => {
    console.log("New request:", data);
    if (data.mechanicId) {
      notifyUser(data.mechanicId, "incomingRequest", data);
    }
  });

  socket.on("disconnect", () => {
    console.log(`User ${userId} disconnected`);
    if (userId) {
      delete connectedUsers[String(userId)];
      onlineUsers.setOffline(userId);
    }
  });
});

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/requests", require("./routes/requests"));
app.use("/api/mechanics", require("./routes/mechanics"));
app.use("/api/otp", require("./routes/otp"));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} `);
});
