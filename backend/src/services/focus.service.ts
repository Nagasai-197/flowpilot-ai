import { supabase } from "../lib/supabase.js";
import { logger } from "../utils/logger.js";

export interface FocusSessionPayload {
  task_id?: string;
  goal_id?: string;
  milestone_id?: string;
  duration_minutes: number;
  type: string;
  completed: boolean;
}

export class FocusService {
  /**
   * Log a completed focus session
   */
  static async logFocusSession(userId: string, payload: FocusSessionPayload) {
    logger.info(`Logging focus session for user: ${userId}, type: ${payload.type}`);

    try {
      const { data, error } = await supabase
        .from("focus_sessions")
        .insert({
          user_id: userId,
          task_id: payload.task_id || null,
          goal_id: payload.goal_id || null,
          milestone_id: payload.milestone_id || null,
          duration_minutes: payload.duration_minutes,
          type: payload.type,
          completed: payload.completed !== undefined ? payload.completed : true,
        })
        .select()
        .single();

      if (error) {
        // Fallback-safe db tracking: log and return fallback if table not found
        if (
          error.code === "PGRST116" ||
          error.message?.includes("relation") ||
          error.message?.includes("does not exist")
        ) {
          logger.warn(
            `focus_sessions table not found in Supabase. Falling back to local-only API response.`,
          );
          return {
            id: "local_mock_" + Math.random().toString(36).substr(2, 9),
            user_id: userId,
            ...payload,
            created_at: new Date().toISOString(),
          };
        }
        throw error;
      }
      return data;
    } catch (err: any) {
      logger.warn(
        `Failed to insert focus session into database: ${err.message}. Returning mock response.`,
      );
      return {
        id: "local_mock_" + Math.random().toString(36).substr(2, 9),
        user_id: userId,
        ...payload,
        created_at: new Date().toISOString(),
      };
    }
  }

  /**
   * Fetch focus statistics for a specific user
   */
  static async getFocusStats(userId: string) {
    try {
      const { data, error } = await supabase
        .from("focus_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        if (error.message?.includes("relation") || error.message?.includes("does not exist")) {
          logger.warn(
            `focus_sessions table missing in Supabase. Returning localized empty statistics.`,
          );
          return this.getEmptyStats();
        }
        throw error;
      }

      const sessions = data || [];
      return this.aggregateStats(sessions);
    } catch (err: any) {
      logger.warn(
        `Focus statistics fetch failed: ${err.message}. Returning localized empty statistics.`,
      );
      return this.getEmptyStats();
    }
  }

  /**
   * Generates empty analytics format
   */
  private static getEmptyStats() {
    return {
      todayFocusHours: 0,
      weeklyFocusHours: 0,
      monthlyFocusHours: 0,
      deepWorkStreak: 0,
      sessionCompletionRate: 100,
      focusSessionsCount: 0,
      deepWorkHours: 0,
      weeklyBreakdown: [0, 0, 0, 0, 0, 0, 0], // M, T, W, T, F, S, S
      sessionsList: [],
    };
  }

  /**
   * Aggregate focus sessions into structured KPIs
   */
  private static aggregateStats(sessions: any[]) {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    // Start of current week (Monday)
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let todayMins = 0;
    let weeklyMins = 0;
    let monthlyMins = 0;
    let completedSessionsCount = 0;
    let deepWorkMins = 0;

    // Day activity map for streak calculation (YYYY-MM-DD -> boolean)
    const activityDays: Record<string, boolean> = {};
    const weeklyBreakdown = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun

    sessions.forEach((s) => {
      if (!s.completed) return;

      const createdDate = new Date(s.created_at);
      const dateStr = s.created_at.split("T")[0];
      const duration = s.duration_minutes || 0;

      completedSessionsCount++;
      activityDays[dateStr] = true;

      // Track today
      if (dateStr === todayStr) {
        todayMins += duration;
      }

      // Track current week
      if (createdDate.getTime() >= startOfWeek.getTime()) {
        weeklyMins += duration;

        // Monday is day 0, Sunday is day 6
        let dayIdx = createdDate.getDay(); // 0 is Sunday, 1 is Monday...
        let adjustedIdx = dayIdx === 0 ? 6 : dayIdx - 1;
        weeklyBreakdown[adjustedIdx] += Math.round((duration / 60) * 10) / 10;
      }

      // Track current month
      if (createdDate.getTime() >= startOfMonth.getTime()) {
        monthlyMins += duration;
      }

      // Deep Work represents high focus blocks (type 'deep_work' or duration >= 50 mins)
      if (s.type === "deep_work" || duration >= 50) {
        deepWorkMins += duration;
      }
    });

    // Calculate Streak
    let streak = 0;
    const checkDate = new Date();

    // Check if user completed something today or yesterday to continue streak
    let activeToday = activityDays[checkDate.toISOString().split("T")[0]] || false;

    checkDate.setDate(checkDate.getDate() - 1);
    let activeYesterday = activityDays[checkDate.toISOString().split("T")[0]] || false;

    if (activeToday || activeYesterday) {
      streak = activeToday ? 1 : 0;
      let countDate = new Date();
      if (!activeToday) countDate.setDate(countDate.getDate() - 1);

      while (true) {
        countDate.setDate(countDate.getDate() - 1);
        const dayKey = countDate.toISOString().split("T")[0];
        if (activityDays[dayKey]) {
          streak++;
        } else {
          break;
        }
      }
    }

    const completionRate =
      sessions.length > 0
        ? Math.round((sessions.filter((s) => s.completed).length / sessions.length) * 100)
        : 100;

    return {
      todayFocusHours: Math.round((todayMins / 60) * 10) / 10,
      weeklyFocusHours: Math.round((weeklyMins / 60) * 10) / 10,
      monthlyFocusHours: Math.round((monthlyMins / 60) * 10) / 10,
      deepWorkStreak: streak,
      sessionCompletionRate: completionRate,
      focusSessionsCount: sessions.length,
      deepWorkHours: Math.round((deepWorkMins / 60) * 10) / 10,
      weeklyBreakdown,
      sessionsList: sessions.slice(0, 15),
    };
  }
}
