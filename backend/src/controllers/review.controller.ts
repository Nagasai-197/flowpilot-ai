import { Request, Response, NextFunction } from "express";
import { ReviewService } from "../services/review.service.js";
import { BadRequestError, UnauthorizedError } from "../utils/errors.js";

export class ReviewController {
  /**
   * Fetches the user's completed reflection reviews
   */
  static async getReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      return next(new UnauthorizedError());
    }

    try {
      const reviews = await ReviewService.getReviewsForUser(userId);
      res.status(200).json({
        status: "success",
        results: reviews.length,
        data: { reviews },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Saves a reflection review session
   */
  static async createReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      return next(new UnauthorizedError());
    }

    const {
      type,
      period_start,
      period_end,
      wins,
      missed_tasks,
      goal_progress,
      habit_performance,
      reflection_q_and_a,
      next_plan,
    } = req.body;

    if (!type || !period_start || !period_end) {
      return next(new BadRequestError("Type, period_start, and period_end are required"));
    }

    try {
      const review = await ReviewService.saveReview(userId, {
        type,
        period_start,
        period_end,
        wins: wins || [],
        missed_tasks: missed_tasks || [],
        goal_progress: goal_progress || [],
        habit_performance: habit_performance || {},
        reflection_q_and_a: reflection_q_and_a || {},
        next_plan: next_plan || {},
      });

      res.status(201).json({
        status: "success",
        data: { review },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Generates a data-driven AI Review Draft based on recent workspace context
   */
  static async generateReviewDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      return next(new UnauthorizedError());
    }

    const { type, period_start, period_end } = req.body;

    if (!type || !period_start || !period_end) {
      return next(new BadRequestError("Type, period_start, and period_end are required"));
    }

    try {
      const draft = await ReviewService.generateReviewDraft(userId, type, period_start, period_end);
      res.status(200).json({
        status: "success",
        data: { draft },
      });
    } catch (err) {
      next(err);
    }
  }
}
