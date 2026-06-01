import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Award, Sparkles, Target, Zap, Brain, Flame, ClipboardList, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

export const Route = createFileRoute("/app/progress")({
  component: ProgressPage,
});

const BADGES = [
  {
    id: "flow_devotee",
    name: "Flow Devotee",
    desc: "Unlock 5 focus hours",
    icon: Brain,
    color: "lavender",
    unlockValue: 5,
  },
  {
    id: "streak_immortal",
    name: "Streak Immortal",
    desc: "Maintain a 5-day habit streak",
    icon: Flame,
    color: "peach",
    unlockValue: 5,
  },
  {
    id: "milestone_conqueror",
    name: "Milestone Conqueror",
    desc: "Achieve 5 goal milestones",
    icon: Target,
    color: "sky",
    unlockValue: 5,
  },
  {
    id: "reflection_master",
    name: "Reflection Master",
    desc: "Complete 1 reflection review",
    icon: Award,
    color: "mint",
    unlockValue: 1,
  },
];

function ProgressPage() {
  const { data: copilotSummary, isLoading } = useQuery<any>({
    queryKey: ["copilot"],
    queryFn: async () => {
      const res = await api.get("/analytics/copilot");
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">
            Analyzing cognitive progression...
          </p>
        </div>
      </div>
    );
  }

  // Fallback safe mapping
  const scores = copilotSummary?.scores || {};
  const xp = scores.xp ?? 0;
  const level = scores.level ?? 1;
  const nextTarget = scores.nextLevelXpTarget ?? 100;
  const baseline = scores.currentLevelXpBaseline ?? 0;
  const levelProgressPercent =
    nextTarget - baseline > 0
      ? Math.min(100, Math.round(((xp - baseline) / (nextTarget - baseline)) * 100))
      : 0;

  const currentStreak = scores.currentStreak ?? 0;
  const habitConsistency = scores.habitConsistency ?? 0;
  const lifeScore = scores.lifeScore ?? 0;
  const successScore = scores.successScore ?? 0;

  const activeGoals = copilotSummary?.goals || [];
  const weeklyFocus = copilotSummary?.weeklyGoal || {
    completedHours: 0,
    targetHours: 25,
    percentage: 0,
  };
  const scheduleCount = (copilotSummary?.todayPlanner || []).length;

  // XP achievements checking
  const achievements = {
    focusHours: weeklyFocus.completedHours,
    habitStreak: currentStreak,
    milestonesCount: activeGoals.reduce(
      (acc: number, g: any) => acc + (g.milestones?.filter((m: any) => m.completed).length || 0),
      0,
    ),
    reviewsCount: 1, // assume reflection unlocked on loading dashboard reviews count
  };

  // Static mock datasets for Recharts
  const productivityHistory = [
    { day: "Mon", score: Math.round(lifeScore * 0.9) },
    { day: "Tue", score: Math.round(lifeScore * 0.95) },
    { day: "Wed", score: Math.round(lifeScore * 0.85) },
    { day: "Thu", score: Math.round(lifeScore * 0.88) },
    { day: "Fri", score: Math.round(lifeScore * 1.02) },
    { day: "Sat", score: Math.round(lifeScore * 0.97) },
    { day: "Sun", score: lifeScore },
  ];

  const adherenceData = [
    { name: "Task Rate", completed: successScore, planned: 100 },
    { name: "Habits", completed: habitConsistency, planned: 100 },
    { name: "Planner", completed: scheduleCount > 0 ? 85 : 0, planned: 100 },
  ];

  // GitHub-style Heatmap Grid Array (past 12 weeks, 7 days per week)
  const heatmapCells = Array.from({ length: 84 }, (_, idx) => {
    // Determine activity level based on consistency and random seed
    const daySeed = (idx * 31) % 100;
    let activityLevel = 0; // 0 = none, 1 = low, 2 = medium, 3 = high
    if (idx % 7 === 0 || idx % 11 === 0) activityLevel = 0;
    else if (daySeed < habitConsistency) activityLevel = 3;
    else if (daySeed < habitConsistency * 1.5) activityLevel = 2;
    else activityLevel = 1;

    return { id: idx, level: activityLevel };
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl">Progress</h1>
        <p className="text-sm text-muted-foreground">
          Dynamic growth metrics and gamified milestones.
        </p>
      </div>

      {/* Gamification Level and XP Cockpit */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-soft relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 -z-10 h-64 w-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4.5">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.75_0.13_220)] text-xl font-bold text-white shadow-float relative shrink-0">
              <Award className="h-8 w-8 absolute opacity-10" />
              Lvl {level}
            </div>
            <div className="space-y-1.5 flex-1">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                Flow Operating Level <Sparkles className="h-4.5 w-4.5 text-primary animate-pulse" />
              </h3>
              <p className="text-xs text-muted-foreground">
                Current Experience Points:{" "}
                <span className="font-bold text-foreground">{xp} XP</span> ·{" "}
                <span className="font-semibold">
                  {nextTarget - xp} XP needed for Level {level + 1}
                </span>
              </p>
              {/* Level progress bar */}
              <div className="w-full md:w-80 h-3 rounded-full bg-secondary overflow-hidden border border-border/40">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-700"
                  style={{ width: `${levelProgressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 shrink-0 flex-wrap">
            <div className="rounded-2xl border border-border/60 bg-secondary/35 px-4.5 py-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                XP Multiplier
              </div>
              <div className="font-display text-2xl font-bold text-primary">1.5x Active</div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-secondary/35 px-4.5 py-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Global Streak
              </div>
              <div className="font-display text-2xl font-bold text-orange-500 flex items-center justify-center gap-1">
                🔥 {currentStreak}d
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Analytics Charts Grid */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Productivity Score Trend */}
        <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Brain className="h-4.5 w-4.5 text-primary" /> Overall Productivity Score
            </h3>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase">
              7-Day Trend
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={productivityHistory}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="var(--muted-foreground)" opacity={0.6} fontSize={10} />
                <YAxis
                  domain={[0, 100]}
                  stroke="var(--muted-foreground)"
                  opacity={0.6}
                  fontSize={10}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "16px",
                    boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#scoreGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Planner Adherence comparative BarChart */}
        <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <ClipboardList className="h-4.5 w-4.5 text-indigo-500" /> Planner & Execution
              Adherence
            </h3>
            <span className="text-[10px] font-semibold text-muted-foreground">
              Planned vs Actual Completion Rate
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={adherenceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  stroke="var(--muted-foreground)"
                  opacity={0.6}
                  fontSize={10}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="var(--muted-foreground)"
                  opacity={0.6}
                  fontSize={10}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "16px",
                  }}
                />
                <Bar dataKey="planned" fill="var(--secondary)" radius={[8, 8, 0, 0]} barSize={24} />
                <Bar dataKey="completed" fill="var(--primary)" radius={[8, 8, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Habit git-heatmap & Badges grid */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Habit heatmaps Git-Grid */}
        <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-soft lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border/40 pb-2.5 mb-3.5">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Zap className="h-4.5 w-4.5 text-orange-500" /> Habit Consistency Matrix
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Check-ins pattern over the past 12 weeks.
              </p>
            </div>
            <div className="flex gap-1 items-center text-[9px] text-muted-foreground font-semibold">
              <span>Less</span>
              <div className="h-2 w-2 rounded bg-secondary/60" />
              <div
                className="h-2 w-2 rounded"
                style={{ background: "color-mix(in oklab, var(--primary) 30%, var(--card))" }}
              />
              <div
                className="h-2 w-2 rounded"
                style={{ background: "color-mix(in oklab, var(--primary) 65%, var(--card))" }}
              />
              <div className="h-2 w-2 rounded bg-primary" />
              <span>More</span>
            </div>
          </div>

          {/* Map cells grid */}
          <div className="grid grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto py-1">
            {heatmapCells.map((cell) => (
              <div
                key={cell.id}
                className={cn(
                  "h-3 w-3 rounded-sm transition-all hover:scale-115 cursor-pointer",
                  cell.level === 0 && "bg-secondary/40",
                  cell.level === 1 && "style-color-mix-30",
                  cell.level === 2 && "style-color-mix-65",
                  cell.level === 3 && "bg-primary",
                )}
                style={
                  cell.level === 1
                    ? { background: "color-mix(in oklab, var(--primary) 30%, var(--card))" }
                    : cell.level === 2
                      ? { background: "color-mix(in oklab, var(--primary) 65%, var(--card))" }
                      : undefined
                }
                title={`Activity Score Level ${cell.level}`}
              />
            ))}
          </div>
        </div>

        {/* Dynamic Achievements Badges Locker */}
        <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between border-b border-border/40 pb-2.5 mb-3.5">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Award className="h-4.5 w-4.5 text-primary" /> Badges Locker
            </h3>
            <span className="text-[10px] text-muted-foreground">Unlockable Achievements</span>
          </div>

          <div className="space-y-3">
            {BADGES.map((b) => {
              // Check unlock status
              let currentValue = 0;
              if (b.id === "flow_devotee") currentValue = achievements.focusHours;
              else if (b.id === "streak_immortal") currentValue = achievements.habitStreak;
              else if (b.id === "milestone_conqueror") currentValue = achievements.milestonesCount;
              else if (b.id === "reflection_master") currentValue = achievements.reviewsCount;

              const isUnlocked = currentValue >= b.unlockValue;
              const Icon = b.icon;

              return (
                <div
                  key={b.id}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-2.5 transition-all select-none",
                    isUnlocked
                      ? "bg-gradient-to-br from-card to-secondary/30 border-border/60"
                      : "bg-secondary/10 border-border/20 opacity-50",
                  )}
                >
                  <div
                    className={cn(
                      "grid h-10 w-10 place-items-center rounded-xl transition-transform",
                      isUnlocked ? "shadow-soft" : "bg-secondary/40 text-muted-foreground",
                    )}
                    style={
                      isUnlocked
                        ? { background: `color-mix(in oklab, var(--${b.color}) 45%, var(--card))` }
                        : undefined
                    }
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold truncate">{b.name}</span>
                      {isUnlocked && (
                        <span className="rounded-md bg-emerald-500/10 px-1 py-0.2 text-[8px] font-bold text-emerald-600 uppercase">
                          Unlocked
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{b.desc}</p>
                    <div className="flex justify-between text-[8px] text-muted-foreground/60 mt-1">
                      <span>Progress</span>
                      <span>
                        {Math.min(b.unlockValue, currentValue)}/{b.unlockValue}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
