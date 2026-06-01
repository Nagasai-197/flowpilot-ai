import { Request, Response, NextFunction } from "express";
import { AnalyticsService } from "../services/analytics.service.js";
import { UnauthorizedError } from "../utils/errors.js";

export class AnalyticsController {
  /**
   * Retrieves dashboard statistics details
   */
  static async getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      return next(new UnauthorizedError());
    }

    try {
      const localDate = req.query.localDate as string | undefined;
      const stats = await AnalyticsService.getDashboardStats(userId, localDate);
      res.status(200).json({
        status: "success",
        data: stats,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves 14-day focus trend metrics
   */
  static async getTrendStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      return next(new UnauthorizedError());
    }

    try {
      const localDate = req.query.localDate as string | undefined;
      const trend = await AnalyticsService.getTrendStats(userId, localDate);
      res.status(200).json({
        status: "success",
        data: {
          trend,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves 12-week productivity heatmap stats
   */
  static async getHeatmapStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      return next(new UnauthorizedError());
    }

    try {
      const localDate = req.query.localDate as string | undefined;
      const heatmap = await AnalyticsService.getHeatmapStats(userId, localDate);
      res.status(200).json({
        status: "success",
        data: {
          heatmap,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
