import { createLazyFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Award,
  Target,
  Zap,
  ClipboardList,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  History,
  BookOpen,
  Clock,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createLazyFileRoute("/app/review")({
  component: ReviewPage,
});

function ReviewPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"new" | "archive">("new");

  // Date window presets
  const today = new Date();
  const sevenDaysAgo = new Date(new Date().setDate(today.getDate() - 7));
  const formatIsoDate = (d: Date) => d.toISOString().split("T")[0];

  const [reviewType, setReviewType] = useState<"weekly" | "monthly">("weekly");
  const [startDate, setStartDate] = useState(formatIsoDate(sevenDaysAgo));
  const [endDate, setEndDate] = useState(formatIsoDate(today));

  // Reflection Q&A states
  const [whatWorked, setWhatWorked] = useState("");
  const [whatDidnt, setWhatDidnt] = useState("");
  const [whatShouldChange, setWhatShouldChange] = useState("");
  const [userWins, setUserWins] = useState<string[]>([]);
  const [draftResult, setDraftResult] = useState<any | null>(null);

  // Expanded archive review state
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);

  // 1. Fetch completed reviews archive
  const { data: archiveData, isLoading: archiveLoading } = useQuery<any>({
    queryKey: ["reviews"],
    queryFn: async () => {
      const res = await api.get("/reviews");
      return res.data;
    },
  });

  const completedReviews = archiveData?.reviews || [];

  // 2. AI draft synthesis mutation
  const draftMutation = useMutation<any, Error, any>({
    mutationFn: (payload) => api.post("/reviews/draft", payload),
    onSuccess: (res) => {
      const draft = res.data.draft;
      setDraftResult(draft);
      setUserWins(draft.wins || []);
      toast.success("AI Reflection Draft synthesized!");
    },
    onError: (err) => {
      toast.error(`Draft generation failed: ${err.message}`);
    },
  });

  // 3. Save completed review journal mutation
  const saveReviewMutation = useMutation<any, Error, any>({
    mutationFn: (payload) => api.post("/reviews", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["copilot"] });
      toast.success("Reflection Journal submitted to archive! 🏆");

      // Reset form
      setDraftResult(null);
      setWhatWorked("");
      setWhatDidnt("");
      setWhatShouldChange("");
      setActiveTab("archive");
    },
    onError: (err: any) => {
      toast.error(`Failed to submit review: ${err.message}`);
    },
  });

  const handleGenerateDraft = (e: React.FormEvent) => {
    e.preventDefault();
    toast.promise(
      draftMutation.mutateAsync({
        type: reviewType,
        period_start: startDate,
        period_end: endDate,
      }),
      {
        loading: "AI analyzing recent focus hours and active KPIs...",
        success: "Conscious briefing calculated!",
        error: "Failed to generate draft.",
      },
    );
  };

  const handleSubmitReview = () => {
    if (!whatWorked.trim() || !whatDidnt.trim() || !whatShouldChange.trim()) {
      toast.error("Please answer all three reflection questions before submitting.");
      return;
    }

    saveReviewMutation.mutate({
      type: reviewType,
      period_start: startDate,
      period_end: endDate,
      wins: userWins,
      missed_tasks: draftResult?.missed_tasks || [],
      goal_progress: draftResult?.goal_progress || [],
      habit_performance: draftResult?.habit_performance || {},
      reflection_q_and_a: {
        whatWorked: whatWorked.trim(),
        whatDidnt: whatDidnt.trim(),
        whatShouldChange: whatShouldChange.trim(),
      },
      next_plan: draftResult?.next_plan || {},
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Review & Reflection</h1>
          <p className="text-sm text-muted-foreground">
            Analyze victories, diagnose bottlenecks, and align next week's outcomes.
          </p>
        </div>

        {/* Tab Selector Toggle */}
        <div className="rounded-full bg-secondary/60 p-1 flex items-center border border-border/40 select-none">
          <button
            onClick={() => setActiveTab("new")}
            className={cn(
              "rounded-full px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all",
              activeTab === "new"
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <BookOpen className="h-3.5 w-3.5" /> Start Reflection
          </button>
          <button
            onClick={() => setActiveTab("archive")}
            className={cn(
              "rounded-full px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all",
              activeTab === "archive"
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <History className="h-3.5 w-3.5" /> Review Archive ({completedReviews.length})
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "new" ? (
          <motion.div
            key="new-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Draft Configuration Form */}
            {!draftResult && (
              <div className="glass max-w-xl mx-auto rounded-3xl p-6 shadow-soft border border-border/60 space-y-4">
                <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-base">Setup AI Reflection Session</h2>
                </div>

                <form onSubmit={handleGenerateDraft} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Review Type
                      </span>
                      <select
                        value={reviewType}
                        onChange={(e) => setReviewType(e.target.value as any)}
                        className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3 py-2.5 text-xs outline-none cursor-pointer"
                      >
                        <option value="weekly">Weekly Reflection</option>
                        <option value="monthly">Monthly Reflection</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Period Start
                      </span>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3 py-2 text-xs outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Period End
                      </span>
                      <input
                        type="date"
                        required
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3 py-2 text-xs outline-none"
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={draftMutation.isPending}
                    className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-xs font-semibold text-background hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-soft transition-all"
                  >
                    {draftMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Synthesizing workspace
                        achievements...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" /> Generate AI Review Draft
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* AI Generated Draft Reflection Dashboard */}
            {draftResult && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Columns (AI Context Findings) */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Wins celebrate */}
                  <div className="glass border border-border/60 rounded-3xl p-5 shadow-soft space-y-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/40 pb-2">
                      <Award className="h-4.5 w-4.5 text-primary" /> Generated Wins & Victories
                    </h2>
                    <ul className="space-y-2">
                      {userWins.map((win, idx) => (
                        <li
                          key={idx}
                          className="text-xs flex items-start gap-2 text-foreground/80 leading-relaxed bg-secondary/20 p-2.5 rounded-xl border border-border/20"
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{win}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Stalled Overdue targets */}
                  {draftResult.missed_tasks?.length > 0 && (
                    <div className="glass border border-border/60 rounded-3xl p-5 shadow-soft space-y-3">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/40 pb-2">
                        <ClipboardList className="h-4.5 w-4.5 text-indigo-500" /> Stalled
                        Checkpoints & Bottlenecks
                      </h2>
                      <div className="space-y-2.5">
                        {draftResult.missed_tasks.map((task: any, idx: number) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-border/40 bg-secondary/15 p-3 space-y-1"
                          >
                            <div className="text-xs font-bold text-foreground/90">{task.title}</div>
                            <p className="text-[10px] text-muted-foreground leading-normal">
                              {task.insight}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI reflection answers input fields */}
                  <div className="glass border border-border/60 rounded-3xl p-6 shadow-soft space-y-4">
                    <h2 className="text-sm font-semibold flex items-center gap-1.5 border-b border-border/40 pb-3">
                      <BookOpen className="h-4.5 w-4.5 text-primary" /> AI Reflection Q&A Journal
                    </h2>

                    <div className="space-y-4">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold text-foreground">
                          1. What worked exceptionally well during this period?
                        </span>
                        <textarea
                          placeholder="Reflect on focus strategies, timing, habits checked, or milestones reached..."
                          value={whatWorked}
                          onChange={(e) => setWhatWorked(e.target.value)}
                          rows={3}
                          className="w-full rounded-xl border border-border bg-white/70 dark:bg-zinc-900/40 p-3 text-xs outline-none focus:border-primary/45 resize-none leading-relaxed"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold text-foreground">
                          2. What didn't work, and what bottlenecks stalled your focus?
                        </span>
                        <textarea
                          placeholder="Overdue tasks backlog, scheduling omissions, energy drops..."
                          value={whatDidnt}
                          onChange={(e) => setWhatDidnt(e.target.value)}
                          rows={3}
                          className="w-full rounded-xl border border-border bg-white/70 dark:bg-zinc-900/40 p-3 text-xs outline-none focus:border-primary/45 resize-none leading-relaxed"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold text-foreground">
                          3. What operational adjustments will you integrate next period?
                        </span>
                        <textarea
                          placeholder="How will you adapt your planner blocks, reorder milestones, or align subtasks..."
                          value={whatShouldChange}
                          onChange={(e) => setWhatShouldChange(e.target.value)}
                          rows={3}
                          className="w-full rounded-xl border border-border bg-white/70 dark:bg-zinc-900/40 p-3 text-xs outline-none focus:border-primary/45 resize-none leading-relaxed"
                        />
                      </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setDraftResult(null)}
                        className="rounded-full border border-border bg-card px-5 py-2.5 text-xs font-semibold hover:bg-secondary cursor-pointer"
                      >
                        Reset Session
                      </button>
                      <button
                        onClick={handleSubmitReview}
                        disabled={saveReviewMutation.isPending}
                        className="rounded-full bg-foreground px-5 py-2.5 text-xs font-bold text-background hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer shadow-soft"
                      >
                        {saveReviewMutation.isPending ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...
                          </>
                        ) : (
                          <>
                            Submit Review <ArrowRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Sidebar (AI Suggestions) */}
                <div className="space-y-6">
                  {/* Habit insights */}
                  <div className="glass border border-border/60 rounded-3xl p-5 shadow-soft space-y-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/40 pb-2">
                      <Zap className="h-4.5 w-4.5 text-primary" /> Habit Routine Analysis
                    </h2>
                    <div className="rounded-xl bg-secondary/20 p-3 border border-border/40 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-medium">
                          Habits track count:
                        </span>
                        <span className="font-bold">
                          {draftResult.habit_performance?.totalHabitsCount ?? 0} active
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-medium">
                          Completed check-ins:
                        </span>
                        <span className="font-bold text-emerald-500">
                          {draftResult.habit_performance?.completedLogs ?? 0} logs
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-normal mt-1 pt-1.5 border-t border-border/30">
                        {draftResult.habit_performance?.insight ||
                          "Your habits averages remain well balanced."}
                      </p>
                    </div>
                  </div>

                  {/* Future Planning Recommendations */}
                  <div className="glass border border-border/60 rounded-3xl p-5 shadow-soft space-y-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/40 pb-2">
                      <ClipboardList className="h-4.5 w-4.5 text-indigo-500" /> Next Period
                      Strategic Recommendations
                    </h2>

                    <div className="space-y-3.5 text-xs leading-relaxed">
                      <div>
                        <div className="font-bold text-foreground mb-1">
                          Recommended Priorities:
                        </div>
                        <ul className="space-y-1 list-disc pl-4 text-muted-foreground text-[11px]">
                          {draftResult.next_plan?.priorities?.map((p: string, i: number) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <div className="font-bold text-foreground mb-1">Domain Focus Areas:</div>
                        <ul className="space-y-1 list-disc pl-4 text-muted-foreground text-[11px]">
                          {draftResult.next_plan?.focus_areas?.map((fa: string, i: number) => (
                            <li key={i}>{fa}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <div className="font-bold text-foreground mb-1">
                          Accelerated Roadmap Goal:
                        </div>
                        <p className="text-[11px] text-muted-foreground bg-indigo-500/5 border border-indigo-500/10 p-2 rounded-lg">
                          {draftResult.next_plan?.recommended_goals}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="archive-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 max-w-3xl mx-auto"
          >
            {archiveLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : completedReviews.length === 0 ? (
              <div className="text-center glass rounded-3xl p-12 border border-border/60 bg-card shadow-soft">
                <History className="h-10 w-10 text-muted-foreground/60 mb-2 mx-auto" />
                <h2 className="font-semibold text-base">Archive empty</h2>
                <p className="text-xs text-muted-foreground max-w-xs mt-1.5 mx-auto">
                  No weekly or monthly reflection journals completed yet. Start your first session
                  to submit a reflection!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedReviews.map((review: any) => {
                  const isExpanded = expandedReviewId === review.id;
                  return (
                    <div
                      key={review.id}
                      className="glass border border-border/60 rounded-3xl overflow-hidden shadow-soft transition-all"
                    >
                      <button
                        onClick={() => setExpandedReviewId(isExpanded ? null : review.id)}
                        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-secondary/20 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                            <Clock className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-sm font-bold capitalize">
                              {review.type} Reflection Log
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              Period: {review.period_start} to {review.period_end}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-600 uppercase">
                            Submitted ✓
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-border/60 bg-card/20 px-6 py-5 space-y-4 text-xs overflow-hidden"
                          >
                            {/* Wins list */}
                            {review.wins?.length > 0 && (
                              <div>
                                <div className="font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                                  <Award className="h-4 w-4 text-primary" /> Wins Celebrated:
                                </div>
                                <ul className="space-y-1 list-disc pl-4 text-muted-foreground">
                                  {review.wins.map((w: string, i: number) => (
                                    <li key={i}>{w}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Reflection Q&A details */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border/30 pt-3.5">
                              <div className="space-y-1 bg-secondary/15 rounded-xl p-3 border border-border/20">
                                <div className="font-bold text-foreground text-[10px] uppercase tracking-wider text-emerald-600">
                                  What worked well:
                                </div>
                                <p className="text-muted-foreground leading-relaxed">
                                  {review.reflection_q_and_a?.whatWorked}
                                </p>
                              </div>
                              <div className="space-y-1 bg-secondary/15 rounded-xl p-3 border border-border/20">
                                <div className="font-bold text-foreground text-[10px] uppercase tracking-wider text-red-500">
                                  Stalled & slipped:
                                </div>
                                <p className="text-muted-foreground leading-relaxed">
                                  {review.reflection_q_and_a?.whatDidnt}
                                </p>
                              </div>
                              <div className="space-y-1 bg-secondary/15 rounded-xl p-3 border border-border/20">
                                <div className="font-bold text-foreground text-[10px] uppercase tracking-wider text-primary">
                                  Strategic modifications:
                                </div>
                                <p className="text-muted-foreground leading-relaxed">
                                  {review.reflection_q_and_a?.whatShouldChange}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
