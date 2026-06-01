import { Router } from "express";
import { GoalController } from "../controllers/goal.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validateGoalInput, validateGoalUpdateInput } from "../middlewares/validation.js";

const router = Router();

// Secure all goal endpoints
router.use(requireAuth);

router.route("/").get(GoalController.getGoals).post(validateGoalInput, GoalController.createGoal);

router
  .route("/:id")
  .put(validateGoalUpdateInput, GoalController.updateGoal)
  .delete(GoalController.deleteGoal);

router.route("/:id/roadmap/regenerate").post(GoalController.regenerateRoadmap);

// Milestone endpoints
router.route("/:id/milestones").post(GoalController.createMilestone);

router.route("/:id/milestones/reorder").put(GoalController.reorderMilestones);

router
  .route("/:id/milestones/:milestoneId")
  .put(GoalController.updateMilestone)
  .delete(GoalController.deleteMilestone);

export default router;
