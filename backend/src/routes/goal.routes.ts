import { Router } from 'express';
import { GoalController } from '../controllers/goal.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateGoalInput } from '../middlewares/validation.js';

const router = Router();

// Secure all goal endpoints
router.use(requireAuth);

router.route('/')
  .get(GoalController.getGoals)
  .post(validateGoalInput, GoalController.createGoal);

router.route('/:id')
  .put(validateGoalInput, GoalController.updateGoal)
  .delete(GoalController.deleteGoal);

export default router;
