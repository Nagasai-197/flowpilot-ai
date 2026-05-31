import { supabase } from '../lib/supabase.js';
import { NotFoundError, AppError } from '../utils/errors.js';

export class NotificationService {
  /**
   * Fetch all notifications for a specific user, sorted descending by created_at
   */
  static async getNotificationsForUser(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(`Failed to fetch notifications: ${error.message}`, 500);
    }

    return data || [];
  }

  /**
   * Fetch unread notification counts for a specific user
   */
  static async getUnreadCountForUser(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      throw new AppError(`Failed to fetch unread notification count: ${error.message}`, 500);
    }

    return count || 0;
  }

  /**
   * Marks a single notification as read
   */
  static async markAsReadForUser(notificationId: string, userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Notification not found');
      }
      throw new AppError(`Failed to update notification: ${error.message}`, 500);
    }

    return data;
  }

  /**
   * Safely deletes a single notification
   */
  static async deleteNotificationForUser(notificationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      throw new AppError(`Failed to delete notification: ${error.message}`, 400);
    }
  }

  /**
   * Clears/deletes all notifications associated with the user
   */
  static async clearAllForUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw new AppError(`Failed to clear notifications: ${error.message}`, 400);
    }
  }

  /**
   * Helper utility to create a new notification row
   */
  static async createNotification(
    userId: string,
    type: string,
    title: string,
    description: string,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        description,
        priority,
      })
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to create notification row: ${error.message}`, 400);
    }

    return data;
  }
}
