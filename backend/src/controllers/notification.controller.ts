import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service.js';
import { NotificationRuleEngine } from '../services/notificationRuleEngine.js';
import { UnauthorizedError } from '../utils/errors.js';

export class NotificationController {
  /**
   * Retrieves user notifications history list and unread counts
   */
  static async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      return next(new UnauthorizedError());
    }

    try {
      const notifications = await NotificationService.getNotificationsForUser(userId);
      const unreadCount = await NotificationService.getUnreadCountForUser(userId);

      res.status(200).json({
        status: 'success',
        unreadCount,
        results: notifications.length,
        data: {
          notifications,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Marks a single notification as read
   */
  static async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next(new UnauthorizedError());
    }

    try {
      const notification = await NotificationService.markAsReadForUser(id, userId);
      res.status(200).json({
        status: 'success',
        data: {
          notification,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Deletes a single notification row
   */
  static async deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next(new UnauthorizedError());
    }

    try {
      await NotificationService.deleteNotificationForUser(id, userId);
      res.status(200).json({
        status: 'success',
        message: 'Notification deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Clears all notifications history logs for the user
   */
  static async clearAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      return next(new UnauthorizedError());
    }

    try {
      await NotificationService.clearAllForUser(userId);
      res.status(200).json({
        status: 'success',
        message: 'All notifications cleared successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Runs the notification rule engine for the authenticated user
   * and returns a count of newly generated notifications.
   */
  static async generateNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      return next(new UnauthorizedError());
    }

    try {
      const result = await NotificationRuleEngine.runForUser(userId);
      res.status(200).json({
        status: 'success',
        message: `Notification scan complete. ${result.generated} new notification(s) generated.`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
