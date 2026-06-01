export class ContextBuilder {
  /**
   * Compresses task lists into a single string summary
   */
  static summarizeTasks(tasks: any[]): string {
    if (!tasks || tasks.length === 0) return "No tasks active.";

    const todo = tasks.filter((t) => t.status === "todo").length;
    const doing = tasks.filter((t) => t.status === "doing").length;
    const review = tasks.filter((t) => t.status === "review").length;
    const done = tasks.filter((t) => t.status === "done").length;

    const highPriorityList = tasks
      .filter((t) => t.priority === "high" && t.status !== "done")
      .map((t) => `'${t.title}'`)
      .slice(0, 3);

    const todayStr = new Date().toISOString().split("T")[0];
    const overdueList = tasks
      .filter((t) => t.status !== "done" && t.due_date && t.due_date.split("T")[0] < todayStr)
      .map((t) => `'${t.title}'`)
      .slice(0, 3);

    let summary = `Total tasks: ${tasks.length}. Column counts -> Todo: ${todo}, Doing: ${doing}, Review: ${review}, Done: ${done}.`;
    if (highPriorityList.length > 0) {
      summary += ` High priority active tasks: ${highPriorityList.join(", ")}.`;
    }
    if (overdueList.length > 0) {
      summary += ` Overdue tasks: ${overdueList.join(", ")}.`;
    }

    return summary;
  }

  /**
   * Compresses habits list into a single string summary
   */
  static summarizeHabits(habits: any[]): string {
    if (!habits || habits.length === 0) return "No habits active.";

    const summaries = habits.map(
      (h) => `'${h.name}' (streak: ${h.streak}d, 30d consistency: ${h.pct}%)`,
    );
    return `${habits.length} habits configured: ${summaries.join(", ")}.`;
  }

  /**
   * Compresses timeline schedule blocks into a single string summary
   */
  static summarizeSchedule(blocks: any[], dateStr: string): string {
    if (!blocks || blocks.length === 0) return `No calendar events scheduled for date ${dateStr}.`;

    const summaries = blocks.map((b) => {
      const start = b.start_time ? b.start_time.split("T")[1].substring(0, 5) : "00:00";
      const end = b.end_time ? b.end_time.split("T")[1].substring(0, 5) : "00:00";
      return `${start}-${end} [${b.type}] '${b.label}'`;
    });

    return `Schedule blocks for ${dateStr}: ${summaries.join(" | ")}.`;
  }

  /**
   * Compresses dashboard statistics into a single string summary
   */
  static summarizeAnalytics(stats: any): string {
    if (!stats) return "No focus stats accumulated.";

    return `Productivity Score: ${stats.productivityScore}%, Today's Completed Tasks ratio: ${stats.tasksToday}, 30d Habits consistency: ${stats.habitConsistency}, Longest Streak: ${stats.currentStreak}.`;
  }

  /**
   * Compresses goals list into a single contextual string for the AI, incorporating health stats
   */
  static summarizeGoals(goals: any[], milestones: any[] = [], focusSessions: any[] = [], tasks: any[] = []): string {
    if (!goals || goals.length === 0) return "No goals set yet.";

    const activeGoals = goals.filter((g) => g.status === "active");
    const completedGoals = goals.filter((g) => g.status === "completed");

    const summaries = activeGoals
      .slice(0, 5)
      .map((g) => {
        const goalMilestones = (milestones || []).filter((m) => m.goal_id === g.id);
        const completedMilestones = goalMilestones.filter((m) => m.completed).length;
        const milestoneRate = goalMilestones.length > 0 ? completedMilestones / goalMilestones.length : 0.5;

        const goalSessions = (focusSessions || []).filter((fs) => fs.goal_id === g.id && fs.completed);
        const focusMins = goalSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
        const focusHours = Math.round((focusMins / 60) * 10) / 10;

        const linkedTasks = (tasks || []).filter((t) => 
          t.tag && 
          (t.tag.toLowerCase() === g.category?.toLowerCase() || 
           t.tag.toLowerCase() === g.title?.toLowerCase())
        );
        const completedLinkedTasks = linkedTasks.filter((t) => t.status === "done").length;
        const taskRate = linkedTasks.length > 0 ? completedLinkedTasks / linkedTasks.length : 1.0;
        const focusFactor = Math.min(1.0, focusHours / 5.0);

        const healthScore = Math.min(100, Math.max(0, Math.round((milestoneRate * 35) + (taskRate * 25) + (focusFactor * 15) + 30)));
        const healthLabel = healthScore >= 80 ? "Excellent" : healthScore >= 65 ? "On Track" : healthScore >= 50 ? "At Risk" : "Critical";

        return `'${g.title}' [${g.type}] – progress: ${g.progress ?? 0}%, Health: ${healthScore}/100 (${healthLabel}), Focus Hours: ${focusHours}h, Milestones: ${completedMilestones}/${goalMilestones.length} completed`;
      });

    return `${goals.length} goals total (${activeGoals.length} active, ${completedGoals.length} completed). Active goals: ${summaries.join("; ")}.`;
  }

  /**
   * Compresses focus session statistics into a single string summary
   */
  static summarizeFocus(focusStats: any): string {
    if (!focusStats) return "No focus sessions logged yet.";
    return `Today's Focus: ${focusStats.todayFocusHours}h, Weekly Focus: ${focusStats.weeklyFocusHours}h (Target: 25h), Deep Work Hours: ${focusStats.deepWorkHours}h, Deep Work Streak: ${focusStats.deepWorkStreak} days, Completed Sessions: ${focusStats.focusSessionsCount}, Session Completion Rate: ${focusStats.sessionCompletionRate}%.`;
  }

  /**
   * Unified context compiler mapping all resources
   */
  static build(
    tasks: any[],
    habits: any[],
    blocks: any[],
    stats: any,
    profile: { workingHoursStart: string; workingHoursEnd: string; timezone: string },
    dateStr: string,
    goals: any[] = [],
    focusStats: any = null,
    focusSessions: any[] = [],
    milestones: any[] = [],
  ) {
    return {
      tasksSummary: this.summarizeTasks(tasks),
      habitsSummary: this.summarizeHabits(habits),
      scheduleSummary: this.summarizeSchedule(blocks, dateStr),
      analyticsSummary: this.summarizeAnalytics(stats),
      goalsSummary: this.summarizeGoals(goals, milestones, focusSessions, tasks),
      focusSummary: this.summarizeFocus(focusStats),
      workingHours: `${profile.workingHoursStart}-${profile.workingHoursEnd} (Timezone: ${profile.timezone})`,
    };
  }
}
