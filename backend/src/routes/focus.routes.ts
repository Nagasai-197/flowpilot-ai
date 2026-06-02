import { Router } from "express";
import { FocusController } from "../controllers/focus.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validateFocusSessionInput } from "../middlewares/validation.js";

const router = Router();

// Protect all routes with auth
router.use(requireAuth);

router.post("/", validateFocusSessionInput, FocusController.logSession);
router.get("/stats", FocusController.getStats);

export default router;
