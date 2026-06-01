import {
  createFileRoute,
  Outlet,
  useRouterState,
  useNavigate,
  redirect,
} from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppTopbar } from "@/components/app/AppTopbar";
import { AIWidget } from "@/components/app/AIWidget";
import { useAuth } from "../hooks/useAuth";
import { Loader2, X, Play, Pause, Square, Award, Brain, Target, Sparkles, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTasks } from "../hooks/useTasks";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

const titles: Record<string, string> = {
  "/app/dashboard": "Dashboard",
  "/app/goals": "Goals",
  "/app/planner": "AI Planner",
  "/app/tasks": "Tasks",
  "/app/progress": "Progress",
  "/app/coach": "AI Coach",
  "/app/review": "Review Reflection",
  "/app/settings": "Settings",
};

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    if (typeof window === "undefined") {
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = titles[pathname] ?? "FlowPilot";

  // Global Task Modal States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const { createTask } = useTasks();
  const [newTitle, setNewTitle] = useState("");
  const [newTag, setNewTag] = useState("Eng");

  // ── Focus Mode Overlay State & Engine ──────────────────────────────────────
  const queryClient = useQueryClient();
  const [isFocusActive, setIsFocusActive] = useState(false);
  const [focusTimer, setFocusTimer] = useState(25 * 60);
  const [focusDuration, setFocusDuration] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [focusType, setFocusType] = useState<"pomodoro" | "extended_focus" | "deep_work" | "custom">("pomodoro");
  const [focusTask, setFocusTask] = useState<{
    id?: string;
    title: string;
    goalId?: string;
    goalTitle?: string;
    milestoneId?: string;
    milestoneTitle?: string;
  } | null>(null);
  const [nudge, setNudge] = useState("");

  const motivationNudges = [
    "Take a deep breath. You are fully aligned with your cognitive peak right now. 🧠",
    "This specific focus session is bringing you closer to your roadmap destinations. 🚀",
    "Deep focus is a muscle. You are building structural neural pathways with every minute. ⚡",
    "Protect this space. Your outcomes-centric focus determines your level progression! 🌟",
    "You are in the zone. Every completed Pomodoro builds unstoppable momentum! 🧘",
    "Great athletes recover. Remember to take your planned breaks to avoid fatigue. 🔋"
  ];

  useEffect(() => {
    const handleStartFocus = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const durationMap = {
        pomodoro: 25 * 60,
        extended_focus: 50 * 60,
        deep_work: 90 * 60,
        custom: (detail.customMinutes || 25) * 60
      };
      const duration = durationMap[detail.type as keyof typeof durationMap] || 25 * 60;
      setFocusTask({
        id: detail.taskId || undefined,
        title: detail.taskTitle || "General Focus Segment",
        goalId: detail.goalId || undefined,
        goalTitle: detail.goalTitle || undefined,
        milestoneId: detail.milestoneId || undefined,
        milestoneTitle: detail.milestoneTitle || undefined
      });
      setFocusType(detail.type || "pomodoro");
      setFocusDuration(duration);
      setFocusTimer(duration);
      setIsFocusActive(true);
      setIsTimerRunning(true);
      setNudge(motivationNudges[Math.floor(Math.random() * motivationNudges.length)]);
      toast.success("Focus Mode activated! Distractions silenced. 🧘");
    };

    window.addEventListener("start-focus-session", handleStartFocus as EventListener);
    return () => window.removeEventListener("start-focus-session", handleStartFocus as EventListener);
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (isFocusActive && isTimerRunning && focusTimer > 0) {
      interval = setInterval(() => {
        setFocusTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsTimerRunning(false);
            handleCompleteFocus();
            return 0;
          }
          if (prev % 300 === 0) {
            setNudge(motivationNudges[Math.floor(Math.random() * motivationNudges.length)]);
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isFocusActive, isTimerRunning, focusTimer]);

  const handleCompleteFocus = async () => {
    const durationMins = Math.round(focusDuration / 60);
    
    // Fallback-safe localStorage database mock sync
    const localSessions = JSON.parse(localStorage.getItem("local_focus_sessions") || "[]");
    const newSession = {
      id: "local_session_" + Date.now(),
      task_id: focusTask?.id || null,
      goal_id: focusTask?.goalId || null,
      milestone_id: focusTask?.milestoneId || null,
      duration_minutes: durationMins,
      type: focusType,
      completed: true,
      created_at: new Date().toISOString()
    };
    localStorage.setItem("local_focus_sessions", JSON.stringify([...localSessions, newSession]));

    // Increment today's logged hours in browser cache
    const todayHours = Number(localStorage.getItem("focus_hours_today") || "0");
    const weeklyHours = Number(localStorage.getItem("focus_hours_weekly") || "0");
    localStorage.setItem("focus_hours_today", String(todayHours + (durationMins / 60)));
    localStorage.setItem("focus_hours_weekly", String(weeklyHours + (durationMins / 60)));

    try {
      await api.post("/focus", {
        task_id: focusTask?.id || null,
        goal_id: focusTask?.goalId || null,
        milestone_id: focusTask?.milestoneId || null,
        duration_minutes: durationMins,
        type: focusType,
        completed: true
      });
    } catch (e) {
      console.log("Database offline or table missing. Local-only session logged.");
    }

    // Tapping completion logic for tasks if checked
    if (focusTask?.id) {
      try {
        await api.post(`/tasks/${focusTask.id}/toggle`, { completed: true });
        toast.info("Linked task marked completed! 🏁");
      } catch (err) {
        console.log("Failed to toggle linked task.");
      }
    }

    // Invalidate TanStack query cache keys
    queryClient.invalidateQueries({ queryKey: ["copilot"] });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["goals"] });
    queryClient.invalidateQueries({ queryKey: ["planner"] });

    toast.success(`Victory! Completed focus session: "${focusTask?.title}" (+15 XP) 🏆`);
    setIsFocusActive(false);
    setFocusTask(null);
  };

  const handleCancelFocus = () => {
    setIsFocusActive(false);
    setIsTimerRunning(false);
    setFocusTask(null);
    toast.error("Focus session terminated. Keep striving!");
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };
  const [newPriority, setNewPriority] = useState<"low" | "med" | "high">("med");
  const [newColor, setNewColor] = useState("lavender");
  const [newDueDate, setNewDueDate] = useState("");

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Task title cannot be empty");
      return;
    }

    createTask({
      title: newTitle.trim(),
      tag: newTag,
      priority: newPriority,
      status: "todo",
      color: newColor,
      due_date: newDueDate || undefined,
    });

    toast.success("Task created successfully!");
    setIsTaskModalOpen(false);
    setNewTitle("");
    setNewTag("Eng");
    setNewPriority("med");
    setNewColor("lavender");
    setNewDueDate("");
  };

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-background overflow-hidden">
        <div className="absolute inset-0 -z-10 gradient-mesh" />
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="space-y-1">
            <h3 className="font-display text-lg text-foreground">Aligning with your flow</h3>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Securing workspace session credentials...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Stop render during transition bounds to secure private layouts
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          onMenuClick={() => setMobileOpen(true)}
          onNewTaskClick={() => setIsTaskModalOpen(true)}
          title={title}
        />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
        <AIWidget />
      </div>

      {/* Global Add Task Modal overlay */}
      <AnimatePresence>
        {isTaskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass max-w-md w-full rounded-3xl p-6 shadow-float border border-border/60 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="font-display text-xl text-foreground">Add New Task</h3>
                <button
                  onClick={() => setIsTaskModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Task Title
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Auth flow testing"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/40"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Category Tag
                    </span>
                    <input
                      type="text"
                      placeholder="Marketing / Eng / Design"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/40"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Priority
                    </span>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as any)}
                      className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2 text-sm outline-none cursor-pointer"
                    >
                      <option value="high">High</option>
                      <option value="med">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Card Theme Color
                    </span>
                    <select
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2 text-sm outline-none cursor-pointer"
                    >
                      <option value="lavender">Lavender (Purple)</option>
                      <option value="mint">Mint (Green)</option>
                      <option value="sky">Sky (Blue)</option>
                      <option value="peach">Peach (Orange)</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Due Date
                    </span>
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2 text-sm outline-none"
                    />
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => setIsTaskModalOpen(false)}
                    className="rounded-full border border-border px-5 py-2.5 text-xs hover:bg-secondary cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-foreground px-5 py-2.5 text-xs font-medium text-background hover:opacity-90 cursor-pointer"
                  >
                    Save Task
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* distraction-free FULL SCREEN FOCUS OVERLAY */}
      <AnimatePresence>
        {isFocusActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/98 backdrop-blur-xl text-white p-6 md:p-12 select-none"
          >
            {/* Visual ambient backdrop grid/glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.1),transparent_60%)] pointer-events-none" />
            <div className="absolute top-6 left-6 flex items-center gap-2 text-zinc-400 text-xs tracking-wider uppercase font-medium">
              <Brain className="h-4 w-4 text-violet-400 animate-pulse" />
              <span>FlowPilot AI — Distraction-Free Workspace</span>
            </div>

            <div className="flex flex-col items-center text-center space-y-6 max-w-3xl w-full z-10">
              {/* Linked indicators */}
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="rounded-full bg-white/5 border border-white/10 px-3.5 py-1.5 text-xs font-display flex items-center gap-1.5 backdrop-blur-md">
                  <Target className="h-3.5 w-3.5 text-violet-400" />
                  <span>Type: {focusType.replace("_", " ").toUpperCase()}</span>
                </span>
                {focusTask?.goalTitle && (
                  <span className="rounded-full bg-white/5 border border-white/10 px-3.5 py-1.5 text-xs font-display flex items-center gap-1.5 backdrop-blur-md">
                    <Award className="h-3.5 w-3.5 text-pink-400" />
                    <span>Goal: {focusTask.goalTitle}</span>
                  </span>
                )}
                {focusTask?.milestoneTitle && (
                  <span className="rounded-full bg-white/5 border border-white/10 px-3.5 py-1.5 text-xs font-display flex items-center gap-1.5 backdrop-blur-md">
                    <ChevronRight className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Milestone: {focusTask.milestoneTitle}</span>
                  </span>
                )}
              </div>

              {/* Task name */}
              <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-white max-w-2xl leading-tight">
                {focusTask?.title}
              </h1>

              {/* Giant Timer Ring */}
              <div className="relative flex items-center justify-center py-8">
                {/* Visual Glow rings */}
                <div className="absolute inset-0 bg-violet-500/10 rounded-full blur-3xl scale-75 animate-pulse" />
                <div className="text-8xl md:text-9xl font-mono tracking-tight font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-pink-400 to-indigo-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                  {formatTime(focusTimer)}
                </div>
              </div>

              {/* AI Focus Coach bubble */}
              {nudge && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-4 max-w-lg text-center text-sm text-zinc-300 backdrop-blur-md shadow-lg font-light leading-relaxed flex items-center gap-3"
                >
                  <Sparkles className="h-5 w-5 text-violet-400 shrink-0 animate-pulse" />
                  <span>{nudge}</span>
                </motion.div>
              )}

              {/* Controls */}
              <div className="flex items-center gap-4 pt-8">
                <button
                  onClick={handleCancelFocus}
                  title="Quit Focus Session"
                  className="p-4 rounded-full border border-white/10 bg-white/5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                >
                  <Square className="h-6 w-6" />
                </button>

                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  title={isTimerRunning ? "Pause Timer" : "Resume Timer"}
                  className="p-6 rounded-full bg-white text-zinc-950 hover:scale-105 transition-all cursor-pointer shadow-float"
                >
                  {isTimerRunning ? <Pause className="h-8 w-8 fill-current" /> : <Play className="h-8 w-8 fill-current" />}
                </button>

                <button
                  onClick={handleCompleteFocus}
                  title="Complete Session & Log Wins"
                  className="p-4 rounded-full border border-white/10 bg-white/5 text-zinc-400 hover:text-green-400 hover:bg-green-500/10 transition-all cursor-pointer"
                >
                  <Award className="h-6 w-6" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
