import { Router } from 'express';
import { PlannerController } from '../controllers/planner.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { rateLimit } from '../middlewares/rateLimiter.js';

const router = Router();

// Secure all planner endpoints
router.use(requireAuth);

router.post('/generate', rateLimit(5, 60000), PlannerController.generatePlan);
router.get('/current', PlannerController.getCurrentPlan);

export default router;
