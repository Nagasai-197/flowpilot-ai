import { Request, Response, NextFunction } from "express";
import { PlannerService } from "../services/planner.service.js";
import { UnauthorizedError } from "../utils/errors.js";

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
        currentTime,
      );
      res.status(200).json({
        status: "success",
        message: "Optimized schedule plan generated successfully",
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
        status: "success",
        data: plan,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Creates a manual schedule block
   */
  static async createBlock(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      return next(new UnauthorizedError());
    }

    try {
      const block = await PlannerService.createBlockForUser(userId, req.body);
      res.status(201).json({
        status: "success",
        data: { block },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Updates an existing schedule block
   */
  static async updateBlock(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next(new UnauthorizedError());
    }

    try {
      const block = await PlannerService.updateBlockForUser(id, userId, req.body);
      res.status(200).json({
        status: "success",
        data: { block },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Deletes a schedule block
   */
  static async deleteBlock(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next(new UnauthorizedError());
    }

    try {
      await PlannerService.deleteBlockForUser(id, userId);
      res.status(200).json({
        status: "success",
        message: "Block deleted successfully",
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Regenerates a single schedule block using Gemini
   */
  static async regenerateBlock(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next(new UnauthorizedError());
    }

    try {
      const result = await PlannerService.regenerateBlockForUser(id, userId);
      res.status(200).json({
        status: "success",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
