import { Request, Response, NextFunction } from "express";
import { GoalService } from "../services/goal.service.js";
import { BadRequestError, UnauthorizedError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { supabase } from "../lib/supabase.js";

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function mapGoalDbToApi(goal: any) {
  if (!goal) return goal;
  return {
    ...goal,
    type: toTitleCase(goal.category || "Personal"),
  };
}

export class GoalController {
  /**
   * Fetch user goals with their relational milestones embedded
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

      // Bulk query milestones for all these goals to prevent N+1 queries
      let milestonesData: any[] = [];
      if (goals.length > 0) {
        const goalIds = goals.map((g) => g.id);
        const { data, error } = await supabase
          .from("goal_milestones")
          .select("*")
          .in("goal_id", goalIds)
          .order("order_index", { ascending: true });

        if (error) {
          logger.error(`Failed to fetch milestones in bulk: ${error.message}`);
        } else {
          milestonesData = data || [];
        }
      }

      const mappedGoals = goals.map((g) => {
        try {
          const goalMilestones = milestonesData.filter((m: any) => m.goal_id === g.id);
          return {
            ...mapGoalDbToApi(g),
            milestones: goalMilestones,
          };
        } catch (mapErr: any) {
          logger.error(`Error mapping goal ID ${g?.id}: ${mapErr.message}`);
          throw mapErr;
        }
      });

      logger.info(
        `Successfully mapped ${mappedGoals.length} goals with relational milestones for user: ${userId}`,
      );
      res.status(200).json({
        status: "success",
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

    const { title, type, status, description, target_date } = req.body;

    if (!title) {
      return next(new BadRequestError("Goal title is required"));
    }

    try {
      const goal = await GoalService.createGoalForUser(userId, {
        title,
        type,
        status,
        description,
        target_date,
      });
      res.status(201).json({
        status: "success",
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

    const { title, type, status, description, progress, target_date } = req.body;

    try {
      const goal = await GoalService.updateGoalForUser(id, userId, {
        title,
        type,
        status,
        description,
        progress,
        target_date,
      });
      res.status(200).json({
        status: "success",
        data: { goal: mapGoalDbToApi(goal) },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Deletes a user goal
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
        status: "success",
        message: "Goal deleted successfully",
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
        status: "success",
        data: { goal: mapGoalDbToApi(goal) },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Adds a manual milestone to a goal
   */
  static async createMilestone(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    const { id: goalId } = req.params;
    const { title } = req.body;

    if (!userId) {
      return next(new UnauthorizedError());
    }

    if (!title) {
      return next(new BadRequestError("Milestone title is required"));
    }

    try {
      const milestone = await GoalService.addMilestone(goalId, userId, title);
      res.status(201).json({
        status: "success",
        data: { milestone },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Updates a specific milestone
   */
  static async updateMilestone(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    const { id: goalId, milestoneId } = req.params;
    const { title, completed, order_index } = req.body;

    if (!userId) {
      return next(new UnauthorizedError());
    }

    try {
      const milestone = await GoalService.updateMilestone(goalId, milestoneId, userId, {
        title,
        completed,
        order_index,
      });
      res.status(200).json({
        status: "success",
        data: { milestone },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Deletes a milestone from a goal
   */
  static async deleteMilestone(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    const { id: goalId, milestoneId } = req.params;

    if (!userId) {
      return next(new UnauthorizedError());
    }

    try {
      await GoalService.deleteMilestone(goalId, milestoneId, userId);
      res.status(200).json({
        status: "success",
        message: "Milestone deleted successfully",
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Bulk reorders milestones for a goal
   */
  static async reorderMilestones(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    const { id: goalId } = req.params;
    const { orders } = req.body;

    if (!userId) {
      return next(new UnauthorizedError());
    }

    if (!orders || !Array.isArray(orders)) {
      return next(new BadRequestError("Orders array is required"));
    }

    try {
      await GoalService.reorderMilestones(goalId, userId, orders);
      res.status(200).json({
        status: "success",
        message: "Milestones reordered successfully",
      });
    } catch (err) {
      next(err);
    }
  }
}
