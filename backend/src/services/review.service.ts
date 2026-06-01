import { supabase } from "../lib/supabase.js";
import { AppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { TaskService } from "./task.service.js";
import { HabitService } from "./habit.service.js";
import { config } from "../config/index.js";

const PRIMARY_MODEL = "gemini-2.5-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export class ReviewService {
  /**
   * Fetches all reflection reviews completed by a user
   */
  static async getReviewsForUser(userId: string) {
    logger.info(`Fetching reflection reviews history for user: ${userId}`);
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error(`Failed to fetch reviews: ${error.message}`);
      throw new AppError(`Failed to fetch reviews: ${error.message}`, 500);
    }
    return data || [];
  }

  /**
   * Saves a reflection review journal
   */
  static async saveReview(
    userId: string,
    payload: {
      type: "weekly" | "monthly";
      period_start: string;
      period_end: string;
      wins: string[];
      missed_tasks: unknown[];
      goal_progress: unknown[];
      habit_performance: unknown;
      reflection_q_and_a: unknown;
      next_plan: unknown;
    },
  ) {
    logger.info(`Saving reflection review for user: ${userId}, type: ${payload.type}`);
    const { data, error } = await supabase
      .from("reviews")
      .insert({
        user_id: userId,
        type: payload.type,
        period_start: payload.period_start,
        period_end: payload.period_end,
        wins: payload.wins,
        missed_tasks: payload.missed_tasks,
        goal_progress: payload.goal_progress,
        habit_performance: payload.habit_performance,
        reflection_q_and_a: payload.reflection_q_and_a,
        next_plan: payload.next_plan,
      })
      .select("*")
      .single();

    if (error) {
      logger.error(`Failed to save review: ${error.message}`);
      throw new AppError(`Failed to save review: ${error.message}`, 500);
    }
    return data;
  }

  /**
   * Generates a data-driven AI Review Draft based on recent workspace context
   */
  static async generateReviewDraft(
    userId: string,
    type: "weekly" | "monthly",
    periodStart: string,
    periodEnd: string,
  ) {
    logger.info(`AI compiling reflection review draft for user: ${userId}, type: ${type}`);

    // 1. Fetch recent Tasks context
    const tasks = await TaskService.getTasksForUser(userId);
    const completedTasks = tasks.filter(
      (t) =>
        t.status === "done" &&
        t.updated_at &&
        t.updated_at >= periodStart &&
        t.updated_at <= periodEnd,
    );
    const pendingTasks = tasks.filter((t) => t.status !== "done");
    const overdueTasks = pendingTasks.filter(
      (t) => t.due_date && t.due_date.split("T")[0] < periodEnd.split("T")[0],
    );

    // 2. Fetch recent Habits context
    const habits = await HabitService.getHabitsForUser(userId);
    // Habits check-ins
    const { data: habitLogs } = await supabase
      .from("habit_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("completed_at", periodStart)
      .lte("completed_at", periodEnd);

    // 3. Fetch Goals context
    const { data: goals } = await supabase.from("goals").select("*").eq("user_id", userId);
    const activeGoals = (goals || []).filter((g) => g.status === "active");

    // 4. Fetch schedule planner focus blocks duration
    const { data: scheduleBlocks } = await supabase
      .from("schedule_blocks")
      .select("*")
      .eq("user_id", userId)
      .eq("block_type", "focus")
      .gte("start_time", periodStart)
      .lte("start_time", periodEnd);

    let actualFocusMinutes = 0;
    scheduleBlocks?.forEach((b) => {
      if (b.start_time && b.end_time) {
        actualFocusMinutes +=
          (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 60000;
      }
    });

    let focusSessionsHours = 0;
    let completedSessionsCount = 0;
    try {
      const { data: focusSessions } = await supabase
        .from("focus_sessions")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", periodStart)
        .lte("created_at", periodEnd);
      if (focusSessions && focusSessions.length > 0) {
        const completedFs = focusSessions.filter((fs) => fs.completed);
        completedSessionsCount = completedFs.length;
        const focusMins = completedFs.reduce((sum, fs) => sum + (fs.duration_minutes || 0), 0);
        focusSessionsHours = Math.round((focusMins / 60) * 10) / 10;
      }
    } catch (e: any) {
      logger.warn(`focus_sessions query ignored: ${e.message}`);
    }

    const calculatedFocusHours = focusSessionsHours > 0 ? focusSessionsHours : Math.round((actualFocusMinutes / 60) * 10) / 10;

    const apiKey = config.GEMINI_API_KEY;
    if (!apiKey || apiKey === "placeholder-gemini-key") {
      // Fallback if Gemini key is missing
      return {
        wins: completedTasks.slice(0, 3).map((t) => t.title) || ["Completed deep tasks"],
        missed_tasks: overdueTasks
          .slice(0, 3)
          .map((t) => ({ title: t.title, priority: t.priority })),
        goal_progress: activeGoals
          .slice(0, 3)
          .map((g) => ({ title: g.title, progress: g.progress })),
        habit_performance: {
          totalHabitsCount: habits.length,
          logsCompletedCount: habitLogs?.length || 0,
        },
        next_plan: {
          priorities: ["Increase focus sessions next week", "Complete remaining milestones"],
          suggestedGoals: ["Maintain discipline streak"],
        },
      };
    }

    const contextPayload = {
      type,
      periodStart,
      periodEnd,
      tasks: {
        completedCount: completedTasks.length,
        completedList: completedTasks.map((t) => t.title),
        overdueCount: overdueTasks.length,
        overdueList: overdueTasks.map((t) => t.title),
      },
      habits: habits.map((h) => ({
        name: h.name,
        consistencyPercent: h.pct || 0,
        currentStreak: h.streak || 0,
      })),
      goals: activeGoals.map((g) => ({ title: g.title, progress: g.progress || 0 })),
      focusHours: calculatedFocusHours,
      completedFocusSessions: completedSessionsCount,
    };

    const promptText = `
You are FlowPilot's AI Executive Coach and Reflection Specialist.
The user is performing a ${type} review for the period ${periodStart} to ${periodEnd}.
Below is their live workspace context from the past period:
${JSON.stringify(contextPayload, null, 2)}

Your job is to analyze this data and generate a professional, highly encouraging, and deeply insightful reflection draft in JSON.
Specifically, synthesize:
1. "wins": Exactly 3 to 5 clear, high-impact achievements from their completed tasks, focus hours, and goals progress. Celebrate active wins.
2. "missed_tasks": A list of items that stalled, highlighting up to 3 overdue tasks, explaining why they might have slipped, and offering brief adjustments.
3. "goal_progress": A status mapping of their top active goals with progress analysis.
4. "habit_performance": A reflection on habit consistency, logs completed, and key strengths.
5. "next_plan": Actionable recommendations for the next period, including:
   - "priorities": 3 concrete, high-priority things to focus on.
   - "focus_areas": 2 operational domains needing structure.
   - "recommended_goals": A suggested new or accelerated goal theme.

Return ONLY valid JSON. No markdown fences.
Schema:
{
  "wins": ["Achieved X", "Focused Y hours"],
  "missed_tasks": [{"title": "Task A", "insight": "Analysis of why it slipped"}],
  "goal_progress": [{"title": "Goal B", "progress": 45, "status_insight": "Insight"}],
  "habit_performance": {
    "totalHabitsCount": 5,
    "completedLogs": 12,
    "insight": "Habit routine assessment"
  },
  "next_plan": {
    "priorities": ["Draft 1", "Draft 2"],
    "focus_areas": ["Domain 1", "Domain 2"],
    "recommended_goals": "Suggested path"
  }
}
`;

    const url = `${GEMINI_BASE}/${PRIMARY_MODEL}:generateContent?key=${apiKey}`;
    const payload = {
      contents: [
        {
          parts: [{ text: promptText }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Gemini status ${response.status}`);
      }

      const resData = await response.json();
      const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error("Empty response candidates");
      }

      return JSON.parse(rawText);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to generate reflection draft from Gemini: ${errMsg}`);
      // Fallback
      return {
        wins: completedTasks.slice(0, 3).map((t) => t.title) || ["Completed deep tasks"],
        missed_tasks: overdueTasks.slice(0, 3).map((t) => ({
          title: t.title,
          insight: "Slipped past its scheduled deadline due to cognitive load.",
        })),
        goal_progress: activeGoals.slice(0, 3).map((g) => ({
          title: g.title,
          progress: g.progress,
          status_insight: "Progressing in milestones.",
        })),
        habit_performance: {
          totalHabitsCount: habits.length,
          completedLogs: habitLogs?.length || 0,
          insight: "Consistency averages are balanced. Keep check-ins active.",
        },
        next_plan: {
          priorities: ["Increase focus sessions next week", "Complete remaining milestones"],
          focus_areas: ["Execution Focus", "Habit Continuity"],
          recommended_goals: "Refining active roadmap checklists",
        },
      };
    }
  }
}
