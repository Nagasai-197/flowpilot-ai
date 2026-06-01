import { Router } from "express";
import { HabitController } from "../controllers/habit.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validateHabitInput } from "../middlewares/validation.js";

const router = Router();

// Secure all habit endpoints
router.use(requireAuth);

router
  .route("/")
  .get(HabitController.getHabits)
  .post(validateHabitInput, HabitController.createHabit);

router
  .route("/:id")
  .put(validateHabitInput, HabitController.updateHabit)
  .delete(HabitController.deleteHabit);

router.route("/:id/toggle").post(HabitController.toggleHabit);

export default router;
