import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// Secure all analytics endpoints
router.use(requireAuth);

router.get('/dashboard', AnalyticsController.getDashboardStats);
router.get('/trend', AnalyticsController.getTrendStats);
router.get('/heatmap', AnalyticsController.getHeatmapStats);

export default router;
