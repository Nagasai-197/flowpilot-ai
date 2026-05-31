import { Request, Response, NextFunction } from 'express';
import { HabitService } from '../services/habit.service.js';
import { BadRequestError, UnauthorizedError } from '../utils/errors.js';

export class HabitController {
  private static validateDate(dateStr?: string): void {
    if (!dateStr) {
      throw new BadRequestError('Date parameter is required');
    }
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) {
      throw new BadRequestError("Invalid date format. Must match 'YYYY-MM-DD'");
    }
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) {
      throw new BadRequestError('Invalid calendar date value');
    }
  }

  /**
   * Fetch user habits with active streaks and 7-day matrices
   */
  static async getHabits(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      return next(new UnauthorizedError());
    }

    try {
      const localDate = req.query.localDate as string | undefined;
      const habits = await HabitService.getHabitsForUser(userId, localDate);
      res.status(200).json({
        status: 'success',
        results: habits.length,
        data: {
          habits,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Creates a new habit configuration
   */
  static async createHabit(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      return next(new UnauthorizedError());
    }

    const { name, color } = req.body;

    if (!name) {
      return next(new BadRequestError('Habit name is required'));
    }

    try {
      const habit = await HabitService.createHabitForUser(userId, { name, color });
      res.status(201).json({
        status: 'success',
        data: {
          habit,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Updates an existing habit (name and/or color)
   */
  static async updateHabit(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next(new UnauthorizedError());
    }

    const { name, color } = req.body;

    try {
      const habit = await HabitService.updateHabitForUser(id, userId, { name, color });
      res.status(200).json({
        status: 'success',
        data: { habit },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Deletes a parent habit configuration
   */
  static async deleteHabit(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next(new UnauthorizedError());
    }

    try {
      await HabitService.deleteHabitForUser(id, userId);
      res.status(200).json({
        status: 'success',
        message: 'Habit deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Toggles a daily habit completion check
   */
  static async toggleHabit(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next(new UnauthorizedError());
    }

    const { date, completed } = req.body;

    try {
      HabitController.validateDate(date);
      const isCompleted = completed !== undefined ? !!completed : true;

      const log = await HabitService.toggleHabitLogForUser(id, userId, date, isCompleted);

      res.status(200).json({
        status: 'success',
        data: {
          log,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
