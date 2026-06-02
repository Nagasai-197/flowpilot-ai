import { createLazyFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Target,
  Sparkles,
  Trash2,
  X,
  Edit2,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Check,
  Trash,
  Brain,
} from "lucide-react";
import { useState } from "react";
import { useGoals, Goal } from "../hooks/useGoals";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useTasks } from "../hooks/useTasks";

export const Route = createLazyFileRoute("/app/goals")({
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
  const {
    goals,
    isLoading,
    isError,
    createGoal,
    updateGoal,
    deleteGoal,
    regenerateRoadmap,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    reorderMilestones,
  } = useGoals();

  const { tasks } = useTasks();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);

  // Create form state
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<string>("Career");
  const [newDescription, setNewDescription] = useState("");
  const [newTargetDate, setNewTargetDate] = useState("");

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState<string>("Career");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<string>("active");
  const [editProgress, setEditProgress] = useState(0);
  const [editTargetDate, setEditTargetDate] = useState("");

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
      target_date: newTargetDate || undefined,
    });
    toast.success("Goal created! Keep pushing 🎯");
    setIsCreateOpen(false);
    setNewTitle("");
    setNewType("Career");
    setNewDescription("");
    setNewTargetDate("");
  };

  const openEdit = (g: Goal) => {
    setEditGoal(g);
    setEditTitle(g.title);
    setEditType(g.type);
    setEditDescription(g.description || "");
    setEditStatus(g.status);
    setEditProgress(g.progress ?? 0);
    setEditTargetDate(g.target_date ? g.target_date.split("T")[0] : "");
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
      target_date: editTargetDate || undefined,
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
            Goals with clear milestones are 42% more likely to be completed. Break each goal into
            weekly checkpoints.
          </span>
        </div>
      </div>

      {/* Empty state */}
      {goals.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-card p-12 text-center shadow-soft">
          <Target className="h-10 w-10 text-primary mb-3 opacity-60" />
          <h2 className="font-semibold text-lg">No goals yet.</h2>
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Active
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeGoals.map((g, i) => (
              <GoalCard
                key={g.id}
                goal={g}
                index={i}
                tasks={tasks}
                onEdit={openEdit}
                onDelete={handleDelete}
                onComplete={handleMarkComplete}
                updateGoal={updateGoal}
                regenerateRoadmap={regenerateRoadmap}
                createMilestone={createMilestone}
                updateMilestone={updateMilestone}
                deleteMilestone={deleteMilestone}
                reorderMilestones={reorderMilestones}
              />
            ))}
          </div>
        </div>
      )}

      {/* Paused Goals */}
      {pausedGoals.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Paused
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pausedGoals.map((g, i) => (
              <GoalCard
                key={g.id}
                goal={g}
                index={i}
                tasks={tasks}
                onEdit={openEdit}
                onDelete={handleDelete}
                updateGoal={updateGoal}
                regenerateRoadmap={regenerateRoadmap}
                createMilestone={createMilestone}
                updateMilestone={updateMilestone}
                deleteMilestone={deleteMilestone}
                reorderMilestones={reorderMilestones}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Completed
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedGoals.map((g, i) => (
              <GoalCard
                key={g.id}
                goal={g}
                index={i}
                tasks={tasks}
                onEdit={openEdit}
                onDelete={handleDelete}
                updateGoal={updateGoal}
                regenerateRoadmap={regenerateRoadmap}
                createMilestone={createMilestone}
                updateMilestone={updateMilestone}
                deleteMilestone={deleteMilestone}
                reorderMilestones={reorderMilestones}
              />
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
                <h2 className="font-display text-xl">New Goal</h2>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Goal Title
                  </span>
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
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Goal Type
                  </span>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2 text-sm outline-none cursor-pointer"
                  >
                    {GOAL_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {GOAL_TYPE_ICONS[t]} {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Description (optional)
                  </span>
                  <textarea
                    placeholder="Brief description of your goal..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    maxLength={500}
                    rows={2}
                    className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/40 resize-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Target Date
                  </span>
                  <input
                    type="date"
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2 text-sm outline-none transition-all focus:border-primary/40"
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
                <h2 className="font-display text-xl">Edit Goal</h2>
                <button
                  onClick={() => setEditGoal(null)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleUpdate} className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Goal Title
                  </span>
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
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Type
                    </span>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2 text-sm outline-none cursor-pointer"
                    >
                      {GOAL_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {GOAL_TYPE_ICONS[t]} {t}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Status
                    </span>
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
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Description
                  </span>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    maxLength={500}
                    rows={2}
                    className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-primary/40 resize-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Target Date
                  </span>
                  <input
                    type="date"
                    value={editTargetDate}
                    onChange={(e) => setEditTargetDate(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-primary/40"
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

function calculateDaysRemaining(targetDateStr?: string) {
  if (!targetDateStr) return { days: null, text: "No target date", isOverdue: false };
  const targetDate = new Date(targetDateStr);
  const now = new Date();
  targetDate.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    const abs = Math.abs(diffDays);
    return { days: abs, text: `${abs} day${abs !== 1 ? "s" : ""} overdue`, isOverdue: true };
  } else if (diffDays === 0) {
    return { days: 0, text: "Due today ⏰", isOverdue: false };
  } else {
    return {
      days: diffDays,
      text: `${diffDays} day${diffDays !== 1 ? "s" : ""} left`,
      isOverdue: false,
    };
  }
}

function GoalCard({
  goal,
  index,
  tasks = [],
  onEdit,
  onDelete,
  onComplete,
  updateGoal,
  regenerateRoadmap,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  reorderMilestones,
}: {
  goal: Goal;
  index: number;
  tasks?: any[];
  onEdit: (g: Goal) => void;
  onDelete: (g: Goal) => void;
  onComplete?: (g: Goal) => void;
  updateGoal: (g: any) => void;
  regenerateRoadmap: (id: string) => Promise<any>;
  createMilestone: (payload: { goalId: string; title: string }) => Promise<any>;
  updateMilestone: (payload: {
    goalId: string;
    milestoneId: string;
    title?: string;
    completed?: boolean;
    order_index?: number;
  }) => Promise<any>;
  deleteMilestone: (payload: { goalId: string; milestoneId: string }) => Promise<any>;
  reorderMilestones: (payload: {
    goalId: string;
    orders: { id: string; order_index: number }[];
  }) => Promise<any>;
}) {
  const color = GOAL_TYPE_COLORS[goal.type] || "lavender";
  const icon = GOAL_TYPE_ICONS[goal.type] || "🎯";
  const progress = goal.progress ?? 0;
  const [isRegeneratingLocal, setIsRegeneratingLocal] = useState(false);
  const [showConfirmRegen, setShowConfirmRegen] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editingMilestoneTitle, setEditingMilestoneTitle] = useState("");
  const [showAISuggestions, setShowAISuggestions] = useState(false);

  // Safely parse milestones
  let userDescriptionText = goal.description || "";
  let milestonesList: any[] = goal.milestones || [];
  try {
    if (
      milestonesList.length === 0 &&
      goal.description &&
      (goal.description.startsWith("{") || goal.description.startsWith("["))
    ) {
      const parsed = JSON.parse(goal.description);
      if (parsed && typeof parsed === "object") {
        userDescriptionText = parsed.description || "";
        milestonesList = parsed.milestones || [];
      }
    }
  } catch (e) {
    // Ignore fallback
  }

  // 1. Calculate Days Remaining
  const daysInfo = calculateDaysRemaining(goal.target_date);

  // 2. Count Linked Tasks (using tag match or title substring)
  const linkedTasks = (tasks || []).filter(
    (t) =>
      t.tag?.toLowerCase() === goal.type?.toLowerCase() ||
      goal.title.toLowerCase().includes(t.tag?.toLowerCase() || "___never_match___") ||
      t.title.toLowerCase().includes(goal.title.toLowerCase()),
  );
  const linkedTasksCount = linkedTasks.length;

  // 3. AI Completion Probability scoring
  const calculateProbability = () => {
    const total = milestonesList.length;
    const completed = milestonesList.filter((m) => m.completed).length;
    if (total === 0) return 50;

    const ratio = completed / total;
    let prob = Math.round(ratio * 100);

    if (goal.target_date) {
      if (daysInfo.isOverdue) {
        prob = Math.max(5, prob - 25);
      } else if (daysInfo.days !== null && daysInfo.days > 0) {
        if (progress > 50 && daysInfo.days > 10) {
          prob = Math.min(99, prob + 12);
        }
      }
    }
    return Math.max(5, Math.min(99, prob));
  };
  const completionProbability = calculateProbability();

  // 4. Mock AI suggestions pathways
  const getSuggestions = () => {
    switch (goal.type) {
      case "Career":
        return {
          pathway:
            "1. Build portfolio assets showcasing this role. 2. Secure expert mentorship/feedback. 3. Target high-leverage interviews.",
          skills: "System Design, Strategic Execution, Core domain mastery",
          resources: "Tech Blogs, O'Reilly Platform, Roadmap.sh",
        };
      case "Health":
        return {
          pathway:
            "1. Lock in consistent sleep & recovery buffers. 2. Establish dynamic micro-routines. 3. Measure metabolic/cardio baselines weekly.",
          skills: "Biometric analysis, Meal prep strategy, HIIT scheduling",
          resources: "Huberman Lab podcast, Sleep trackers, Cronometer",
        };
      case "Learning":
        return {
          pathway:
            "1. Establish structured deep-work timeblocks. 2. Build practice proof-of-concepts. 3. Summarize key concepts using the Feynman method.",
          skills: "Active recall, Spaced repetition, Rapid prototyping",
          resources: "Anki cards, Coursera textbooks, MIT OpenCourseWare",
        };
      default:
        return {
          pathway:
            "1. Map out small weekly milestones. 2. Perform daily habit check-ins. 3. Connect weekly progress to reflection journals.",
          skills: "Mindfulness training, Strategic prioritization, Atomic habits",
          resources: "James Clear Atomic Habits, Notion LifeOS, FlowPilot Coach",
        };
    }
  };
  const suggestions = getSuggestions();

  const handleToggleMilestone = async (mId: string, isCompleted: boolean) => {
    try {
      await updateMilestone({
        goalId: goal.id,
        milestoneId: mId,
        completed: isCompleted,
      });
      toast.success(isCompleted ? "Milestone completed!" : "Milestone set to incomplete.");
    } catch (err: any) {
      toast.error(`Failed to update milestone: ${err.message || err}`);
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) return;
    try {
      await createMilestone({
        goalId: goal.id,
        title: newMilestoneTitle.trim(),
      });
      toast.success("New milestone added!");
      setNewMilestoneTitle("");
    } catch (err: any) {
      toast.error(`Failed to add milestone: ${err.message || err}`);
    }
  };

  const handleDeleteMilestone = async (mId: string) => {
    if (!confirm("Are you sure you want to delete this milestone?")) return;
    try {
      await deleteMilestone({
        goalId: goal.id,
        milestoneId: mId,
      });
      toast.success("Milestone deleted.");
    } catch (err: any) {
      toast.error(`Failed to delete milestone: ${err.message || err}`);
    }
  };

  const handleStartEdit = (mId: string, currentTitle: string) => {
    setEditingMilestoneId(mId);
    setEditingMilestoneTitle(currentTitle);
  };

  const handleSaveEdit = async (mId: string) => {
    if (!editingMilestoneTitle.trim()) {
      toast.error("Milestone title cannot be empty");
      return;
    }
    try {
      await updateMilestone({
        goalId: goal.id,
        milestoneId: mId,
        title: editingMilestoneTitle.trim(),
      });
      toast.success("Milestone updated.");
      setEditingMilestoneId(null);
    } catch (err: any) {
      toast.error(`Failed to update milestone: ${err.message || err}`);
    }
  };

  const handleMoveMilestone = async (currentIndex: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= milestonesList.length) return;

    const updated = [...milestonesList];
    const temp = updated[currentIndex];
    updated[currentIndex] = updated[targetIndex];
    updated[targetIndex] = temp;

    const orders = updated.map((m, idx) => ({
      id: m.id,
      order_index: idx,
    }));

    try {
      await reorderMilestones({
        goalId: goal.id,
        orders,
      });
      toast.success("Milestones reordered!");
    } catch (err: any) {
      toast.error(`Failed to reorder milestones: ${err.message || err}`);
    }
  };

  const handleRegenerateClick = async () => {
    setShowConfirmRegen(false);
    setIsRegeneratingLocal(true);
    toast.promise(regenerateRoadmap(goal.id), {
      loading: "AI generating goal roadmap...",
      success: "Roadmap regenerated successfully! 🎯",
      error: "Failed to regenerate roadmap.",
    });
    setTimeout(() => setIsRegeneratingLocal(false), 2000);
  };

  return (
    <motion.div
      key={goal.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        "group rounded-3xl border border-border/60 bg-card p-5 shadow-soft hover:shadow-float transition-all flex flex-col justify-between h-full min-h-[350px]",
        goal.status === "completed" && "opacity-75",
      )}
    >
      <div className="space-y-4">
        {/* Goal Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{ background: `color-mix(in oklab, var(--${color}) 30%, var(--card))` }}
            >
              {icon} {goal.type}
            </span>
            <span
              className={cn(
                "text-[10px] capitalize rounded-full px-2 py-0.5 font-semibold",
                goal.status === "active" &&
                  "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400",
                goal.status === "completed" &&
                  "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400",
                goal.status === "paused" &&
                  "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
              )}
            >
              {goal.status}
            </span>
          </div>

          {/* Quick Actions (Edit / Delete Goal) */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <button
              onClick={() => onEdit(goal)}
              className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-secondary/60 transition-all cursor-pointer"
              title="Edit Goal"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(goal)}
              className="p-1 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
              title="Delete Goal"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Goal Title & Description */}
        <div>
          <h3 className="font-semibold text-base tracking-tight leading-snug group-hover:text-primary transition-colors">
            {goal.title}
          </h3>
          {userDescriptionText && (
            <p className="mt-1 text-xs text-muted-foreground leading-normal">
              {userDescriptionText}
            </p>
          )}
        </div>

        {/* Date and Tasks Indicators Row */}
        <div className="flex flex-wrap gap-2">
          {goal.target_date && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold border",
                daysInfo.isOverdue
                  ? "bg-red-500/10 text-red-500 border-red-500/20"
                  : "bg-zinc-100 dark:bg-zinc-800 text-muted-foreground border-border/40",
              )}
            >
              {daysInfo.isOverdue ? "⚠️ Overdue" : "📅"} {daysInfo.text}
            </span>
          )}

          {linkedTasksCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20">
              🔗 {linkedTasksCount} linked task{linkedTasksCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Relational Milestones Checklist Section */}
        <div className="rounded-2xl bg-secondary/15 border border-border/30 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 animate-pulse" /> AI Goal
              Roadmap
              {milestonesList.length > 0 && (
                <span className="text-[9px] text-muted-foreground font-normal lowercase ml-1">
                  ({milestonesList.filter((m) => m.completed).length}/{milestonesList.length})
                </span>
              )}
            </div>
            <button
              onClick={() => setShowConfirmRegen(true)}
              disabled={isRegeneratingLocal}
              className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-secondary/60 disabled:opacity-50 transition-all cursor-pointer"
              title="Regenerate AI Roadmap"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRegeneratingLocal && "animate-spin")} />
            </button>
          </div>

          {/* List of Milestones */}
          <div className="space-y-2 max-h-[150px] overflow-y-auto pr-0.5 scrollbar-thin">
            {milestonesList.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic py-3 text-center">
                No milestones defined. Click the sync icon above to auto-generate a custom roadmap!
              </p>
            ) : (
              milestonesList.map((milestone, idx) => (
                <div
                  key={milestone.id}
                  className="flex items-center justify-between gap-1.5 py-0.5 group/milestone hover:bg-secondary/20 rounded px-1 transition-all"
                >
                  <div className="flex items-start gap-2.5 text-xs font-normal text-foreground/80 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={milestone.completed}
                      disabled={editingMilestoneId === milestone.id}
                      onChange={(e) => handleToggleMilestone(milestone.id, e.target.checked)}
                      className="mt-0.5 rounded border-border text-primary outline-none accent-primary shrink-0 cursor-pointer"
                    />
                    {editingMilestoneId === milestone.id ? (
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          type="text"
                          value={editingMilestoneTitle}
                          onChange={(e) => setEditingMilestoneTitle(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(milestone.id)}
                          className="w-full bg-white dark:bg-zinc-800 border border-primary/40 rounded px-1.5 py-0.5 text-xs outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEdit(milestone.id)}
                          className="text-emerald-500 hover:text-emerald-600 p-0.5"
                          title="Save Changes"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingMilestoneId(null)}
                          className="text-muted-foreground hover:text-foreground p-0.5"
                          title="Cancel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span
                        onClick={() => handleStartEdit(milestone.id, milestone.title)}
                        className={cn(
                          "leading-tight transition-all cursor-pointer hover:text-primary",
                          milestone.completed && "line-through text-muted-foreground/60",
                        )}
                        title="Click to Edit Inline"
                      >
                        {milestone.title}
                      </span>
                    )}
                  </div>

                  {/* Milestone Actions */}
                  {editingMilestoneId !== milestone.id && (
                    <div className="opacity-0 group-hover/milestone:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => {
                          window.dispatchEvent(
                            new CustomEvent("start-focus-session", {
                              detail: {
                                type: "pomodoro",
                                taskTitle: `Milestone: ${milestone.title}`,
                                goalId: goal.id,
                                milestoneId: milestone.id,
                              },
                            }),
                          );
                          toast.info(
                            `Launching focus session for milestone: "${milestone.title}"!`,
                          );
                        }}
                        className="p-0.5 rounded text-pink-500 hover:text-pink-600 hover:bg-pink-500/10 cursor-pointer"
                        title="Focus on this Milestone"
                      >
                        <Brain className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveMilestone(idx, "up")}
                        disabled={idx === 0}
                        className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleMoveMilestone(idx, "down")}
                        disabled={idx === milestonesList.length - 1}
                        className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteMilestone(milestone.id)}
                        className="p-0.5 rounded text-muted-foreground hover:text-red-500 hover:bg-red-500/10 cursor-pointer"
                        title="Delete Milestone"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Add Manual Milestone Form */}
          <form
            onSubmit={handleAddMilestone}
            className="flex gap-1.5 pt-1.5 border-t border-border/30"
          >
            <input
              type="text"
              placeholder="+ Add a milestone..."
              value={newMilestoneTitle}
              onChange={(e) => setNewMilestoneTitle(e.target.value)}
              className="flex-1 bg-white/50 dark:bg-zinc-900/30 border border-border/80 rounded-xl px-2.5 py-1 text-[11px] outline-none placeholder:text-muted-foreground/50 focus:border-primary/30"
            />
            <button
              type="submit"
              disabled={!newMilestoneTitle.trim()}
              className="rounded-xl bg-foreground px-2.5 py-1 text-[10px] font-bold text-background hover:opacity-90 disabled:opacity-40 cursor-pointer"
            >
              Add
            </button>
          </form>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border/30 space-y-3.5">
        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Goal Progress</span>
            <div className="flex items-center gap-1.5">
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-foreground"
                title="AI Completion Probability"
              >
                🔮 AI Prob: {completionProbability}%
              </span>
              <span className="font-bold" style={{ color: `var(--${color})` }}>
                {progress}%
              </span>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: `var(--${color})` }}
            />
          </div>
        </div>

        {/* AI Suggestions Expander */}
        <div>
          <button
            onClick={() => setShowAISuggestions(!showAISuggestions)}
            className="w-full flex items-center justify-between text-[10px] font-bold text-primary hover:opacity-90 py-1.5 px-2.5 rounded-xl bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer border border-primary/10"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary" />
              {showAISuggestions ? "Hide AI Recommendations" : "Reveal AI Insights & Pathway"}
            </span>
            <span>{showAISuggestions ? "▲" : "▼"}</span>
          </button>
          <AnimatePresence>
            {showAISuggestions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mt-2 bg-secondary/20 border border-border/30 rounded-2xl p-3 space-y-2.5 text-[11px] leading-relaxed text-left"
              >
                <div>
                  <div className="font-semibold text-foreground/80 mb-0.5 flex items-center gap-1">
                    🗺️ Action Pathway
                  </div>
                  <p className="text-muted-foreground">{suggestions.pathway}</p>
                </div>
                <div>
                  <div className="font-semibold text-foreground/80 mb-0.5 flex items-center gap-1">
                    🧠 Core Skills to Develop
                  </div>
                  <p className="text-muted-foreground">{suggestions.skills}</p>
                </div>
                <div>
                  <div className="font-semibold text-foreground/80 mb-0.5 flex items-center gap-1">
                    📚 Recommended Resources
                  </div>
                  <p className="text-muted-foreground">{suggestions.resources}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mark complete button */}
        {goal.status === "active" && onComplete && (
          <button
            onClick={() => onComplete(goal)}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-border/60 py-2 text-xs text-muted-foreground hover:text-green-600 hover:bg-green-50 hover:border-green-200 transition-all cursor-pointer font-semibold"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Complete Goal
          </button>
        )}
      </div>

      {/* Confirmation Modal for AI Roadmap Regeneration */}
      <AnimatePresence>
        {showConfirmRegen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass max-w-sm w-full rounded-3xl p-6 shadow-float border border-border/60 space-y-4 text-center"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <RefreshCw className="h-6 w-6 animate-spin-slow" />
                </div>
                <h2 className="font-display text-lg font-bold">Regenerate Roadmap?</h2>
                <p className="text-xs text-muted-foreground leading-normal">
                  Are you sure you want to regenerate your AI roadmap? This will delete all current
                  milestones for this goal and generate 5–10 new milestones with Gemini AI.
                </p>
              </div>
              <div className="flex gap-2 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmRegen(false)}
                  className="rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRegenerateClick}
                  className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer"
                >
                  Yes, Regenerate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
