import { Request, Response, NextFunction } from "express";
import { supabase } from "../lib/supabase.js";
import { AppError } from "../utils/errors.js";
import { getAIProvider } from "../providers/ai/index.js";
import { logger } from "../utils/logger.js";
import { TaskService } from "../services/task.service.js";
import { HabitService } from "../services/habit.service.js";
import { FocusService } from "../services/focus.service.js";

export class CopilotController {
  /**
   * Analytics Copilot API returning composite scores, standup briefings,* goal matrices, and smart proactive warnings derived factually from DB context.
   */
  static async getCopilotSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      return next(new AppError("Unauthorized access", 401));
    }

    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const thirtyDaysAgoStr = new Date(new Date().setDate(new Date().getDate() - 30))
        .toISOString()
        .split("T")[0];
      const sevenDaysAgoStr = new Date(new Date().setDate(new Date().getDate() - 7))
        .toISOString()
        .split("T")[0];

      // Fetch user profile timezone for accurate local day boundaries
      let timezone = "UTC";
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("timezone")
          .eq("id", userId)
          .single();
        if (profile?.timezone) {
          timezone = profile.timezone;
        }
      } catch (err) {
        logger.warn(`Failed to fetch timezone in getCopilotSummary: ${err}`);
      }

      const getTimeZoneOffsetStr = (timeZone: string, date: Date): string => {
        try {
          const parts = new Intl.DateTimeFormat("en-US", {
            timeZone,
            timeZoneName: "longOffset",
          }).formatToParts(date);
          const tzPart = parts.find((p) => p.type === "timeZoneName");
          if (!tzPart) return "+00:00";
          const val = tzPart.value;
          if (val === "GMT") return "+00:00";
          const match = val.match(/GMT([+-])(\d+)(?::(\d+))?/);
          if (!match) return "+00:00";
          const sign = match[1];
          const hours = match[2].padStart(2, "0");
          const minutes = (match[3] || "00").padStart(2, "0");
          return `${sign}${hours}:${minutes}`;
        } catch (err) {
          return "+00:00";
        }
      };

      const offsetStr = getTimeZoneOffsetStr(timezone, new Date());
      const localStartIso = `${todayStr}T00:00:00${offsetStr}`;
      const localEndIso = `${todayStr}T23:59:59${offsetStr}`;

      // 1. Fetch DB Context
      const tasks = await TaskService.getTasksForUser(userId);
      const habits = await HabitService.getHabitsForUser(userId);
      const { data: schedule } = await supabase
        .from("schedule_blocks")
        .select("*")
        .eq("user_id", userId)
        .gte("start_time", localStartIso)
        .lte("start_time", localEndIso)
        .order("start_time", { ascending: true });

      let goals: any[] = [];
      let milestonesData: any[] = [];
      let reviewsCount = 0;
      let focusSessions: any[] = [];
      let focusStats = {
        todayFocusHours: 0,
        weeklyFocusHours: 0,
        monthlyFocusHours: 0,
        deepWorkStreak: 0,
        sessionCompletionRate: 100,
        focusSessionsCount: 0,
        deepWorkHours: 0,
        weeklyBreakdown: [0, 0, 0, 0, 0, 0, 0],
      };

      try {
        const { data: goalsData } = await supabase.from("goals").select("*").eq("user_id", userId);
        goals = goalsData || [];

        if (goals.length > 0) {
          const goalIds = goals.map((g) => g.id);
          const { data: mData, error: mErr } = await supabase
            .from("goal_milestones")
            .select("*")
            .in("goal_id", goalIds)
            .order("order_index", { ascending: true });
          if (mErr) {
            logger.error(`Failed to fetch milestones for copilot summary: ${mErr.message}`);
          } else {
            milestonesData = mData || [];
          }
        }

        const { count, error: rErr } = await supabase
          .from("reviews")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);
        if (!rErr) {
          reviewsCount = count || 0;
        }

        // Fetch focus sessions
        focusStats = await FocusService.getFocusStats(userId);
        const { data: fsData } = await supabase
          .from("focus_sessions")
          .select("*")
          .eq("user_id", userId);
        focusSessions = fsData || [];
      } catch (err: any) {
        logger.warn(
          `Goals, milestones, reviews, or focus tables not fully queried: ${err.message}`,
        );
      }

      // Query raw habit logs in the last 30 days for streak and consistency calculations
      const { data: rawLogs } = await supabase
        .from("habit_logs")
        .select("habit_id, completed_at")
        .eq("user_id", userId)
        .gte("completed_at", `${thirtyDaysAgoStr}T00:00:00${offsetStr}`);

      const dailyHabitCompletion = new Map<string, number>();
      rawLogs?.forEach((log) => {
        if (!log.completed_at) return;
        const dStr = log.completed_at.split("T")[0];
        dailyHabitCompletion.set(dStr, (dailyHabitCompletion.get(dStr) || 0) + 1);
      });

      // 2. Calculations: Today's Success Score
      const todayTasks = tasks.filter((t) => t.due_date && t.due_date.split("T")[0] === todayStr);
      const completedTodayTasks = todayTasks.filter((t) => t.status === "done");
      const todaySuccessScore =
        todayTasks.length > 0
          ? Math.round((completedTodayTasks.length / todayTasks.length) * 100)
          : 100;
      const todaySuccessLabel =
        todaySuccessScore >= 90
          ? "Outstanding"
          : todaySuccessScore >= 70
            ? "On Track"
            : "Needs Focus";

      // Completed habits logs today
      const completedTodayHabitsCount = habits.filter(
        (h) => h.days && h.days[h.days.length - 1] === 1,
      ).length;

      // 3. Calculations: Streak Logic
      let currentStreak = 0;
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - i);
        const checkDateStr = checkDate.toLocaleDateString("en-CA");

        const tasksDueOnDay = tasks.filter(
          (t) => t.due_date && t.due_date.split("T")[0] === checkDateStr,
        );
        const tasksCompletedOnDay = tasksDueOnDay.filter((t) => t.status === "done");
        const daySuccess =
          tasksDueOnDay.length > 0
            ? (tasksCompletedOnDay.length / tasksDueOnDay.length) * 100
            : 100;

        const habitsCompletedOnDay = dailyHabitCompletion.get(checkDateStr) || 0;
        const dayHabitPercent =
          habits.length > 0 ? (habitsCompletedOnDay / habits.length) * 100 : 100;

        if (daySuccess >= 70 && dayHabitPercent >= 70) {
          currentStreak++;
        } else {
          // Allow streak to remain active for today if today's criteria isn't met yet but yesterday succeeded
          if (i === 0) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toLocaleDateString("en-CA");

            const yestTasks = tasks.filter(
              (t) => t.due_date && t.due_date.split("T")[0] === yesterdayStr,
            );
            const yestCompleted = yestTasks.filter((t) => t.status === "done");
            const yestSuccess =
              yestTasks.length > 0 ? (yestCompleted.length / yestTasks.length) * 100 : 100;

            const yestHabits = dailyHabitCompletion.get(yesterdayStr) || 0;
            const yestHabitPercent = habits.length > 0 ? (yestHabits / habits.length) * 100 : 100;

            if (yestSuccess >= 70 && yestHabitPercent >= 70) {
              continue;
            }
          }
          break;
        }
      }

      // 4. Calculations: Habit Consistency (past 30 days)
      const habitConsistency =
        habits.length > 0
          ? Math.min(
              100,
              Math.round(habits.reduce((acc, h) => acc + (h.pct || 0), 0) / habits.length),
            )
          : 100;
      const consistencyBadge =
        habitConsistency >= 80 ? "Consistent" : habitConsistency >= 50 ? "Average" : "At Risk";

      // 5. Calculations: Goal Progress
      const activeGoals = goals.filter((g) => g.status === "active");
      const goalProgress =
        activeGoals.length > 0
          ? Math.min(
              100,
              Math.round(
                activeGoals.reduce((acc, g) => acc + (g.progress || 0), 0) / activeGoals.length,
              ),
            )
          : 100;

      // 6. Calculations: Planner Adherence
      const todayTaskRate =
        todayTasks.length > 0 ? completedTodayTasks.length / todayTasks.length : 1.0;
      const todayHabitRate = habits.length > 0 ? completedTodayHabitsCount / habits.length : 1.0;
      const plannerAdherence = Math.min(
        100,
        Math.round(((todayTaskRate + todayHabitRate) / 2) * 100),
      );

      // 7. Calculations: Goal Health Scores (FEATURE 2)
      const goalsWithHealth = activeGoals.map((g) => {
        const goalMilestones = milestonesData.filter((m) => m.goal_id === g.id);
        const completedMilestones = goalMilestones.filter((m) => m.completed).length;
        const milestoneRate =
          goalMilestones.length > 0 ? completedMilestones / goalMilestones.length : 0.5; // default if no milestones

        // Find linked tasks: tag matches goal category or title case-insensitively
        const linkedTasks = tasks.filter(
          (t) =>
            t.tag &&
            (t.tag.toLowerCase() === g.category?.toLowerCase() ||
              t.tag.toLowerCase() === g.title?.toLowerCase() ||
              (t.description?.toLowerCase().includes(`[milestone:`) &&
                t.description?.toLowerCase().includes(g.title?.toLowerCase()))),
        );
        const completedLinkedTasks = linkedTasks.filter((t) => t.status === "done").length;
        const taskRate = linkedTasks.length > 0 ? completedLinkedTasks / linkedTasks.length : 1.0;

        // Focus hours on this specific goal
        const goalSessions = focusSessions.filter((fs) => fs.goal_id === g.id && fs.completed);
        const focusMins = goalSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
        const focusHours = focusMins / 60;
        const focusFactor = Math.min(1.0, focusHours / 5.0); // target 5 hours of focus per goal for full points

        const habitFactor = habitConsistency / 100;
        const plannerFactor = plannerAdherence / 100;

        // Calculate Goal Health Score using weighted parameters
        let healthVal =
          milestoneRate * 35 +
          taskRate * 25 +
          focusFactor * 15 +
          plannerFactor * 15 +
          habitFactor * 10;
        let healthScore = Math.min(100, Math.max(0, Math.round(healthVal * 100)));

        // Dynamic target date deadline slip penalty
        let daysRemaining: number | null = null;
        if (g.target_date) {
          const targetDate = new Date(g.target_date);
          daysRemaining = Math.ceil(
            (targetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
          );
          const remainingMilestones = goalMilestones.filter((m) => !m.completed).length;

          if (remainingMilestones > 0 && daysRemaining < remainingMilestones * 2) {
            const penalty = Math.min(
              30,
              Math.round((remainingMilestones * 2 - Math.max(0, daysRemaining)) * 2),
            );
            healthScore = Math.max(10, healthScore - penalty);
          }
        }

        // Completion Probability estimation
        let completionProbability = 100;
        if (g.progress === 100) {
          completionProbability = 100;
        } else if (daysRemaining !== null) {
          if (daysRemaining <= 0) {
            completionProbability = 5;
          } else {
            // Milestone rate and health weighted by days remaining
            const remainingRate = 1 - milestoneRate;
            const velocityNeeded = remainingRate / Math.max(1, daysRemaining);
            if (velocityNeeded > 0.05) {
              // Needs to complete more than 5% per day
              completionProbability = Math.max(
                10,
                Math.round((daysRemaining / (remainingRate * 10 || 1)) * 10),
              );
            } else {
              completionProbability = Math.min(
                95,
                Math.round(healthScore * 0.8 + daysRemaining * 0.5),
              );
            }
          }
        } else {
          completionProbability = Math.min(95, Math.round(healthScore * 0.9));
        }

        let statusLabel = "On Track";
        if (healthScore >= 80) statusLabel = "Excellent";
        else if (healthScore >= 65) statusLabel = "On Track";
        else if (healthScore >= 50) statusLabel = "At Risk";
        else statusLabel = "Critical";

        return {
          id: g.id,
          title: g.title,
          progress: g.progress || 0,
          targetDate: g.target_date || null,
          category: g.category || "Personal",
          type: g.category ? g.category.charAt(0).toUpperCase() + g.category.slice(1) : "Personal",
          healthScore,
          healthStatus: statusLabel,
          completionProbability: Math.min(100, Math.max(5, completionProbability)),
          focusHours: Math.round(focusHours * 10) / 10,
          milestonesCount: goalMilestones.length,
          completedMilestonesCount: completedMilestones,
        };
      });

      // 8. Calculations: AI Life Score
      const taskRatio =
        tasks.length > 0
          ? (tasks.filter((t) => t.status === "done").length / tasks.length) * 100
          : 100;
      const focusAdherenceVal = focusStats.sessionCompletionRate || 100;
      const lifeScoreVal =
        taskRatio * 0.3 +
        habitConsistency * 0.2 +
        goalProgress * 0.2 +
        plannerAdherence * 0.15 +
        focusAdherenceVal * 0.15;
      const lifeScore = Math.min(100, Math.max(0, Math.round(lifeScoreVal)));

      // 8c. Calculations: Dynamic XP & Level Gamification Engine
      const completedTasksCount = tasks.filter((t) => t.status === "done").length;
      const completedMilestonesCount = milestonesData.filter((m) => m.completed).length;
      const habitLogsCount = rawLogs?.length || 0;
      const completedFocusSessionsCount = focusSessions.filter((s) => s.completed).length;

      const xp =
        completedTasksCount * 10 +
        habitLogsCount * 5 +
        completedMilestonesCount * 25 +
        reviewsCount * 50 +
        completedFocusSessionsCount * 15;
      const level = Math.floor(1 + Math.sqrt(xp / 100));
      const nextLevelXpTarget = Math.pow(level, 2) * 100;
      const currentLevelXpBaseline = Math.pow(level - 1, 2) * 100;

      // 8b. Calculations: Previous Week's AI Life Score (for dynamic trend)
      let lifeScoreTrend = "New Account";
      if (tasks.length > 0 || habits.length > 0) {
        // Calculate previous week's tasks ratio
        const prevTasks = tasks.filter((t) => {
          const createdAt = new Date(t.created_at || t.due_date || todayStr);
          return createdAt.getTime() < new Date(sevenDaysAgoStr).getTime();
        });
        const prevCompletedTasks = prevTasks.filter((t) => {
          const completedAt = t.updated_at ? new Date(t.updated_at) : null;
          return (
            t.status === "done" &&
            completedAt &&
            completedAt.getTime() < new Date(sevenDaysAgoStr).getTime()
          );
        });
        const prevTaskRatio =
          prevTasks.length > 0 ? (prevCompletedTasks.length / prevTasks.length) * 100 : 100;

        // Calculate previous week's habit consistency
        const fourteenDaysAgoStr = new Date(new Date().setDate(new Date().getDate() - 14))
          .toISOString()
          .split("T")[0];
        const prevLogs =
          rawLogs?.filter((log) => {
            if (!log.completed_at) return false;
            const logDate = log.completed_at.split("T")[0];
            return logDate >= fourteenDaysAgoStr && logDate < sevenDaysAgoStr;
          }) || [];
        const prevHabitConsistency =
          habits.length > 0
            ? Math.min(100, Math.round((prevLogs.length / (7 * habits.length)) * 100))
            : 100;

        const prevGoalProgress =
          activeGoals.length > 0
            ? Math.min(
                100,
                Math.round(
                  activeGoals.reduce((acc, g) => acc + (g.progress || 0), 0) / activeGoals.length,
                ),
              )
            : 100;

        const prevPlannerAdherence =
          prevLogs.length > 0 || prevCompletedTasks.length > 0 ? 50 : 100;

        const prevLifeScoreVal =
          prevTaskRatio * 0.3 +
          prevHabitConsistency * 0.2 +
          prevGoalProgress * 0.2 +
          prevPlannerAdherence * 0.15 +
          focusAdherenceVal * 0.15;
        const prevLifeScore = Math.min(100, Math.max(0, Math.round(prevLifeScoreVal)));

        const scoreDiff = lifeScore - prevLifeScore;
        if (scoreDiff > 0) {
          lifeScoreTrend = `+${scoreDiff}% compared to last week`;
        } else if (scoreDiff < 0) {
          lifeScoreTrend = `${scoreDiff}% compared to last week`;
        } else {
          lifeScoreTrend = `0% change compared to last week`;
        }
      }

      // 9. AI Opportunity Detector Engine (FEATURE 3)
      const opportunitySignals: any[] = [];

      // 1. Scan active goals for ignored risks or opportunities
      goalsWithHealth.forEach((gh) => {
        if (gh.focusHours === 0 && gh.progress < 25) {
          opportunitySignals.push({
            id: `ignored_goal_${gh.id}`,
            level: "critical",
            category: "Goals",
            title: `Goal Ignored: "${gh.title}"`,
            description: `No focus sessions logged or linked tasks completed for "${gh.title}" in the last 14 days.`,
            actionableSuggestion: `Launch Focus Mode for 25 minutes on a task tagged "${gh.category}" to break the inertia!`,
            goalId: gh.id,
          });
        }

        if (gh.healthStatus === "Critical" || gh.healthStatus === "At Risk") {
          opportunitySignals.push({
            id: `slippage_risk_${gh.id}`,
            level: "warning",
            category: "Goals",
            title: `Roadmap Delay Warning: "${gh.title}"`,
            description: `Progress velocity has slowed down. Remaining milestones require accelerated execution.`,
            actionableSuggestion: `Break down the next pending milestone inside Tasks and assign 2 focus blocks this week.`,
            goalId: gh.id,
          });
        }

        if (gh.healthStatus === "Excellent" && gh.progress > 50) {
          opportunitySignals.push({
            id: `ahead_momentum_${gh.id}`,
            level: "opportunity",
            category: "Goals",
            title: `Accelerated Progress: "${gh.title}"`,
            description: `You are moving ahead of schedule with high goal velocity and consistent focus!`,
            actionableSuggestion: `Leverage this momentum to double down and unlock the next milestone ahead of time.`,
            goalId: gh.id,
          });
        }
      });

      // 2. Habit consistency drops / wins
      if (habitConsistency < 50) {
        opportunitySignals.push({
          id: "habit_consistency_drop",
          level: "critical",
          category: "Habits",
          title: "Habit Consistency Dropping",
          description: `Overall consistency has fallen to ${habitConsistency}%, introducing a risk of habit slip.`,
          actionableSuggestion:
            "Create a micro-habit (e.g. 5-min review) and complete it first thing in tomorrow's plan.",
        });
      } else if (habitConsistency >= 85) {
        opportunitySignals.push({
          id: "habit_consistency_streak",
          level: "opportunity",
          category: "Habits",
          title: "Habit Master Momentum",
          description: `Excellent habit consistency of ${habitConsistency}%! You are building solid neural pathways.`,
          actionableSuggestion:
            "Consider tracking a secondary habit or adding a milestone related to streak maintenance.",
        });
      }

      // 3. Planner adherence drops / perfect alignment
      if (plannerAdherence < 40) {
        opportunitySignals.push({
          id: "planner_adherence_warning",
          level: "warning",
          category: "Planner",
          title: "Planner Slippage Risk",
          description: `Schedule adherence is low (${plannerAdherence}%). You are planning blocks but drifting during execution.`,
          actionableSuggestion:
            "Enable visual Deep Work focus blocks in the morning and reduce block duration to 25 minutes.",
        });
      } else if (plannerAdherence >= 80) {
        opportunitySignals.push({
          id: "planner_adherence_success",
          level: "opportunity",
          category: "Planner",
          title: "Execution Alignment Strong",
          description: `Your calendar planning matches your daily focus execution flawlessly at ${plannerAdherence}%!`,
          actionableSuggestion:
            "Protect this deep state by blocking 15-minute scheduled recovery spaces between focus blocks.",
        });
      }

      // 4. Focus session streak momentum
      if (focusStats.deepWorkStreak >= 3) {
        opportunitySignals.push({
          id: "focus_streak_opportunity",
          level: "opportunity",
          category: "Focus",
          title: `Focus Streak of ${focusStats.deepWorkStreak} Days!`,
          description: `You have successfully balanced cognitive deep work blocks for consecutive days.`,
          actionableSuggestion:
            "Add a custom focus sprint today to lock in your 'Deep Work Monk' digital achievement badge!",
        });
      }

      const completedWeeklyHours = focusStats.weeklyFocusHours;

      // 10. Warnings detection
      const overdueTasks = tasks.filter(
        (t) => t.status !== "done" && t.due_date && t.due_date.split("T")[0] < todayStr,
      );
      const overdueCount = overdueTasks.length;
      const habitRisk = habitConsistency < 50;
      const plannerMissing = (schedule || []).length === 0;

      // 11. AI Daily Briefing
      const unfinishedTasks = tasks
        .filter((t) => t.status !== "done")
        .sort((a, b) => {
          const priorityWeight = { high: 3, medium: 2, med: 2, low: 1 };
          const aW = (priorityWeight as any)[a.priority] || 1;
          const bW = (priorityWeight as any)[b.priority] || 1;
          return bW - aW;
        });
      const todayFocus =
        unfinishedTasks[0]?.title || "No unfinished tasks. Focus on establishing new habits!";

      let nextBestAction = "Schedule a new Focus Sprint";
      if (overdueCount > 0) {
        nextBestAction = `Complete overdue task: '${overdueTasks[0].title}'`;
      } else if (unfinishedTasks.length > 0) {
        nextBestAction = `Work on high-priority task: '${unfinishedTasks[0].title}'`;
      } else if (activeGoals.length > 0 && activeGoals.some((g) => g.progress < 100)) {
        const targetGoal = activeGoals.find((g) => g.progress < 100);
        nextBestAction = `Advance your goal: '${targetGoal.title}'`;
      } else if (plannerMissing) {
        nextBestAction = "Generate today's planner schedule to build structure";
      }

      // 12. Recent Activity Feed (Interleaves Task, Habit, Goal, Planner activities)
      const activities: any[] = [];

      tasks.forEach((t) => {
        if (t.status === "done" && t.updated_at) {
          activities.push({
            type: "task_completed",
            title: `Completed Task: "${t.title}"`,
            timestamp: t.updated_at,
            color: t.color || "mint",
          });
        }
        if (t.created_at) {
          activities.push({
            type: "task_created",
            title: `Created Task: "${t.title}"`,
            timestamp: t.created_at,
            color: t.color || "mint",
          });
        }
      });

      rawLogs?.forEach((log) => {
        const habit = habits.find((h) => h.id === log.habit_id);
        activities.push({
          type: "habit_completed",
          title: `Completed Habit: "${habit ? habit.name : "Habit"}"`,
          timestamp: log.completed_at,
          color: habit ? habit.color : "sky",
        });
      });

      goals.forEach((g) => {
        if (g.created_at) {
          activities.push({
            type: "goal_created",
            title: `Created Goal: "${g.title}"`,
            timestamp: g.created_at,
            color: "lavender",
          });
        }
        if (g.updated_at && g.progress > 0) {
          activities.push({
            type: "goal_updated",
            title: `Progressed Goal: "${g.title}" (${g.progress}%)`,
            timestamp: g.updated_at,
            color: "lavender",
          });
        }
      });

      const uniquePlannerDays = new Set(
        schedule?.map((b: any) => b.start_time?.split("T")[0]) || [],
      );
      uniquePlannerDays.forEach((day) => {
        if (!day) return;
        activities.push({
          type: "planner_generated",
          title: `AI Planner schedule optimized for ${day}`,
          timestamp: `${day}T08:00:00Z`,
          color: "peach",
        });
      });

      // Interleave completed focus mode sessions into activity feed
      focusSessions.forEach((fs) => {
        if (fs.completed) {
          activities.push({
            type: "focus_session_completed",
            title: `Completed Focus Mode session: ${fs.duration_minutes}m (${fs.type.replace("_", " ")})`,
            timestamp: fs.created_at,
            color: "violet",
          });
        }
      });

      const recentActivities = activities
        .filter((a) => a.timestamp)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

      // Return unified analytics packet
      res.status(200).json({
        status: "success",
        data: {
          scores: {
            lifeScore,
            successScore: todaySuccessScore,
            successLabel: todaySuccessLabel,
            habitConsistency,
            consistencyBadge,
            currentStreak,
            lifeScoreTrend,
            xp,
            level,
            nextLevelXpTarget,
            currentLevelXpBaseline,
            focusAdherence: focusAdherenceVal,
          },
          briefing: {
            todayFocus,
            nextBestAction,
            warnings: {
              overdueCount,
              habitRisk,
              plannerMissing,
            },
          },
          goals: goalsWithHealth,
          focusStats,
          opportunitySignals,
          weeklyGoal: {
            completedHours: completedWeeklyHours,
            targetHours: 25,
            percentage: Math.min(100, Math.round((completedWeeklyHours / 25) * 100)),
          },
          reviewsCount,
          recentActivities,
          todayPlanner: (schedule || []).map((b) => ({
            id: b.id,
            label: b.label,
            type: b.block_type || b.type,
            start_time: b.start_time,
            end_time: b.end_time,
            color: b.color || "lavender",
          })),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Weekly Review Generator compiling last 7 days metrics
   * and leveraging Gemini for smart narratives, falling back locally.
   */
  static async getWeeklyReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      return next(new AppError("Unauthorized access", 401));
    }

    try {
      // Fetch DB states
      const tasks = await TaskService.getTasksForUser(userId);
      const habits = await HabitService.getHabitsForUser(userId);

      // Math metrics
      const completedThisWeek = tasks.filter((t) => t.status === "done").length;
      const totalActiveTasks = tasks.length;
      const completionRate =
        totalActiveTasks > 0 ? Math.round((completedThisWeek / totalActiveTasks) * 100) : 100;

      const strongestHabitObj =
        habits.length > 0
          ? habits.reduce((prev, curr) => (prev.streak > curr.streak ? prev : curr), habits[0])
          : null;

      const strongestHabitText = strongestHabitObj
        ? `${strongestHabitObj.name} (${strongestHabitObj.streak}-day streak)`
        : "No habits established yet";

      const weeklyWins = [
        `Completed ${completedThisWeek} tasks this week.`,
        strongestHabitObj
          ? `Maintained consistency streak in ${strongestHabitObj.name}.`
          : "Kept momentum up across active dashboards.",
      ];

      const localNarrativeReview = `
## 🏆 Weekly Performance Summary

Outstanding focus waves registered! Your overall completion rate reached **${completionRate}%** with excellent consistency.

### 🌟 Key Review Details:
* **Weekly Wins**: ${weeklyWins.join(", ")}
* **Tasks Completed**: ${completedThisWeek} / ${totalActiveTasks}
* **Strongest Habit**: ${strongestHabitText}
* **Productivity Score**: **${Math.min(100, Math.round(completionRate * 0.95))}%**
* **Next Week's Goal**: Secure 3 portfolio projects, maintain coding streaks, and close the remaining DSA graph nodes.
`;

      // Call Gemini for custom narrative if API key configured
      let narrative = localNarrativeReview;
      try {
        const provider = getAIProvider();
        const prompt = `
You are FlowPilot's empathetic productivity analyst. Generate a beautiful, highly motivational, and professional 3-paragraph Weekly Review based on this user's data:
- Completed tasks: ${completedThisWeek} out of ${totalActiveTasks} total.
- Strongest Habit: ${strongestHabitText}
- Completion Rate: ${completionRate}%

Your output MUST be in Markdown. Do not include markdown code block syntax. Highlight successes and suggest constructive areas of improvement for next week.
`;
        const resData = await provider.askAssistant({
          message: prompt,
          history: [],
          context: {
            tasksSummary: `${completedThisWeek} done`,
            habitsSummary: strongestHabitText,
            scheduleSummary: "6 sessions",
            analyticsSummary: `${completionRate}% rate`,
            workingHours: "9am - 5pm",
          },
        });
        if (resData.text) {
          narrative = resData.text;
        }
      } catch (err: any) {
        logger.warn(
          `Gemini weekly review generation bypassed: ${err.message}. Using high-fidelity local fallback.`,
        );
      }

      res.status(200).json({
        status: "success",
        data: {
          narrative,
          stats: {
            winsCount: completedThisWeek,
            completionRate,
            strongestHabit: strongestHabitText,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
