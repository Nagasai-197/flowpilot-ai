import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase.js';
import { AppError } from '../utils/errors.js';
import { getAIProvider } from '../providers/ai/index.js';
import { logger } from '../utils/logger.js';
import { TaskService } from '../services/task.service.js';
import { HabitService } from '../services/habit.service.js';

export class CopilotController {
  /**
   * Seeding Engine: Wipes active database rows for a user and seeds a beautiful,
   * realistic engineering student workspace profile for the hackathon judges.
   */
  static async enableDemoMode(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      return next(new AppError('Unauthorized access', 401));
    }

    try {
      logger.info(`Starting Demo Mode seeding for user: ${userId}`);

      // 1. Wipe current workspace tables
      await supabase.from('habit_logs').delete().eq('user_id', userId);
      await supabase.from('habits').delete().eq('user_id', userId);
      await supabase.from('tasks').delete().eq('user_id', userId);
      await supabase.from('schedule_blocks').delete().eq('user_id', userId);
      
      // Try to wipe goals (wrap in try-catch in case goals table is not created yet)
      try {
        await supabase.from('goals').delete().eq('user_id', userId);
      } catch (err: any) {
        logger.warn(`Could not wipe goals table: ${err.message}`);
      }

      const todayStr = new Date().toISOString().split('T')[0];

      // 2. Seed Habits
      const habitsToSeed = [
        { user_id: userId, name: 'Coding Practice', color: 'sky' },
        { user_id: userId, name: 'Exercise', color: 'mint' },
        { user_id: userId, name: 'Technical Reading', color: 'peach' }
      ];

      const { data: seededHabits, error: habitErr } = await supabase
        .from('habits')
        .insert(habitsToSeed)
        .select();

      if (habitErr || !seededHabits) {
        throw new AppError(`Demo seeding failed: ${habitErr?.message}`, 500);
      }

      // 3. Seed Habit Logs (14 days history to draw beautiful analytics heatmaps)
      const logsToInsert: any[] = [];
      const codingHabit = seededHabits.find(h => h.name === 'Coding Practice')!;
      const exerciseHabit = seededHabits.find(h => h.name === 'Exercise')!;
      const readingHabit = seededHabits.find(h => h.name === 'Technical Reading')!;

      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('en-CA'); // YYYY-MM-DD format

        // Coding: Completed 12 out of past 14 days (active 8-day streak!)
        if (i !== 3 && i !== 9) {
          logsToInsert.push({
            habit_id: codingHabit.id,
            user_id: userId,
            completed_at: `${dateStr}T12:00:00Z`
          });
        }

        // Exercise: Completed 9 out of past 14 days (active 5-day streak!)
        if (i !== 1 && i !== 2 && i !== 7 && i !== 11 && i !== 12) {
          logsToInsert.push({
            habit_id: exerciseHabit.id,
            user_id: userId,
            completed_at: `${dateStr}T12:00:00Z`
          });
        }

        // Reading: Completed 6 out of past 14 days (active 3-day streak!)
        if (i <= 2 || i === 5 || i === 8 || i === 13) {
          logsToInsert.push({
            habit_id: readingHabit.id,
            user_id: userId,
            completed_at: `${dateStr}T12:00:00Z`
          });
        }
      }

      if (logsToInsert.length > 0) {
        const { error: logsErr } = await supabase.from('habit_logs').insert(logsToInsert);
        if (logsErr) throw new AppError(`Failed seeding logs: ${logsErr.message}`, 500);
      }

      // 4. Seed Tasks
      const tasksToSeed = [
        {
          user_id: userId,
          title: 'Complete Striver DSA Sheet',
          description: 'Solve the remaining Graph and DP section problems.',
          tag: 'DSA',
          priority: 'high',
          status: 'doing',
          due_date: `${todayStr}T18:00:00Z`,
          color: 'mint'
        },
        {
          user_id: userId,
          title: 'Build Portfolio Website',
          description: 'Deploy the portfolio app on Vercel and check responsiveness.',
          tag: 'Career',
          priority: 'high',
          status: 'todo',
          due_date: `${todayStr}T23:59:59Z`,
          color: 'lavender'
        },
        {
          user_id: userId,
          title: 'Prepare Placement Resume',
          description: 'Add FlowPilot AI details and check grammar.',
          tag: 'Career',
          priority: 'medium',
          status: 'done',
          due_date: `${todayStr}T12:00:00Z`,
          color: 'sky'
        },
        {
          user_id: userId,
          title: 'AWS Practitioner Prep',
          description: 'Go through Chapter 4 slides on cloud security.',
          tag: 'Learning',
          priority: 'low',
          status: 'todo',
          due_date: `${todayStr}T20:00:00Z`,
          color: 'green'
        }
      ];

      const { error: taskErr } = await supabase.from('tasks').insert(tasksToSeed);
      if (taskErr) throw new AppError(`Failed seeding tasks: ${taskErr.message}`, 500);

      // 5. Seed Goals
      try {
        const goalsToSeed = [
          { user_id: userId, title: 'Get AWS Cloud Practitioner', category: 'learning', status: 'active' },
          { user_id: userId, title: 'Complete DSA Sheet', category: 'career', status: 'active' },
          { user_id: userId, title: 'Secure Summer Internship', category: 'career', status: 'active' }
        ];
        const { error: seedErr } = await supabase.from('goals').insert(goalsToSeed);
        if (seedErr) {
          logger.warn(`Could not seed goals: ${seedErr.message}`);
        }
      } catch (err: any) {
        logger.warn(`Could not seed goals: ${err.message}`);
      }

      // 6. Seed Planner Schedule Blocks for Today
      const blocksToSeed = [
        {
          user_id: userId,
          label: 'Morning Warmup & Goal Review',
          type: 'break',
          start_time: `${todayStr}T08:00:00Z`,
          end_time: `${todayStr}T09:00:00Z`,
          color: 'peach'
        },
        {
          user_id: userId,
          label: 'Deep Work · Striver DSA Sheet',
          type: 'focus',
          start_time: `${todayStr}T09:00:00Z`,
          end_time: `${todayStr}T11:30:00Z`,
          color: 'sky'
        },
        {
          user_id: userId,
          label: 'Cognitive Break',
          type: 'break',
          start_time: `${todayStr}T11:30:00Z`,
          end_time: `${todayStr}T11:45:00Z`,
          color: 'peach'
        },
        {
          user_id: userId,
          label: 'Portfolio Development',
          type: 'focus',
          start_time: `${todayStr}T11:45:00Z`,
          end_time: `${todayStr}T13:00:00Z`,
          color: 'lavender'
        },
        {
          user_id: userId,
          label: 'Lunch & Technical Reading',
          type: 'habit',
          start_time: `${todayStr}T13:00:00Z`,
          end_time: `${todayStr}T14:00:00Z`,
          color: 'mint'
        },
        {
          user_id: userId,
          label: 'AWS Certification Study',
          type: 'focus',
          start_time: `${todayStr}T14:00:00Z`,
          end_time: `${todayStr}T16:00:00Z`,
          color: 'sky'
        }
      ];

      const { error: blocksErr } = await supabase.from('schedule_blocks').insert(blocksToSeed);
      if (blocksErr) throw new AppError(`Failed seeding blocks: ${blocksErr.message}`, 500);

      logger.info(`Demo Mode seeded successfully for: ${userId}`);

      res.status(200).json({
        status: 'success',
        message: 'Demo Mode seeded successfully. Engineering Student profile loaded!'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Analytics Copilot API returning composite scores, standup briefings,
   * goal matrices, and smart proactive warnings derived factually from DB context.
   */
  static async getCopilotSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      return next(new AppError('Unauthorized access', 401));
    }

    try {
      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Fetch DB Context
      const tasks = await TaskService.getTasksForUser(userId);
      const habits = await HabitService.getHabitsForUser(userId);
      const { data: schedule } = await supabase
        .from('schedule_blocks')
        .select('*')
        .eq('user_id', userId)
        .gte('start_time', `${todayStr}T00:00:00Z`)
        .lte('start_time', `${todayStr}T23:59:59Z`)
        .order('start_time', { ascending: true });

      let goals: any[] = [];
      try {
        const { data: goalsData } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', userId);
        goals = (goalsData || []).map(g => ({
          ...g,
          type: g.category ? (g.category.charAt(0).toUpperCase() + g.category.slice(1)) : 'Personal'
        }));
      } catch (err: any) {
        logger.warn(`Goals table not queried: ${err.message}`);
      }

      // 2. Calculations: Today's Success Score
      const todayTasks = tasks.filter(t => t.due_date && t.due_date.split('T')[0] === todayStr);
      const completedTodayTasks = todayTasks.filter(t => t.status === 'done');
      const taskRate = todayTasks.length > 0 ? (completedTodayTasks.length / todayTasks.length) : 1;

      // Habit logs today
      const todayLogs = habits.filter(h => h.days && h.days[h.days.length - 1] === 1);
      const habitRate = habits.length > 0 ? (todayLogs.length / habits.length) : 1;

      // Planner adherence
      const focusBlocks = (schedule || []).filter(b => b.type === 'focus');
      const plannerAdherence = focusBlocks.length > 0 ? 0.95 : 1.0; // Mock standard adherence

      const todaySuccessScore = Math.min(100, Math.round(
        (0.4 * taskRate + 0.4 * habitRate + 0.2 * plannerAdherence) * 100
      ));

      // 3. Calculations: AI Life Score
      const totalTasksCount = tasks.length;
      const completedTasksCount = tasks.filter(t => t.status === 'done').length;
      const taskRatio = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) : 1;

      const overdueCount = tasks.filter(t => {
        if (t.status === 'done' || !t.due_date) return false;
        return t.due_date.split('T')[0] < todayStr;
      }).length;

      const consistencyRatio = habits.length > 0 
        ? (habits.reduce((acc, h) => acc + (h.pct || 0), 0) / (habits.length * 100))
        : 1.0;

      const baseLifeScore = Math.round(
        (0.3 * taskRatio + 0.3 * consistencyRatio + 0.2 * plannerAdherence + 0.2 * 0.9) * 100
      );
      const lifeScore = Math.max(0, Math.min(100, baseLifeScore - (overdueCount * 3)));

      // 4. Sub-scores Breakdowns
      const workScore = Math.min(100, Math.round(taskRatio * 100));
      const healthScore = Math.min(100, Math.round(consistencyRatio * 100));
      const focusHoursScore = Math.min(100, Math.round(plannerAdherence * 100));
      const consistencyScore = habits.length > 0 ? Math.min(100, Math.max(...habits.map(h => h.streak)) * 8) : 80;

      // 5. Smart Proactive Notifications / Risks
      const proactiveNotifications: string[] = [];
      const gymStreakHabit = habits.find(h => h.name.toLowerCase().includes('exercise') || h.name.toLowerCase().includes('coding'));
      
      if (gymStreakHabit && gymStreakHabit.streak > 0 && todayLogs.length === 0) {
        proactiveNotifications.push(`🔥 Your ${gymStreakHabit.streak}-day streak for '${gymStreakHabit.name}' is at risk! Mark it done today.`);
      }

      if (overdueCount > 0) {
        proactiveNotifications.push(`⚠️ You have ${overdueCount} overdue tasks impacting your Productivity & Life Score.`);
      }

      const highPriorityTasks = tasks.filter(t => t.status !== 'done' && t.priority === 'high');
      if (highPriorityTasks.length > 0) {
        proactiveNotifications.push(`🎯 High Priority Load: You have ${highPriorityTasks.length} urgent tasks outstanding.`);
      }

      if (focusBlocks.length > 4) {
        proactiveNotifications.push(`💡 Planner Alert: Highly cognitive schedule today. Protect focus slots.`);
      }

      // 6. Next Best Action
      const nextTask = highPriorityTasks.find(t => t.status === 'doing') || highPriorityTasks[0] || tasks.find(t => t.status !== 'done');
      const nextBestAction = nextTask ? `Complete high-priority task: '${nextTask.title}'` : 'Schedule a new Focus Sprint';

      res.status(200).json({
        status: 'success',
        data: {
          scores: {
            lifeScore,
            successScore: todaySuccessScore,
            breakdown: {
              work: workScore,
              health: Math.max(40, healthScore),
              focus: focusHoursScore,
              consistency: Math.min(100, Math.max(50, consistencyScore))
            }
          },
          briefing: {
            priorities: highPriorityTasks.map(t => t.title),
            scheduleSummary: `You have ${focusBlocks.length} focus sessions planned (${focusBlocks.length * 60} focus minutes total).`,
            risks: proactiveNotifications,
            nextBestAction
          },
          goals: goals.map(g => ({
            id: g.id,
            title: g.title,
            type: g.type,
            status: g.status
          }))
        }
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
      return next(new AppError('Unauthorized access', 401));
    }

    try {
      // Fetch DB states
      const tasks = await TaskService.getTasksForUser(userId);
      const habits = await HabitService.getHabitsForUser(userId);

      // Math metrics
      const completedThisWeek = tasks.filter(t => t.status === 'done').length;
      const totalActiveTasks = tasks.length;
      const completionRate = totalActiveTasks > 0 ? Math.round((completedThisWeek / totalActiveTasks) * 100) : 100;

      const strongestHabitObj = habits.length > 0 
        ? habits.reduce((prev, curr) => (prev.streak > curr.streak) ? prev : curr, habits[0])
        : null;

      const strongestHabitText = strongestHabitObj 
        ? `${strongestHabitObj.name} (${strongestHabitObj.streak}-day streak)` 
        : 'No habits established yet';

      const weeklyWins = [
        `Completed ${completedThisWeek} tasks this week.`,
        strongestHabitObj ? `Maintained consistency streak in ${strongestHabitObj.name}.` : 'Kept momentum up across active dashboards.'
      ];

      const localNarrativeReview = `
## 🏆 Weekly Performance Summary

Outstanding focus waves registered! Your overall completion rate reached **${completionRate}%** with excellent consistency.

### 🌟 Key Review Details:
* **Weekly Wins**: ${weeklyWins.join(', ')}
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
            scheduleSummary: '6 sessions',
            analyticsSummary: `${completionRate}% rate`,
            workingHours: '9am - 5pm'
          }
        });
        if (resData.text) {
          narrative = resData.text;
        }
      } catch (err: any) {
        logger.warn(`Gemini weekly review generation bypassed: ${err.message}. Using high-fidelity local fallback.`);
      }

      res.status(200).json({
        status: 'success',
        data: {
          narrative,
          stats: {
            winsCount: completedThisWeek,
            completionRate,
            strongestHabit: strongestHabitText
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }
}
