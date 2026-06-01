import { Router } from "express";
import { ReviewController } from "../controllers/review.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// Secure all review endpoints
router.use(requireAuth);

router.route("/").get(ReviewController.getReviews).post(ReviewController.createReview);

router.route("/draft").post(ReviewController.generateReviewDraft);

export default router;
