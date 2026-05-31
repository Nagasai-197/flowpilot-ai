import { createFileRoute } from "@tanstack/react-router";
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Sparkles, TrendingUp, Award, Clock, Loader2, RefreshCw, AlertTriangle, ShieldAlert } from "lucide-react";
import { useAnalytics } from "../hooks/useAnalytics";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useState } from "react";

export const Route = createFileRoute("/app/analytics")({
  component: Analytics,
});

const card = "rounded-3xl border border-border/60 bg-card shadow-soft";

function Analytics() {
  const { dashboardStats, trendData, heatmapData, isLoading: analyticsLoading, isError } = useAnalytics();
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Query high-performance Analytics Copilot summary
  const { data: copilotSummary, isLoading: copilotLoading } = useQuery({
    queryKey: ["copilot"],
    queryFn: async () => {
      const res = await api.get("/analytics/copilot");
      return res.data;
    }
  });

  // Query Weekly Review retrospective narrative
  const { data: weeklyReview, isLoading: reviewLoading, refetch: refetchReview } = useQuery({
    queryKey: ["weeklyReview"],
    queryFn: async () => {
      const res = await api.get("/analytics/weekly-review");
      return res.data;
    },
    enabled: isReviewOpen // Only query when review modal is opened
  });

  const isLoading = analyticsLoading || copilotLoading;

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Analyzing productivity indices...</p>
        </div>
      </div>
    );
  }

  if (isError || !dashboardStats) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center glass rounded-3xl p-8 max-w-sm">
          <p className="text-sm text-red-500 font-medium">Failed to load analytics profiles</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs text-primary-foreground hover:bg-primary/90 cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Format heatmap for monthly momentum area charts
  // Life Score parameters
  const lifeScore = copilotSummary?.scores?.lifeScore ?? dashboardStats.productivityScore;
  const successScore = copilotSummary?.scores?.successScore ?? 0;
  const risks = copilotSummary?.briefing?.risks || [];
  const goals = copilotSummary?.goals || [];

  const statCards = [
    { l: "AI Life Score", v: `${lifeScore}/100`, d: "Overall balance score", icon: TrendingUp },
    { l: "Success Score Today", v: `${successScore}/100`, d: "Tasks completed today", icon: Clock },
    { l: "Habit Consistency", v: dashboardStats.habitConsistency, d: "Past 30 days", icon: Award },
    { l: "Active Habits Streak", v: dashboardStats.currentStreak, d: "Current streak", icon: Sparkles },
  ];

  // Derive insight narratives from real analytics data
  const productivityNum = parseInt(String(dashboardStats.productivityScore)) || 0;
  const streakNum = parseInt(String(dashboardStats.currentStreak)) || 0;
  const consistencyStr = String(dashboardStats.habitConsistency || "0%");
  const consistencyNum = parseInt(consistencyStr) || 0;

  const whatWentWell = productivityNum >= 70
    ? `Your productivity score of ${productivityNum}% is above target. ${streakNum > 0 ? `You're maintaining a ${streakNum}-day habit streak.` : ""}`
    : consistencyNum >= 60
      ? `Habit consistency at ${consistencyStr} is solid — you're building reliable daily routines.`
      : `You completed your tracked habits and stayed engaged with the system this period.`;

  const needsAttention = productivityNum < 50
    ? `Productivity score (${productivityNum}%) is below the 70% target threshold. Consider reducing task backlog.`
    : consistencyNum < 50
      ? `Habit consistency (${consistencyStr}) needs improvement. Missing streaks reduces your AI Life Score.`
      : risks.length > 0
        ? risks[0]
        : `Keep monitoring high-priority tasks to prevent any overdue build-up.`;

  const suggestedAction = streakNum === 0
    ? `Start a new habit today — even a 5-minute routine builds momentum.`
    : productivityNum < 60
      ? `Block 90 minutes for your highest-priority task first thing tomorrow morning.`
      : `Generate an AI Planner schedule to protect deep work blocks for your active goals.`;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Analytics</h1>
          <p className="text-sm text-muted-foreground">Where your focus, energy, and momentum live.</p>
        </div>
        <button
          onClick={() => setIsReviewOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 cursor-pointer"
        >
          <Sparkles className="h-4 w-4 text-primary animate-pulse" /> Generate Weekly Review
        </button>
      </div>

      {/* Metric dials */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.l} className={`${card} p-5`}>
            <div className="flex items-center justify-between">
              <s.icon className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-medium text-primary">{s.d}</span>
            </div>
            <div className="mt-3 font-display text-3xl">{s.v}</div>
            <div className="text-xs text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </div>

      {/* AI Insights: What went well / Needs attention / Suggested action */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-green-500/20 dark:border-green-500/10 bg-gradient-to-br from-green-500/5 to-card p-5 shadow-soft">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-green-600 dark:text-green-400 mb-2">
            <span className="text-base">✅</span> What went well
          </div>
          <p className="text-sm text-foreground leading-relaxed">{whatWentWell}</p>
        </div>
        <div className="rounded-3xl border border-amber-500/20 dark:border-amber-500/10 bg-gradient-to-br from-amber-500/5 to-card p-5 shadow-soft">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-2">
            <span className="text-base">⚠️</span> Needs attention
          </div>
          <p className="text-sm text-foreground leading-relaxed">{needsAttention}</p>
        </div>
        <div className="rounded-3xl border border-primary/20 dark:border-primary/10 bg-gradient-to-br from-primary/5 to-card p-5 shadow-soft">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary mb-2">
            <span className="text-base">🚀</span> Suggested action
          </div>
          <p className="text-sm text-foreground leading-relaxed">{suggestedAction}</p>
        </div>
      </div>

      {/* Focus lines chart */}
      <div className={`${card} p-6`}>
        <h3 className="text-base font-semibold">Productivity vs Focus · 14 days</h3>
        {trendData.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-xs text-muted-foreground">Use FlowPilot for a few days to unlock personalized analytics.</div>
        ) : (
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <LineChart data={trendData}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="d" tick={{ fontSize: 11, fill: "oklch(0.55 0.02 260)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "oklch(0.55 0.02 260)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", backgroundColor: "var(--card)", color: "var(--foreground)", fontSize: 12 }} />
                <Line dataKey="score" stroke="oklch(0.55 0.18 270)" strokeWidth={2.5} name="Productivity Score" dot={false} />
                <Line dataKey="focus" stroke="oklch(0.72 0.13 200)" strokeWidth={2.5} name="Focus Index" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Goal Management lists */}
      {goals.length > 0 && (
        <div className={`${card} p-6`}>
          <h3 className="text-base font-semibold">Active goal progress</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {goals.map((g: any) => {
              const progress = g.progress ?? 0;
              const color = g.type === "Career" ? "lavender" : g.type === "Health" ? "mint" : g.type === "Learning" ? "sky" : "peach";
              return (
                <div key={g.id} className="rounded-2xl border border-border/60 bg-secondary/35 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{g.type}</span>
                      <span className="text-[10px] text-muted-foreground font-semibold capitalize">{g.status}</span>
                    </div>
                    <h4 className="mt-2 text-sm font-semibold text-foreground leading-relaxed">{g.title}</h4>
                  </div>
                  <div className="mt-4 space-y-1.5 border-t border-border/30 pt-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span className="font-semibold" style={{ color: `var(--${color})` }}>{progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress}%`, background: `var(--${color})` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Proactive warnings / Risks banner */}
      {risks.length > 0 && (
        <div className={`${card} p-6 border-red-500/20 bg-gradient-to-br from-card to-red-500/5`}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-red-500">
            <ShieldAlert className="h-4 w-4" /> Warnings & Alerts
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {risks.slice(0, 3).map((r: any, idx: number) => (
              <div key={idx} className="flex gap-2 rounded-2xl border border-red-500/10 bg-white p-4 text-sm dark:bg-zinc-900/40 text-muted-foreground leading-relaxed">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Review Retrospective Modal Overlay */}
      {isReviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                <h2 className="font-display text-xl">AI Weekly Review</h2>
              </div>
              <button 
                onClick={() => setIsReviewOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer font-bold"
              >
                Close ×
              </button>
            </div>

            {reviewLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground animate-pulse">Preparing your weekly review...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap bg-secondary/35 border border-border/40 rounded-2xl p-4">
                  {weeklyReview?.data?.narrative}
                </div>
                
                <div className="flex gap-2 justify-end pt-3">
                  <button
                    onClick={() => refetchReview()}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-full cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" /> Refresh Review
                  </button>
                  <button
                    onClick={() => setIsReviewOpen(false)}
                    className="rounded-full bg-foreground px-4 py-1.5 text-xs text-background font-medium hover:opacity-90 cursor-pointer"
                  >
                    Ack review
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
