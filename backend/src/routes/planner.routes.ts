import { Router } from "express";
import { PlannerController } from "../controllers/planner.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { rateLimit } from "../middlewares/rateLimiter.js";

const router = Router();

// Secure all planner endpoints
router.use(requireAuth);

router.post("/generate", rateLimit(5, 60000), PlannerController.generatePlan);
router.get("/current", PlannerController.getCurrentPlan);

// CRUD and AI customization for schedule blocks
router.post("/blocks", PlannerController.createBlock);
router.put("/blocks/:id", PlannerController.updateBlock);
router.delete("/blocks/:id", PlannerController.deleteBlock);
router.post("/blocks/:id/regenerate", PlannerController.regenerateBlock);

export default router;
