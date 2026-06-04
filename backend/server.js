const express = require("express");
const http = require("http");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const errorHandler = require("./middlewares/errorHandler");
const connectDB = require("./database/db");
const { initSocketServer } = require("./sockets/socket");

const userRoutes = require("./routes/userRoutes");
const incRoutes = require("./routes/incidentRoutes");
const emergencyRoutes = require("./routes/emergencyRoutes");
const chatRoutes = require("./routes/chatRoutes");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 8000;

// Create HTTP Server
const server = http.createServer(app);

// Initialize Socket.IO server
initSocketServer(server);

// Security Middlewares
app.use(helmet());
app.use(cookieParser());
app.use(express.json());

// CORS configuration (allow requests with credentials)
app.use(cors({
  origin: "http://localhost:3000", // Update with production domain
  credentials: true
}));

// API Routes
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/incidents", incRoutes);
app.use("/api/v1/emergency", emergencyRoutes);
app.use("/api/v1/chats", chatRoutes);

// Error Handling Middleware
app.use(errorHandler);

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URL);
    server.listen(port, () => {
      console.log(`Server started on ${port}`);
      console.log(`Mongo Connected!!!`);
    });
  } catch (err) {
    console.error("Database connection failure:", err);
  }
};

start();
