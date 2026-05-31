import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Filter, LayoutGrid, List, Calendar as CalIcon, Sparkles, Flag, Trash2, X, ArrowRight, ArrowLeft, Edit2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTasks, Task } from "../hooks/useTasks";
import { toast } from "sonner";

export const Route = createFileRoute("/app/tasks")({
  component: Tasks,
});

function Tasks() {
  const [view, setView] = useState<"kanban" | "list" | "calendar">("kanban");
  const { tasks, isLoading, isError, createTask, updateTask, deleteTask } = useTasks();

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Create dialog state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTag, setNewTag] = useState("Eng");
  const [newPriority, setNewPriority] = useState<"low" | "med" | "high">("med");
  const [newColor, setNewColor] = useState("lavender");
  const [newDueDate, setNewDueDate] = useState("");

  // Edit dialog state
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTag, setEditTag] = useState("");
  const [editPriority, setEditPriority] = useState<"low" | "med" | "high">("med");
  const [editColor, setEditColor] = useState("lavender");
  const [editDueDate, setEditDueDate] = useState("");
  const [editStatus, setEditStatus] = useState<Task["status"]>("todo");

  const openEdit = (t: Task) => {
    setEditTask(t);
    setEditTitle(t.title);
    setEditTag(t.tag || "");
    setEditPriority((t.priority as string) === "medium" ? "med" : (t.priority || "med") as "low" | "med" | "high");
    setEditColor(t.color || "lavender");
    setEditDueDate(t.due_date ? t.due_date.split("T")[0] : "");
    setEditStatus(t.status);
  };

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
    setIsModalOpen(false);
    setNewTitle("");
    setNewTag("Eng");
    setNewPriority("med");
    setNewColor("lavender");
    setNewDueDate("");
  };

  const handleEditTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTask || !editTitle.trim()) {
      toast.error("Task title cannot be empty");
      return;
    }

    updateTask({
      id: editTask.id,
      title: editTitle.trim(),
      tag: editTag,
      priority: editPriority,
      color: editColor,
      due_date: editDueDate || undefined,
      status: editStatus,
    });

    toast.success("Task updated!");
    setEditTask(null);
  };

  const shiftStatus = (id: string, currentStatus: string, direction: "next" | "prev") => {
    const statusOrder: Task["status"][] = ["todo", "doing", "review", "done"];
    const currentIndex = statusOrder.indexOf(currentStatus as Task["status"]);
    let newIndex = currentIndex;
    
    if (direction === "next" && currentIndex < statusOrder.length - 1) {
      newIndex += 1;
    } else if (direction === "prev" && currentIndex > 0) {
      newIndex -= 1;
    }

    if (newIndex !== currentIndex) {
      updateTask({ id, status: statusOrder[newIndex] });
    }
  };

  // Filter task list dynamically
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (t.tag || "Task").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const columns = [
    { id: "todo", title: "To do", tasks: filteredTasks.filter((t) => t.status === "todo") },
    { id: "doing", title: "In progress", tasks: filteredTasks.filter((t) => t.status === "doing") },
    { id: "review", title: "In review", tasks: filteredTasks.filter((t) => t.status === "review") },
    { id: "done", title: "Done", tasks: filteredTasks.filter((t) => t.status === "done") },
  ];

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading active workspace tasks...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center glass rounded-3xl p-8 max-w-sm">
          <p className="text-sm text-red-500 font-medium">Failed to sync task data with local APIs</p>
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

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Tasks</h1>
          <p className="text-sm text-muted-foreground">Triaged by AI · {filteredTasks.length} active</p>
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
            {([
              ["kanban", LayoutGrid], ["list", List], ["calendar", CalIcon],
            ] as const).map(([v, Icon]) => (
              <button key={v} onClick={() => setView(v)}
                className={cn("inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 capitalize cursor-pointer",
                  view === v ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground")}>
                <Icon className="h-3.5 w-3.5" /> {v}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-xs font-medium text-background hover:opacity-90 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Add task
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-gradient-to-r from-primary/5 via-[oklch(0.85_0.08_220)]/15 to-[oklch(0.85_0.08_160)]/15 px-4 py-3 text-sm">
        <div className="flex items-center gap-2 text-xs">
          <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
          <span className="font-medium">AI suggestion:</span>
          <span className="text-muted-foreground">FlowPilot auto-arranges tasks inside high-energy morning time slots to boost focus.</span>
        </div>
      </div>

      {/* Kanban Board View */}
      {view === "kanban" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((col) => (
            <div key={col.id} className="rounded-3xl border border-border/60 bg-secondary/40 p-3 min-h-[300px]">
              <div className="flex items-center justify-between px-2 py-1.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {col.title} <span className="rounded-full bg-secondary dark:bg-card px-1.5 text-xs text-muted-foreground">{col.tasks.length}</span>
                </div>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="grid h-6 w-6 place-items-center rounded-lg text-muted-foreground hover:bg-secondary cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {col.tasks.length === 0 ? (
                  <div className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-border/40 text-center text-xs text-muted-foreground">
                    Empty column
                  </div>
                ) : (
                  col.tasks.map((t, i) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="group rounded-2xl border border-border/60 bg-card p-3 shadow-soft transition-all hover:shadow-float"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="rounded-full px-2 py-0.5 font-medium"
                          style={{ background: `color-mix(in oklab, var(--${t.color || 'lavender'}) 65%, var(--card))` }}>{t.tag || "Task"}</span>
                        <div className="flex items-center gap-1.5">
                          <Flag className={cn("h-3 w-3", (t.priority as string) === "high" && "text-red-500",
                            ((t.priority as string) === "med" || (t.priority as string) === "medium") && "text-orange-500",
                            (t.priority as string) === "low" && "text-green-500")} />
                          <button 
                            onClick={() => openEdit(t)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity cursor-pointer"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button 
                            onClick={() => deleteTask(t.id)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 text-sm font-medium leading-snug">{t.title}</div>
                      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{t.due_date ? t.due_date.split('T')[0] : "No due date"}</span>
                        
                        {/* Status Shift Controls */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {t.status !== "todo" && (
                            <button onClick={() => shiftStatus(t.id, t.status, "prev")} className="p-0.5 rounded hover:bg-secondary cursor-pointer">
                              <ArrowLeft className="h-3 w-3" />
                            </button>
                          )}
                          {t.status !== "done" && (
                            <button onClick={() => shiftStatus(t.id, t.status, "next")} className="p-0.5 rounded hover:bg-secondary cursor-pointer">
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-soft">
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">No tasks matching filters</div>
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
                  <tr key={t.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-3 font-medium">{t.title}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2 py-0.5 text-xs"
                        style={{ background: `color-mix(in oklab, var(--${t.color || 'lavender'}) 65%, var(--card))` }}>
                        {t.tag || "Task"}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize text-xs">
                      {t.priority === "med" ? "medium" : t.priority}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{t.due_date ? t.due_date.split('T')[0] : "-"}</td>
                    <td className="px-4 py-3 text-xs capitalize">{t.status}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => deleteTask(t.id)} className="text-muted-foreground hover:text-red-500 p-1 cursor-pointer">
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
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => {
              const dayNum = (i % 31) + 1;
              const hasTask = filteredTasks.some((t) => t.due_date && new Date(t.due_date).getDate() === dayNum);
              return (
                <div key={i} className="min-h-[90px] rounded-xl border border-border/60 bg-secondary/30 p-2 text-xs">
                  <div className="text-muted-foreground">{dayNum}</div>
                  {hasTask && (
                    <div className="mt-1 rounded-md bg-primary/10 text-primary px-1.5 py-0.5 text-[9px] truncate font-medium">Task due</div>
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
                <h3 className="font-display text-xl text-foreground">Add New Task</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
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
                <h3 className="font-display text-xl text-foreground">Edit Task</h3>
                <button onClick={() => setEditTask(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleEditTask} className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Task Title</span>
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
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Category Tag</span>
                    <input
                      type="text"
                      placeholder="Marketing / Eng / Design"
                      value={editTag}
                      onChange={(e) => setEditTag(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2 text-sm outline-none transition-all focus:border-primary/40"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Priority</span>
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
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Status</span>
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
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Card Color</span>
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
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Due Date</span>
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
    </div>
  );
}
