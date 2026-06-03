import { createLazyFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Flag,
  Trash2,
  X,
  Edit2,
  LayoutGrid,
  List,
  Calendar as CalIcon,
  Sparkles,
  CheckSquare,
  Loader2,
  Check,
  Brain,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTasks, Task } from "../hooks/useTasks";
import { useGoals } from "../hooks/useGoals";
import { api } from "../lib/api";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createLazyFileRoute("/app/tasks")({
  component: Tasks,
});

function Tasks() {
  const [view, setView] = useState<"kanban" | "list" | "calendar">("kanban");

  // Accordion expanded states for due-date sections
  const [isOverdueExpanded, setIsOverdueExpanded] = useState(true);
  const [isTodayExpanded, setIsTodayExpanded] = useState(true);
  const [isUpcomingExpanded, setIsUpcomingExpanded] = useState(false);
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
  const {
    tasks,
    isLoading,
    isError,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    setTasksOptimistic,
  } = useTasks();

  const { goals } = useGoals();

  // Collapsible due-date sections state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overdue: true,
    today: true,
    upcoming: false,
    completed: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Create dialog state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<Task["status"]>("todo");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTag, setNewTag] = useState("Eng");
  const [newPriority, setNewPriority] = useState<"low" | "med" | "high">("med");
  const [newColor, setNewColor] = useState("lavender");
  const [newDueDate, setNewDueDate] = useState("");
  const [newGoalId, setNewGoalId] = useState("");
  const [newMilestoneId, setNewMilestoneId] = useState("");

  // Edit dialog state
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTag, setEditTag] = useState("");
  const [editPriority, setEditPriority] = useState<"low" | "med" | "high">("med");
  const [editColor, setEditColor] = useState("lavender");
  const [editDueDate, setEditDueDate] = useState("");
  const [editStatus, setEditStatus] = useState<Task["status"]>("todo");
  const [editGoalId, setEditGoalId] = useState("");
  const [editMilestoneId, setEditMilestoneId] = useState("");

  // AI Subtask Breakdown Drawer state
  const [activeBreakdownTask, setActiveBreakdownTask] = useState<Task | null>(null);
  const [isBreakdownLoading, setIsBreakdownLoading] = useState(false);
  const [breakdownSubtasks, setBreakdownSubtasks] = useState<
    { title: string; estimated_minutes: number; completed?: boolean }[]
  >([]);
  const [editingSubtaskIdx, setEditingSubtaskIdx] = useState<number | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  // Drag Overlay active ID state
  const [activeId, setActiveId] = useState<string | null>(null);

  // DnD Sensors config (optimally balanced for desktop click vs drag & touch screens)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const openCreate = (status: Task["status"]) => {
    setCreateStatus(status);
    setNewTitle("");
    setNewDescription("");
    setNewTag("Eng");
    setNewPriority("med");
    setNewColor("lavender");
    setNewDueDate("");
    setNewGoalId("");
    setNewMilestoneId("");
    setIsModalOpen(true);
  };

  const openEdit = (t: Task) => {
    setEditTask(t);
    setEditTitle(t.title);
    setEditTag(t.tag || "");
    setEditPriority(
      (t.priority as string) === "medium"
        ? "med"
        : ((t.priority || "med") as "low" | "med" | "high"),
    );
    setEditColor(t.color || "lavender");
    setEditDueDate(t.due_date ? t.due_date.split("T")[0] : "");
    setEditStatus(t.status);

    // Parse description and linked milestone
    const desc = t.description || "";
    const cleanDesc = desc.replace(/\[Milestone:\s*([^\]]+)\]/g, "").trim();
    setEditDescription(cleanDesc);

    const match = desc.match(/\[Milestone:\s*([^\]]+)\]/);
    if (match) {
      const milestoneTitle = match[1];
      const linkedGoal = goals.find((g) => g.milestones?.some((m) => m.title === milestoneTitle));
      if (linkedGoal) {
        setEditGoalId(linkedGoal.id);
        const milestone = linkedGoal.milestones?.find((m) => m.title === milestoneTitle);
        setEditMilestoneId(milestone ? milestone.id : "");
      } else {
        setEditGoalId("");
        setEditMilestoneId("");
      }
    } else {
      setEditGoalId("");
      setEditMilestoneId("");
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Task title cannot be empty");
      return;
    }

    let finalDesc = newDescription.trim();
    let finalTag = newTag.trim();

    if (newGoalId) {
      const g = goals.find((x) => x.id === newGoalId);
      if (g) {
        finalTag = g.type; // Automatically set category tag to Goal type
        if (newMilestoneId) {
          const m = g.milestones?.find((x) => x.id === newMilestoneId);
          if (m) {
            finalDesc = `${finalDesc}\n[Milestone: ${m.title}]`.trim();
          }
        }
      }
    }

    createTask({
      title: newTitle.trim(),
      description: finalDesc || undefined,
      tag: finalTag,
      priority: newPriority,
      status: createStatus,
      color: newColor,
      due_date: newDueDate || undefined,
    });

    toast.success("Task created successfully!");
    setIsModalOpen(false);
    setNewTitle("");
    setNewDescription("");
    setNewTag("Eng");
    setNewPriority("med");
    setNewColor("lavender");
    setNewDueDate("");
    setNewGoalId("");
    setNewMilestoneId("");
  };

  const handleEditTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTask || !editTitle.trim()) {
      toast.error("Task title cannot be empty");
      return;
    }

    let finalDesc = editDescription.trim();
    let finalTag = editTag.trim();

    if (editGoalId) {
      const g = goals.find((x) => x.id === editGoalId);
      if (g) {
        finalTag = g.type;
        if (editMilestoneId) {
          const m = g.milestones?.find((x) => x.id === editMilestoneId);
          if (m) {
            finalDesc = `${finalDesc}\n[Milestone: ${m.title}]`.trim();
          }
        }
      }
    }

    updateTask({
      id: editTask.id,
      title: editTitle.trim(),
      description: finalDesc || undefined,
      tag: finalTag,
      priority: editPriority,
      color: editColor,
      due_date: editDueDate || undefined,
      status: editStatus,
    });

    toast.success("Task updated!");
    setEditTask(null);
  };

  const BREAKDOWN_STORAGE_KEY = (taskId: string) => `fp_breakdown_${taskId}`;

  const handleOpenBreakdown = async (t: Task) => {
    setActiveBreakdownTask(t);
    setEditingSubtaskIdx(null);
    setIsSaved(false);

    // Load from localStorage first
    const saved = localStorage.getItem(BREAKDOWN_STORAGE_KEY(t.id));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setBreakdownSubtasks(parsed);
        setIsSaved(true);
        return; // Don't regenerate
      } catch {
        // ignore parse error, fall through to AI
      }
    }

    // No saved data — call AI
    setIsBreakdownLoading(true);
    setBreakdownSubtasks([]);
    try {
      const res = await api.post(`/tasks/${t.id}/breakdown`);
      if (res.data && res.data.subtasks) {
        setBreakdownSubtasks(res.data.subtasks.map((st: any) => ({ ...st, completed: false })));
      } else {
        toast.error("Failed to generate AI breakdown checkpoints.");
      }
    } catch (err: any) {
      toast.error("AI breakdown request failed. Using tactical fallback steps.");
      setBreakdownSubtasks([
        {
          title: "Define technical requirements & edge cases",
          estimated_minutes: 15,
          completed: false,
        },
        {
          title: "Implement core functional logic and schema changes",
          estimated_minutes: 45,
          completed: false,
        },
        {
          title: "Draft unit tests and verify edge inputs",
          estimated_minutes: 20,
          completed: false,
        },
      ]);
    } finally {
      setIsBreakdownLoading(false);
    }
  };

  const handleSaveBreakdown = () => {
    if (!activeBreakdownTask) return;
    localStorage.setItem(
      BREAKDOWN_STORAGE_KEY(activeBreakdownTask.id),
      JSON.stringify(breakdownSubtasks),
    );
    setIsSaved(true);
    toast.success("Breakdown saved! It will load automatically next time.");
  };

  const handleRefreshBreakdown = async () => {
    if (!activeBreakdownTask) return;
    localStorage.removeItem(BREAKDOWN_STORAGE_KEY(activeBreakdownTask.id));
    setIsSaved(false);
    setIsBreakdownLoading(true);
    setBreakdownSubtasks([]);
    try {
      const res = await api.post(`/tasks/${activeBreakdownTask.id}/breakdown`);
      if (res.data && res.data.subtasks) {
        setBreakdownSubtasks(res.data.subtasks.map((st: any) => ({ ...st, completed: false })));
      }
    } catch {
      toast.error("AI refresh failed.");
    } finally {
      setIsBreakdownLoading(false);
    }
  };

  const handleToggleSubtask = (idx: number) => {
    setBreakdownSubtasks((prev) => {
      const next = prev.map((st, i) => (i === idx ? { ...st, completed: !st.completed } : st));
      // Auto-save on toggle if already saved
      if (isSaved && activeBreakdownTask) {
        localStorage.setItem(BREAKDOWN_STORAGE_KEY(activeBreakdownTask.id), JSON.stringify(next));
      }
      return next;
    });
  };

  const handleDeleteSubtask = (idx: number) => {
    setBreakdownSubtasks((prev) => prev.filter((_, i) => i !== idx));
    setIsSaved(false);
  };

  const handleAddSubtask = () => {
    setBreakdownSubtasks((prev) => [
      ...prev,
      { title: "New subtask", estimated_minutes: 15, completed: false },
    ]);
    setIsSaved(false);
    // Open inline edit for the new item
    setEditingSubtaskIdx(breakdownSubtasks.length);
    setEditingSubtaskTitle("New subtask");
  };

  const handleCommitEdit = (idx: number) => {
    if (!editingSubtaskTitle.trim()) return;
    setBreakdownSubtasks((prev) =>
      prev.map((st, i) => (i === idx ? { ...st, title: editingSubtaskTitle.trim() } : st)),
    );
    setEditingSubtaskIdx(null);
    setEditingSubtaskTitle("");
    setIsSaved(false);
  };

  // Filter task list dynamically based on search query & priority dropdown
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.tag || "Task").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  // Re-organize filtered task items into visual Kanban lists sorted by position/date
  const columns = [
    {
      id: "todo",
      title: "To do",
      tasks: filteredTasks
        .filter((t) => t.status === "todo")
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    },
    {
      id: "doing",
      title: "In progress",
      tasks: filteredTasks
        .filter((t) => t.status === "doing")
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    },
    {
      id: "review",
      title: "In review",
      tasks: filteredTasks
        .filter((t) => t.status === "review")
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    },
    {
      id: "done",
      title: "Done",
      tasks: filteredTasks
        .filter((t) => t.status === "done")
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    },
  ];

  const activeTask = tasks.find((t) => t.id === activeId);

  // DnD Handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    if (activeIdStr === overIdStr) return;

    const activeTaskItem = tasks.find((t) => t.id === activeIdStr);
    if (!activeTaskItem) return;

    const isOverTask = tasks.some((t) => t.id === overIdStr);
    const isOverColumn = ["todo", "doing", "review", "done"].includes(overIdStr);

    let targetStatus: Task["status"] | null = null;

    if (isOverColumn) {
      targetStatus = overIdStr as Task["status"];
    } else if (isOverTask) {
      const overTaskItem = tasks.find((t) => t.id === overIdStr);
      if (overTaskItem) {
        targetStatus = overTaskItem.status;
      }
    }

    if (targetStatus && activeTaskItem.status !== targetStatus) {
      setTasksOptimistic((prev) => {
        return prev.map((t) => {
          if (t.id === activeIdStr) {
            return { ...t, status: targetStatus! };
          }
          return t;
        });
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    const activeTaskItem = tasks.find((t) => t.id === activeIdStr);
    if (!activeTaskItem) return;

    const isOverColumn = ["todo", "doing", "review", "done"].includes(overIdStr);
    let targetStatus: Task["status"] = activeTaskItem.status;

    if (isOverColumn) {
      targetStatus = overIdStr as Task["status"];
    } else {
      const overTaskItem = tasks.find((t) => t.id === overIdStr);
      if (overTaskItem) {
        targetStatus = overTaskItem.status;
      }
    }

    const columnTasks = tasks.filter((t) => t.status === targetStatus && t.id !== activeIdStr);

    let finalIndex = columnTasks.length;
    if (!isOverColumn) {
      const overIndex = columnTasks.findIndex((t) => t.id === overIdStr);
      if (overIndex !== -1) {
        finalIndex = overIndex;
      }
    }

    setTasksOptimistic((prev) => {
      const filtered = prev.filter((t) => t.id !== activeIdStr);
      const activeItemCopy = prev.find((t) => t.id === activeIdStr);
      if (!activeItemCopy) return prev;

      const updatedItem = { ...activeItemCopy, status: targetStatus, position: finalIndex };
      const statusTasks = filtered.filter((t) => t.status === targetStatus);
      const otherTasks = filtered.filter((t) => t.status !== targetStatus);

      statusTasks.splice(finalIndex, 0, updatedItem);
      const reindexedStatusTasks = statusTasks.map((t, idx) => ({ ...t, position: idx }));

      return [...otherTasks, ...reindexedStatusTasks];
    });

    moveTask({
      id: activeIdStr,
      status: targetStatus,
      position: finalIndex,
    });

    toast.success("Task updated & layout preserved!");
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground animate-pulse">
            Loading active workspace tasks...
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center glass rounded-3xl p-8 max-w-sm">
          <p className="text-sm text-red-500 font-medium">
            Failed to sync task data with local APIs
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs text-primary-foreground hover:bg-primary/90"
          >
            Retry Sync
          </button>
        </div>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const overdueTasks = tasks.filter(
    (t) => t.status !== "done" && t.due_date && t.due_date.split("T")[0] < todayStr,
  );
  const dueTodayTasks = tasks.filter(
    (t) => t.status !== "done" && t.due_date && t.due_date.split("T")[0] === todayStr,
  );
  const upcomingTasks = tasks.filter(
    (t) => t.status !== "done" && t.due_date && t.due_date.split("T")[0] > todayStr,
  );
  const completedTasks = tasks.filter((t) => t.status === "done");

  const getGoalTitle = (goalId?: string) => {
    if (!goalId) return null;
    const goal = goals.find((g) => g.id === goalId);
    return goal ? goal.title : null;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            Triaged by AI · {filteredTasks.length} active
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              placeholder="Search tasks"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-32 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs hover:bg-secondary outline-none cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="med">Medium</option>
            <option value="low">Low</option>
          </select>

          <div className="inline-flex rounded-xl border border-border bg-card p-0.5 text-xs">
            {(
              [
                ["kanban", LayoutGrid],
                ["list", List],
                ["calendar", CalIcon],
              ] as const
            ).map(([v, Icon]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 capitalize cursor-pointer",
                  view === v
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => openCreate("todo")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-xs font-medium text-background hover:opacity-90 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Add task
          </button>
        </div>
      </div>

      {/* Task Due-Date Sections Overview */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            id: "overdue",
            title: "Overdue",
            textColor: "text-red-600 dark:text-red-400 font-bold",
            badgeClass: "bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400",
            emoji: "🔥",
            tasks: overdueTasks,
          },
          {
            id: "today",
            title: "Due Today",
            textColor: "text-amber-600 dark:text-amber-400 font-bold",
            badgeClass:
              "bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400",
            emoji: "📅",
            tasks: dueTodayTasks,
          },
          {
            id: "upcoming",
            title: "Upcoming",
            textColor: "text-sky-600 dark:text-sky-400 font-bold",
            badgeClass: "bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400",
            emoji: "⏳",
            tasks: upcomingTasks,
          },
          {
            id: "completed",
            title: "Completed",
            textColor: "text-emerald-600 dark:text-emerald-400 font-bold",
            badgeClass:
              "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
            emoji: "✅",
            tasks: completedTasks,
          },
        ].map((sec) => {
          const isExpanded = expandedSections[sec.id];
          return (
            <div
              key={sec.id}
              className="rounded-3xl border border-border/60 bg-card p-4 shadow-soft space-y-3"
            >
              <button
                onClick={() => toggleSection(sec.id)}
                className="flex w-full items-center justify-between font-display text-sm cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span>{sec.emoji}</span>
                  <span className={sec.textColor}>{sec.title}</span>
                  <span
                    className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", sec.badgeClass)}
                  >
                    {sec.tasks.length}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    {sec.tasks.length === 0 ? (
                      <div className="py-6 text-center text-xs text-muted-foreground italic bg-secondary/10 rounded-2xl border border-border/30">
                        No tasks
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {sec.tasks.map((task) => {
                          const goalTitle = getGoalTitle(task.goal_id);
                          return (
                            <div
                              key={task.id}
                              onClick={() => openEdit(task)}
                              className="group relative flex flex-col gap-1.5 rounded-2xl border border-border/40 bg-secondary/25 p-3 hover:bg-secondary/40 transition-all cursor-pointer hover:border-primary/20"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                  {task.title}
                                </span>
                                <span
                                  className={cn(
                                    "shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide",
                                    task.priority === "high"
                                      ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                                      : task.priority === "med"
                                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
                                  )}
                                >
                                  {task.priority === "med" ? "medium" : task.priority}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2 text-[9px] text-muted-foreground font-medium">
                                <span>
                                  {task.due_date ? task.due_date.split("T")[0] : "No due date"}
                                </span>
                                {goalTitle && (
                                  <span className="truncate max-w-[120px] font-bold text-violet-600 dark:text-violet-400 bg-violet-500/5 border border-violet-500/10 rounded-full px-1.5 py-0.5">
                                    🎯 {goalTitle}
                                  </span>
                                )}
                              </div>
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
        })}
      </div>

      <div className="rounded-2xl border border-border/60 bg-gradient-to-r from-primary/5 via-[oklch(0.85_0.08_220)]/15 to-[oklch(0.85_0.08_160)]/15 px-4 py-3 text-sm">
        <div className="flex items-center gap-2 text-xs">
          <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
          <span className="font-medium">AI suggestion:</span>
          <span className="text-muted-foreground">
            Drag and drop your tasks across columns to quickly triage and manage your daily
            engineering flow.
          </span>
        </div>
      </div>

      {/* Kanban Board View with Full DnD support */}
      {view === "kanban" && (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {columns.map((col) => (
              <DroppableColumn
                key={col.id}
                id={col.id}
                title={col.title}
                count={col.tasks.length}
                onPlusClick={() => openCreate(col.id as Task["status"])}
              >
                <SortableContext
                  items={col.tasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {col.tasks.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-border/40 text-center text-xs text-muted-foreground p-8 min-h-[120px] transition-colors group-hover:border-primary/30">
                      No tasks here — drop to move!
                    </div>
                  ) : (
                    col.tasks.map((t, idx) => (
                      <SortableTaskCard
                        key={t.id}
                        t={t}
                        idx={idx}
                        openEdit={openEdit}
                        deleteTask={deleteTask}
                        onBreakdownClick={handleOpenBreakdown}
                      />
                    ))
                  )}
                </SortableContext>
              </DroppableColumn>
            ))}
          </div>

          <DragOverlay>
            {activeId && activeTask ? (
              <SortableTaskCard
                t={activeTask}
                idx={0}
                openEdit={openEdit}
                deleteTask={deleteTask}
                onBreakdownClick={handleOpenBreakdown}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-soft">
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No tasks matching filters
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="px-4 py-3 text-left">Task</th>
                  <th className="px-4 py-3 text-left">Tag</th>
                  <th className="px-4 py-3 text-left">Priority</th>
                  <th className="px-4 py-3 text-left">Due</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-border/60 last:border-0 hover:bg-secondary/30"
                  >
                    <td className="px-4 py-3 font-medium">{t.title}</td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded-full px-2 py-0.5 text-xs"
                        style={{
                          background: `color-mix(in oklab, var(--${t.color || "lavender"}) 65%, var(--card))`,
                        }}
                      >
                        {t.tag || "Task"}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize text-xs">
                      {t.priority === "med" ? "medium" : t.priority}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {t.due_date ? t.due_date.split("T")[0] : "-"}
                    </td>
                    <td className="px-4 py-3 text-xs capitalize">{t.status}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteTask(t.id)}
                        className="text-muted-foreground hover:text-red-500 p-1 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Calendar view fallback */}
      {view === "calendar" && (
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
          <div className="grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => {
              const dayNum = (i % 31) + 1;
              const hasTask = filteredTasks.some(
                (t) => t.due_date && new Date(t.due_date).getDate() === dayNum,
              );
              return (
                <div
                  key={i}
                  className="min-h-[90px] rounded-xl border border-border/60 bg-secondary/30 p-2 text-xs"
                >
                  <div className="text-muted-foreground">{dayNum}</div>
                  {hasTask && (
                    <div className="mt-1 rounded-md bg-primary/10 text-primary px-1.5 py-0.5 text-[9px] truncate font-medium">
                      Task due
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Task Modal overlay */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass max-w-md w-full rounded-3xl p-6 shadow-float border border-border/60 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h2 className="font-display text-xl text-foreground">Add New Task</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
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

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Description
                  </span>
                  <textarea
                    placeholder="Detailed task description..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/40 resize-none"
                  />
                </label>

                {/* Relational Goal Roadmap Link */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Link Goal Roadmap
                    </span>
                    <select
                      value={newGoalId}
                      onChange={(e) => {
                        setNewGoalId(e.target.value);
                        setNewMilestoneId("");
                      }}
                      className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2 text-sm outline-none cursor-pointer"
                    >
                      <option value="">-- No Goal --</option>
                      {goals
                        .filter((g) => g.status === "active")
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            🎯 {g.title}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Link Milestone
                    </span>
                    <select
                      value={newMilestoneId}
                      disabled={!newGoalId}
                      onChange={(e) => setNewMilestoneId(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2 text-sm outline-none cursor-pointer disabled:opacity-40"
                    >
                      <option value="">-- No Milestone --</option>
                      {newGoalId &&
                        goals
                          .find((g) => g.id === newGoalId)
                          ?.milestones?.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.completed ? "✅" : "⏳"} {m.title}
                            </option>
                          ))}
                    </select>
                  </label>
                </div>

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
                    onClick={() => setIsModalOpen(false)}
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

      {/* Edit Task Modal */}
      <AnimatePresence>
        {editTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass max-w-md w-full rounded-3xl p-6 shadow-float border border-border/60 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h2 className="font-display text-xl text-foreground">Edit Task</h2>
                <button
                  onClick={() => setEditTask(null)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleEditTask} className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Task Title
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

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Description
                  </span>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-primary/40 resize-none"
                  />
                </label>

                {/* Relational Goal Roadmap Link */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Link Goal Roadmap
                    </span>
                    <select
                      value={editGoalId}
                      onChange={(e) => {
                        setEditGoalId(e.target.value);
                        setEditMilestoneId("");
                      }}
                      className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2 text-sm outline-none cursor-pointer"
                    >
                      <option value="">-- No Goal --</option>
                      {goals
                        .filter((g) => g.status === "active")
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            🎯 {g.title}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Link Milestone
                    </span>
                    <select
                      value={editMilestoneId}
                      disabled={!editGoalId}
                      onChange={(e) => setEditMilestoneId(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2 text-sm outline-none cursor-pointer disabled:opacity-40"
                    >
                      <option value="">-- No Milestone --</option>
                      {editGoalId &&
                        goals
                          .find((g) => g.id === editGoalId)
                          ?.milestones?.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.completed ? "✅" : "⏳"} {m.title}
                            </option>
                          ))}
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Category Tag
                    </span>
                    <input
                      type="text"
                      placeholder="Marketing / Eng / Design"
                      value={editTag}
                      onChange={(e) => setEditTag(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2 text-sm outline-none transition-all focus:border-primary/40"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Priority
                    </span>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as any)}
                      className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2 text-sm outline-none cursor-pointer"
                    >
                      <option value="high">🔴 High</option>
                      <option value="med">🟠 Medium</option>
                      <option value="low">🟢 Low</option>
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Status
                    </span>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as Task["status"])}
                      className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2 text-sm outline-none cursor-pointer"
                    >
                      <option value="todo">To Do</option>
                      <option value="doing">In Progress</option>
                      <option value="review">In Review</option>
                      <option value="done">Done</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Card Color
                    </span>
                    <select
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2 text-sm outline-none cursor-pointer"
                    >
                      <option value="lavender">Lavender</option>
                      <option value="mint">Mint</option>
                      <option value="sky">Sky</option>
                      <option value="peach">Peach</option>
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Due Date
                  </span>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2 text-sm outline-none"
                  />
                </label>

                <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => setEditTask(null)}
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

      {/* AI Subtask Breakdown Slide-out Drawer */}
      <AnimatePresence>
        {activeBreakdownTask && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={() => setActiveBreakdownTask(null)} />

            <motion.div
              initial={{ x: "100%", opacity: 0.9 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md h-full bg-card border-l border-border/60 p-6 shadow-2xl flex flex-col justify-between z-10"
            >
              <div className="space-y-6 overflow-y-auto pr-1">
                {/* Drawer Header */}
                <div className="flex items-start justify-between border-b border-border/40 pb-4">
                  <div className="space-y-1 text-left">
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      <Sparkles className="h-3 w-3 animate-pulse text-primary" /> AI Architect
                    </span>
                    <h2 className="font-display text-lg font-bold text-foreground leading-tight mt-1">
                      {activeBreakdownTask.title}
                    </h2>
                  </div>
                  <button
                    onClick={() => setActiveBreakdownTask(null)}
                    className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                {/* Subtask list */}
                <div className="space-y-4 text-left">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Action Plan Checkpoints
                  </div>

                  {isBreakdownLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                      <p className="text-xs text-muted-foreground animate-pulse font-medium">
                        FlowPilot AI is mapping optimal task sub-steps...
                      </p>
                    </div>
                  ) : breakdownSubtasks.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground italic">
                      No subtasks generated.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {breakdownSubtasks.map((st, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "rounded-2xl border transition-all duration-200",
                            st.completed
                              ? "bg-secondary/40 border-border/40 opacity-70"
                              : "bg-card border-border/60 hover:shadow-soft",
                          )}
                        >
                          {editingSubtaskIdx === idx ? (
                            <div className="flex items-center gap-2 p-3">
                              <input
                                autoFocus
                                type="text"
                                value={editingSubtaskTitle}
                                onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleCommitEdit(idx);
                                  if (e.key === "Escape") {
                                    setEditingSubtaskIdx(null);
                                    setEditingSubtaskTitle("");
                                  }
                                }}
                                className="flex-1 rounded-lg border border-primary/40 bg-background px-2 py-1 text-xs outline-none"
                              />
                              <button
                                onClick={() => handleCommitEdit(idx)}
                                className="rounded-lg bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingSubtaskIdx(null);
                                  setEditingSubtaskTitle("");
                                }}
                                className="rounded-lg border border-border px-2 py-1 text-[10px] font-bold text-muted-foreground cursor-pointer hover:bg-secondary"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2.5 p-3">
                              <input
                                type="checkbox"
                                checked={st.completed}
                                onChange={() => handleToggleSubtask(idx)}
                                className="rounded border-border text-primary outline-none accent-primary shrink-0 cursor-pointer h-4 w-4 mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <span
                                  className={cn(
                                    "text-xs font-medium text-foreground leading-snug block",
                                    st.completed && "line-through text-muted-foreground",
                                  )}
                                >
                                  {st.title}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  ⏱ {st.estimated_minutes} min
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {/* Start Focus from subtask */}
                                <button
                                  onClick={() => {
                                    window.dispatchEvent(
                                      new CustomEvent("start-focus-session", {
                                        detail: {
                                          type: "pomodoro",
                                          taskTitle: st.title,
                                          taskId: activeBreakdownTask?.id,
                                        },
                                      }),
                                    );
                                    toast.info(`Focus: "${st.title}"`);
                                  }}
                                  className="p-1 rounded-lg text-pink-500 hover:bg-pink-500/10 cursor-pointer transition-colors"
                                  title="Start Focus"
                                >
                                  <Brain className="h-3.5 w-3.5" />
                                </button>
                                {/* Edit subtask */}
                                <button
                                  onClick={() => {
                                    setEditingSubtaskIdx(idx);
                                    setEditingSubtaskTitle(st.title);
                                  }}
                                  className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                {/* Delete subtask */}
                                <button
                                  onClick={() => handleDeleteSubtask(idx)}
                                  className="p-1 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Add Subtask row */}
                      <button
                        onClick={handleAddSubtask}
                        className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-primary border border-dashed border-border/60 hover:border-primary/40 rounded-2xl px-3.5 py-2.5 cursor-pointer transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add subtask
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer Footer — Progress + Save/Refresh */}
              <div className="border-t border-border/40 pt-4 mt-4 space-y-3">
                {/* Progress bar */}
                {breakdownSubtasks.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
                      <span>
                        {breakdownSubtasks.filter((s) => s.completed).length} /{" "}
                        {breakdownSubtasks.length} completed
                      </span>
                      <span>
                        {breakdownSubtasks.reduce((sum, s) => sum + s.estimated_minutes, 0)} min
                        total
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            breakdownSubtasks.length === 0
                              ? 0
                              : (breakdownSubtasks.filter((s) => s.completed).length /
                                  breakdownSubtasks.length) *
                                100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRefreshBreakdown}
                    disabled={isBreakdownLoading}
                    className="flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-[10px] font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 cursor-pointer transition-all disabled:opacity-40"
                    title="Regenerate from AI"
                  >
                    <Sparkles className="h-3 w-3" />
                    Refresh
                  </button>
                  <button
                    onClick={handleSaveBreakdown}
                    disabled={breakdownSubtasks.length === 0 || isSaved}
                    className={cn(
                      "flex-1 rounded-full px-4 py-2 text-[10px] font-semibold cursor-pointer transition-all",
                      isSaved
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 cursor-default"
                        : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40",
                    )}
                  >
                    {isSaved ? "✓ Saved" : "Save Breakdown"}
                  </button>
                  <button
                    onClick={() => setActiveBreakdownTask(null)}
                    className="rounded-full border border-border px-4 py-2 text-[10px] font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Droppable Column Component
function DroppableColumn({
  id,
  title,
  count,
  children,
  onPlusClick,
}: {
  id: string;
  title: string;
  count: number;
  children: React.ReactNode;
  onPlusClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-3xl border p-3.5 min-h-[450px] flex flex-col transition-all duration-200",
        isOver
          ? "border-primary/50 bg-secondary/80 shadow-md ring-4 ring-primary/5"
          : "border-border/60 bg-secondary/40",
      )}
    >
      <div className="flex items-center justify-between px-2 py-1.5 shrink-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
          {title}{" "}
          <span className="rounded-full bg-secondary dark:bg-card px-1.5 py-0.5 text-xs text-muted-foreground font-bold">
            {count}
          </span>
        </div>
        <button
          onClick={onPlusClick}
          className="grid h-6 w-6 place-items-center rounded-lg text-muted-foreground hover:bg-secondary cursor-pointer transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-2 space-y-2 flex-1 flex flex-col">{children}</div>
    </div>
  );
}

// Draggable Sortable Task Card Component
function SortableTaskCard({
  t,
  idx,
  openEdit,
  deleteTask,
  onBreakdownClick,
  isOverlay = false,
}: {
  t: Task;
  idx: number;
  openEdit: (t: Task) => void;
  deleteTask: (id: string) => void;
  onBreakdownClick: (t: Task) => void;
  isOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: t.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  // Parse linked milestone title if exists
  const milestoneMatch = t.description?.match(/\[Milestone:\s*([^\]]+)\]/);
  const milestoneTitle = milestoneMatch ? milestoneMatch[1] : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group rounded-2xl border border-border/60 bg-card p-3.5 shadow-soft transition-all active:scale-[0.98] select-none touch-none flex flex-col gap-2.5",
        isOverlay
          ? "shadow-float scale-102 border-primary/30 cursor-grabbing bg-card/90 backdrop-blur-md"
          : "hover:shadow-float cursor-grab",
      )}
    >
      <div className="flex items-center justify-between text-[10px]">
        <span
          className="rounded-full px-2 py-0.5 font-semibold text-foreground/85"
          style={{
            background: `color-mix(in oklab, var(--${t.color || "lavender"}) 65%, var(--card))`,
          }}
        >
          {t.tag || "Task"}
        </span>
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Flag
            className={cn(
              "h-3 w-3",
              (t.priority as string) === "high" && "text-red-500",
              ((t.priority as string) === "med" || (t.priority as string) === "medium") &&
                "text-orange-500",
              (t.priority as string) === "low" && "text-green-500",
            )}
          />
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onBreakdownClick(t)}
            className="text-primary hover:bg-primary/10 p-0.5 rounded transition-all cursor-pointer"
            title="AI Subtask Breakdown"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("start-focus-session", {
                  detail: {
                    type: "pomodoro",
                    taskTitle: t.title,
                    goalId: t.goal_id || undefined,
                    milestoneId: t.milestone_id || undefined,
                  },
                }),
              );
              toast.info(`Launching focus session for task: "${t.title}"!`);
            }}
            className="text-pink-500 hover:bg-pink-500/10 p-0.5 rounded transition-all cursor-pointer"
            title="Launch Focus Session"
          >
            <Brain className="h-3.5 w-3.5 animate-pulse text-pink-500" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => openEdit(t)}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity cursor-pointer p-0.5"
            title="Edit Task"
          >
            <Edit2 className="h-3 w-3" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => deleteTask(t.id)}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity cursor-pointer p-0.5"
            title="Delete Task"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div>
        <div className="text-sm font-semibold leading-snug text-foreground">{t.title}</div>
        {milestoneTitle && (
          <div className="mt-1.5 flex items-center gap-1 text-[9px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10 w-fit">
            🎯 {milestoneTitle}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/20 pt-2 mt-0.5">
        <span className="font-semibold">
          {t.due_date ? t.due_date.split("T")[0] : "No due date"}
        </span>
      </div>
    </div>
  );
}
