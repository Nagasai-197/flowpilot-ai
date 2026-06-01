import express from "express";
import cors from "cors";
import helmet from "helmet";
import { requestLogger } from "./middlewares/logger.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { NotFoundError } from "./utils/errors.js";
import { globalLimiter } from "./middlewares/rateLimiter.js";
import authRoutes from "./routes/auth.routes.js";
import taskRoutes from "./routes/task.routes.js";
import habitRoutes from "./routes/habit.routes.js";
import plannerRoutes from "./routes/planner.routes.js";
import assistantRoutes from "./routes/assistant.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import copilotRoutes from "./routes/copilot.routes.js";
import goalRoutes from "./routes/goal.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import focusRoutes from "./routes/focus.routes.js";

const app = express();

app.set("trust proxy", true);

// Security Middlewares
app.use(helmet());
app.use("/api", globalLimiter);
app.use(
  cors((req: any, callback) => {
    const origin = req.header("Origin");
    const allowedOrigins = (
      process.env.NODE_ENV === "production"
        ? [process.env.CLIENT_ORIGIN]
        : [
            "http://localhost:3000",
            "http://localhost:8080",
            "http://localhost:5173",
            process.env.CLIENT_ORIGIN,
          ]
    ).filter(Boolean) as string[];

    let corsOptions: any;

    if (!origin) {
      corsOptions = { origin: true, credentials: true };
    } else {
      let isSameOrigin = false;
      try {
        const originHost = new URL(origin).host;
        const requestHost = req.header("Host");
        isSameOrigin = originHost === requestHost;
      } catch (e) {
        // Ignore
      }

      const isVercelPreview = origin.endsWith(".vercel.app");

      if (
        isSameOrigin ||
        isVercelPreview ||
        allowedOrigins.indexOf(origin) !== -1 ||
        allowedOrigins.includes("*")
      ) {
        corsOptions = { origin: true, credentials: true };
      } else {
        corsOptions = { origin: false };
      }
    }
    callback(null, corsOptions);
  }),
);

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use(requestLogger);

// Authentication Routes
app.use("/api/auth", authRoutes);

// Task Management Routes
app.use("/api/tasks", taskRoutes);

// Habit Tracking Routes
app.use("/api/habits", habitRoutes);

// AI Planner Routes
app.use("/api/planner", plannerRoutes);

// AI Assistant Routes
app.use("/api/assistant", assistantRoutes);

// Notification Engine Routes
app.use("/api/notifications", notificationRoutes);

// Goals Microservice Routes
app.use("/api/goals", goalRoutes);

// Reflection Reviews Routes
app.use("/api/reviews", reviewRoutes);

// Focus Session Tracking Routes
app.use("/api/focus", focusRoutes);

import { supabase } from "./lib/supabase.js";
import { config } from "./config/index.js";

// Health Check Route
app.get("/api/health", async (_req, res) => {
  let supabaseOk = false;
  try {
    // Quick probe query to check if Supabase is reachable and service key is valid
    const { error } = await supabase.from("profiles").select("id").limit(1);
    if (!error) {
      supabaseOk = true;
    }
  } catch (err) {
    // ignore
  }

  const geminiConfigured = !!config.GEMINI_API_KEY;
  const healthy = supabaseOk && geminiConfigured;

  res.status(healthy ? 200 : 500).json({
    status: healthy ? "ok" : "error",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
    version: "v1.0.3_priority_fix",
    services: {
      supabase: supabaseOk ? "connected" : "disconnected",
      gemini: geminiConfigured ? "configured" : "missing_api_key",
    },
  });
});

// Copilot System Routes (Demo, Life Scores, Standups, Weekly Reviews)
app.use("/api", copilotRoutes);

// Fallback Route for non-existing endpoints
app.use((_req, _res, next) => {
  next(new NotFoundError("Resource not found"));
});

// Global Centralized Error Interceptor
app.use(errorHandler);

export default app;
