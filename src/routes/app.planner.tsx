import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, Zap, Coffee, Brain, Calendar, Loader2 } from "lucide-react";
import { useState } from "react";
import { usePlanner } from "../hooks/usePlanner";
import { toast } from "sonner";

export const Route = createFileRoute("/app/planner")({
  component: Planner,
});

const TYPE_ICONS = {
  focus: Brain,
  break: Coffee,
  meeting: Calendar,
  habit: Zap,
  routine: Coffee,
};

function Planner() {
  const todayObj = new Date();
  const todayStr = todayObj.toISOString().split("T")[0];

  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().split("T")[0];

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const { schedule, recommendations, isLoading, isGenerating, generatePlan } = usePlanner(selectedDate);

  const handleGenerate = () => {
    const prefDeepWork = localStorage.getItem("pref_deep_work") ? parseInt(localStorage.getItem("pref_deep_work")!) : 90;
    const prefBreak = localStorage.getItem("pref_break") ? parseInt(localStorage.getItem("pref_break")!) : 15;

    toast.promise(
      new Promise((resolve, reject) => {
        generatePlan({
          targetDate: selectedDate,
          preferredDeepWorkDuration: prefDeepWork,
          breakDuration: prefBreak,
        }, {
          onSuccess: () => resolve("Plan updated"),
          onError: (err) => reject(err),
        });
      }),
      {
        loading: `Generating customized AI schedule for ${selectedDate === todayStr ? "today" : "tomorrow"}...`,
        success: "Schedule auto-balanced successfully! 📅",
        error: "Failed to optimize schedule.",
      }
    );
  };

  // Helper to format ISO timestamps as local time (HH:MM)
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return "00:00";
    }
  };

  // Helper to compute block duration in minutes
  const getDuration = (startIso: string, endIso: string) => {
    try {
      const start = new Date(startIso).getTime();
      const end = new Date(endIso).getTime();
      return Math.max(0, Math.round((end - start) / (60 * 1000)));
    } catch {
      return 0;
    }
  };

  // Dynamic statistics calculations
  const focusTimeMin = schedule
    .filter((b) => b.type === "focus")
    .reduce((sum, b) => sum + getDuration(b.start_time, b.end_time), 0);

  const breakTimeMin = schedule
    .filter((b) => b.type === "break")
    .reduce((sum, b) => sum + getDuration(b.start_time, b.end_time), 0);

  const focusHrs = Math.floor(focusTimeMin / 60);
  const focusMins = focusTimeMin % 60;
  const focusTimeStr = focusTimeMin > 0 ? `${focusHrs}h ${focusMins}m` : "0h";

  const totalActiveMin = focusTimeMin + breakTimeMin;
  const breakRatio = totalActiveMin > 0 ? Math.round((breakTimeMin / totalActiveMin) * 100) : 0;

  const focusCount = schedule.filter((b) => b.type === "focus").length;
  const cognitiveLoad = focusCount <= 2 ? "Light" : focusCount <= 4 ? "Moderate" : "High";

  const stats = [
    { l: "Focus time", v: focusTimeStr, d: "of 5h daily target", c: "lavender", pct: Math.min(100, Math.round((focusTimeMin / 300) * 100)) },
    { l: "Break ratio", v: `${breakRatio}%`, d: breakRatio >= 15 ? "Balanced ratio" : "Needs rest blocks", c: "mint", pct: Math.min(100, breakRatio * 4) },
    { l: "Cognitive load", v: cognitiveLoad, d: "AI Optimized Load", c: "sky", pct: focusCount * 20 },
  ];

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground animate-pulse">Orchestrating daily focus blocks...</p>
        </div>
      </div>
    );
  }

  // Format active selected date neatly
  const activeDateObj = selectedDate === todayStr ? todayObj : tomorrowObj;
  const formattedActiveDate = activeDateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">AI Planner</h1>
          <p className="text-sm text-muted-foreground">Adaptive scheduling, optimized for your rhythm.</p>
        </div>

        {/* Date Selector Tabs */}
        <div className="flex rounded-xl bg-secondary/60 p-1 border border-border/40 shadow-soft">
          <button
            onClick={() => setSelectedDate(todayStr)}
            className={`rounded-lg px-5 py-2 text-xs font-semibold cursor-pointer transition-all ${
              selectedDate === todayStr
                ? "bg-background text-foreground shadow-soft border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setSelectedDate(tomorrowStr)}
            className={`rounded-lg px-5 py-2 text-xs font-semibold cursor-pointer transition-all ${
              selectedDate === tomorrowStr
                ? "bg-background text-foreground shadow-soft border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Tomorrow
          </button>
        </div>

        <button 
          onClick={handleGenerate}
          disabled={isGenerating}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-60 cursor-pointer"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Optimizing...
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" /> Generate new plan
            </>
          )}
        </button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.l} className="rounded-3xl border border-border/60 bg-card p-5 shadow-soft">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.l}</div>
            <div className="mt-2 font-display text-3xl">{s.v}</div>
            <div className="mt-1 text-xs" style={{ color: `oklch(0.4 0.06 280)` }}>{s.d}</div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.pct}%`, background: `var(--${s.c})` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Timeline blocks */}
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-primary">
              {selectedDate === todayStr ? "Today's timeline" : "Tomorrow's timeline"}
            </div>
            <h2 className="mt-1 text-lg font-semibold">{formattedActiveDate}</h2>
          </div>
          <div className="text-xs text-muted-foreground">Auto-balanced by FlowPilot</div>
        </div>
        
        {schedule.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="h-8 w-8 text-primary animate-pulse mb-3" />
            <h3 className="font-semibold text-base">Your timeline is empty</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">Generate your first AI plan to organize your day.</p>
            <button 
              onClick={handleGenerate}
              className="mt-4 inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90"
            >
              Construct AI Plan
            </button>
          </div>
        ) : (
          <div className="relative">
            {/* Shunted left border to align perfectly with center of bullet (w-28 + gap-5 = left-[138px]) */}
            <div className="absolute left-[138px] top-0 bottom-0 w-px bg-border" />
            <div className="space-y-3">
              {schedule.map((b, i) => {
                const Icon = TYPE_ICONS[b.type] || Zap;
                const blockDuration = getDuration(b.start_time, b.end_time);
                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative flex items-start gap-5"
                  >
                    {/* Width widened to w-28 and mono font styled for exact range times */}
                    <div className="w-28 pt-3 text-right text-[10px] font-bold text-muted-foreground/80 tracking-tight font-mono whitespace-nowrap">
                      {formatTime(b.start_time)} - {formatTime(b.end_time)}
                    </div>
                    <div className="relative z-10 mt-3.5 h-3 w-3 shrink-0 rounded-full border-2 border-card"
                      style={{ background: `var(--${b.color || 'lavender'})` }} />
                    <div
                      className="flex-1 rounded-2xl border border-border/60 p-4 transition-all hover:shadow-soft"
                      style={{ background: `color-mix(in oklab, var(--${b.color || 'lavender'}) 22%, var(--card))` }}
                    >
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Icon className="h-4 w-4 text-foreground/80" /> {b.label}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{blockDuration} min</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-card to-secondary/40 p-6 shadow-soft">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" /> AI Recommendations
          </div>
          <div className="mt-3 space-y-2">
            {recommendations.map((rec, i) => (
              <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary">•</span> {rec}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
