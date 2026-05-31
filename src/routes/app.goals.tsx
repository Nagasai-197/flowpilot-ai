import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Target, Sparkles, Trash2, X, Edit2, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useGoals, Goal } from "../hooks/useGoals";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/goals")({
  component: GoalsPage,
});

const GOAL_TYPES = ["Career", "Health", "Learning", "Personal"] as const;
const GOAL_TYPE_COLORS: Record<string, string> = {
  Career: "lavender",
  Health: "mint",
  Learning: "sky",
  Personal: "peach",
};
const GOAL_TYPE_ICONS: Record<string, string> = {
  Career: "💼",
  Health: "🍏",
  Learning: "🎓",
  Personal: "🌱",
};

function GoalsPage() {
  const { goals, isLoading, isError, createGoal, updateGoal, deleteGoal } = useGoals();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);

  // Create form state
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<string>("Career");
  const [newDescription, setNewDescription] = useState("");

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState<string>("Career");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<string>("active");
  const [editProgress, setEditProgress] = useState(0);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Goal title cannot be empty");
      return;
    }
    createGoal({
      title: newTitle.trim(),
      type: newType,
      description: newDescription.trim() || undefined,
      status: "active",
    });
    toast.success("Goal created! Keep pushing 🎯");
    setIsCreateOpen(false);
    setNewTitle("");
    setNewType("Career");
    setNewDescription("");
  };

  const openEdit = (g: Goal) => {
    setEditGoal(g);
    setEditTitle(g.title);
    setEditType(g.type);
    setEditDescription(g.description || "");
    setEditStatus(g.status);
    setEditProgress(g.progress ?? 0);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGoal || !editTitle.trim()) {
      toast.error("Goal title cannot be empty");
      return;
    }
    updateGoal({
      id: editGoal.id,
      title: editTitle.trim(),
      type: editType as Goal["type"],
      description: editDescription.trim() || undefined,
      status: editStatus as Goal["status"],
      progress: editProgress,
    });
    toast.success("Goal updated!");
    setEditGoal(null);
  };

  const handleDelete = (g: Goal) => {
    if (!confirm(`Delete goal "${g.title}"?`)) return;
    deleteGoal(g.id);
    toast.success("Goal removed.");
  };

  const handleMarkComplete = (g: Goal) => {
    updateGoal({ id: g.id, status: "completed", progress: 100 });
    toast.success(`"${g.title}" marked as completed! 🎉`);
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading goal tracker...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center glass rounded-3xl p-8 max-w-sm">
          <p className="text-sm text-red-500 font-medium">Failed to load goals</p>
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

  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");
  const pausedGoals = goals.filter((g) => g.status === "paused");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Goals</h1>
          <p className="text-sm text-muted-foreground">
            {activeGoals.length} active · {completedGoals.length} completed
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" /> New Goal
        </button>
      </div>

      {/* AI Insight Banner */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-r from-primary/5 via-[oklch(0.85_0.08_220)]/15 to-[oklch(0.85_0.08_160)]/15 px-4 py-3">
        <div className="flex items-center gap-2 text-xs">
          <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
          <span className="font-medium">AI insight:</span>
          <span className="text-muted-foreground">
            Goals with clear milestones are 42% more likely to be completed. Break each goal into weekly checkpoints.
          </span>
        </div>
      </div>

      {/* Empty state */}
      {goals.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-card p-12 text-center shadow-soft">
          <Target className="h-10 w-10 text-primary mb-3 opacity-60" />
          <h3 className="font-semibold text-lg">No goals yet.</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Create your first goal to start tracking long-term progress.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 cursor-pointer shadow-soft transition-all"
          >
            Create Goal
          </button>
        </div>
      )}

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Active</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeGoals.map((g, i) => (
              <GoalCard
                key={g.id}
                goal={g}
                index={i}
                onEdit={openEdit}
                onDelete={handleDelete}
                onComplete={handleMarkComplete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Paused Goals */}
      {pausedGoals.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Paused</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pausedGoals.map((g, i) => (
              <GoalCard key={g.id} goal={g} index={i} onEdit={openEdit} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Completed</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedGoals.map((g, i) => (
              <GoalCard key={g.id} goal={g} index={i} onEdit={openEdit} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {/* Create Goal Modal */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass max-w-md w-full rounded-3xl p-6 shadow-float border border-border/60 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="font-display text-xl">New Goal</h3>
                <button onClick={() => setIsCreateOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Goal Title</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Complete AWS Certification"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    maxLength={100}
                    className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/40"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Goal Type</span>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2 text-sm outline-none cursor-pointer"
                  >
                    {GOAL_TYPES.map((t) => (
                      <option key={t} value={t}>{GOAL_TYPE_ICONS[t]} {t}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Description (optional)</span>
                  <textarea
                    placeholder="Brief description of your goal..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    maxLength={500}
                    rows={2}
                    className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/40 resize-none"
                  />
                </label>
                <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="rounded-full border border-border px-5 py-2.5 text-xs hover:bg-secondary cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-foreground px-5 py-2.5 text-xs font-medium text-background hover:opacity-90 cursor-pointer"
                  >
                    Create Goal
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Goal Modal */}
      <AnimatePresence>
        {editGoal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass max-w-md w-full rounded-3xl p-6 shadow-float border border-border/60 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="font-display text-xl">Edit Goal</h3>
                <button onClick={() => setEditGoal(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleUpdate} className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Goal Title</span>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    maxLength={100}
                    className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-primary/40"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Type</span>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2 text-sm outline-none cursor-pointer"
                    >
                      {GOAL_TYPES.map((t) => (
                        <option key={t} value={t}>{GOAL_TYPE_ICONS[t]} {t}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Status</span>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2 text-sm outline-none cursor-pointer"
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="completed">Completed</option>
                    </select>
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Progress: {editProgress}%
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={editProgress}
                    onChange={(e) => setEditProgress(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Description</span>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    maxLength={500}
                    rows={2}
                    className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-primary/40 resize-none"
                  />
                </label>
                <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => setEditGoal(null)}
                    className="rounded-full border border-border px-5 py-2.5 text-xs hover:bg-secondary cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-foreground px-5 py-2.5 text-xs font-medium text-background hover:opacity-90 cursor-pointer"
                  >
                    Save Changes
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

function GoalCard({
  goal,
  index,
  onEdit,
  onDelete,
  onComplete,
}: {
  goal: Goal;
  index: number;
  onEdit: (g: Goal) => void;
  onDelete: (g: Goal) => void;
  onComplete?: (g: Goal) => void;
}) {
  const color = GOAL_TYPE_COLORS[goal.type] || "lavender";
  const icon = GOAL_TYPE_ICONS[goal.type] || "🎯";
  const progress = goal.progress ?? 0;

  return (
    <motion.div
      key={goal.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        "group rounded-3xl border border-border/60 bg-card p-5 shadow-soft hover:shadow-float transition-all",
        goal.status === "completed" && "opacity-70"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{ background: `color-mix(in oklab, var(--${color}) 30%, var(--card))` }}
            >
              {icon} {goal.type}
            </span>
            <span className={cn(
              "text-[10px] capitalize rounded-full px-2 py-0.5 font-semibold",
              goal.status === "active" && "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400",
              goal.status === "completed" && "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400",
              goal.status === "paused" && "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
            )}>
              {goal.status}
            </span>
          </div>
          <h3 className="mt-2 text-sm font-semibold leading-snug text-foreground line-clamp-2">{goal.title}</h3>
          {goal.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{goal.description}</p>
          )}
        </div>
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => onEdit(goal)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
            title="Edit goal"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(goal)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 cursor-pointer"
            title="Delete goal"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
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

      {/* Mark complete button */}
      {goal.status === "active" && onComplete && (
        <button
          onClick={() => onComplete(goal)}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-border/60 py-2 text-xs text-muted-foreground hover:text-green-600 hover:bg-green-50 hover:border-green-200 transition-all cursor-pointer"
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Mark Completed
        </button>
      )}
    </motion.div>
  );
}
