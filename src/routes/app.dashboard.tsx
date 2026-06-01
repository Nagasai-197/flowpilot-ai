import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Sparkles, CheckCircle2, Flame, TrendingUp, ArrowUpRight,
  CalendarDays, Zap, Loader2, Award, AlertTriangle, ShieldAlert,
  Brain, Coffee, Target, Activity, Calendar, ClipboardList
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import { usePlanner } from "../hooks/usePlanner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { toast } from "sonner";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/app/dashboard")({
  component: Dashboard,
});

const cardClass = "rounded-3xl border border-border/60 bg-card shadow-soft p-6 relative overflow-hidden transition-all duration-300 hover:shadow-float";

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

  // Query high-performance Analytics Copilot summary
  const { data: copilotSummary, isLoading: copilotLoading } = useQuery<any>({
    queryKey: ["copilot"],
    queryFn: async () => {
      const res = await api.get("/analytics/copilot");
      return res.data.data;
    }
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
      }
    );
  };

  const handleEnableDemo = async () => {
    toast.promise(
      api.post("/demo/enable").then(() => {
        queryClient.invalidateQueries();
      }),
      {
        loading: "Seeding premium Engineering Student profile...",
        success: "Demo Mode seeded successfully! 🎓",
        error: "Seeding failed."
      }
    );
  };

  if (copilotLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Running FlowPilot AI engines...</p>
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

  // Safe destructuring of scores and values from our high-fidelity backend payload
  const lifeScore = copilotSummary?.scores?.lifeScore ?? 0;
  const successScore = copilotSummary?.scores?.successScore ?? 0;
  const successLabel = copilotSummary?.scores?.successLabel ?? 'Needs Focus';
  const habitConsistency = copilotSummary?.scores?.habitConsistency ?? 0;
  const consistencyBadge = copilotSummary?.scores?.consistencyBadge ?? 'Average';
  const currentStreak = copilotSummary?.scores?.currentStreak ?? 0;

  const todayFocus = copilotSummary?.briefing?.todayFocus ?? 'Create high-priority tasks to begin!';
  const nextBestAction = copilotSummary?.briefing?.nextBestAction ?? 'Schedule a Focus Sprint';
  
  const warnings = copilotSummary?.briefing?.warnings ?? { overdueCount: 0, habitRisk: false, plannerMissing: false };
  const goals = copilotSummary?.goals ?? [];
  const weeklyGoal = copilotSummary?.weeklyGoal ?? { completedHours: 0, targetHours: 25, percentage: 0 };
  const recentActivities = copilotSummary?.recentActivities ?? [];
  const todayPlanner = copilotSummary?.todayPlanner ?? [];

  const hasWarnings = warnings.overdueCount > 0 || warnings.habitRisk || warnings.plannerMissing;

  const statsList = [
    { 
      label: "AI Life Score", 
      value: `${lifeScore}/100`, 
      detail: "+3% compared to last week", 
      icon: Award, 
      color: "lavender",
      desc: "Overall balance score based on Tasks, Habits, Goals, and Planner adherence"
    },
    { 
      label: "Today's Success Score", 
      value: `${successScore}%`, 
      detail: successLabel, 
      icon: CheckCircle2, 
      color: "mint",
      desc: "Completion rate of tasks scheduled and due for today"
    },
    { 
      label: "Habit Consistency", 
      value: `${habitConsistency}%`, 
      detail: consistencyBadge, 
      icon: TrendingUp, 
      color: "sky",
      desc: "Completed vs expected habit check-ins over the past 30 days"
    },
    { 
      label: "Active Streak", 
      value: `${currentStreak} Days`, 
      detail: currentStreak >= 5 ? "Consistent 🔥" : "Keep it up!", 
      icon: Flame, 
      color: "peach",
      desc: "Consecutive days with Success Score >= 70% and Habit Completion >= 70%"
    },
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
              {todayPlanner.length > 0 
                ? `You have ${todayPlanner.filter((b: any) => b.type === 'focus').length} deep-work sessions mapped out for today. Keep pushing!`
                : "No focus blocks scheduled for today. Generate an optimized plan to command your workflow!"}
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
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Mapped by AI...
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

      {/* 1. Core KPIs Row */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsList.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i }}
            className={cardClass}
          >
            <div className="flex items-center justify-between">
              <div className="grid h-9 w-9 place-items-center rounded-xl"
                style={{ background: `color-mix(in oklab, var(--${s.color}) 65%, var(--card))` }}>
                <s.icon className="h-4 w-4 text-foreground/80" />
              </div>
              {s.label === "AI Life Score" && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary uppercase">
                  Active Weights
                </span>
              )}
            </div>
            
            <div className="mt-3.5 flex items-baseline justify-between">
              <div className="font-display text-3xl font-semibold tracking-tight">{s.value}</div>
              <div className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                s.label === "Active Streak" && currentStreak > 0 ? "bg-orange-500/10 text-orange-500" :
                s.label === "Today's Success Score" && successScore >= 70 ? "bg-emerald-500/10 text-emerald-500" :
                s.label === "Habit Consistency" && habitConsistency >= 70 ? "bg-sky-500/10 text-sky-500" :
                "bg-primary/10 text-primary"
              )}>
                {s.detail}
              </div>
            </div>
            
            <div className="mt-1 text-xs font-semibold text-foreground/80">{s.label}</div>
            
            {/* Embedded custom progress bars for stats if applicable */}
            {s.label === "Today's Success Score" && (
              <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500" 
                  style={{ width: `${successScore}%` }} 
                />
              </div>
            )}
            {s.label === "Habit Consistency" && (
              <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-400 transition-all duration-500" 
                  style={{ width: `${habitConsistency}%` }} 
                />
              </div>
            )}
            
            <p className="mt-2.5 text-[9px] leading-normal text-muted-foreground">{s.desc}</p>
          </motion.div>
        ))}
      </section>

      {/* Main split grid */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Side: Intelligent Daily Brief & Today's Plan */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* AI Daily Briefing Card */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`${cardClass} bg-gradient-to-br from-card to-primary/5 border-primary/20`}
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" /> AI Daily Briefing
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground">FlowPilot Assistant</span>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {/* Today's Focus */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                    <Brain className="h-3.5 w-3.5 text-primary" /> Today's Focus
                  </h4>
                  <div className="mt-1.5 rounded-2xl bg-secondary/40 border border-border/40 p-3.5">
                    <p className="text-xs font-semibold text-foreground leading-snug">{todayFocus}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Suggested highest-priority task on your Kanban sheet.</p>
                  </div>
                </div>

                {/* Suggested Action */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-indigo-500" /> Recommended Action
                  </h4>
                  <div className="mt-1.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 p-3.5">
                    <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 leading-snug">{nextBestAction}</p>
                  </div>
                </div>
              </div>

              {/* Top Active Goals Preview */}
              <div className="space-y-3.5">
                <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-violet-500" /> Top Active Goals
                </h4>
                {goals.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">No active goals. Add some in the Goals page.</p>
                ) : (
                  <div className="space-y-3">
                    {goals.slice(0, 3).map((g: any) => (
                      <div key={g.id} className="rounded-xl border border-border/40 bg-secondary/20 p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold truncate max-w-[150px]">{g.title}</span>
                          <span className="font-bold text-primary text-[9px] bg-primary/10 px-1.5 py-0.5 rounded-md uppercase shrink-0">
                            {g.type}
                          </span>
                        </div>
                        <div>
                          <div className="flex justify-between text-[9px] text-muted-foreground mb-1">
                            <span>Progress</span>
                            <span>{g.progress}%</span>
                          </div>
                          <div className="h-1 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${g.progress}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Today's Planner Card */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`${cardClass}`}
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-primary">Daily Agenda</div>
                <h2 className="mt-0.5 text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-4.5 w-4.5 text-muted-foreground" /> Today's Planner
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
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Sparkles className="h-8 w-8 text-primary animate-pulse mb-3" />
                <h3 className="font-semibold text-sm">Planner empty</h3>
                <p className="text-xs text-muted-foreground max-w-xs mt-1">No schedule blocks optimized for today. Kickstart your day with AI scheduling.</p>
                <button 
                  onClick={handleRegenerate}
                  className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer"
                >
                  Generate Plan
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-2 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                {todayPlanner.map((b: any, idx: number) => {
                  const Icon = TYPE_ICONS[b.type as keyof typeof TYPE_ICONS] || Zap;
                  return (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.04 * idx }}
                      className="group flex items-center gap-4 rounded-2xl border border-transparent bg-secondary/30 p-3.5 transition-all hover:border-border hover:bg-card hover:shadow-soft"
                    >
                      <div className="w-12 text-xs font-semibold text-muted-foreground">{formatTime(b.start_time)}</div>
                      <div className="flex h-9 w-9 shrink-0 place-items-center rounded-xl"
                        style={{ background: `color-mix(in oklab, var(--${b.color || 'lavender'}) 70%, var(--card))` }}>
                        <Icon className="h-4 w-4 text-foreground/70" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold leading-none">{b.label}</div>
                        <div className="text-[10px] text-muted-foreground mt-1.5 capitalize font-medium">
                          {b.type} · {formatTime(b.start_time)} – {formatTime(b.end_time)}
                        </div>
                      </div>
                      <span className="rounded-full bg-card border border-border/80 px-2 py-0.5 text-[9px] font-semibold uppercase text-muted-foreground tracking-wider">
                        Active
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

        </div>

        {/* Right Side: Proactive Warnings, Goals, Activity Stream */}
        <div className="space-y-6">

          {/* Proactive Warnings Engine Card */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={cardClass}
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-primary" /> Warning Engine
              </h3>
              <span className="text-[9px] uppercase font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-md">
                Real-time
              </span>
            </div>

            <div className="mt-3.5 space-y-2">
              {!hasWarnings ? (
                <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 p-3.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">All workspace modules are active and optimized!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {warnings.overdueCount > 0 && (
                    <div className="flex items-center gap-2.5 rounded-2xl bg-red-500/5 border border-red-500/10 p-3.5">
                      <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                      <span className="text-xs font-semibold text-red-500">⚠️ {warnings.overdueCount} overdue tasks impacting score</span>
                    </div>
                  )}
                  {warnings.habitRisk && (
                    <div className="flex items-center gap-2.5 rounded-2xl bg-yellow-500/5 border border-yellow-500/10 p-3.5">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                      <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">⚠️ Habit consistency dropping below 50%</span>
                    </div>
                  )}
                  {warnings.plannerMissing && (
                    <div className="flex items-center gap-2.5 rounded-2xl bg-blue-500/5 border border-blue-500/10 p-3.5">
                      <AlertTriangle className="h-4 w-4 text-blue-500 shrink-0" />
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">⚠️ Generate today's plan to start agenda</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Active Goals Checklist Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={cardClass}
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Target className="h-4 w-4 text-primary" /> Active Goals Progress
              </h3>
              <Link to="/app/goals" className="text-[10px] font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                View All →
              </Link>
            </div>

            <div className="mt-4 space-y-3.5">
              {goals.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No active goals found. Set a goal to track your growth!</p>
              ) : (
                goals.map((g: any) => (
                  <div key={g.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground truncate max-w-[180px]">{g.title}</span>
                      <span className="font-bold text-muted-foreground text-[10px] shrink-0">
                        {g.progress}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-primary to-[oklch(0.75_0.13_220)] transition-all duration-500" 
                        style={{ width: `${g.progress}%` }} 
                      />
                    </div>
                    {g.targetDate && (
                      <p className="text-[9px] text-muted-foreground text-right font-medium">
                        Target: {g.targetDate.split('T')[0]}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Weekly Goal Progress Card */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={cardClass}
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <ClipboardList className="h-4 w-4 text-primary" /> Weekly Goal Progress
              </h3>
              <span className="text-[10px] font-semibold text-muted-foreground">{weeklyGoal.percentage}%</span>
            </div>

            <div className="mt-3.5">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary shrink-0" />
                <div className="text-xs font-semibold">{weeklyGoal.targetHours}h deep work target</div>
              </div>
              <div className="mt-4">
                <div className="flex items-end justify-between text-[10px] text-muted-foreground mb-1 font-medium">
                  <span>{weeklyGoal.completedHours}h completed</span>
                  <span>{weeklyGoal.targetHours}h target</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-primary to-[oklch(0.75_0.13_220)] transition-all duration-500" 
                    style={{ width: `${weeklyGoal.percentage}%` }} 
                  />
                </div>
              </div>
              <p className="mt-3.5 text-[10px] leading-relaxed text-muted-foreground">
                {weeklyGoal.percentage >= 100 
                  ? "Outstanding efficiency! You surpassed your weekly deep work flow hours! 🏆"
                  : `You are currently at ${weeklyGoal.percentage}% of your weekly deep work flow targets.`}
              </p>
            </div>
          </motion.div>

          {/* Recent Activity Feed Timeline */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={cardClass}
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-primary" /> Recent Activity
              </h3>
              <span className="text-[9px] uppercase font-bold text-muted-foreground">Stream</span>
            </div>

            <div className="mt-4 space-y-4 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
              {recentActivities.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No recent workspace actions logged.</p>
              ) : (
                recentActivities.map((a: any, idx: number) => (
                  <div key={idx} className="flex gap-3 text-xs leading-tight">
                    <span 
                      className="h-2 w-2 rounded-full shrink-0 mt-1" 
                      style={{ background: `var(--${a.color || 'mint'})` }} 
                    />
                    <div className="flex-1 space-y-0.5">
                      <p className="text-foreground/90 font-medium">{a.title}</p>
                      <p className="text-[9px] text-muted-foreground font-semibold">
                        {new Date(a.timestamp).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

        </div>
      </section>
    </div>
  );
}
