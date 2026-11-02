
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import interviewRoutes from "./routes/interviewRoutes.js";
import questionRoutes from "./routes/questionRoutes.js";
import pool from "./config/db.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import selectionRoutes from "./routes/selectionRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import codeRunnerRoutes from "./routes/codeRunnerRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

const app = express();

// ---------------------------------
// MIDDLEWARE
// ---------------------------------

app.use(cors({
  origin: (origin, callback) => {
    const configuredOrigins = (process.env.CLIENT_URL || "")
      .split(",")
      .map(value => value.trim())
      .filter(Boolean);

    const allowedOrigins = new Set([
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3000",
      ...configuredOrigins,
    ]);

    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    console.error("CORS blocked origin:", origin);
    return callback(new Error("Origin is not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

// ---------------------------------
// ROOT ROUTE
// ---------------------------------

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend API is running 🚀",
  });
});

// ---------------------------------
// API ROUTES
// ---------------------------------

app.use("/api/interview", interviewRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api", selectionRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/code", codeRunnerRoutes);
app.use("/api/admin", adminRoutes);

// ---------------------------------
// 404 HANDLER
// ---------------------------------

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// ---------------------------------
// GLOBAL ERROR HANDLER
// ---------------------------------

app.use((err, req, res, next) => {
  console.error("Server Error:", err);

  res.status(500).json({
    success: false,
    error: "Something went wrong",
  });
});

// ---------------------------------
// START SERVER
// ---------------------------------

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log("----------------------------------");
  console.log(`✅ Server running on port ${PORT}`);
  console.log("🌐 Backend API is ready");
  console.log("----------------------------------");
});

// ---------------------------------
// SERVER ERROR MONITORING
// ---------------------------------

server.on("error", (err) => {
  console.error("❌ Express server error:", err);
});

server.on("close", () => {
  console.error("⚠️ Express server was closed!");
});

// ---------------------------------
// DATABASE CONNECTION TEST
// ---------------------------------

async function checkDatabase() {
  try {
    await pool.query("SELECT 1");
    console.log("✅ Database Connected Successfully");
  } catch (error) {
    console.error("❌ Database Connection Error:", error);
  }
}

checkDatabase();

// ---------------------------------
// PROCESS ERROR MONITORING
// ---------------------------------

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Promise Rejection:", reason);
});

process.on("exit", (code) => {
  console.log("Node process exiting with code:", code);
});

// ---------------------------------
// GRACEFUL SHUTDOWN
// ---------------------------------

async function shutdown(signal) {
  console.log(`\n⚠️ Received ${signal}. Shutting down...`);

  server.close(async () => {
    try {
      await pool.end();
      console.log("✅ Database pool closed");
      process.exit(0);
    } catch (error) {
      console.error("❌ Shutdown error:", error);
      process.exit(1);
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
