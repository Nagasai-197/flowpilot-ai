import { createFileRoute, Outlet, useRouterState, useNavigate, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppTopbar } from "@/components/app/AppTopbar";
import { AIWidget } from "@/components/app/AIWidget";
import { useAuth } from "../hooks/useAuth";
import { Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTasks } from "../hooks/useTasks";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

const titles: Record<string, string> = {
  "/app/dashboard": "Dashboard",
  "/app/tasks": "Tasks",
  "/app/goals": "Goals",
  "/app/planner": "AI Planner",
  "/app/analytics": "Analytics",
  "/app/assistant": "AI Assistant",
  "/app/habits": "Habits",
  "/app/calendar": "Calendar",
  "/app/notifications": "Notifications",
  "/app/settings": "Settings",
};

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
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
            <p className="text-xs text-muted-foreground max-w-[200px]">Securing workspace session credentials...</p>
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
                <button onClick={() => setIsTaskModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Task Title</span>
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
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Category Tag</span>
                    <input
                      type="text"
                      placeholder="Marketing / Eng / Design"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/40"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Priority</span>
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
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Card Theme Color</span>
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
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Due Date</span>
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
    </div>
  );
}
