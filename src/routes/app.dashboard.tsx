import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  CheckCircle2,
  Flame,
  TrendingUp,
  ArrowUpRight,
  CalendarDays,
  Zap,
  Loader2,
  Award,
  AlertTriangle,
  ShieldAlert,
  Brain,
  Coffee,
  Target,
  Activity,
  Calendar,
  ClipboardList,
  Repeat,
  Plus,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { usePlanner } from "../hooks/usePlanner";
import { useHabits } from "../hooks/useHabits";
import { useGoals } from "../hooks/useGoals";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { useState } from "react";

export const Route = createFileRoute("/app/dashboard")({
  component: Dashboard,
});

const cardClass =
  "rounded-3xl border border-border/60 bg-card shadow-soft p-6 relative overflow-hidden transition-all duration-300 hover:shadow-float";

const TYPE_ICONS = {
  focus: Brain,
  break: Coffee,
  meeting: CalendarDays,
  habit: Zap,
  routine: Coffee,
};

function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { generatePlan, isGenerating } = usePlanner();
  const { habits, toggleHabit, createHabit } = useHabits();
  const { createGoal } = useGoals();

  const [quickGoalOpen, setQuickGoalOpen] = useState(false);
  const [quickGoalTitle, setQuickGoalTitle] = useState("");
  const [quickGoalType, setQuickGoalType] = useState("Career");

  const [quickHabitOpen, setQuickHabitOpen] = useState(false);
  const [quickHabitName, setQuickHabitName] = useState("");
  const [quickHabitColor, setQuickHabitColor] = useState("mint");
  const [focusTimerMode, setFocusTimerMode] = useState<"pomodoro" | "extended_focus" | "deep_work">("pomodoro");

  // Query high-performance Analytics Copilot summary
  const { data: copilotSummary, isLoading: copilotLoading } = useQuery<any>({
    queryKey: ["copilot"],
    queryFn: async () => {
      const res = await api.get("/analytics/copilot");
      return res.data;
    },
  });

  const handleRegenerate = () => {
    toast.promise(
      new Promise((resolve, reject) => {
        generatePlan(undefined, {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["copilot"] });
            resolve("Plan updated");
          },
          onError: (err) => reject(err),
        });
      }),
      {
        loading: "Optimizing schedule planner...",
        success: "AI Schedule plan regenerated successfully! 📅",
        error: "Failed to optimize schedule.",
      },
    );
  };

  const handleQuickGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickGoalTitle.trim()) return;
    try {
      await createGoal({
        title: quickGoalTitle.trim(),
        type: quickGoalType,
        status: "active",
      });
      toast.success("AI Goal created! Generating milestones roadmap...");
      setQuickGoalTitle("");
      setQuickGoalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["copilot"] });
    } catch (err: any) {
      toast.error(`Goal creation failed: ${err.message}`);
    }
  };

  const handleQuickHabitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickHabitName.trim()) return;
    try {
      await createHabit({
        name: quickHabitName.trim(),
        color: quickHabitColor,
      });
      toast.success("New daily habit established successfully! 🧘");
      setQuickHabitName("");
      setQuickHabitOpen(false);
      queryClient.invalidateQueries({ queryKey: ["copilot"] });
    } catch (err: any) {
      toast.error(`Habit creation failed: ${err.message}`);
    }
  };

  const triggerFocusSession = (typeStr: string = "pomodoro") => {
    window.dispatchEvent(
      new CustomEvent("start-focus-session", {
        detail: {
          type: typeStr,
          taskTitle: "General Focus Sprint",
        },
      })
    );
  };

  if (copilotLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">
            Running FlowPilot AI engines...
          </p>
        </div>
      </div>
    );
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  // Format today's date
  const todayDateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return "00:00";
    }
  };

  // Safe destructuring of scores and values
  const scores = copilotSummary?.scores || {};
  const lifeScore = scores.lifeScore ?? 0;
  const successScore = scores.successScore ?? 0;
  const successLabel = scores.successLabel ?? "Needs Focus";
  const habitConsistency = scores.habitConsistency ?? 0;
  const consistencyBadge = scores.consistencyBadge ?? "Average";
  const currentStreak = scores.currentStreak ?? 0;
  const lifeScoreTrend = scores.lifeScoreTrend ?? "New Account";

  const xp = scores.xp ?? 0;
  const level = scores.level ?? 1;

  const todayFocus = copilotSummary?.briefing?.todayFocus ?? "Create high-priority tasks to begin!";
  const nextBestAction = copilotSummary?.briefing?.nextBestAction ?? "Schedule a Focus Sprint";

  const warnings = copilotSummary?.briefing?.warnings || {
    overdueCount: 0,
    habitRisk: false,
    plannerMissing: false,
  };
  const activeGoals = copilotSummary?.goals || [];
  const focusStats = copilotSummary?.focusStats || {
    todayFocusHours: 0,
    weeklyFocusHours: 0,
    deepWorkStreak: 0,
    sessionCompletionRate: 100,
  };
  const opportunitySignals = copilotSummary?.opportunitySignals || [];
  const weeklyGoal = copilotSummary?.weeklyGoal || {
    completedHours: 0,
    targetHours: 25,
    percentage: 0,
  };
  const recentActivities = copilotSummary?.recentActivities || [];
  const todayPlanner = copilotSummary?.todayPlanner || [];

  const hasWarnings = warnings.overdueCount > 0 || warnings.habitRisk || warnings.plannerMissing;

  // Next focus block detection
  const focusBlocks = todayPlanner.filter((b: any) => b.type === "focus");
  const nextFocusBlock = focusBlocks[0];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* 1. Welcome Greeting Banner */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-6 shadow-soft md:p-8"
      >
        <div className="absolute inset-0 -z-10 gradient-mesh opacity-65" />
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs text-muted-foreground">{todayDateStr}</p>
            <h1 className="mt-1 font-display text-4xl md:text-5xl">
              Good morning, <span className="text-gradient italic">{displayName}</span>
            </h1>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground leading-normal">
              {todayPlanner.length > 0
                ? `Daily plan loaded! You have ${focusBlocks.length} deep-work focus sessions optimized for today.`
                : "No focus blocks scheduled for today. Generate an optimized plan to command your workflow!"}
            </p>
          </div>

          {/* Level Badge cockpit */}
          <div className="flex items-center gap-3 bg-card/65 backdrop-blur border border-border/60 rounded-2xl p-4 shadow-soft">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary to-[oklch(0.75_0.13_220)] text-base font-bold text-white shadow-soft">
              Lvl {level}
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">Outcomes Level</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{xp} XP accumulated</div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 2. Unified Life Score circular progress row */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: "AI Life Score",
            value: `${lifeScore}`,
            detail: lifeScoreTrend,
            pct: lifeScore,
            color: "lavender",
          },
          {
            label: "Success Rate",
            value: `${successScore}%`,
            detail: successLabel,
            pct: successScore,
            color: "mint",
          },
          {
            label: "Habit Consistency",
            value: `${habitConsistency}%`,
            detail: consistencyBadge,
            pct: habitConsistency,
            color: "sky",
          },
          {
            label: "Weekly Goal",
            value: `${weeklyGoal.completedHours}h`,
            detail: `${weeklyGoal.percentage}% target`,
            pct: weeklyGoal.percentage,
            color: "peach",
          },
        ].map((item, idx) => (
          <div key={item.label} className={cn(cardClass, "flex items-center gap-4.5 group/card")}>
            {/* SVG HSL Circle */}
            <div className="relative h-14 w-14 shrink-0">
              <svg className="h-full w-full -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r="23"
                  className="stroke-secondary fill-transparent"
                  strokeWidth="4"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="23"
                  className="transition-all duration-700 fill-transparent"
                  strokeWidth="4"
                  strokeDasharray={144.5}
                  strokeDashoffset={144.5 - (144.5 * Math.min(100, item.pct)) / 100}
                  strokeLinecap="round"
                  style={{ stroke: `var(--${item.color})` }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold font-mono">
                {item.value.replace("%", "")}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                {item.label}
              </div>
              <div className="text-xs font-bold mt-1 text-foreground/80">{item.detail}</div>
            </div>
          </div>
        ))}
      </section>

      {/* 3. Main Dashboard Cockpit */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Agenda & Next Focus Segment */}
        <div className="space-y-6 lg:col-span-2">
          {/* Next Focus Block Alert Panel */}
          {nextFocusBlock && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/5 via-[oklch(0.85_0.08_220)]/10 to-[oklch(0.85_0.08_160)]/10 p-5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Brain className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <div className="text-[9px] uppercase font-bold text-primary tracking-wider">
                    Next Focus Block
                  </div>
                  <h4 className="text-xs font-bold mt-0.5">{nextFocusBlock.label}</h4>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    {formatTime(nextFocusBlock.start_time)} – {formatTime(nextFocusBlock.end_time)}
                  </p>
                </div>
              </div>
              <Link
                to="/app/planner"
                className="rounded-full bg-primary px-3 py-1.5 text-[10px] font-bold text-primary-foreground hover:opacity-90 shrink-0"
              >
                Launch Focus
              </Link>
            </motion.div>
          )}

          {/* Daily Schedule agenda */}
          <div className={cardClass}>
            <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Daily Agenda
                </div>
                <h2 className="mt-0.5 text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-4.5 w-4.5 text-muted-foreground" /> Today's Execution Plan
                </h2>
              </div>
              <Link
                to="/app/planner"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                Open Planner →
              </Link>
            </div>

            {todayPlanner.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Sparkles className="h-8 w-8 text-primary animate-pulse mb-3" />
                <h3 className="font-semibold text-sm">Planner schedule empty</h3>
                <p className="text-xs text-muted-foreground max-w-xs mt-1">
                  No focus slots configured for today. Optimize your agenda now with AI.
                </p>
                <button
                  onClick={handleRegenerate}
                  className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer"
                >
                  Generate Plan
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-0.5 scrollbar-thin">
                {todayPlanner.map((b: any, idx: number) => {
                  const Icon = TYPE_ICONS[b.type as keyof typeof TYPE_ICONS] || Zap;
                  return (
                    <div
                      key={b.id}
                      className="group flex items-center gap-4 rounded-2xl border border-transparent bg-secondary/30 p-3.5 transition-all hover:border-border hover:bg-card hover:shadow-soft"
                    >
                      <div className="w-12 text-[10px] font-bold text-muted-foreground">
                        {formatTime(b.start_time)}
                      </div>
                      <div
                        className="flex h-9 w-9 shrink-0 place-items-center rounded-xl"
                        style={{
                          background: `color-mix(in oklab, var(--${b.color || "lavender"}) 70%, var(--card))`,
                        }}
                      >
                        <Icon className="h-4 w-4 text-foreground/70" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold leading-none">{b.label}</div>
                        <div className="text-[9px] text-muted-foreground mt-1 capitalize font-medium">
                          {b.type} · {formatTime(b.start_time)} – {formatTime(b.end_time)}
                        </div>
                      </div>
                      <span className="rounded-full bg-card border border-border/80 px-2 py-0.5 text-[8px] font-bold uppercase text-muted-foreground tracking-wider">
                        Active
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Intelligence recommendations briefings */}
          <div
            className={cn(cardClass, "bg-gradient-to-br from-card to-primary/5 border-primary/20")}
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" /> AI Daily Briefing
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                    <Brain className="h-3.5 w-3.5 text-primary" /> Today's Focus
                  </h4>
                  <div className="mt-1.5 rounded-2xl bg-secondary/40 border border-border/40 p-3">
                    <p className="text-xs font-bold text-foreground leading-snug">{todayFocus}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-indigo-500" /> Recommended Action
                  </h4>
                  <div className="mt-1.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 p-3">
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 leading-snug">
                      {nextBestAction}
                    </p>
                  </div>
                </div>
              </div>

              {/* Real-time Diagnostics Warning panel */}
              <div className="space-y-3.5">
                <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-primary" /> Warnings Engine
                </h4>

                <div className="space-y-2">
                  {!hasWarnings ? (
                    <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 p-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        All OS modules optimized!
                      </span>
                    </div>
                  ) : (
                    <>
                      {warnings.overdueCount > 0 && (
                        <div className="flex items-center gap-2.5 rounded-2xl bg-red-500/5 border border-red-500/10 p-2.5">
                          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                          <span className="text-[10px] font-bold text-red-500">
                            ⚠️ {warnings.overdueCount} overdue tasks dropping score
                          </span>
                        </div>
                      )}
                      {warnings.habitRisk && (
                        <div className="flex items-center gap-2.5 rounded-2xl bg-yellow-500/5 border border-yellow-500/10 p-2.5">
                          <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                          <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400">
                            ⚠️ Habit consistency dropped average
                          </span>
                        </div>
                      )}
                      {warnings.plannerMissing && (
                        <div className="flex items-center gap-2.5 rounded-2xl bg-blue-500/5 border border-blue-500/10 p-2.5">
                          <AlertTriangle className="h-4 w-4 text-blue-500 shrink-0" />
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                            ⚠️ Generate planner schedule for today
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Habits, Goals, Focus, Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions Panel */}
          <div className={cn(cardClass, "bg-gradient-to-br from-card to-secondary/35")}>
            <div className="flex items-center justify-between border-b border-border/40 pb-2.5 mb-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" /> Quick Actions Bar
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="rounded-2xl border border-border bg-card p-3 text-center transition-all hover:border-primary/30 hover:shadow-float cursor-pointer flex flex-col items-center gap-1.5"
              >
                <Calendar className="h-5 w-5 text-primary animate-pulse" />
                <span className="text-[9px] font-bold uppercase text-foreground/80 mt-1">
                  Generate Plan
                </span>
              </button>

              <button
                onClick={() => setQuickGoalOpen((v) => !v)}
                className="rounded-2xl border border-border bg-card p-3 text-center transition-all hover:border-primary/30 hover:shadow-float cursor-pointer flex flex-col items-center gap-1.5"
              >
                <Target className="h-5 w-5 text-indigo-500 animate-pulse" />
                <span className="text-[9px] font-bold uppercase text-foreground/80 mt-1">
                  Add AI Goal
                </span>
              </button>

              <button
                onClick={() => triggerFocusSession(focusTimerMode)}
                className="rounded-2xl border border-border bg-card p-3 text-center transition-all hover:border-primary/30 hover:shadow-float cursor-pointer flex flex-col items-center gap-1.5"
              >
                <Brain className="h-5 w-5 text-pink-500 animate-pulse" />
                <span className="text-[9px] font-bold uppercase text-foreground/80 mt-1">
                  Start Focus
                </span>
              </button>

              <button
                onClick={() => setQuickHabitOpen((v) => !v)}
                className="rounded-2xl border border-border bg-card p-3 text-center transition-all hover:border-primary/30 hover:shadow-float cursor-pointer flex flex-col items-center gap-1.5"
              >
                <Repeat className="h-5 w-5 text-emerald-500 animate-pulse" />
                <span className="text-[9px] font-bold uppercase text-foreground/80 mt-1">
                  Create Habit
                </span>
              </button>
            </div>

            {/* Quick add goal inline form */}
            <AnimatePresence>
              {quickGoalOpen && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={handleQuickGoalSubmit}
                  className="mt-3.5 pt-3.5 border-t border-border/30 space-y-2.5 overflow-hidden text-xs"
                >
                  <label className="block">
                    <span className="mb-1 block text-[10px] text-muted-foreground">Goal Title</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Learn DSA Concepts"
                      value={quickGoalTitle}
                      onChange={(e) => setQuickGoalTitle(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white dark:bg-zinc-900/60 px-3 py-2 text-xs outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] text-muted-foreground">Category</span>
                    <select
                      value={quickGoalType}
                      onChange={(e) => setQuickGoalType(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white dark:bg-zinc-900/60 px-3 py-1.5 text-xs outline-none cursor-pointer"
                    >
                      <option value="Career">Career</option>
                      <option value="Health">Health</option>
                      <option value="Learning">Learning</option>
                      <option value="Personal">Personal</option>
                    </select>
                  </label>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setQuickGoalOpen(false)}
                      className="rounded-xl border border-border bg-card px-3 py-1.5 text-[10px] font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!quickGoalTitle.trim()}
                      className="rounded-xl bg-foreground text-background px-3 py-1.5 text-[10px] font-bold cursor-pointer"
                    >
                      Save Goal
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* FEATURE 1 — FOCUS ENVIRONMENT CARD */}
          <div className={cardClass}>
            <div className="flex items-center justify-between border-b border-border/40 pb-2.5 mb-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Brain className="h-4 w-4 text-pink-500 animate-pulse" /> Focus Session Cockpit
              </h3>
              <span className="rounded-full bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 text-[8px] font-bold uppercase text-pink-600 dark:text-pink-400">
                Streak: {focusStats.deepWorkStreak}d 🔥
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center mb-4">
              <div className="bg-secondary/30 rounded-2xl p-2.5 border border-border/30">
                <div className="text-xs font-bold font-mono">{focusStats.todayFocusHours}h</div>
                <div className="text-[8px] text-muted-foreground uppercase font-bold mt-1 tracking-wider">Today</div>
              </div>
              <div className="bg-secondary/30 rounded-2xl p-2.5 border border-border/30">
                <div className="text-xs font-bold font-mono">{focusStats.weeklyFocusHours}h</div>
                <div className="text-[8px] text-muted-foreground uppercase font-bold mt-1 tracking-wider">Week</div>
              </div>
              <div className="bg-secondary/30 rounded-2xl p-2.5 border border-border/30">
                <div className="text-xs font-bold font-mono">{focusStats.sessionCompletionRate}%</div>
                <div className="text-[8px] text-muted-foreground uppercase font-bold mt-1 tracking-wider">Adherence</div>
              </div>
            </div>

            {/* Timer modes selection selector */}
            <div className="space-y-3">
              <div className="flex rounded-xl bg-secondary/50 p-1 border border-border/35 text-[9px] font-semibold text-muted-foreground">
                {[
                  { id: "pomodoro", label: "Pomo 25m" },
                  { id: "extended_focus", label: "Focus 50m" },
                  { id: "deep_work", label: "Deep 90m" }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setFocusTimerMode(mode.id as any)}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg transition-all cursor-pointer",
                      focusTimerMode === mode.id
                        ? "bg-card text-foreground shadow-soft"
                        : "hover:text-foreground"
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => triggerFocusSession(focusTimerMode)}
                className="w-full rounded-2xl py-3 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-display text-xs font-bold uppercase tracking-wider shadow-float hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-violet-400/20"
              >
                <Brain className="h-4.5 w-4.5 animate-pulse" />
                Start Focus Session
              </button>
            </div>
          </div>

          {/* Integrated Habits Widget Cockpit with Create Habit Modal form */}
          <div className={cardClass}>
            <div className="flex items-center justify-between border-b border-border/40 pb-2.5 mb-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Repeat className="h-4 w-4 text-emerald-500" /> Habits Tracker
              </h3>
              <button
                onClick={() => setQuickHabitOpen((v) => !v)}
                className="text-[9px] font-bold text-muted-foreground hover:text-emerald-500 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add Habit
              </button>
            </div>

            {/* Quick add habit form */}
            <AnimatePresence>
              {quickHabitOpen && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={handleQuickHabitSubmit}
                  className="mb-4 bg-secondary/25 border border-border/40 rounded-2xl p-3.5 space-y-2.5 overflow-hidden text-xs"
                >
                  <label className="block">
                    <span className="mb-1 block text-[10px] text-muted-foreground">Habit Name</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Push Ups"
                      value={quickHabitName}
                      onChange={(e) => setQuickHabitName(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white dark:bg-zinc-900/60 px-3 py-2 text-xs outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] text-muted-foreground">Color Theme</span>
                    <select
                      value={quickHabitColor}
                      onChange={(e) => setQuickHabitColor(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white dark:bg-zinc-900/60 px-3 py-1.5 text-xs outline-none cursor-pointer"
                    >
                      <option value="mint">Mint (Green)</option>
                      <option value="sky">Sky (Blue)</option>
                      <option value="lavender">Lavender (Purple)</option>
                      <option value="peach">Peach (Orange)</option>
                    </select>
                  </label>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setQuickHabitOpen(false)}
                      className="rounded-xl border border-border bg-card px-2.5 py-1 text-[9px] font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!quickHabitName.trim()}
                      className="rounded-xl bg-foreground text-background px-2.5 py-1 text-[9px] font-bold cursor-pointer"
                    >
                      Save Habit
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {habits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <p className="text-[10px] text-muted-foreground italic mb-3">
                  No habits configured. Establish routine check-ins to build neural pathways!
                </p>
                <button
                  type="button"
                  onClick={() => setQuickHabitOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Establish Your First Habit
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {habits.slice(0, 3).map((h: any) => {
                  const todayCompleted = h.days?.[6] === 1;
                  return (
                    <div
                      key={h.id}
                      className="flex items-center justify-between gap-3 bg-secondary/25 border border-border/30 rounded-2xl p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate">{h.name}</div>
                        <div className="text-[9px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Flame className="h-3 w-3 text-orange-500" /> {h.streak}d streak · {h.pct}% consistency
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const todayStr = new Date().toLocaleDateString("en-CA");
                          toggleHabit({ id: h.id, date: todayStr, completed: !todayCompleted });
                          toast.success(
                            todayCompleted
                              ? "Habit unchecked"
                              : "Habit checked off! Keep pushing 🔥",
                          );
                        }}
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center transition-all border cursor-pointer",
                          todayCompleted
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20"
                            : "bg-card border-border/80 text-muted-foreground hover:bg-secondary",
                        )}
                      >
                        <CheckCircle2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* FEATURE 2 — GOAL HEALTH SCORE CARD */}
          <div className={cardClass}>
            <div className="flex items-center justify-between border-b border-border/40 pb-2.5 mb-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Target className="h-4 w-4 text-primary animate-pulse" /> Goal Health Cockpit
              </h3>
              <Link
                to="/app/goals"
                className="text-[9px] font-bold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              >
                View All →
              </Link>
            </div>

            <div className="space-y-4">
              {activeGoals.length === 0 ? (
                <p className="text-[10px] text-muted-foreground italic text-center py-4">
                  No active goals set. Formulate your destination goals in Goals page.
                </p>
              ) : (
                activeGoals.slice(0, 3).map((g: any) => {
                  const score = g.healthScore || 80;
                  const status = g.healthStatus || "On Track";
                  
                  // Color codes
                  let badgeColor = "bg-emerald-500/10 border-emerald-500/20 text-emerald-600";
                  let circleStroke = "var(--mint)";
                  
                  if (status === "Excellent") {
                    badgeColor = "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400";
                    circleStroke = "var(--mint)";
                  } else if (status === "At Risk") {
                    badgeColor = "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400";
                    circleStroke = "var(--peach)";
                  } else if (status === "Critical") {
                    badgeColor = "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400";
                    circleStroke = "var(--lavender)";
                  }

                  return (
                    <div key={g.id} className="bg-secondary/15 border border-border/30 rounded-2xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold truncate">{g.title}</h4>
                          <p className="text-[8px] text-muted-foreground font-semibold mt-0.5 tracking-wide">
                            TYPE: {g.type.toUpperCase()} · PROBABILITY: {g.completionProbability}%
                          </p>
                        </div>

                        {/* Health Score Mini Ring */}
                        <div className="relative h-11 w-11 shrink-0">
                          <svg className="h-full w-full -rotate-90">
                            <circle
                              cx="22"
                              cy="22"
                              r="17"
                              className="stroke-secondary fill-transparent"
                              strokeWidth="3.5"
                            />
                            <circle
                              cx="22"
                              cy="22"
                              r="17"
                              className="transition-all duration-700 fill-transparent"
                              strokeWidth="3.5"
                              strokeDasharray={106.8}
                              strokeDashoffset={106.8 - (106.8 * score) / 100}
                              strokeLinecap="round"
                              style={{ stroke: circleStroke }}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-[8px] font-extrabold font-mono leading-none">{score}</span>
                            <span className="text-[6px] text-muted-foreground uppercase leading-none font-bold scale-90">Health</span>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar & Status Badge */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className={cn("rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider border", badgeColor)}>
                            {status}
                          </span>
                          <span className="font-bold text-muted-foreground">{g.progress}% Complete</span>
                        </div>
                        
                        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-[oklch(0.75_0.13_220)] transition-all duration-500"
                            style={{ width: `${g.progress}%` }}
                          />
                        </div>
                      </div>

                      {g.nextMilestone && (
                        <p className="text-[9px] text-muted-foreground flex items-center gap-1.5 bg-card border border-border/40 rounded-lg px-2 py-1 select-none">
                          <Sparkles className="h-3 w-3 text-primary shrink-0 animate-pulse" />
                          <span className="font-bold text-foreground/80 shrink-0">Next:</span>
                          <span className="truncate">{g.nextMilestone}</span>
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* FEATURE 3 — AI OPPORTUNITY DETECTOR CARD */}
          <div className={cardClass}>
            <div className="flex items-center justify-between border-b border-border/40 pb-2.5 mb-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-violet-500 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-violet-500 animate-pulse" /> Opportunity Detector
              </h3>
            </div>

            <div className="space-y-2.5">
              {opportunitySignals.length === 0 ? (
                <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 p-3.5">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    <span className="font-bold block">Telemetry Clean</span>
                    <span className="mt-0.5 block leading-normal">FlowPilot found zero warnings! Momentum is robust.</span>
                  </div>
                </div>
              ) : (
                opportunitySignals.slice(0, 3).map((sig: any) => {
                  let badgeStyle = "bg-violet-500/5 border-violet-500/10 text-violet-600 dark:text-violet-400";
                  let dotStyle = "bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]";

                  if (sig.level === "critical") {
                    badgeStyle = "bg-red-500/5 border-red-500/10 text-red-600 dark:text-red-400";
                    dotStyle = "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]";
                  } else if (sig.level === "warning") {
                    badgeStyle = "bg-amber-500/5 border-amber-500/10 text-amber-600 dark:text-amber-400";
                    dotStyle = "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]";
                  }

                  return (
                    <div key={sig.id} className={cn("rounded-2xl border p-3 space-y-2 select-none", badgeStyle)}>
                      <div className="flex items-center gap-2">
                        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotStyle)} />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider">{sig.category} · {sig.level}</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold leading-tight text-foreground/80">{sig.title}</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">{sig.description}</p>
                      </div>
                      <div className="mt-1 bg-white/20 dark:bg-black/20 rounded-xl p-2 text-[9px] leading-relaxed text-foreground font-medium flex items-start gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 animate-pulse mt-0.5" />
                        <span>{sig.actionableSuggestion}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
