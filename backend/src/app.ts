import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requestLogger } from './middlewares/logger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { NotFoundError } from './utils/errors.js';
import authRoutes from './routes/auth.routes.js';
import taskRoutes from './routes/task.routes.js';
import habitRoutes from './routes/habit.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import plannerRoutes from './routes/planner.routes.js';
import assistantRoutes from './routes/assistant.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import copilotRoutes from './routes/copilot.routes.js';
import goalRoutes from './routes/goal.routes.js';

const app = express();

// Security Middlewares
app.use(helmet());
const allowedOrigins = (process.env.NODE_ENV === 'production'
  ? [process.env.CLIENT_ORIGIN]
  : ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:5173', process.env.CLIENT_ORIGIN]
).filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use(requestLogger);

// Authentication Routes
app.use('/api/auth', authRoutes);

// Task Management Routes
app.use('/api/tasks', taskRoutes);

// Habit Tracking Routes
app.use('/api/habits', habitRoutes);

// Analytics System Routes
app.use('/api/analytics', analyticsRoutes);

// AI Planner Routes
app.use('/api/planner', plannerRoutes);

// AI Assistant Routes
app.use('/api/assistant', assistantRoutes);

// Notification Engine Routes
app.use('/api/notifications', notificationRoutes);

// Goals Microservice Routes
app.use('/api/goals', goalRoutes);






import { supabase } from './lib/supabase.js';
import { config } from './config/index.js';

// Health Check Route
app.get('/api/health', async (_req, res) => {
  let supabaseOk = false;
  try {
    // Quick probe query to check if Supabase is reachable and service key is valid
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (!error) {
      supabaseOk = true;
    }
  } catch (err) {
    // ignore
  }

  const geminiConfigured = !!config.GEMINI_API_KEY;
  const healthy = supabaseOk && geminiConfigured;

  res.status(healthy ? 200 : 500).json({
    status: healthy ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    services: {
      supabase: supabaseOk ? 'connected' : 'disconnected',
      gemini: geminiConfigured ? 'configured' : 'missing_api_key',
    }
  });
});

// Copilot System Routes (Demo, Life Scores, Standups, Weekly Reviews)
app.use('/api', copilotRoutes);


// Fallback Route for non-existing endpoints
app.use('*', (_req, _res, next) => {
  next(new NotFoundError('API Route not found'));
});

// Global Centralized Error Interceptor
app.use(errorHandler);

export default app;
