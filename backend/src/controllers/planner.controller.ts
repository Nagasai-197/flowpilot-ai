import { Request, Response, NextFunction } from 'express';
import { PlannerService } from '../services/planner.service.js';
import { UnauthorizedError } from '../utils/errors.js';

export class PlannerController {
  /**
   * Generates a new chronological plan for the user
   */
  static async generatePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      return next(new UnauthorizedError());
    }

    const { date, preferredDeepWorkDuration, breakDuration, currentTime } = req.body;

    try {
      const plan = await PlannerService.generatePlanForUser(
        userId,
        date,
        preferredDeepWorkDuration,
        breakDuration,
        currentTime
      );
      res.status(200).json({
        status: 'success',
        message: 'Optimized schedule plan generated successfully',
        data: plan,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves today's current calendar schedule blocks
   */
  static async getCurrentPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      return next(new UnauthorizedError());
    }

    const { date } = req.query;

    try {
      const plan = await PlannerService.getCurrentPlanForUser(userId, date as string);
      res.status(200).json({
        status: 'success',
        data: plan,
      });
    } catch (err) {
      next(err);
    }
  }
}
