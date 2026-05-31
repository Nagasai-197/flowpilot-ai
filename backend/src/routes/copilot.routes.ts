import { Router } from 'express';
import { CopilotController } from '../controllers/copilot.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// Secure all copilot endpoints
router.use(requireAuth);

router.get('/analytics/copilot', CopilotController.getCopilotSummary);
router.get('/analytics/weekly-review', CopilotController.getWeeklyReview);
router.post('/demo/enable', CopilotController.enableDemoMode);

export default router;
