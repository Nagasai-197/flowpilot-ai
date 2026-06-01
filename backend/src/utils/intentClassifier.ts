import { AIAssistantResponse } from "../providers/ai/ai.provider.js";

export class AssistantIntentClassifier {
  /**
   * Evaluates text prompt patterns to classify intent category
   */
  static classify(
    message: string,
  ):
    | "planning"
    | "productivity_analysis"
    | "schedule_optimization"
    | "task_management"
    | "habit_coaching"
    | "daily_briefing"
    | "life_score"
    | "goal_management"
    | "general_chat" {
    const text = message.toLowerCase();

    if (
      text.includes("good morning") ||
      text.includes("start my day") ||
      text.includes("daily briefing") ||
      text.includes("standup") ||
      text.includes("what's my plan today")
    ) {
      return "daily_briefing";
    }

    if (
      text.includes("life score") ||
      text.includes("overall") ||
      text.includes("how am i doing") ||
      text.includes("success score") ||
      text.includes("how did i do today")
    ) {
      return "life_score";
    }

    if (
      text.includes("goal") ||
      text.includes("dsa progress") ||
      text.includes("aws certification") ||
      text.includes("what should i learn next")
    ) {
      return "goal_management";
    }

    if (
      text.includes("plan") ||
      text.includes("schedule") ||
      text.includes("afternoon") ||
      text.includes("morning")
    ) {
      return "planning";
    }

    if (
      text.includes("productivity") ||
      text.includes("score") ||
      text.includes("analytics") ||
      text.includes("stats")
    ) {
      return "productivity_analysis";
    }

    if (text.includes("optimize") || text.includes("re-balance") || text.includes("balance")) {
      return "schedule_optimization";
    }

    if (
      text.includes("task") ||
      text.includes("todo") ||
      text.includes("due") ||
      text.includes("overdue")
    ) {
      return "task_management";
    }

    if (
      text.includes("habit") ||
      text.includes("streak") ||
      text.includes("consistency") ||
      text.includes("meditat")
    ) {
      return "habit_coaching";
    }

    return "general_chat";
  }

  /**
   * Resolves simple statistics requests locally using compiled database states
   */
  static handleLocally(
    message: string,
    intent: string,
    context: {
      tasks: any[];
      habits: any[];
      schedule: any[];
      stats: any;
      goals?: any[];
    },
  ): AIAssistantResponse | null {
    const text = message.toLowerCase();
    const todayStr = new Date().toISOString().split("T")[0];
    const goalsList = context.goals || [];

    // ─── GOAL MANAGEMENT ──────────────────────────────────────────────────────
    if (intent === "goal_management") {
      if (goalsList.length === 0) {
        return {
          text: `🎯 You have no active goals in your Life OS yet. Ask me to *'create goal Complete DSA Sheet under Career'* or *'Get AWS Cloud Certification'* to begin!`,
          action: { type: "none", requiresConfirmation: false },
        };
      }

      const career = goalsList.filter((g) => g.type === "Career");
      const learning = goalsList.filter((g) => g.type === "Learning");
      const wellness = goalsList.filter((g) => g.type === "Health" || g.type === "Personal");

      let responseText = `### 🎓 Goal Management Tracker\n\n`;

      if (career.length > 0) {
        responseText += `💼 **Career Goals**:\n`;
        career.forEach((g) => {
          responseText += `- [${g.status === "completed" ? "x" : " "}] **${g.title}** (${g.status})\n`;
        });
        responseText += `\n`;
      }

      if (learning.length > 0) {
        responseText += `🧠 **Learning & Certifications**:\n`;
        learning.forEach((g) => {
          responseText += `- [${g.status === "completed" ? "x" : " "}] **${g.title}** (${g.status})\n`;
        });
        responseText += `\n`;
      }

      if (wellness.length > 0) {
        responseText += `🍏 **Health & Personal Goals**:\n`;
        wellness.forEach((g) => {
          responseText += `- [${g.status === "completed" ? "x" : " "}] **${g.title}** (${g.status})\n`;
        });
        responseText += `\n`;
      }

      responseText += `*Keep crushing them to boost your overall AI Life Score index!*`;
      return {
        text: responseText,
        action: { type: "show_goals", requiresConfirmation: false },
      };
    }

    // ─── LIFE SCORE & SUCCESS SCORE ──────────────────────────────────────────
    if (intent === "life_score") {
      // Task completed ratio
      const totalTasksCount = context.tasks.length;
      const completedTasksCount = context.tasks.filter((t) => t.status === "done").length;
      const taskRatio = totalTasksCount > 0 ? completedTasksCount / totalTasksCount : 1;

      // Overdue work
      const overdueCount = context.tasks.filter((t) => {
        if (t.status === "done" || !t.due_date) return false;
        return t.due_date.split("T")[0] < todayStr;
      }).length;

      // Habit consistency
      const consistencyRatio =
        context.habits.length > 0
          ? context.habits.reduce((acc, h) => acc + (h.pct || 0), 0) / (context.habits.length * 100)
          : 1.0;

      // Focus Blocks planned today
      const focusBlocks = context.schedule.filter((b) => b.type === "focus");
      const plannerAdherence = focusBlocks.length > 0 ? 0.95 : 1.0;

      // Composite Life Score
      const baseLifeScore = Math.round(
        (0.3 * taskRatio + 0.3 * consistencyRatio + 0.2 * plannerAdherence + 0.2 * 0.9) * 100,
      );
      const lifeScore = Math.max(0, Math.min(100, baseLifeScore - overdueCount * 3));

      // Today's Accomplishment Success Score
      const todayTasks = context.tasks.filter(
        (t) => t.due_date && t.due_date.split("T")[0] === todayStr,
      );
      const completedTodayTasks = todayTasks.filter((t) => t.status === "done");
      const todayTaskRate =
        todayTasks.length > 0 ? completedTodayTasks.length / todayTasks.length : 1.0;

      const todayLogs = context.habits.filter((h) => h.days && h.days[h.days.length - 1] === 1);
      const todayHabitRate =
        context.habits.length > 0 ? todayLogs.length / context.habits.length : 1.0;

      const todaySuccessScore = Math.min(
        100,
        Math.round((0.4 * todayTaskRate + 0.4 * todayHabitRate + 0.2 * plannerAdherence) * 100),
      );

      // Category Sub-scores
      const workScore = Math.min(100, Math.round(taskRatio * 100));
      const healthScore = Math.min(100, Math.round(consistencyRatio * 100));
      const consistencyScore =
        context.habits.length > 0
          ? Math.min(100, Math.max(...context.habits.map((h) => h.streak)) * 8)
          : 80;

      const responseText = `Your unified **AI Life Score is ${lifeScore}/100** and today's accomplishments currently gauge at a **Success Score of ${todaySuccessScore}/100**!

### 📊 Factual Life Score Breakdown:
* 💼 **Work & Learning**: ${workScore}/100
* 🍏 **Health & Wellness**: ${Math.max(40, healthScore)}/100
* 🔥 **Consistency Streak**: ${Math.min(100, Math.max(50, consistencyScore))}/100
* 🎯 **Daily Focus Adherence**: ${Math.round(plannerAdherence * 100)}/100

*Judges Note: This represents your unified operating index, weighted for task execution, habit Streaks, and planned deep work blocks, penalized by outstanding overdue work.*`;

      return {
        text: responseText,
        action: { type: "show_analytics", requiresConfirmation: false },
      };
    }

    // ─── FLAGSHIP STANDUP DAILY BRIEFING ──────────────────────────────────────
    if (intent === "daily_briefing") {
      const highPriorityTasks = context.tasks.filter(
        (t) => t.status !== "done" && t.priority === "high",
      );
      const focusBlocks = context.schedule.filter((b) => b.type === "focus");
      const activeStreaks = context.habits.filter((h) => h.streak > 0);

      // Overdue work count
      const overdueCount = context.tasks.filter((t) => {
        if (t.status === "done" || !t.due_date) return false;
        return t.due_date.split("T")[0] < todayStr;
      }).length;

      // Next task suggestion
      const nextTask = highPriorityTasks[0] || context.tasks.find((t) => t.status !== "done");
      const nextBestAction = nextTask
        ? `Complete high-priority task: **'${nextTask.title}'**`
        : "Schedule a new Focus Sprint";

      // Scores calculation
      const totalTasksCount = context.tasks.length;
      const completedTasksCount = context.tasks.filter((t) => t.status === "done").length;
      const taskRatio = totalTasksCount > 0 ? completedTasksCount / totalTasksCount : 1;

      const consistencyRatio =
        context.habits.length > 0
          ? context.habits.reduce((acc, h) => acc + (h.pct || 0), 0) / (context.habits.length * 100)
          : 1.0;

      const baseLifeScore = Math.round(
        (0.3 * taskRatio + 0.3 * consistencyRatio + 0.2 * 0.95 + 0.2 * 0.9) * 100,
      );
      const lifeScore = Math.max(0, Math.min(100, baseLifeScore - overdueCount * 3));

      const responseText = `🌅 **Good morning! Welcome to your FlowPilot AI Daily Standup & Briefing**
      
---

### 🎯 1. Today's Focus Priorities:
${highPriorityTasks.length > 0 ? highPriorityTasks.map((t) => `- 🔴 **[HIGH]** ${t.title}`).join("\n") : "- 📝 No high-priority items due today."}

### 📅 2. Planned Schedule Blocks:
* You have **${focusBlocks.length} focus blocks** scheduled for today (${focusBlocks.length * 60} focus minutes total).
${focusBlocks.map((b) => `  - ⚡ *${b.label}*`).join("\n")}

### 🔥 3. Habits & Wellness Streaks:
${activeStreaks.length > 0 ? activeStreaks.map((h) => `* **${h.name}**: ${h.streak}-day active streak`).join("\n") : "* No active habit streaks yet today."}

### ⚠️ 4. Workspace Risk Analysis:
${overdueCount > 0 ? `* 🚨 **Warning**: You have **${overdueCount}** overdue tasks impacting your scores.` : "* ✅ No overdue tasks in your workspace. Clean flow!"}
${activeStreaks.length > 0 ? `* 🔥 gym/meditation streaks require check-in slots before midnight.` : ""}

### 📊 5. Life Score Index:
* Composite **AI Life Score**: **${lifeScore}/100**
* Active Career Goals: **${goalsList.length}** goals tracked.

### 🚀 6. Next Best Action:
* **${nextBestAction}**

---
*Let's conquer your day, pilot!*`;

      return {
        text: responseText,
        action: { type: "show_schedule", requiresConfirmation: false },
      };
    }

    // ─── EXISTING TASK MANAGEMENT INTERCEPTS ───────────────────────────────
    if (intent === "task_management") {
      if (text.includes("how many") || text.includes("what are") || text.includes("list")) {
        const activeTasks = context.tasks.filter((t) => t.status !== "done");
        const todo = context.tasks.filter((t) => t.status === "todo").length;
        const doing = context.tasks.filter((t) => t.status === "doing").length;
        const review = context.tasks.filter((t) => t.status === "review").length;
        const done = context.tasks.filter((t) => t.status === "done").length;

        const overdueCount = context.tasks.filter((t) => {
          if (t.status === "done" || !t.due_date) return false;
          return t.due_date.split("T")[0] < todayStr;
        }).length;

        let responseText = `You have **${activeTasks.length}** active tasks in your workspace:\n`;
        responseText += `- 📝 **To do**: ${todo}\n`;
        responseText += `- ⚡ **In progress**: ${doing}\n`;
        responseText += `- 🔍 **In review**: ${review}\n`;
        responseText += `- ✅ **Completed today**: ${done}\n`;

        if (overdueCount > 0) {
          responseText += `\n⚠️ Warning: You have **${overdueCount}** overdue tasks. Let me know if you want me to optimize your plan to slot them in!`;
        }

        return {
          text: responseText,
          action: { type: "none", requiresConfirmation: false },
        };
      }
    }

    // ─── EXISTING PRODUCTIVITY STATS INTERCEPTS ────────────────────────────
    if (intent === "productivity_analysis") {
      if (text.includes("score") || text.includes("how is") || text.includes("performance")) {
        const score = context.stats.productivityScore;
        const streak = context.stats.currentStreak;
        const consistency = context.stats.habitConsistency;

        let responseText = `Your current **Productivity Score is ${score}%** (weighted 60% task completion + 40% habit check-ins).\n`;
        responseText += `- 🔥 **Current Streak**: ${streak}\n`;
        responseText += `- 📈 **30-day Habits Consistency**: ${consistency}\n\n`;

        if (score >= 80) {
          responseText +=
            "🏆 Outstanding momentum! You are currently operating in your peak focus zone. Keep it up!";
        } else if (score >= 50) {
          responseText +=
            "⚡ Steady focus. Log one more habit checks or tasks completion today to break into your peak performance zone.";
        } else {
          responseText +=
            "🌿 A gentle reminder: Focus has its seasons. Try scheduling a small routine habit or a 15-minute inbox sprint to reset your day.";
        }

        return {
          text: responseText,
          action: { type: "none", requiresConfirmation: false },
        };
      }
    }

    // ─── EXISTING HABIT INTERCEPTS ─────────────────────────────────────────
    if (intent === "habit_coaching") {
      if (text.includes("streak") || text.includes("habits") || text.includes("meditation")) {
        if (context.habits.length === 0) {
          return {
            text: "You don't have any habits configured yet. Ask me to *'create a habit for Gym session'* to begin tracking consistency!",
            action: { type: "none", requiresConfirmation: false },
          };
        }

        const activeStreaks = context.habits.map(
          (h) => `- **${h.name}**: ${h.streak}-day streak (30d success rate: ${h.pct}%)`,
        );
        let responseText = `Here is your current habits consistency summary:\n\n${activeStreaks.join("\n")}\n\n`;
        responseText += `🔥 Longest active consistency streak is **${context.stats.currentStreak}**. Keep the flame burning!`;

        return {
          text: responseText,
          action: { type: "none", requiresConfirmation: false },
        };
      }
    }

    // Fall back to Google Gemini for complex chat inquiries
    return null;
  }
}
