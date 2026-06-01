import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/rateLimiter.js";

const router = Router();

// Public Routes
router.post("/signup", authLimiter, AuthController.signup);
router.post("/login", authLimiter, AuthController.login);

// Protected Routes
router.post("/logout", requireAuth, AuthController.logout);
router.get("/me", requireAuth, AuthController.getMe);

export default router;
