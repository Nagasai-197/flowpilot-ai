import { supabase } from '../lib/supabase.js';
import { NotificationService } from './notification.service.js';
import { logger } from '../utils/logger.js';

/**
 * NotificationRuleEngine
 *
 * Scans the user's workspace and generates contextual notifications for:
 *  1. Overdue tasks              (priority: high / critical)
 *  2. Tasks due today            (priority: medium)
 *  3. Habit streaks at risk      (priority: medium)
 *  4. Productivity alerts        (priority: low / medium)
 *
 * Called on-demand via POST /api/notifications/generate
 * Also wired into task mutation endpoints.
 */
export class NotificationRuleEngine {

  static async runForUser(userId: string): Promise<{ generated: number }> {
    logger.info(`NotificationRuleEngine: Running rules for user ${userId}`);
    let generated = 0;

    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      const todayStartIso = todayStart.toISOString();
      const todayEndIso = todayEnd.toISOString();

      let todayLogs: any[] | null = null;

      // ── Fetch existing notifications created today to avoid duplicate spam ──
      const { data: existingToday } = await supabase
        .from('notifications')
        .select('type, title')
        .eq('user_id', userId)
        .gte('created_at', todayStartIso);

      const existingKeys = new Set(
        (existingToday || []).map((n) => `${n.type}::${n.title}`)
      );

      const mayCreate = async (
        type: string,
        title: string,
        description: string,
        priority: 'low' | 'medium' | 'high' | 'critical'
      ) => {
        const key = `${type}::${title}`;
        if (existingKeys.has(key)) return; // already notified today
        try {
          await NotificationService.createNotification(userId, type, title, description, priority);
          existingKeys.add(key);
          generated++;
        } catch (e: any) {
          logger.warn(`NotificationRuleEngine: failed to create notification: ${e.message}`);
        }
      };

      // ── Rule 1: Overdue Tasks ─────────────────────────────────────────────
      const { data: overdueTasks } = await supabase
        .from('tasks')
        .select('id, title, due_date, priority')
        .eq('user_id', userId)
        .neq('status', 'done')
        .not('due_date', 'is', null)
        .lt('due_date', todayStartIso);

      for (const task of overdueTasks || []) {
        const daysOverdue = Math.floor(
          (Date.now() - new Date(task.due_date).getTime()) / (1000 * 60 * 60 * 24)
        );
        const severity = daysOverdue >= 3 ? 'critical' : 'high';
        await mayCreate(
          'overdue_task',
          `⚠️ Overdue: ${task.title}`,
          `This task was due ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} ago and is still pending. Address it to maintain your flow score.`,
          severity
        );
      }

      // ── Rule 2: Tasks Due Today ────────────────────────────────────────────
      const { data: dueTodayTasks } = await supabase
        .from('tasks')
        .select('id, title, priority, estimated_minutes')
        .eq('user_id', userId)
        .neq('status', 'done')
        .not('due_date', 'is', null)
        .gte('due_date', todayStartIso)
        .lte('due_date', todayEndIso);

      for (const task of dueTodayTasks || []) {
        await mayCreate(
          'due_today',
          `📅 Due Today: ${task.title}`,
          `This task is due today${task.estimated_minutes ? ` (~${task.estimated_minutes} min)` : ''}. Block time in your schedule to complete it.`,
          task.priority === 'high' ? 'high' : 'medium'
        );
      }

      // ── Rule 3: Habit Streak Reminders ────────────────────────────────────
      const { data: habits } = await supabase
        .from('habits')
        .select('id, name')
        .eq('user_id', userId);

      if (habits && habits.length > 0) {
        // Fetch today's habit logs
        const { data: todayLogsData } = await supabase
          .from('habit_logs')
          .select('habit_id')
          .eq('user_id', userId)
          .gte('completed_at', todayStartIso)
          .lte('completed_at', todayEndIso);
        
        todayLogs = todayLogsData;

        const completedHabitIds = new Set((todayLogs || []).map((l) => l.habit_id));

        for (const habit of habits) {
          if (!completedHabitIds.has(habit.id)) {
            // Check if they had a streak yesterday (any log in the last 2 days)
            const { data: recentLog } = await supabase
              .from('habit_logs')
              .select('completed_at')
              .eq('habit_id', habit.id)
              .eq('user_id', userId)
              .gte('completed_at', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString())
              .lt('completed_at', todayStartIso)
              .limit(1);

            if (recentLog && recentLog.length > 0) {
              // Has a streak going — remind them not to break it
              await mayCreate(
                'habit_reminder',
                `🔥 Keep your streak: ${habit.name}`,
                `You've been consistent with "${habit.name}" recently. Don't break the chain — mark it done today!`,
                'medium'
              );
            } else {
              // No recent streak — gentle nudge
              await mayCreate(
                'habit_reminder',
                `💡 Habit reminder: ${habit.name}`,
                `You haven't logged "${habit.name}" yet today. Small consistent actions compound into big results.`,
                'low'
              );
            }
          }
        }
      }

      // ── Rule 4: Productivity Alert — many overdue tasks ───────────────────
      const overdueCount = overdueTasks?.length ?? 0;
      if (overdueCount >= 3) {
        await mayCreate(
          'productivity_alert',
          `📊 Productivity Alert: ${overdueCount} overdue tasks`,
          `You have ${overdueCount} overdue tasks. Consider running the AI Planner to auto-prioritize and reschedule them into your focus blocks.`,
          overdueCount >= 5 ? 'critical' : 'medium'
        );
      }

      // ── Rule 5: All tasks done — positive reinforcement ───────────────────
      if (dueTodayTasks?.length === 0 && overdueCount === 0) {
        const { data: completedToday } = await supabase
          .from('tasks')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'done')
          .gte('updated_at', todayStartIso);

        if ((completedToday?.length ?? 0) > 0) {
          await mayCreate(
            'productivity_alert',
            '🌟 All clear — great focus session!',
            `No pending tasks or habits overdue. You're running at peak productivity today. Keep the momentum.`,
            'low'
          );
        }
      }

      // ── Rule 6: Goal Milestones & Targets ──────────────────────────────
      let goals: any[] = [];
      try {
        const { data: goalsData } = await supabase
          .from('goals')
          .select('id, title, progress, target_date, status')
          .eq('user_id', userId);
        goals = goalsData || [];
      } catch (err: any) {
        logger.warn(`Could not read goals for notifications: ${err.message}`);
      }

      for (const goal of goals) {
        if (goal.status === 'active') {
          if (goal.progress >= 80 && goal.progress < 100) {
            await mayCreate(
              'goal_alert',
              `🎯 Milestone Near: ${goal.title}`,
              `You are at ${goal.progress}% progress for "${goal.title}". Just a little more focus to cross the finish line!`,
              'medium'
            );
          }
          if (goal.target_date && new Date(goal.target_date).getTime() < Date.now()) {
            await mayCreate(
              'goal_alert',
              `⚠️ Goal Target Overdue: ${goal.title}`,
              `Your goal "${goal.title}" target date was ${goal.target_date.split('T')[0]}. Review and adjust your plan in the Goals sheet.`,
              'high'
            );
          }
        }
      }

      // ── Rule 7: Planner & AI Recommendations ─────────────────────────
      const { data: todayBlocks } = await supabase
        .from('schedule_blocks')
        .select('id')
        .eq('user_id', userId)
        .gte('start_time', todayStartIso)
        .lte('start_time', todayEndIso);

      if (!todayBlocks || todayBlocks.length === 0) {
        await mayCreate(
          'ai_recommendation',
          '🤖 AI Planner Recommendation',
          'Establish dynamic structure for your workspace today. Click "Regenerate Plan" on the dashboard to build an optimized routine.',
          'medium'
        );
      }

      // ── Rule 8: Achievement Milestones & Streak Warnings ─────────────
      if (habits && habits.length > 0 && todayLogs && todayLogs.length === habits.length) {
        await mayCreate(
          'achievement_milestone',
          '🏆 Achievement: Perfect Habit Day!',
          `Incredible consistency! You checked off all ${habits.length} habits today. Your momentum is unstoppable!`,
          'high'
        );
      }

      logger.info(`NotificationRuleEngine: Generated ${generated} new notifications for user ${userId}`);
      return { generated };

    } catch (err: any) {
      logger.error(`NotificationRuleEngine failed for user ${userId}: ${err.message}`);
      return { generated };
    }
  }
}
