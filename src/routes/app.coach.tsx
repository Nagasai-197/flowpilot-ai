import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
  Target,
  Zap,
  Bot,
  Brain,
  ShieldAlert,
  Trash2,
  ArrowRight,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAssistant } from "../hooks/useAssistant";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/coach")({
  component: AICoachPage,
});

const SUGGESTED_PROMPTS = [
  {
    label: "Analyze my productivity",
    prompt: "Analyze my productivity and suggest improvements based on my active tasks and scores.",
  },
  {
    label: "Optimize my schedule",
    prompt:
      "Look at today's schedule blocks and tell me how to optimize my deep work focus sessions.",
  },
  {
    label: "Achieve my goals roadmap",
    prompt: "Give me an acceleration plan to achieve my active goals and milestone check-ins.",
  },
  {
    label: "Fix consistency drops",
    prompt: "Why is my consistency score low and how can I boost my daily habit streaks today?",
  },
];

function AICoachPage() {
  const { messages, sendMessage, confirmAction, cancelAction, isPending, clearHistory } =
    useAssistant();
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch metrics context for the sidebar diagnostics
  const { data: copilotSummary } = useQuery<any>({
    queryKey: ["copilot"],
    queryFn: async () => {
      const res = await api.get("/analytics/copilot");
      return res.data;
    },
  });

  const scores = copilotSummary?.scores || {};
  const briefing = copilotSummary?.briefing || {};
  const warnings = briefing.warnings || {
    overdueCount: 0,
    habitRisk: false,
    plannerMissing: false,
  };
  const hasWarnings = warnings.overdueCount > 0 || warnings.habitRisk || warnings.plannerMissing;

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(inputText.trim());
    setInputText("");
  };

  const handlePillClick = (promptText: string) => {
    sendMessage(promptText);
  };

  return (
    <div className="mx-auto max-w-7xl h-[calc(100vh-8.5rem)] flex flex-col lg:flex-row gap-6">
      {/* Left Chat Screen */}
      <div className="flex-1 glass border border-border/60 rounded-3xl overflow-hidden flex flex-col justify-between shadow-soft">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-border/60 bg-card/40">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Bot className="h-5.5 w-5.5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-1.5">
                FlowPilot AI Coach <Sparkles className="h-3.5 w-3.5 text-primary" />
              </h2>
              <p className="text-[10px] text-muted-foreground">Personal outcomes & focus mentor</p>
            </div>
          </div>
          <button
            onClick={clearHistory}
            className="p-2 text-xs font-semibold text-muted-foreground hover:text-red-500 rounded-xl hover:bg-secondary transition-colors cursor-pointer"
            title="Clear Chat History"
          >
            Clear Conversation
          </button>
        </div>

        {/* Chat Messages Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => {
              const isAi = msg.role === "ai";
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-3 max-w-[85%] sm:max-w-[75%]",
                    isAi ? "mr-auto" : "ml-auto flex-row-reverse",
                  )}
                >
                  {isAi && (
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div className="space-y-3">
                    <div
                      className={cn(
                        "rounded-2xl p-4 text-xs leading-relaxed shadow-soft border",
                        isAi
                          ? "bg-card border-border/60 text-foreground"
                          : "bg-primary text-primary-foreground border-transparent",
                      )}
                    >
                      <p className="whitespace-pre-wrap font-medium">{msg.text}</p>
                    </div>

                    {/* Interactive Action Confirmations */}
                    {isAi && msg.action && msg.action.type !== "none" && (
                      <div className="rounded-2xl border border-border/80 bg-secondary/35 p-3 space-y-2 max-w-sm">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                          <Target className="h-3.5 w-3.5" /> Action Recommended
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-normal capitalize">
                          Type: {msg.action.type.replace("_", " ")} · Title:{" "}
                          {msg.action.payload?.title || msg.action.payload?.name || "Target block"}
                        </p>

                        {msg.actionExecuted === "confirmed" ? (
                          <div className="flex items-center gap-1 text-[10px] font-semibold text-green-600">
                            <Check className="h-3.5 w-3.5" /> Action confirmed and synced!
                          </div>
                        ) : msg.actionExecuted === "cancelled" ? (
                          <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                            <X className="h-3.5 w-3.5" /> Action skipped.
                          </div>
                        ) : (
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => cancelAction(idx)}
                              className="rounded-full border border-border bg-card px-3 py-1.5 text-[9px] font-bold text-muted-foreground hover:bg-secondary cursor-pointer"
                            >
                              Skip
                            </button>
                            <button
                              onClick={() => confirmAction(idx, msg.action!)}
                              className="rounded-full bg-primary px-3 py-1.5 text-[9px] font-bold text-primary-foreground hover:opacity-90 cursor-pointer"
                            >
                              Confirm Action
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* Loading Typing Indicator */}
            {isPending && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 max-w-[50%]"
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl p-4 bg-card border border-border/40 flex items-center justify-center gap-1.5 shadow-soft">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-[10px] text-muted-foreground animate-pulse">
                    Coach is thinking...
                  </span>
                </div>
              </motion.div>
            )}
            <div ref={scrollRef} />
          </AnimatePresence>
        </div>

        {/* Suggested Prompt Pills Drawer */}
        <div className="px-6 py-2 bg-secondary/10 border-t border-border/45 overflow-x-auto flex gap-2 no-scrollbar">
          {SUGGESTED_PROMPTS.map((p) => (
            <button
              key={p.label}
              onClick={() => handlePillClick(p.prompt)}
              className="shrink-0 rounded-full border border-border bg-card/65 px-3 py-1.5 text-[10px] font-medium text-foreground/80 hover:text-primary hover:border-primary/40 hover:bg-card shadow-soft transition-all cursor-pointer select-none"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Input Chat bar form */}
        <form
          onSubmit={handleSend}
          className="px-6 py-4.5 border-t border-border/60 bg-card/20 flex gap-3"
        >
          <input
            type="text"
            required
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isPending}
            placeholder="Ask AI Coach to analyze scores, optimize planner slots, or structure roadmaps..."
            className="flex-1 rounded-2xl border border-border bg-white dark:bg-zinc-900/60 px-4 py-3 text-xs outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary/45"
          />
          <button
            type="submit"
            disabled={isPending || !inputText.trim()}
            className="rounded-2xl bg-foreground text-background hover:opacity-90 disabled:opacity-40 p-3 shrink-0 flex items-center justify-center cursor-pointer transition-all shadow-soft"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* Right Sidebar Diagnostics Engine */}
      <div className="w-full lg:w-80 space-y-6 shrink-0">
        {/* Productivity Warnings Engine Widget */}
        <div className="glass border border-border/60 rounded-3xl p-5 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-primary shrink-0 animate-pulse" /> Diagnostics
              Alert
            </h3>
            <span className="text-[8px] font-bold uppercase text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-md">
              Real-time
            </span>
          </div>

          <div className="space-y-2">
            {!hasWarnings ? (
              <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/10 p-3.5 space-y-1">
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Workspace Optimized
                </div>
                <p className="text-[10px] text-muted-foreground/90">
                  No cognitive bottleneck risks found. Keep tracking your active planner blocks!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {warnings.overdueCount > 0 && (
                  <div className="rounded-2xl bg-red-500/5 border border-red-500/10 p-3.5 space-y-1">
                    <div className="text-xs font-bold text-red-500">Task Backlog Slipping</div>
                    <p className="text-[10px] text-muted-foreground">
                      {warnings.overdueCount} overdue tasks are dragging down your Today's Success
                      Score. Complete them to restore balance.
                    </p>
                  </div>
                )}
                {warnings.habitRisk && (
                  <div className="rounded-2xl bg-yellow-500/5 border border-yellow-500/10 p-3.5 space-y-1">
                    <div className="text-xs font-bold text-yellow-600 dark:text-yellow-400">
                      Streak Drop Alert
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Habit consistency dropped under 50% this week. Uncheck the status matrix
                      blockers on your dashboard.
                    </p>
                  </div>
                )}
                {warnings.plannerMissing && (
                  <div className="rounded-2xl bg-blue-500/5 border border-blue-500/10 p-3.5 space-y-1">
                    <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      Planner Omission
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Today's schedule has no scheduled focus slots. Click "Generate Plan" in
                      dashboard to build deep-work slots.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Life OS Balance Stats card */}
        <div className="glass border border-border/60 rounded-3xl p-5 shadow-soft space-y-4">
          <div className="border-b border-border/40 pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Brain className="h-4 w-4 text-primary shrink-0" /> OS Balance Metrics
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1 font-semibold">
                <span>AI Life Score</span>
                <span>{scores.lifeScore ?? 0}/100</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${scores.lifeScore ?? 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1 font-semibold">
                <span>Success Completion Rate</span>
                <span>{scores.successScore ?? 0}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${scores.successScore ?? 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1 font-semibold">
                <span>Habit Consistency</span>
                <span>{scores.habitConsistency ?? 0}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full"
                  style={{ width: `${scores.habitConsistency ?? 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
