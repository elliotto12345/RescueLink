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

// Test Route
app.get("/", (req, res) => {
  res.json({ message: "RescueLink Backend is Alive 🚀" });
});

// Socket.IO
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  console.log(`User ${userId} connected:`, socket.id);

  // Store user socket
  if (userId) {
    connectedUsers[userId] = socket.id;
  }

  // User shares location
  socket.on("sendLocation", (data) => {
    console.log("Location received:", data);
    io.emit("receiveLocation", data);
  });

  // Mechanic accepts request
  socket.on("acceptRequest", (data) => {
    console.log("Request accepted:", data);
    // Notify the specific user
    const userSocketId = connectedUsers[data.userId];
    if (userSocketId) {
      io.to(userSocketId).emit("requestAccepted", data);
    }
    io.emit("requestAccepted", data);
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

  // New request created
  socket.on("newRequest", (data) => {
    console.log("New request:", data);
    // Broadcast to all mechanics
    io.emit("incomingRequest", data);
  });

  socket.on("disconnect", () => {
    console.log(`User ${userId} disconnected`);
    if (userId) {
      delete connectedUsers[userId];
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
