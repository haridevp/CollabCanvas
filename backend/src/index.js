const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("../config/database");
const { errorHandler, AppError } = require("../middleware/errorHandler");

const authRoutes = require("../routes/auth");
const roomRoutes = require("../routes/rooms");
const roomSocketHandler = require("../sockets/roomSocket");

const app = express();
const server = http.createServer(app);

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

const io = socketIo(server, {
  cors: {
    origin: [frontendUrl, "http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST"],
  },
});

// Initialize socket handler
io.on("connection", (socket) => {
  roomSocketHandler(io, socket);
});

// Middleware
app.use(
  cors({
    origin: [frontendUrl, "http://localhost:5173", "http://localhost:3000"],
  }),
);
app.use(express.json());

connectDB();

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

// 404 handler for unknown routes
app.use((req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

// Global error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
