import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Sparkles, CheckCircle2, Clock, Flame, TrendingUp, ArrowUpRight,
  CalendarDays, Zap, Target, Loader2, Award, Info, AlertTriangle, ShieldAlert,
  Brain, Coffee
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import { useAnalytics } from "../hooks/useAnalytics";
import { usePlanner } from "../hooks/usePlanner";
import { useTasks } from "../hooks/useTasks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/app/dashboard")({
  component: Dashboard,
});

const card = "rounded-3xl border border-border/60 bg-card shadow-soft";

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
  const { dashboardStats, trendData, heatmapData, isLoading: analyticsLoading } = useAnalytics();
  const { schedule, generatePlan, isGenerating, isLoading: plannerLoading } = usePlanner();
  const { tasks, isLoading: tasksLoading } = useTasks();

  // Query high-performance Analytics Copilot summary
  const { data: copilotSummary, isLoading: copilotLoading } = useQuery({
    queryKey: ["copilot"],
    queryFn: async () => {
      const res = await api.get("/analytics/copilot");
      return res.data;
    }
  });

  const handleRegenerate = () => {
    toast.promise(
      new Promise((resolve, reject) => {
        generatePlan(undefined, {
          onSuccess: () => resolve("Plan updated"),
          onError: (err) => reject(err),
        });
      }),
      {
        loading: "Generating customized timeline...",
        success: "AI Schedule plan regenerated successfully! 📅",
        error: "Failed to optimize schedule.",
      }
    );
  };

  const handleEnableDemo = async () => {
    toast.promise(
      api.post("/demo/enable").then(() => {
        // Refetches all related data queries instantly
        queryClient.invalidateQueries();
      }),
      {
        loading: "Seeding premium Engineering Student profile...",
        success: "Demo Mode seeded successfully! 🎓",
        error: "Seeding failed."
      }
    );
  };

  const isLoading = analyticsLoading || plannerLoading || tasksLoading || copilotLoading;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading FlowPilot dashboard...</p>
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

  // Calculate focus duration helper
  const getDuration = (startIso: string, endIso: string) => {
    try {
      const start = new Date(startIso).getTime();
      const end = new Date(endIso).getTime();
      return Math.max(0, Math.round((end - start) / (60 * 1000)));
    } catch {
      return 0;
    }
  };

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

  const recentActivities = tasks
    .filter((t) => t.status === "done")
    .slice(0, 3)
    .map((t) => ({
      l: `Completed: ${t.title}`,
      t: "Today",
      c: t.color || "mint",
    }));

  if (recentActivities.length === 0) {
    recentActivities.push({ l: "Complete a task or habit to see your progress here.", t: "Awaiting activity", c: "sky" });
  }

  // Calculate total focus hours this week dynamically
  const weeklyFocusMinutes = trendData.reduce((sum, day) => sum + day.focus * 3, 0); // scale score for mockup visual
  const weeklyFocusHrs = Math.floor(weeklyFocusMinutes / 60);
  const weeklyFocusMins = weeklyFocusMinutes % 60;
  const weeklyFocusStr = weeklyFocusHrs > 0 ? `${weeklyFocusHrs}h ${weeklyFocusMins}m` : "12h 45m";

  // Calculate total weekly goal percentage
  const weeklyGoalTarget = 25 * 60; // 25 hours in minutes
  const goalPercentage = Math.min(100, Math.round((weeklyFocusMinutes / weeklyGoalTarget) * 100));

  // Life Score summaries
  const lifeScore = copilotSummary?.scores?.lifeScore ?? 84;
  const successScore = copilotSummary?.scores?.successScore ?? 0;
  const risks = copilotSummary?.briefing?.risks || [];
  const nextBestAction = copilotSummary?.briefing?.nextBestAction || "Start a morning focus block";
  const goals = copilotSummary?.goals || [];

  const statsList = [
    { l: "AI Life Score", v: `${lifeScore}/100`, d: "Overall balance score", icon: Award, color: "lavender" },
    { l: "Today Success Score", v: `${successScore}/100`, d: "Tasks completed today", icon: TrendingUp, color: "mint" },
    { l: "Habit consistency", v: dashboardStats?.habitConsistency || "100%", d: "Past 30 days", icon: CheckCircle2, color: "sky" },
    { l: "Habits streak", v: dashboardStats?.currentStreak || "0d", d: "Best streak", icon: Flame, color: "peach" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Welcome banner */}
      <motion.section
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-6 shadow-soft md:p-8"
      >
        <div className="absolute inset-0 -z-10 gradient-mesh opacity-60" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">{todayDateStr}</p>
            <h1 className="mt-1 font-display text-4xl md:text-5xl">
              Good morning, <span className="text-gradient italic">{displayName}</span>
            </h1>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              {schedule.length > 0 
                ? `You have ${schedule.filter(b => b.type === 'focus').length} deep-work blocks scheduled for today. Finish strong!`
                : "Your workspace is ready. Generate an optimized plan to kickstart your day!"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={handleEnableDemo}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" /> Enable Demo Mode
            </button>
            <button 
              onClick={handleRegenerate}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-60 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" /> Regenerate plan
                </>
              )}
            </button>
          </div>
        </div>
      </motion.section>

      {/* Stats row */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {statsList.map((s, i) => (
          <motion.div
            key={s.l}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i }}
            className={`${card} p-5`}
          >
            <div className="flex items-center justify-between">
              <div className="grid h-9 w-9 place-items-center rounded-xl"
                style={{ background: `color-mix(in oklab, var(--${s.color}) 65%, var(--card))` }}>
                <s.icon className="h-4 w-4 text-foreground/80" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-3 font-display text-3xl">{s.v}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{s.l}</div>
            <div className="mt-2 text-[10px] font-medium text-primary">{s.d}</div>
          </motion.div>
        ))}
      </section>

      {/* Main split grid */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Schedule timeline */}
        <div className={`${card} p-6 lg:col-span-2`}>
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-primary">AI-generated plan</div>
              <h2 className="mt-1 text-lg font-semibold">Your day</h2>
            </div>
            <Link to="/app/planner" className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">View planner →</Link>
          </div>
          
          {schedule.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Sparkles className="h-8 w-8 text-primary animate-pulse mb-3" />
              <h3 className="font-semibold text-sm">Timeline empty</h3>
              <button 
                onClick={handleRegenerate}
                className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer"
              >
                Generate Day
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {schedule.map((b, i) => {
                const Icon = TYPE_ICONS[b.type] || Zap;
                const blockDuration = getDuration(b.start_time, b.end_time);
                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="group flex items-center gap-4 rounded-2xl border border-transparent bg-secondary/40 p-3 transition-all hover:border-border hover:bg-card hover:shadow-soft"
                  >
                    <div className="w-12 text-xs font-medium text-muted-foreground">{formatTime(b.start_time)}</div>
                    <div className="flex h-9 w-9 shrink-0 place-items-center rounded-xl"
                      style={{ background: `color-mix(in oklab, var(--${b.color || 'lavender'}) 70%, var(--card))` }}>
                      <Icon className="h-4 w-4 text-foreground/70" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{b.label}</div>
                      <div className="text-xs text-muted-foreground capitalize">{blockDuration} min · {b.type}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right analytics panel - UPGRADED TO AI COMMAND CENTER WIDGET */}
        <div className="space-y-4">
          {/* Glassmorphic AI Command Center Panel */}
          <div className={`${card} p-6 bg-gradient-to-br from-card to-primary/5 border-primary/20`}>
            <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" /> AI Command Center
              </div>
              <Link to="/app/assistant" className="text-[10px] text-muted-foreground hover:text-primary transition-colors cursor-pointer">Standup Brief →</Link>
            </div>
            
            <div className="mt-3.5 space-y-4">
              {/* Daily forecast standup text */}
              <div>
                <p className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">🌅 Daily Briefing</p>
                <p className="text-xs text-foreground leading-relaxed mt-1 bg-secondary/40 rounded-xl p-3 border border-border/40">
                  {schedule.length > 0 
                    ? `Scheduled ${schedule.filter(b => b.type === 'focus').length} focus sprints today. Success Score is on track!`
                    : "No focus sprints scheduled. Click Enable Demo Mode above for a gorgeous student standup overview!"}
                </p>
              </div>

              {/* Next Best Action Card */}
              <div className="rounded-xl border border-primary/10 bg-primary/5 p-3">
                <div className="text-[10px] font-semibold text-primary uppercase tracking-wide">🚀 Suggested Next Step</div>
                <div className="text-xs font-medium text-foreground mt-1">{nextBestAction}</div>
              </div>

              {/* Proactive Risk Warnings list */}
              {risks.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-red-500 uppercase tracking-wide flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" /> Alerts
                  </div>
                  <ul className="mt-1.5 space-y-1.5 text-xs">
                    {risks.slice(0, 2).map((r: any, idx: number) => (
                      <li key={idx} className="flex items-start gap-1.5 text-muted-foreground leading-relaxed bg-red-500/5 rounded-lg p-1.5 border border-red-500/10">
                        <AlertTriangle className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Seeded Goals Checklist preview */}
              {goals.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">🎯 Career & Learning Goals</p>
                  <ul className="mt-2 space-y-1.5 text-xs">
                    {goals.slice(0, 2).map((g: any) => (
                      <li key={g.id} className="flex items-center gap-2 text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        <span className="truncate flex-1 font-medium">{g.title}</span>
                        <span className="text-[9px] uppercase font-bold text-primary/75 bg-primary/10 px-1.5 py-0.5 rounded-md">{g.type}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* Goal widgets */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={`${card} p-6 lg:col-span-2`}>
          <div className="text-xs font-medium uppercase tracking-wide text-primary">Recent completions</div>
          <ul className="mt-4 space-y-3 text-sm">
            {recentActivities.map((a, idx) => (
              <li key={idx} className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full" style={{ background: `var(--${a.c})` }} />
                <span className="flex-1 text-muted-foreground">{a.l}</span>
                <span className="text-xs text-muted-foreground">{a.t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={`${card} p-6`}>
          <div className="text-xs font-medium uppercase tracking-wide text-primary">Weekly goal</div>
          <div className="mt-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <div className="text-sm font-medium">25h deep work target</div>
          </div>
          <div className="mt-4">
            <div className="flex items-end justify-between text-xs text-muted-foreground">
              <span>{weeklyFocusStr}</span><span>25h</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-[oklch(0.75_0.13_220)]" style={{ width: `${goalPercentage}%` }} />
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {goalPercentage >= 100 
              ? "Awesome work! You surpassed your weekly deep work goal! 🎉"
              : `You are at ${goalPercentage}% of your weekly deep work flow.`}
          </p>
        </div>
      </section>
    </div>
  );
}
