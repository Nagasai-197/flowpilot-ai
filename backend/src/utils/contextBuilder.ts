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
   * Compresses goals list into a single contextual string for the AI
   */
  static summarizeGoals(goals: any[]): string {
    if (!goals || goals.length === 0) return "No goals set yet.";

    const activeGoals = goals.filter((g) => g.status === "active");
    const completedGoals = goals.filter((g) => g.status === "completed");

    const summaries = activeGoals
      .slice(0, 5)
      .map((g) => `'${g.title}' [${g.type}] – progress: ${g.progress ?? 0}%`);

    return `${goals.length} goals total (${activeGoals.length} active, ${completedGoals.length} completed). Active goals: ${summaries.join("; ")}.`;
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
  ) {
    return {
      tasksSummary: this.summarizeTasks(tasks),
      habitsSummary: this.summarizeHabits(habits),
      scheduleSummary: this.summarizeSchedule(blocks, dateStr),
      analyticsSummary: this.summarizeAnalytics(stats),
      goalsSummary: this.summarizeGoals(goals),
      workingHours: `${profile.workingHoursStart}-${profile.workingHoursEnd} (Timezone: ${profile.timezone})`,
    };
  }
}
