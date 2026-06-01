import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// Secure all notification endpoints
router.use(requireAuth);

router.route("/").get(NotificationController.getNotifications);

// Run the rule engine to generate fresh notifications
router.route("/generate").post(NotificationController.generateNotifications);

router.route("/clear").post(NotificationController.clearAll);

// /:id routes MUST come after named routes to avoid swallowing /clear and /generate
router.route("/:id").delete(NotificationController.deleteNotification);

router
  .route("/:id/read")
  .put(NotificationController.markAsRead)
  .patch(NotificationController.markAsRead);

export default router;
