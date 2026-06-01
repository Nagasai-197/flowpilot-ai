import { Router } from "express";
import { FocusController } from "../controllers/focus.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// Protect all routes with auth
router.use(requireAuth);

router.post("/", FocusController.logSession);
router.get("/stats", FocusController.getStats);

export default router;
