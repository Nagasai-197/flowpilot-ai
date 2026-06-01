import { Request, Response, NextFunction } from "express";
import { FocusService } from "../services/focus.service.js";
import { BadRequestError, UnauthorizedError } from "../utils/errors.js";

export class FocusController {
  /**
   * Logs a completed focus session
   */
  static async logSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      return next(new UnauthorizedError());
    }

    const { task_id, goal_id, milestone_id, duration_minutes, type, completed } = req.body;

    if (duration_minutes === undefined || !type) {
      return next(new BadRequestError("duration_minutes and type are required"));
    }

    try {
      const session = await FocusService.logFocusSession(userId, {
        task_id,
        goal_id,
        milestone_id,
        duration_minutes: Number(duration_minutes),
        type,
        completed: completed !== undefined ? !!completed : true,
      });

      res.status(201).json({
        status: "success",
        data: { session },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves focus session statistics for the user
   */
  static async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      return next(new UnauthorizedError());
    }

    try {
      const stats = await FocusService.getFocusStats(userId);
      res.status(200).json({
        status: "success",
        data: { stats },
      });
    } catch (err) {
      next(err);
    }
  }
}
