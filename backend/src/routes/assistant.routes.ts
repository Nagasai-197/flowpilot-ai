import { Router } from 'express';
import { AssistantController } from '../controllers/assistant.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { rateLimit } from '../middlewares/rateLimiter.js';
import { validateAssistantInput } from '../middlewares/validation.js';

const router = Router();

// Secure all assistant endpoints
router.use(requireAuth);

router.post('/chat', rateLimit(5, 60000), validateAssistantInput, AssistantController.chat);

export default router;
