import { createLazyFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
  Target,
  Zap,
  Bot,
  Lightbulb,
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

export const Route = createLazyFileRoute("/app/coach")({
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

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  const formatInline = (line: string): React.ReactNode => {
    // Handle **bold** and *italic*
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return <em key={i}>{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={key++} className="h-2" />);
    } else if (/^#{1,3}\s/.test(trimmed)) {
      const level = trimmed.match(/^(#+)/)?.[1].length || 1;
      const content = trimmed.replace(/^#+\s+/, "");
      const cls =
        level === 1
          ? "text-sm font-bold text-foreground mt-2 mb-1"
          : level === 2
            ? "text-xs font-bold text-foreground mt-1.5 mb-0.5"
            : "text-xs font-semibold text-primary mt-1";
      elements.push(
        <div key={key++} className={cls}>
          {formatInline(content)}
        </div>,
      );
    } else if (/^[-*]\s/.test(trimmed)) {
      elements.push(
        <div key={key++} className="flex items-start gap-1.5 text-xs leading-relaxed">
          <span className="text-primary mt-0.5 shrink-0">•</span>
          <span>{formatInline(trimmed.replace(/^[-*]\s+/, ""))}</span>
        </div>,
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      const num = trimmed.match(/^(\d+)\./)?.[1];
      elements.push(
        <div key={key++} className="flex items-start gap-1.5 text-xs leading-relaxed">
          <span className="text-primary font-bold shrink-0 min-w-[16px]">{num}.</span>
          <span>{formatInline(trimmed.replace(/^\d+\.\s+/, ""))}</span>
        </div>,
      );
    } else {
      elements.push(
        <p key={key++} className="text-xs leading-relaxed">
          {formatInline(trimmed)}
        </p>,
      );
    }
  }
  return <div className="space-y-0.5">{elements}</div>;
}

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
  const tasks = copilotSummary?.tasks || [];
  const overdueCount = tasks.filter((t: any) => t.status !== "done" && t.due_date && new Date(t.due_date) < new Date()).length;

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

  // Quick action: pre-fill and send a contextual prompt to the AI Coach
  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt);
    setInputText("");
  };

  // AI Insights derived from real task/score context
  const aiInsights = [
    overdueCount > 0
      ? `⚠️ You have ${overdueCount} overdue task${overdueCount > 1 ? "s" : ""} blocking your progress.`
      : "✅ No overdue tasks — great consistency!",
    scores.habitConsistency !== undefined
      ? scores.habitConsistency < 50
        ? "📉 Habit consistency is below 50%. A quick review can help you reset."
        : "🌱 Habit consistency is healthy. Keep your daily rituals going."
      : "📊 Track daily habits to build long-term momentum.",
    "🔁 Break your goals into focused 25-min blocks to stay in flow.",
    "🧠 Protect your deep work windows — silence notifications during focus sessions.",
  ];

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
              <h1 className="text-sm font-semibold flex items-center gap-1.5">
                FlowPilot AI Coach <Sparkles className="h-3.5 w-3.5 text-primary" />
              </h1>
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
                      {isAi ? renderMarkdown(msg.text) : <p className="font-medium">{msg.text}</p>}
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
                  <Loader2 className="h-4.5 w-4.5 animate-spin text-primary" />
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

      {/* Right Sidebar */}
      <div className="w-full lg:w-80 space-y-4 shrink-0">
        {/* AI Insights Widget */}
        <div className="glass border border-border/60 rounded-3xl p-5 shadow-soft space-y-4">
          <div className="flex items-center gap-2 border-b border-border/40 pb-2.5">
            <Lightbulb className="h-4 w-4 text-primary shrink-0" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
              AI Insights
            </h2>
          </div>
          <ul className="space-y-2.5">
            {aiInsights.map((insight, i) => (
              <li
                key={i}
                className="text-[11px] leading-relaxed text-foreground/80 bg-secondary/30 rounded-xl px-3 py-2"
              >
                {insight}
              </li>
            ))}
          </ul>
        </div>

        {/* Coach Quick Actions Widget */}
        <div className="glass border border-border/60 rounded-3xl p-5 shadow-soft space-y-4">
          <div className="flex items-center gap-2 border-b border-border/40 pb-2.5">
            <Zap className="h-4 w-4 text-primary shrink-0" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
              Quick Actions
            </h2>
          </div>
          <div className="space-y-2">
            {[
              { emoji: "📝", label: "What should I do today?", prompt: "Based on my tasks, goals, and schedule, what should I focus on today?" },
              { emoji: "🚨", label: "Which goal is at risk?", prompt: "Which of my active goals is most at risk of falling behind, and why?" },
              { emoji: "📊", label: "Analyze my habits", prompt: "Analyze my habit completion patterns and tell me what's working and what needs improvement." },
              { emoji: "🩹", label: "Create recovery plan", prompt: "I feel behind on my goals. Help me create a realistic recovery plan for this week." },
            ].map(({ emoji, label, prompt }) => (
              <button
                key={label}
                onClick={() => handleQuickAction(prompt)}
                className="w-full flex items-center gap-2.5 rounded-2xl border border-border/50 bg-card/50 hover:bg-secondary/60 hover:border-primary/30 px-3.5 py-2.5 text-left text-[11px] font-medium text-foreground/80 hover:text-foreground transition-all cursor-pointer group"
              >
                <span className="text-base shrink-0">{emoji}</span>
                <span className="flex-1 leading-snug">{label}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
