/**
 * @fileoverview Main entry point for the Collaborative Canvas backend server.
 * Initializes Express, Socket.io, database connection, and registers routes and middleware.
 */

// Import core web framework and server modules
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
// Load environment variables from .env file into process.env
require("dotenv").config();

// Import database connection utility
const connectDB = require("../config/database");
// Import custom error handling middleware and error class
const { errorHandler, AppError } = require("../middleware/errorHandler");

// Import REST API route definitions
const authRoutes = require("../routes/auth");
const roomRoutes = require("../routes/rooms");
const notificationRoutes = require("../routes/notifications");

// Import real-time socket event handlers
const roomSocketHandler = require("../sockets/roomSocket");
const { notificationSocketHandler } = require("../sockets/notificationSocket");

// Initialize Express application instance
const app = express();
// Create an HTTP server to wrap the Express app, allowing shared use with Socket.io
const server = http.createServer(app);

// Determine the primary frontend URL from environment configuration
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
// Normalize the frontend origin to handle protocol/domain matching
let frontendOrigin = frontendUrl;
try {
  const urlObj = new URL(frontendUrl);
  frontendOrigin = urlObj.origin; 
} catch (e) {
  // Fallback if URL parsing fails
  console.log("Could not parse frontend URL, using as-is");
}

// Define the list of origins permitted to access this API
const allowedOrigins = [
  frontendOrigin, 
  frontendUrl, 
  "http://localhost:5173", 
  "http://localhost:3000", 
  "https://haridevp.dev",
  "https://sid-error.github.io"
];

/**
 * Socket.io initialization with CORS configuration.
 * Attaches the socket server to the HTTP instance.
 */
const io = socketIo(server, {
  cors: {
    // Permit connections from any origin (broad permissive policy for collaboration)
    origin: "*", 
    methods: ["GET", "POST"],
  },
});

/**
 * Global Socket.IO connection event listener.
 * This function runs every time a new client connects via WebSocket.
 */
io.on("connection", (socket) => {
  // Delegate room-specific events (drawing, locking) to its dedicated handler
  roomSocketHandler(io, socket);
  // Delegate user notification events to its dedicated handler
  notificationSocketHandler(io, socket);
});

/**
 * Global Middleware Configuration
 */
// Enable CORS for all REST API endpoints with a permissive policy
app.use(cors({
  origin: "*", 
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Parse incoming JSON request bodies automatically
app.use(express.json());

// Establish connection to the MongoDB database
connectDB();

/**
 * REST API Route Registration
 */
// Mount authentication-related endpoints (register, login, profile)
app.use("/api/auth", authRoutes);
// Mount room management endpoints (create, join, export)
app.use("/api/rooms", roomRoutes);
// Mount notification management endpoints (fetch, mark as read)
app.use("/api/notifications", notificationRoutes);

/**
 * 404 handler for any requests that don't match the registered routes.
 */
app.use((req, res, next) => {
  // Pass a custom 404 error to the global error handler
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

/**
 * Global error handling middleware.
 * This must be registered LAST to catch errors passed to next() from routes.
 */
app.use(errorHandler);

// Define the server's listening port
const PORT = process.env.PORT || 5000;
// Start the HTTP/WebSocket server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

