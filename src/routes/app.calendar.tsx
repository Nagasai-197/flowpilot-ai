import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus, Loader2, X } from "lucide-react";
import { useTasks } from "../hooks/useTasks";
import { usePlanner } from "../hooks/usePlanner";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/calendar")({
  component: CalendarPage,
});

function CalendarPage() {
  const { tasks, isLoading: tasksLoading, createTask } = useTasks();
  const todayStr = new Date().toISOString().split("T")[0];
  const { schedule, isLoading: plannerLoading } = usePlanner(todayStr);

  // Calendar month/year navigation state
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const currentMonthName = currentDate.toLocaleDateString("en-US", { month: "long" });

  // Event creation modal state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState(todayStr);
  const [eventPriority, setEventPriority] = useState<"low" | "med" | "high">("med");

  const handlePrevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));

  const handleAddEvent = () => setIsEventModalOpen(true);

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) { toast.error("Event title is required"); return; }
    createTask({
      title: eventTitle.trim(),
      tag: "Event",
      priority: eventPriority,
      status: "todo",
      color: "sky",
      due_date: eventDate,
    });
    toast.success("Event added to calendar! 📅");
    setIsEventModalOpen(false);
    setEventTitle("");
    setEventDate(todayStr);
    setEventPriority("med");
  };

  const isLoading = tasksLoading || plannerLoading;

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Syncing calendar timelines...</p>
        </div>
      </div>
    );
  }

  // Calculate grid padding cells based on first day of month (0 = Sun, 1 = Mon...)
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  // Create 35 or 42 grid cells depending on space
  const totalGridCells = firstDayIndex + totalDaysInMonth > 35 ? 42 : 35;
  const gridCells = Array.from({ length: totalGridCells }, (_, i) => i - firstDayIndex + 1);

  const todayDate = new Date();
  const isCurrentMonth = todayDate.getFullYear() === currentYear && todayDate.getMonth() === currentMonth;
  const todayDayNum = todayDate.getDate();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Calendar</h1>
          <p className="text-sm text-muted-foreground">A unified view of your time.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handlePrevMonth}
            className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card hover:bg-secondary cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium">
            {currentMonthName} {currentYear}
          </div>
          <button 
            onClick={handleNextMonth}
            className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card hover:bg-secondary cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button 
            onClick={handleAddEvent}
            className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-xs font-medium text-background hover:opacity-90 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Event
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
        <div className="grid grid-cols-7 gap-2 border-b border-border/60 pb-3 text-center text-xs font-medium text-muted-foreground">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="mt-3 grid grid-cols-7 gap-2">
          {gridCells.map((d, i) => {
            const valid = d > 0 && d <= totalDaysInMonth;
            const isToday = isCurrentMonth && d === todayDayNum;

            // 1. Gather all tasks due on this calendar day
            const tasksDue = tasks.filter((t) => {
              if (!t.due_date || !valid) return false;
              const tDate = new Date(t.due_date);
              return (
                tDate.getFullYear() === currentYear &&
                tDate.getMonth() === currentMonth &&
                tDate.getDate() === d
              );
            });

            // 2. Gather planner focus blocks scheduled for today (only if cell is today)
            const todayFocusCount = isToday 
              ? schedule.filter((b) => b.type === "focus").length 
              : 0;

            return (
              <div 
                key={i} 
                className={cn(
                  "min-h-[110px] rounded-2xl p-2 text-xs transition-colors border border-transparent",
                  valid ? "border-border/60 bg-secondary/30 hover:bg-secondary/60" : "opacity-30 pointer-events-none",
                  isToday ? "ring-2 ring-primary" : ""
                )}
              >
                <div className={cn("text-xs font-medium", isToday ? "text-primary font-bold" : "text-muted-foreground")}>
                  {valid ? d : ""}
                </div>

                <div className="mt-2 space-y-1 overflow-y-auto max-h-[70px] pr-0.5">
                  {/* Draw tasks due events */}
                  {tasksDue.map((t) => (
                    <div 
                      key={t.id} 
                      title={`${t.tag || "Task"}: ${t.title}`}
                      className="rounded-lg px-1.5 py-0.5 text-[9px] truncate font-medium border"
                      style={{
                        background: `color-mix(in oklab, var(--${t.color || "lavender"}) 60%, var(--card))`,
                        borderColor: `color-mix(in oklab, var(--${t.color || "lavender"}) 30%, transparent)`,
                      }}
                    >
                      {t.title}
                    </div>
                  ))}

                  {/* Draw today's focus block indicators */}
                  {isToday && todayFocusCount > 0 && (
                    <div className="rounded-lg bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 text-[9px] truncate font-medium">
                      🔥 {todayFocusCount} Focus blocks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Creation Modal */}
      <AnimatePresence>
        {isEventModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass max-w-md w-full rounded-3xl p-6 shadow-float border border-border/60 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="font-display text-xl text-foreground">Add Calendar Event</h3>
                <button onClick={() => setIsEventModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Event Title</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Team meeting, Doctor appointment"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    maxLength={100}
                    autoFocus
                    className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/40"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Date</span>
                    <input
                      type="date"
                      required
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2 text-sm outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Priority</span>
                    <select
                      value={eventPriority}
                      onChange={(e) => setEventPriority(e.target.value as any)}
                      className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2 text-sm outline-none cursor-pointer"
                    >
                      <option value="high">🔴 High</option>
                      <option value="med">🟠 Medium</option>
                      <option value="low">🟢 Low</option>
                    </select>
                  </label>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
                  <button type="button" onClick={() => setIsEventModalOpen(false)} className="rounded-full border border-border px-5 py-2.5 text-xs hover:bg-secondary cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" className="rounded-full bg-foreground px-5 py-2.5 text-xs font-medium text-background hover:opacity-90 cursor-pointer">
                    Add Event
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
