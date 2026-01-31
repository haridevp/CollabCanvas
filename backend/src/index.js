const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const authRoutes = require("../routes/auth");
const roomRoutes = require("../routes/rooms");
const participantRoutes = require("../routes/participants");
const roomSocketHandler = require("../sockets/roomSocket");
const connectDB = require("../config/database");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());
connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/participants", participantRoutes);

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  roomSocketHandler(io, socket);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
