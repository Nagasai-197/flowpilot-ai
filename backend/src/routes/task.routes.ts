import { Router } from "express";
import { TaskController } from "../controllers/task.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validateTaskInput, validateTaskUpdateInput } from "../middlewares/validation.js";

const router = Router();

// Apply authentication middleware to all task management endpoints
router.use(requireAuth);

router.route("/").get(TaskController.getTasks).post(validateTaskInput, TaskController.createTask);

router
  .route("/:id")
  .get(TaskController.getTaskById)
  .put(validateTaskUpdateInput, TaskController.updateTask)
  .delete(TaskController.deleteTask);

router.post("/:id/breakdown", TaskController.generateSubtaskBreakdown);

export default router;
