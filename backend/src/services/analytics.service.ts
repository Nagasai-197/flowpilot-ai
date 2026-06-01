import { supabase } from "../lib/supabase.js";
import { HabitService } from "./habit.service.js";
import { AppError } from "../utils/errors.js";
import { analyticsConfig } from "../config/analytics.config.js";

export class AnalyticsService {
  /**
   * Aggregates main dashboard metrics including real-time productivity scores
   */
  static async getDashboardStats(userId: string, localDate?: string) {
    const todayStr = localDate || new Date().toISOString().split("T")[0];
    const today = localDate ? new Date(localDate + "T12:00:00") : new Date();

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const start7Str = sevenDaysAgo.toLocaleDateString("en-CA");

    // 1. Fetch Today's Tasks completed / total in 7-day window
    const { data: todayTasks, error: tasksError } = await supabase
      .from("tasks")
      .select("status, due_date, updated_at")
      .eq("user_id", userId)
      .or(`due_date.gte.${start7Str}T00:00:00Z,updated_at.gte.${start7Str}T00:00:00Z`);

    if (tasksError) {
      throw new AppError(`Failed to fetch tasks stats: ${tasksError.message}`, 500);
    }

    const completedToday =
      todayTasks?.filter((t) => {
        if (t.status !== "done") return false;
        const isUpdatedToday = t.updated_at && t.updated_at.split("T")[0] === todayStr;
        const isDueToday = t.due_date && t.due_date.split("T")[0] === todayStr;
        return isUpdatedToday || isDueToday;
      }).length || 0;

    const totalTodayTasks =
      todayTasks?.filter((t) => {
        const isDueToday = t.due_date && t.due_date.split("T")[0] === todayStr;
        const isCompletedToday =
          t.status === "done" && t.updated_at && t.updated_at.split("T")[0] === todayStr;
        return isDueToday || isCompletedToday;
      }) || [];

    const totalToday = totalTodayTasks.length;

    // 2. Fetch User Habits and Streaks
    const habitsStats = await HabitService.getHabitsForUser(userId, localDate);
    const maxStreak = habitsStats.length > 0 ? Math.max(...habitsStats.map((h) => h.streak)) : 0;

    // 3. Calculate 30-day overall habit consistency rate
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const start30Str = thirtyDaysAgo.toLocaleDateString("en-CA");

    let habitConsistency = 0;
    if (habitsStats.length > 0) {
      const habitIds = habitsStats.map((h) => h.id);
      const { data: logs30, error: logs30Error } = await supabase
        .from("habit_logs")
        .select("id")
        .in("habit_id", habitIds)
        .gte("completed_at", `${start30Str}T00:00:00Z`)
        .lte("completed_at", `${todayStr}T23:59:59Z`);

      if (logs30Error) {
        throw new AppError(`Failed to fetch logs count: ${logs30Error.message}`, 500);
      }

      // Fetch habits from database to get their actual created_at dates
      const { data: habitsDb } = await supabase
        .from("habits")
        .select("id, created_at")
        .in("id", habitIds);

      let totalLogsPossible = 0;
      habitsDb?.forEach((h) => {
        const createdDate = new Date(h.created_at || start30Str);
        const diffTime = today.getTime() - createdDate.getTime();
        const diffDays = Math.max(1, Math.min(30, Math.ceil(diffTime / (1000 * 60 * 60 * 24))));
        totalLogsPossible += diffDays;
      });

      if (totalLogsPossible === 0) {
        totalLogsPossible = habitsStats.length * 30;
      }

      habitConsistency =
        totalLogsPossible > 0 ? Math.round(((logs30?.length || 0) / totalLogsPossible) * 100) : 0;
    }

    // 4. Calculate 7-day Productivity Score
    // (sevenDaysAgo and start7Str are already calculated above)

    // Task rate (last 7 days due or completed)
    const tasks7d =
      todayTasks?.filter((t) => {
        const datePart = t.due_date ? t.due_date.split("T")[0] : null;
        const updatedPart = t.updated_at ? t.updated_at.split("T")[0] : null;

        const isDueInRange = datePart && datePart >= start7Str && datePart <= todayStr;
        const isCompletedInRange =
          t.status === "done" && updatedPart && updatedPart >= start7Str && updatedPart <= todayStr;

        return isDueInRange || isCompletedInRange;
      }) || [];
    const completedTasks7d = tasks7d.filter((t) => t.status === "done").length;
    const totalTasks7d = tasks7d.length;
    const taskRate = totalTasks7d > 0 ? completedTasks7d / totalTasks7d : 1.0;

    // Habit rate (last 7 days)
    let habitRate = 1.0;
    if (habitsStats.length > 0) {
      const habitIds = habitsStats.map((h) => h.id);
      const { data: logs7, error: logs7Error } = await supabase
        .from("habit_logs")
        .select("id")
        .in("habit_id", habitIds)
        .gte("completed_at", `${start7Str}T00:00:00Z`)
        .lte("completed_at", `${todayStr}T23:59:59Z`);

      if (logs7Error) {
        throw new AppError(`Failed to fetch logs count: ${logs7Error.message}`, 500);
      }

      const totalPossible7 = habitsStats.length * 7;
      habitRate = totalPossible7 > 0 ? (logs7?.length || 0) / totalPossible7 : 1.0;
    }

    // Dynamic Weighted Formula using centralized configurations
    let productivityScore = 0;
    if (totalTasks7d > 0 || habitsStats.length > 0) {
      const taskWeight = analyticsConfig.scoring.factors.taskCompletion.weight;
      const habitWeight = analyticsConfig.scoring.factors.habitCheckIn.weight;

      let divisor = 0;
      let weightedSum = 0;

      if (totalTasks7d > 0) {
        weightedSum += taskRate * taskWeight;
        divisor += taskWeight;
      }
      if (habitsStats.length > 0) {
        weightedSum += habitRate * habitWeight;
        divisor += habitWeight;
      }

      productivityScore = divisor > 0 ? Math.round((weightedSum / divisor) * 100) : 0;
    } else {
      productivityScore = 0;
    }

    return {
      productivityScore: Math.min(100, Math.max(0, productivityScore)),
      tasksToday: `${completedToday}/${totalToday}`,
      tasksDonePercentage: totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0,
      habitConsistency: `${habitConsistency}%`,
      currentStreak: `${maxStreak}d`,
    };
  }

  /**
   * Compiles focus and productivity trends for the last 14 days
   */
  static async getTrendStats(userId: string, localDate?: string) {
    const trendData: { d: string; score: number; focus: number }[] = [];
    const todayStr = localDate || new Date().toISOString().split("T")[0];
    const today = localDate ? new Date(localDate + "T12:00:00") : new Date();

    // Generate dates list for the last 14 days
    const dates: string[] = [];
    const displayDates: string[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toLocaleDateString("en-CA"));
      displayDates.push(d.toLocaleDateString("en-US", { day: "numeric" }));
    }

    const startDateStr = dates[0];

    // Fetch tasks in target 14-day range
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, status, due_date, updated_at")
      .eq("user_id", userId)
      .or(`due_date.gte.${startDateStr}T00:00:00Z,updated_at.gte.${startDateStr}T00:00:00Z`);

    if (tasksError) {
      throw new AppError(`Failed to fetch trend tasks: ${tasksError.message}`, 500);
    }

    // Fetch Completed habit logs in range
    const { data: habits, error: habitsError } = await supabase
      .from("habits")
      .select("id")
      .eq("user_id", userId);

    if (habitsError) {
      throw new AppError(`Failed to fetch trend habits: ${habitsError.message}`, 500);
    }

    let logs: any[] = [];
    if (habits && habits.length > 0) {
      const habitIds = habits.map((h) => h.id);
      const { data: fetchedLogs, error: logsError } = await supabase
        .from("habit_logs")
        .select("completed_at")
        .in("habit_id", habitIds)
        .gte("completed_at", `${startDateStr}T00:00:00Z`)
        .lte("completed_at", `${todayStr}T23:59:59Z`);

      if (logsError) {
        throw new AppError(`Failed to fetch trend logs: ${logsError.message}`, 500);
      }
      logs = (fetchedLogs || [])
        .filter((l) => l.completed_at)
        .map((l) => ({
          date: l.completed_at.split("T")[0],
          completed: true,
        }));
    }

    // Fetch Schedule blocks in range for focus time calculations
    const { data: blocks, error: blocksError } = await supabase
      .from("schedule_blocks")
      .select("block_type, start_time, end_time")
      .eq("user_id", userId)
      .eq("block_type", "focus")
      .gte("start_time", `${startDateStr}T00:00:00Z`)
      .lte("start_time", `${todayStr}T23:59:59Z`);

    if (blocksError) {
      throw new AppError(`Failed to fetch trend schedule blocks: ${blocksError.message}`, 500);
    }

    const scheduleBlocks = blocks || [];

    // Populate trend stats per day
    dates.forEach((dateStr, idx) => {
      // Tasks due or completed on this day
      const dayTasks =
        tasks?.filter((t) => {
          const isDueOnDay = t.due_date && t.due_date.split("T")[0] === dateStr;
          const isCompletedOnDay =
            t.status === "done" && t.updated_at && t.updated_at.split("T")[0] === dateStr;
          return isDueOnDay || isCompletedOnDay;
        }) || [];
      const tasksCompleted = dayTasks.filter((t) => t.status === "done").length;
      const tasksDue = dayTasks.length;

      // Habits checked in on this day
      const habitsCompleted = logs.filter((l) => l.date === dateStr).length;
      const activeHabitsCount = habits?.length || 0;

      // Scheduled Focus Minutes on this day
      const dayFocusBlocks = scheduleBlocks.filter(
        (b) => b.start_time && b.start_time.split("T")[0] === dateStr,
      );
      let focusMinutes = 0;
      dayFocusBlocks.forEach((block) => {
        if (block.start_time && block.end_time) {
          const dur =
            (new Date(block.end_time).getTime() - new Date(block.start_time).getTime()) / 60000;
          focusMinutes += Math.max(0, dur);
        }
      });

      // Calculate Daily Focus Score
      // Base: focus block duration + 25 mins per completed task on that day
      const totalFocusMinutes = focusMinutes + tasksCompleted * 25;
      const focusScore = Math.min(100, Math.round((totalFocusMinutes / 180) * 100)); // Target 180 minutes (3 hrs) for 100%

      // Calculate Daily Productivity Score
      let score = 0;
      if (tasksDue > 0 || activeHabitsCount > 0) {
        let divisor = 0;
        let weightedSum = 0;
        if (tasksDue > 0 || tasksCompleted > 0) {
          const taskRate = tasksDue > 0 ? tasksCompleted / tasksDue : 1.0;
          weightedSum += taskRate * 0.6;
          divisor += 0.6;
        }
        if (activeHabitsCount > 0 || habitsCompleted > 0) {
          const habitRate = activeHabitsCount > 0 ? habitsCompleted / activeHabitsCount : 1.0;
          weightedSum += habitRate * 0.4;
          divisor += 0.4;
        }
        score = divisor > 0 ? Math.round((weightedSum / divisor) * 100) : 0;
      } else {
        score = tasksCompleted > 0 || habitsCompleted > 0 ? 100 : 0;
      }

      trendData.push({
        d: displayDates[idx],
        score,
        focus: focusScore,
      });
    });

    return trendData;
  }

  /**
   * Generates productivity heatmap indices over a 12-week timeframe (84 days)
   */
  static async getHeatmapStats(userId: string, localDate?: string) {
    const heat: { i: number; v: number; date: string }[] = [];
    const todayStr = localDate || new Date().toISOString().split("T")[0];
    const today = localDate ? new Date(localDate + "T12:00:00") : new Date();

    // Generate date array for 84 days (12 weeks)
    const dates: string[] = [];
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toLocaleDateString("en-CA"));
    }

    const startDateStr = dates[0];

    // Query tasks completed in 12-week range
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("due_date, updated_at")
      .eq("user_id", userId)
      .eq("status", "done")
      .or(`due_date.gte.${startDateStr}T00:00:00Z,updated_at.gte.${startDateStr}T00:00:00Z`);

    if (tasksError) {
      throw new AppError(`Failed to fetch heatmap tasks: ${tasksError.message}`, 500);
    }

    // Query habits checked in range
    const { data: habits, error: habitsError } = await supabase
      .from("habits")
      .select("id")
      .eq("user_id", userId);

    if (habitsError) {
      throw new AppError(`Failed to fetch heatmap habits: ${habitsError.message}`, 500);
    }

    let logs: any[] = [];
    if (habits && habits.length > 0) {
      const habitIds = habits.map((h) => h.id);
      const { data: fetchedLogs, error: logsError } = await supabase
        .from("habit_logs")
        .select("completed_at")
        .in("habit_id", habitIds)
        .gte("completed_at", `${startDateStr}T00:00:00Z`)
        .lte("completed_at", `${todayStr}T23:59:59Z`);

      if (logsError) {
        throw new AppError(`Failed to fetch heatmap logs: ${logsError.message}`, 500);
      }
      logs = (fetchedLogs || [])
        .filter((l) => l.completed_at)
        .map((l) => ({
          date: l.completed_at.split("T")[0],
        }));
    }

    // Map counts to date items
    dates.forEach((dateStr, idx) => {
      const tasksCompleted =
        tasks?.filter((t) => {
          const isDueOnDay = t.due_date && t.due_date.split("T")[0] === dateStr;
          const isCompletedOnDay = t.updated_at && t.updated_at.split("T")[0] === dateStr;
          return isDueOnDay || isCompletedOnDay;
        }).length || 0;

      const habitsCompleted = logs.filter((l) => l.date === dateStr).length;

      // Intensity level 'v' corresponds directly to the total operations logged on the date
      const intensity = tasksCompleted * 2 + habitsCompleted;

      heat.push({
        i: idx,
        v: Math.min(5, intensity), // cap visual intensity levels at 5
        date: dateStr,
      });
    });

    return heat;
  }
}
