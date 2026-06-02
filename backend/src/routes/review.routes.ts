import { Router } from "express";
import { ReviewController } from "../controllers/review.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validateReviewCreateInput, validateReviewDraftInput } from "../middlewares/validation.js";

const router = Router();

// Secure all review endpoints
router.use(requireAuth);

router
  .route("/")
  .get(ReviewController.getReviews)
  .post(validateReviewCreateInput, ReviewController.createReview);

router.route("/draft").post(validateReviewDraftInput, ReviewController.generateReviewDraft);

export default router;
