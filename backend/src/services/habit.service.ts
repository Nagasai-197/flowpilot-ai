import { supabase } from '../lib/supabase.js';
import { NotFoundError, AppError, BadRequestError } from '../utils/errors.js';

export class HabitService {
  /**
   * Calculate the current consecutive daily streak for completed habit checks
   */
  static calculateStreak(logs: { date: string; completed: boolean }[], localDate?: string): number {
    if (!logs || logs.length === 0) return 0;

    // Filter to completed and sort by date descending
    const completedDates = logs
      .filter((l) => l.completed)
      .map((l) => new Date(l.date + 'T12:00:00'))
      .sort((a, b) => b.getTime() - a.getTime());

    if (completedDates.length === 0) return 0;

    const today = localDate ? new Date(localDate + 'T12:00:00') : new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const newestDate = completedDates[0];
    newestDate.setHours(0, 0, 0, 0);

    // If the newest log is neither today nor yesterday, the streak is broken
    if (newestDate.getTime() !== today.getTime() && newestDate.getTime() !== yesterday.getTime()) {
      return 0;
    }

    let streak = 1;
    let currentRef = newestDate;

    for (let i = 1; i < completedDates.length; i++) {
      const nextDate = completedDates[i];
      nextDate.setHours(0, 0, 0, 0);

      // Check difference in days
      const diffTime = currentRef.getTime() - nextDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        streak++;
        currentRef = nextDate;
      } else if (diffDays > 1) {
        // Gap encountered, streak ends
        break;
      }
      // If diffDays is 0 (duplicate), ignore and continue
    }

    return streak;
  }

  /**
   * Fetch all habits for a specific user, including streaks and completion statistics
   */
  static async getHabitsForUser(userId: string, localDate?: string) {
    const todayStr = localDate || new Date().toISOString().split('T')[0];
    const today = localDate ? new Date(localDate + 'T12:00:00') : new Date();

    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (habitsError) {
      throw new AppError(`Failed to fetch habits: ${habitsError.message}`, 500);
    }

    if (!habits || habits.length === 0) {
      return [];
    }

    const habitIds = habits.map((h) => h.id);

    // Fetch logs for the last 30 days to calculate completion rate and active streaks
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDateStr = thirtyDaysAgo.toISOString().split('T')[0];

    // Query 'completed_at' since 'date' doesn't exist on habit_logs
    const { data: logs, error: logsError } = await supabase
      .from('habit_logs')
      .select('habit_id, completed_at')
      .in('habit_id', habitIds)
      .gte('completed_at', `${startDateStr}T00:00:00Z`)
      .lte('completed_at', `${todayStr}T23:59:59Z`);

    if (logsError) {
      throw new AppError(`Failed to fetch habit logs: ${logsError.message}`, 500);
    }

    const logsMap = new Map<string, { date: string; completed: boolean }[]>();
    logs?.forEach((log) => {
      if (!log.completed_at) return;
      const dateStr = log.completed_at.split('T')[0];
      const existing = logsMap.get(log.habit_id) || [];
      existing.push({ date: dateStr, completed: true });
      logsMap.set(log.habit_id, existing);
    });

    const past7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      past7Days.push(d.toISOString().split('T')[0]);
    }

    return habits.map((habit) => {
      const habitLogs = logsMap.get(habit.id) || [];
      const streak = this.calculateStreak(habitLogs, localDate);

      // 30-day completion rate calculation
      const completedCount = habitLogs.filter((l) => l.completed).length;
      const pct = Math.round((completedCount / 30) * 100);

      // Create a 7-day completion checklist matrix (M-S mapping)
      const days = past7Days.map((dateStr) => {
        const found = habitLogs.find((l) => l.date === dateStr);
        return found ? (found.completed ? 1 : 0) : 0;
      });

      return {
        id: habit.id,
        name: habit.name,
        color: habit.color || 'mint', // Default fallback color if column doesn't exist in DB
        streak,
        pct: Math.min(100, pct),
        days,
      };
    });
  }

  /**
   * Creates a new habit config
   */
  static async createHabitForUser(userId: string, payload: { name: string; color?: string }) {
    const { data, error } = await supabase
      .from('habits')
      .insert({
        user_id: userId,
        name: payload.name,
        color: payload.color || 'mint',
      })
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to create habit: ${error.message}`, 400);
    }

    return data;
  }

  /**
   * Updates an existing habit (name and/or color)
   */
  static async updateHabitForUser(
    habitId: string,
    userId: string,
    payload: { name?: string; color?: string }
  ) {
    const { data: existing, error: existError } = await supabase
      .from('habits')
      .select('id')
      .eq('id', habitId)
      .eq('user_id', userId)
      .single();

    if (existError || !existing) {
      throw new NotFoundError('Habit not found');
    }

    const updatePayload: Record<string, any> = {};
    if (payload.name !== undefined) updatePayload.name = payload.name;
    if (payload.color !== undefined) updatePayload.color = payload.color;

    const { data, error } = await supabase
      .from('habits')
      .update(updatePayload)
      .eq('id', habitId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to update habit: ${error.message}`, 400);
    }

    return data;
  }

  /**
   * Safely deletes a habit config
   */
  static async deleteHabitForUser(habitId: string, userId: string): Promise<void> {
    const { data: existing, error: existError } = await supabase
      .from('habits')
      .select('id')
      .eq('id', habitId)
      .eq('user_id', userId)
      .single();

    if (existError || !existing) {
      throw new NotFoundError('Habit not found');
    }

    const { error } = await supabase
      .from('habits')
      .delete()
      .eq('id', habitId)
      .eq('user_id', userId);

    if (error) {
      throw new AppError(`Failed to delete habit: ${error.message}`, 400);
    }
  }

  /**
   * Toggles completion log for a specific date
   */
  static async toggleHabitLogForUser(
    habitId: string,
    userId: string,
    date: string,
    completed: boolean
  ) {
    // 1. Fetch user's timezone from their profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('id', userId)
      .single();

    const timezone = profile?.timezone || 'UTC';

    // 2. Compute today's date string in the user's timezone
    let todayStr: string;
    try {
      todayStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
    } catch (err) {
      todayStr = new Date().toISOString().split('T')[0];
    }

    // 3. Validate that the request date matches today's date string
    if (date !== todayStr) {
      throw new BadRequestError('Habit logs can only be toggled for today.');
    }

    // Verify owner of habit config first
    const { data: existingHabit, error: existError } = await supabase
      .from('habits')
      .select('id')
      .eq('id', habitId)
      .eq('user_id', userId)
      .single();

    if (existError || !existingHabit) {
      throw new NotFoundError('Habit not found');
    }

    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    if (completed) {
      // 1. Check if check-in log already exists for this date
      const { data: existingLog } = await supabase
        .from('habit_logs')
        .select('id')
        .eq('habit_id', habitId)
        .eq('user_id', userId)
        .gte('completed_at', startOfDay)
        .lte('completed_at', endOfDay)
        .maybeSingle();

      if (!existingLog) {
        // Create new check-in row
        const { data, error } = await supabase
          .from('habit_logs')
          .insert({
            habit_id: habitId,
            user_id: userId,
            completed_at: `${date}T12:00:00Z`, // safe mid-day value
          })
          .select()
          .single();

        if (error) {
          throw new AppError(`Failed to insert habit log: ${error.message}`, 400);
        }
        return data;
      }
      return existingLog;
    } else {
      // 2. Uncheck: Delete the check-in log row for this date
      const { error } = await supabase
        .from('habit_logs')
        .delete()
        .eq('habit_id', habitId)
        .eq('user_id', userId)
        .gte('completed_at', startOfDay)
        .lte('completed_at', endOfDay);

      if (error) {
        throw new AppError(`Failed to delete habit log: ${error.message}`, 400);
      }
      return { success: true };
    }
  }
}
