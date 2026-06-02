import { Request, Response, NextFunction } from "express";
import { TaskService } from "../services/task.service.js";
import { BadRequestError, UnauthorizedError } from "../utils/errors.js";

export class TaskController {
  private static validateStatus(status?: string): void {
    if (status && !["todo", "doing", "review", "done"].includes(status)) {
      throw new BadRequestError(
        "Invalid status. Must be one of: 'todo', 'doing', 'review', 'done'",
      );
    }
  }

  private static validatePriority(priority?: string): void {
    if (priority && !["low", "med", "high"].includes(priority)) {
      throw new BadRequestError("Invalid priority. Must be one of: 'low', 'med', 'high'");
    }
  }

  /**
   * Fetch user tasks based on filter parameters
   */
  static async getTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      return next(new UnauthorizedError());
    }

    const { status, priority, tag } = req.query;

    try {
      if (status) TaskController.validateStatus(status as string);
      if (priority) TaskController.validatePriority(priority as string);

      const tasks = await TaskService.getTasksForUser(userId, {
        status: status as string,
        priority: priority as string,
        tag: tag as string,
      });

      res.status(200).json({
        status: "success",
        results: tasks.length,
        data: {
          tasks,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Fetch a single task by ID
   */
  static async getTaskById(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next(new UnauthorizedError());
    }

    try {
      const task = await TaskService.getTaskByIdForUser(id, userId);
      res.status(200).json({
        status: "success",
        data: {
          task,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Creates a new task
   */
  static async createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      return next(new UnauthorizedError());
    }

    const { title, description, tag, priority, status, due_date, color } = req.body;

    if (!title) {
      return next(new BadRequestError("Task title is required"));
    }

    try {
      TaskController.validateStatus(status);
      TaskController.validatePriority(priority);

      const task = await TaskService.createTaskForUser(userId, {
        title,
        description,
        tag,
        priority: priority || "med",
        status: status || "todo",
        due_date,
        color,
      });

      res.status(201).json({
        status: "success",
        data: {
          task,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Updates an existing task
   */
  static async updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next(new UnauthorizedError());
    }

    const { title, description, tag, priority, status, due_date, color } = req.body;

    try {
      TaskController.validateStatus(status);
      TaskController.validatePriority(priority);

      const task = await TaskService.updateTaskForUser(id, userId, {
        title,
        description,
        tag,
        priority,
        status,
        due_date,
        color,
      });

      res.status(200).json({
        status: "success",
        data: {
          task,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Compatibility endpoint for toggling task completion from focus flows.
   */
  static async toggleTaskCompletion(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next(new UnauthorizedError());
    }

    const completed =
      typeof req.body.completed === "boolean" ? req.body.completed : req.body.status === "done";

    try {
      const task = await TaskService.updateTaskForUser(id, userId, {
        status: completed ? "done" : "todo",
      });

      res.status(200).json({
        status: "success",
        data: {
          task,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Deletes an existing task
   */
  static async deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next(new UnauthorizedError());
    }

    try {
      await TaskService.deleteTaskForUser(id, userId);
      res.status(200).json({
        status: "success",
        message: "Task deleted successfully",
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Generates an AI subtask breakdown
   */
  static async generateSubtaskBreakdown(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next(new UnauthorizedError());
    }

    try {
      const breakdown = await TaskService.generateSubtaskBreakdown(id, userId);
      res.status(200).json({
        status: "success",
        data: breakdown,
      });
    } catch (err) {
      next(err);
    }
  }
}
