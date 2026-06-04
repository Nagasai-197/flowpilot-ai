import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Flame,
  TrendingUp,
  ArrowUpRight,
  CalendarDays,
  Zap,
  Loader2,
  Award,
  Brain,
  Coffee,
  Target,
  Activity,
  Calendar,
  ClipboardList,
  Repeat,
  Plus,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit2,
  Clock,
  Pin,
  X,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { usePlanner } from "../hooks/usePlanner";
import { useHabits } from "../hooks/useHabits";
import { useGoals } from "../hooks/useGoals";
import { useEvents, CalendarEvent } from "../hooks/useEvents";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { useState, useEffect, useMemo } from "react";

export const Route = createLazyFileRoute("/app/dashboard")({
  component: Dashboard,
});

const cardClass =
  "rounded-3xl border border-border/60 bg-card shadow-soft p-4 sm:p-6 relative overflow-hidden transition-all duration-300 hover:shadow-float";

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

  const [isDeferredMounted, setIsDeferredMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDeferredMounted(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const { generatePlanAsync } = usePlanner(undefined, { enabled: false });
  const { habits, toggleHabit, createHabit } = useHabits({ enabled: isDeferredMounted });
  const { createGoal } = useGoals({ enabled: false });

  // Calendar & Events states
  const { events, addEvent, updateEvent, deleteEvent } = useEvents();
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDayStr, setSelectedDayStr] = useState(new Date().toISOString().split("T")[0]);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventTime, setEventTime] = useState("10:00");
  const [eventCategory, setEventCategory] = useState<
    "Exam" | "Interview" | "Meeting" | "Deadline" | "Personal"
  >("Meeting");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const [quickGoalOpen, setQuickGoalOpen] = useState(false);
  const [quickGoalTitle, setQuickGoalTitle] = useState("");
  const [quickGoalType, setQuickGoalType] = useState("Career");

  const [quickHabitOpen, setQuickHabitOpen] = useState(false);
  const [quickHabitName, setQuickHabitName] = useState("");
  const [quickHabitColor, setQuickHabitColor] = useState("mint");
  const [focusTimerMode, setFocusTimerMode] = useState<"pomodoro" | "extended_focus" | "deep_work">(
    "pomodoro",
  );

  // Query high-performance Analytics Copilot summary
  const { data: copilotSummary, isLoading: copilotLoading } = useQuery<any>({
    queryKey: ["copilot"],
    queryFn: async () => {
      const res = await api.get("/analytics/copilot");
      return res.data;
    },
  });

  const handleRegenerate = () => {
    toast.promise(generatePlanAsync(undefined), {
      loading: "Optimizing schedule planner...",
      success: () => {
        queryClient.invalidateQueries({ queryKey: ["copilot"] });
        return "AI Schedule plan regenerated successfully! 📅";
      },
      error: "Failed to optimize schedule.",
    });
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
      }),
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
  const successScore = scores.successScore ?? 0;
  const successLabel = scores.successLabel ?? "Needs Focus";
  const habitConsistency = scores.habitConsistency ?? 0;
  const consistencyBadge = scores.consistencyBadge ?? "Average";

  const todayFocus = copilotSummary?.briefing?.todayFocus ?? "Create high-priority tasks to begin!";
  const nextBestAction = copilotSummary?.briefing?.nextBestAction ?? "Schedule a Focus Sprint";

  const warnings = copilotSummary?.briefing?.warnings || {
    overdueCount: 0,
    habitRisk: false,
    plannerMissing: false,
  };
  const activeGoals = copilotSummary?.goals || [];
  const avgGoalProgress = activeGoals.length > 0
    ? Math.round(activeGoals.reduce((sum: number, g: any) => sum + (g.progress || 0), 0) / activeGoals.length)
    : 0;

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

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of events) {
      if (!map[e.date]) {
        map[e.date] = [];
      }
      map[e.date].push(e);
    }
    return map;
  }, [events]);

  const calendarCells = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const adjustedStartDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells: { date: Date; isCurrent: boolean; key: string; cellStr: string }[] = [];

    for (let i = adjustedStartDay - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      cells.push({
        date: d,
        isCurrent: false,
        key: `prev-${i}`,
        cellStr: d.toISOString().split("T")[0],
      });
    }
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      cells.push({
        date: d,
        isCurrent: true,
        key: `curr-${i}`,
        cellStr: d.toISOString().split("T")[0],
      });
    }
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      cells.push({
        date: d,
        isCurrent: false,
        key: `next-${i}`,
        cellStr: d.toISOString().split("T")[0],
      });
    }
    return cells;
  }, [calendarDate]);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const upcomingEvents = useMemo(() => {
    return events
      .filter((e) => e.date >= todayStr)
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
      .slice(0, 3);
  }, [events, todayStr]);

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
        </div>
      </motion.section>

      {/* 2. Unified circular progress row */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4.5 lg:grid-cols-4">
        {[
          {
            label: "Goal Progress",
            value: `${avgGoalProgress}%`,
            detail: `${activeGoals.length} Active Goals`,
            pct: avgGoalProgress,
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
          <div key={item.label} className={cn(cardClass, "flex items-center gap-3 sm:gap-4.5 group/card")}>
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
                  <div className="text-xs font-bold mt-0.5">{nextFocusBlock.label}</div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-secondary/40 border border-border/40 p-4 space-y-1 text-left">
                <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                  <Brain className="h-3.5 w-3.5 text-primary" /> Today's Focus
                </div>
                <p className="text-xs font-bold text-foreground leading-snug">{todayFocus}</p>
              </div>

              <div className="rounded-2xl bg-indigo-500/5 border border-indigo-500/10 p-4 space-y-1 text-left">
                <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-indigo-500" /> Recommended Action
                </div>
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 leading-snug">
                  {nextBestAction}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Habits, Goals, Focus, Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions Panel */}
          <div className={cn(cardClass, "bg-gradient-to-br from-card to-secondary/35")}>
            <div className="flex items-center justify-between border-b border-border/40 pb-2.5 mb-3.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" /> Quick Actions Bar
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-task-modal"))}
                className="rounded-2xl border border-border bg-card p-3 text-center transition-all hover:border-primary/30 hover:shadow-float cursor-pointer flex flex-col items-center gap-1.5"
              >
                <ClipboardCheck className="h-5 w-5 text-primary" />
                <span className="text-[9px] font-bold uppercase text-foreground/80 mt-1">
                  Add Task
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
          {!isDeferredMounted ? (
            <div className={cn(cardClass, "h-[200px] flex items-center justify-center")}>
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/45" />
            </div>
          ) : (
            <div className={cardClass}>
              <div className="flex items-center justify-between border-b border-border/40 pb-2.5 mb-3.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Brain className="h-4 w-4 text-pink-500 animate-pulse" /> Focus Session Cockpit
                </h2>
                <span className="rounded-full bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 text-[8px] font-bold uppercase text-pink-600 dark:text-pink-400">
                  Streak: {focusStats.deepWorkStreak}d 🔥
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-center mb-4">
                <div className="bg-secondary/30 rounded-2xl p-2.5 border border-border/30">
                  <div className="text-xs font-bold font-mono">{focusStats.todayFocusHours}h</div>
                  <div className="text-[8px] text-muted-foreground uppercase font-bold mt-1 tracking-wider">
                    Today
                  </div>
                </div>
                <div className="bg-secondary/30 rounded-2xl p-2.5 border border-border/30">
                  <div className="text-xs font-bold font-mono">{focusStats.weeklyFocusHours}h</div>
                  <div className="text-[8px] text-muted-foreground uppercase font-bold mt-1 tracking-wider">
                    Week
                  </div>
                </div>
                <div className="bg-secondary/30 rounded-2xl p-2.5 border border-border/30">
                  <div className="text-xs font-bold font-mono">
                    {focusStats.sessionCompletionRate}%
                  </div>
                  <div className="text-[8px] text-muted-foreground uppercase font-bold mt-1 tracking-wider">
                    Adherence
                  </div>
                </div>
              </div>

              {/* Timer modes selection selector */}
              <div className="space-y-3">
                <div className="flex rounded-xl bg-secondary/50 p-1 border border-border/35 text-[9px] font-semibold text-muted-foreground">
                  {[
                    { id: "pomodoro", label: "Pomo 25m" },
                    { id: "extended_focus", label: "Focus 50m" },
                    { id: "deep_work", label: "Deep 90m" },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setFocusTimerMode(mode.id as any)}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg transition-all cursor-pointer",
                        focusTimerMode === mode.id
                          ? "bg-card text-foreground shadow-soft"
                          : "hover:text-foreground",
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
          )}

          {/* FEATURE — CALENDAR & EVENTS SIDEBAR WIDGET */}
          {!isDeferredMounted ? (
            <div className={cn(cardClass, "h-[400px] flex items-center justify-center")}>
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/45" />
            </div>
          ) : (
            <div className={cardClass}>
              <div className="flex items-center justify-between border-b border-border/40 pb-2.5 mb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-violet-500 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-violet-500" /> Calendar & Events
                </h2>
                <button
                  onClick={() => {
                    setEditingEventId(null);
                    setEventTitle("");
                    setEventDesc("");
                    setEventTime("10:00");
                    setEventCategory("Meeting");
                    setEventModalOpen(true);
                  }}
                  className="text-[9px] font-bold text-muted-foreground hover:text-violet-500 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Event
                </button>
              </div>

              {/* Monthly Calendar View */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold px-1">
                  <span>
                    {calendarDate.toLocaleString("default", { month: "long" })}{" "}
                    {calendarDate.getFullYear()}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() =>
                        setCalendarDate(
                          new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1),
                        )
                      }
                      className="p-1 hover:bg-secondary rounded-lg cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        setCalendarDate(
                          new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1),
                        )
                      }
                      className="p-1 hover:bg-secondary rounded-lg cursor-pointer"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Day Labels */}
                <div className="grid grid-cols-7 text-center text-[9px] font-bold text-muted-foreground">
                  {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                    <div key={i}>{d}</div>
                  ))}
                </div>

                {/* Date Cells Grid */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono">
                  {calendarCells.map((cell) => {
                    const isToday = cell.cellStr === todayStr;
                    const isSelected = cell.cellStr === selectedDayStr;
                    const dayEvents = eventsByDate[cell.cellStr] || [];
                    const hasEvents = dayEvents.length > 0;

                    return (
                      <button
                        key={cell.key}
                        type="button"
                        onClick={() => setSelectedDayStr(cell.cellStr)}
                        className={cn(
                          "h-6 w-full rounded-lg flex flex-col items-center justify-center relative cursor-pointer font-bold",
                          !cell.isCurrent && "text-muted-foreground/40",
                          isSelected
                            ? "bg-violet-500 text-white shadow-soft"
                            : isToday
                              ? "bg-violet-500/10 border border-violet-500/35 text-violet-600 dark:text-violet-400"
                              : "hover:bg-secondary",
                        )}
                      >
                        <span>{cell.date.getDate()}</span>
                        {hasEvents && (
                          <span
                            className={cn(
                              "absolute bottom-0.5 h-1 w-1 rounded-full",
                              isSelected ? "bg-white" : "bg-violet-500",
                            )}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Selected date events list */}
                {(() => {
                  const dayEvents = eventsByDate[selectedDayStr] || [];
                  return (
                    <div className="bg-secondary/20 rounded-2xl p-2.5 border border-border/30 text-[10px] space-y-2 mt-2">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                          Events: {selectedDayStr}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="rounded-full bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 text-[8px] font-bold text-violet-600 dark:text-violet-400">
                            {dayEvents.length} scheduled
                          </span>
                        )}
                      </div>

                      {dayEvents.length === 0 ? (
                        <p className="text-muted-foreground italic text-center py-2 text-[9px]">
                          No events planned for this date.
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                          {dayEvents.map((ev) => (
                            <div
                              key={ev.id}
                              className="bg-card border border-border/40 rounded-xl p-2 flex flex-col gap-1 hover:border-violet-500/20 transition-all"
                            >
                              <div className="flex items-start justify-between gap-1.5">
                                <span className="font-bold text-foreground truncate">{ev.title}</span>
                                <div className="flex gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingEventId(ev.id);
                                      setEventTitle(ev.title);
                                      setEventDesc(ev.description || "");
                                      setEventTime(ev.time);
                                      setEventCategory(ev.category);
                                      setEventModalOpen(true);
                                    }}
                                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      deleteEvent(ev.id);
                                      toast.success("Event deleted!");
                                    }}
                                    className="text-muted-foreground hover:text-red-500 cursor-pointer"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              {ev.description && (
                                <p className="text-[9px] text-muted-foreground line-clamp-1">
                                  {ev.description}
                                </p>
                              )}
                              <div className="flex items-center justify-between text-[8px] text-muted-foreground font-semibold">
                                <span className="flex items-center gap-0.5 font-mono">
                                  <Clock className="h-2.5 w-2.5 text-muted-foreground/60" /> {ev.time}
                                </span>
                                <span className="rounded-full bg-secondary px-1.5 py-0.5 tracking-wide text-foreground/80">
                                  {ev.category}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Upcoming Events Section (Below Month View inside same card) */}
                <div className="border-t border-border/40 pt-3 mt-3 space-y-2">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    Upcoming Events
                  </div>

                  {(() => {
                    const upcoming = upcomingEvents;

                    const formatLabel = (dateStr: string) => {
                      const todayVal = todayStr;
                      const tomDate = new Date();
                      tomDate.setDate(tomDate.getDate() + 1);
                      const tomorrowVal = tomDate.toISOString().split("T")[0];

                      if (dateStr === todayVal) return "Today";
                      if (dateStr === tomorrowVal) return "Tomorrow";

                      return new Date(dateStr).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      });
                    };

                    if (upcoming.length === 0) {
                      return (
                        <p className="text-[9px] text-muted-foreground italic text-center py-1">
                          No upcoming events.
                        </p>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        {upcoming.map((ev) => (
                          <div key={ev.id} className="flex items-start gap-2 text-xs">
                            <Pin className="h-3.5 w-3.5 text-violet-500 shrink-0 mt-0.5 rotate-45" />
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-foreground truncate">{ev.title}</div>
                              <div className="text-[9px] text-muted-foreground font-semibold flex items-center gap-1 mt-0.5">
                                <span>{formatLabel(ev.date)}</span>
                                <span>•</span>
                                <span className="font-mono">{ev.time}</span>
                                <span className="rounded bg-violet-500/5 px-1 py-0.25 text-[8px] font-bold text-violet-600 dark:text-violet-400">
                                  {ev.category}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Integrated Habits Widget Cockpit with Create Habit Modal form */}
          {!isDeferredMounted ? (
            <div className={cn(cardClass, "h-[200px] flex items-center justify-center")}>
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/45" />
            </div>
          ) : (
            <div className={cardClass}>
              <div className="flex items-center justify-between border-b border-border/40 pb-2.5 mb-3.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                  <Repeat className="h-4 w-4 text-emerald-500" /> Habits Tracker
                </h2>
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
                      <span className="mb-1 block text-[10px] text-muted-foreground">
                        Color Theme
                      </span>
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
                            <Flame className="h-3 w-3 text-orange-500" /> {h.streak}d streak · {h.pct}
                            % consistency
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
          )}
        </div>
      </section>

      {/* Event Add/Edit Modal */}
      <AnimatePresence>
        {eventModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass max-w-sm w-full rounded-3xl p-6 shadow-float border border-border/60 space-y-4 text-xs"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="font-display text-lg font-bold">
                  {editingEventId ? "Edit Calendar Event" : "Add Calendar Event"}
                </h3>
                <button
                  onClick={() => setEventModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!eventTitle.trim()) {
                    toast.error("Event title is required");
                    return;
                  }
                  if (editingEventId) {
                    updateEvent(editingEventId, {
                      title: eventTitle.trim(),
                      description: eventDesc.trim() || undefined,
                      date: selectedDayStr,
                      time: eventTime,
                      category: eventCategory,
                    });
                    toast.success("Event updated!");
                  } else {
                    addEvent({
                      title: eventTitle.trim(),
                      description: eventDesc.trim() || undefined,
                      date: selectedDayStr,
                      time: eventTime,
                      category: eventCategory,
                    });
                    toast.success("Event added!");
                  }
                  setEventModalOpen(false);
                }}
                className="space-y-3.5"
              >
                <label className="block">
                  <span className="mb-1 block text-[10px] text-muted-foreground">Event Title</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Midterm Exam"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white dark:bg-zinc-900/60 px-3 py-2 text-xs outline-none"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[10px] text-muted-foreground">
                    Description (Optional)
                  </span>
                  <textarea
                    placeholder="Provide meeting notes, links, etc."
                    value={eventDesc}
                    onChange={(e) => setEventDesc(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white dark:bg-zinc-900/60 px-3 py-2 text-xs outline-none h-16 resize-none"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2.5">
                  <label className="block">
                    <span className="mb-1 block text-[10px] text-muted-foreground">
                      Time (HH:MM)
                    </span>
                    <input
                      type="time"
                      required
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white dark:bg-zinc-900/60 px-3 py-2 text-xs outline-none font-mono"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[10px] text-muted-foreground">Category</span>
                    <select
                      value={eventCategory}
                      onChange={(e) => setEventCategory(e.target.value as any)}
                      className="w-full rounded-xl border border-border bg-white dark:bg-zinc-900/60 px-3 py-2 text-xs outline-none cursor-pointer"
                    >
                      <option value="Meeting">Meeting 💼</option>
                      <option value="Exam">Exam 📝</option>
                      <option value="Interview">Interview 🤝</option>
                      <option value="Deadline">Deadline 🚨</option>
                      <option value="Personal">Personal 🌿</option>
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1 block text-[10px] text-muted-foreground">Target Date</span>
                  <input
                    type="date"
                    required
                    value={selectedDayStr}
                    onChange={(e) => setSelectedDayStr(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white dark:bg-zinc-900/60 px-3 py-2 text-xs outline-none font-mono"
                  />
                </label>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setEventModalOpen(false)}
                    className="rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-foreground text-background px-4 py-2 text-xs font-bold cursor-pointer hover:opacity-90"
                  >
                    {editingEventId ? "Save Changes" : "Create Event"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
