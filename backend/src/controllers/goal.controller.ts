import { Request, Response, NextFunction } from 'express';
import { GoalService } from '../services/goal.service.js';
import { BadRequestError, UnauthorizedError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function mapGoalDbToApi(goal: any) {
  if (!goal) return goal;
  return {
    ...goal,
    type: toTitleCase(goal.category || 'Personal')
  };
}

export class GoalController {
  /**
   * Fetch user goals
   */
  static async getGoals(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    logger.info(`GET /api/goals initiated for user: ${userId}`);
    
    if (!userId) {
      logger.warn(`GET /api/goals failed: unauthorized`);
      return next(new UnauthorizedError());
    }

    try {
      logger.info(`Fetching goals from database for user: ${userId}`);
      const goals = await GoalService.getGoalsForUser(userId);
      logger.info(`Successfully fetched ${goals.length} raw goals from DB for user: ${userId}`);
      
      const mappedGoals = goals.map(g => {
        try {
          return mapGoalDbToApi(g);
        } catch (mapErr: any) {
          logger.error(`Error mapping goal ID ${g?.id}: ${mapErr.message}`);
          throw mapErr;
        }
      });
      
      logger.info(`Successfully mapped ${mappedGoals.length} goals for user: ${userId}`);
      res.status(200).json({
        status: 'success',
        results: mappedGoals.length,
        data: {
          goals: mappedGoals,
        },
      });
    } catch (err: any) {
      logger.error(`GET /api/goals error for user ${userId}: ${err.message}`, { error: err });
      next(err);
    }
  }

  /**
   * Creates a new goal
   */
  static async createGoal(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      return next(new UnauthorizedError());
    }

    const { title, type, status, description } = req.body;

    if (!title) {
      return next(new BadRequestError('Goal title is required'));
    }

    try {
      const goal = await GoalService.createGoalForUser(userId, { title, type, status, description });
      res.status(201).json({
        status: 'success',
        data: {
          goal: mapGoalDbToApi(goal),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Updates an existing goal
   */
  static async updateGoal(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next(new UnauthorizedError());
    }

    const { title, type, status, description, progress } = req.body;

    try {
      const goal = await GoalService.updateGoalForUser(id, userId, { title, type, status, description, progress });
      res.status(200).json({
        status: 'success',
        data: { goal: mapGoalDbToApi(goal) },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Deletes a user goal (soft delete)
   */
  static async deleteGoal(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next(new UnauthorizedError());
    }

    try {
      await GoalService.deleteGoalForUser(id, userId);
      res.status(200).json({
        status: 'success',
        message: 'Goal deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Regenerates AI milestones for a goal
   */
  static async regenerateRoadmap(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next(new UnauthorizedError());
    }

    try {
      const goal = await GoalService.regenerateGoalRoadmap(id, userId);
      res.status(200).json({
        status: 'success',
        data: { goal: mapGoalDbToApi(goal) },
      });
    } catch (err) {
      next(err);
    }
  }
}
