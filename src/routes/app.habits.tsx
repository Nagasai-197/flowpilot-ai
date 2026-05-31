import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Flame, Sparkles, Trash2, X, Edit2, Search } from "lucide-react";
import { useState } from "react";
import { useHabits, Habit } from "../hooks/useHabits";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/habits")({
  component: Habits,
});

function Ring({ pct, color }: { pct: number; color: string }) {
  const r = 32, c = 2 * Math.PI * r, off = c - (pct / 100) * c;
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" className="shrink-0">
      <circle cx="38" cy="38" r={r} fill="none" stroke="oklch(0.94 0.01 260)" strokeWidth="6" />
      <circle cx="38" cy="38" r={r} fill="none" stroke={`var(--${color})`} strokeWidth="6"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
        transform="rotate(-90 38 38)" />
      <text x="38" y="42" textAnchor="middle" className="font-display fill-foreground text-sm font-semibold" fontSize="16">{pct}%</text>
    </svg>
  );
}

function Habits() {
  const { habits, isLoading, isError, createHabit, updateHabit, toggleHabit, deleteHabit } = useHabits();

  // Create modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("mint");

  // Edit modal state
  const [editHabit, setEditHabit] = useState<Habit | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("mint");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  const past7DaysData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return { dateStr: d.toISOString().split("T")[0], label: dayLabels[d.getDay()] };
  });

  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) { toast.error("Habit name cannot be empty"); return; }
    createHabit({ name: newName.trim(), color: newColor });
    toast.success("New habit created!");
    setIsModalOpen(false);
    setNewName(""); setNewColor("mint");
  };

  const openEdit = (h: Habit) => {
    setEditHabit(h); setEditName(h.name); setEditColor(h.color || "mint");
  };

  const handleEditHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editHabit || !editName.trim()) { toast.error("Habit name cannot be empty"); return; }
    updateHabit({ id: editHabit.id, name: editName.trim(), color: editColor });
    toast.success("Habit updated!");
    setEditHabit(null);
  };

  const handleToggleClick = (habitId: string, dateStr: string, currentVal: number) => {
    const nextVal = currentVal === 1 ? false : true;
    toggleHabit({ id: habitId, date: dateStr, completed: nextVal });
    toast.success(nextVal ? "Habit checked off! Keep it up 🔥" : "Habit unchecked");
  };

  const filteredHabits = habits.filter((h) =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) return (
    <div className="flex h-96 items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading habits streaks...</p>
      </div>
    </div>
  );

  if (isError) return (
    <div className="flex h-96 items-center justify-center">
      <div className="text-center glass rounded-3xl p-8 max-w-sm">
        <p className="text-sm text-red-500 font-medium">Failed to sync habit data with backend</p>
        <button onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs text-primary-foreground hover:bg-primary/90 cursor-pointer">Retry</button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Habits</h1>
          <p className="text-sm text-muted-foreground">Consistency, gently tracked.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 cursor-pointer">
          <Plus className="h-3.5 w-3.5" /> New habit
        </button>
      </div>

      {/* Search bar */}
      {habits.length > 0 && (
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search habits..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-card pl-8 pr-4 py-2 text-sm outline-none transition-all focus:border-primary/40 placeholder:text-muted-foreground/60"
          />
        </div>
      )}

      {habits.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-card p-12 text-center shadow-soft">
          <Sparkles className="h-8 w-8 text-primary animate-pulse mb-3" />
          <h3 className="font-semibold text-lg">No habits tracked yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">Start creating small, consistent habits to build your daily momentum.</p>
          <button onClick={() => setIsModalOpen(true)} className="mt-4 inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 cursor-pointer">
            Create first habit
          </button>
        </div>
      ) : filteredHabits.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No habits match "{searchQuery}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredHabits.map((h, i) => (
            <motion.div
              key={h.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="group rounded-3xl border border-border/60 bg-card p-5 shadow-soft hover:shadow-float transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1 pr-3">
                  <div className="text-sm font-medium truncate">{h.name}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Flame className="h-3 w-3 text-[oklch(0.7_0.18_45)]" /> {h.streak}-day streak
                    </div>
                    <button onClick={() => openEdit(h)} className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-primary transition-opacity cursor-pointer" title="Edit habit">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete "${h.name}"?`)) deleteHabit(h.id); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-red-500 transition-opacity cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <Ring pct={h.pct} color={h.color || "mint"} />
              </div>

              <div className="mt-4 flex justify-between gap-1">
                {past7DaysData.map((day, k) => {
                  const dayCheckVal = h.days?.[k] || 0;
                  return (
                    <div key={k} className="flex flex-col items-center gap-1.5 flex-1">
                      <span className="text-[10px] text-muted-foreground">{day.label}</span>
                      <button
                        onClick={() => handleToggleClick(h.id, day.dateStr, dayCheckVal)}
                        className={cn("h-7 w-full max-w-[28px] rounded-lg transition-transform hover:scale-105 cursor-pointer border border-transparent", dayCheckVal === 1 ? "" : "bg-secondary hover:bg-secondary/80")}
                        style={dayCheckVal === 1 ? { background: `color-mix(in oklab, var(--${h.color || "mint"}) 70%, var(--card))` } : undefined}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Today's status</span>
                {h.days?.[6] === 1 ? (
                  <button onClick={() => handleToggleClick(h.id, past7DaysData[6].dateStr, 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl cursor-pointer border border-transparent shadow-sm"
                    style={{ background: `color-mix(in oklab, var(--${h.color || "mint"}) 22%, var(--card))`, color: `color-mix(in oklab, var(--${h.color || "mint"}) 80%, var(--foreground))` }}>
                    Done for today ✓
                  </button>
                ) : (
                  <button onClick={() => handleToggleClick(h.id, past7DaysData[6].dateStr, 0)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl cursor-pointer border border-border bg-transparent hover:bg-secondary text-foreground shadow-sm"
                    onMouseEnter={(e) => { e.currentTarget.style.background = `color-mix(in oklab, var(--${h.color || "mint"}) 10%, var(--card))`; e.currentTarget.style.borderColor = `color-mix(in oklab, var(--${h.color || "mint"}) 40%, transparent)`; e.currentTarget.style.color = `color-mix(in oklab, var(--${h.color || "mint"}) 80%, var(--foreground))`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = ''; e.currentTarget.style.color = ''; }}>
                    Mark Done
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Habit Insights Nudge */}
      <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-card to-secondary/40 p-6 shadow-soft">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
          <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" /> AI habit suggestion
        </div>
        <h3 className="mt-2 text-lg font-semibold">Consolidate Morning Routines</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Checking off micro-habits before 10:00 AM matches with a 30% increase in weekly deep work execution.
        </p>
      </div>

      {/* New Habit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass max-w-md w-full rounded-3xl p-6 shadow-float border border-border/60 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="font-display text-xl text-foreground">New Habit</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleCreateHabit} className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Habit Name</span>
                  <input type="text" required placeholder="e.g. Read 20 pages" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={100} className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/40" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Label Accent Color</span>
                  <select value={newColor} onChange={(e) => setNewColor(e.target.value)} className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2 text-sm outline-none cursor-pointer">
                    <option value="mint">Mint (Green)</option>
                    <option value="lavender">Lavender (Purple)</option>
                    <option value="sky">Sky (Blue)</option>
                    <option value="peach">Peach (Orange)</option>
                  </select>
                </label>
                <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-full border border-border px-5 py-2.5 text-xs hover:bg-secondary cursor-pointer">Cancel</button>
                  <button type="submit" className="rounded-full bg-foreground px-5 py-2.5 text-xs font-medium text-background hover:opacity-90 cursor-pointer">Save Habit</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Habit Modal */}
      <AnimatePresence>
        {editHabit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass max-w-md w-full rounded-3xl p-6 shadow-float border border-border/60 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="font-display text-xl text-foreground">Edit Habit</h3>
                <button onClick={() => setEditHabit(null)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleEditHabit} className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Habit Name</span>
                  <input type="text" required value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={100} className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-primary/40" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Label Accent Color</span>
                  <select value={editColor} onChange={(e) => setEditColor(e.target.value)} className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2 text-sm outline-none cursor-pointer">
                    <option value="mint">Mint (Green)</option>
                    <option value="lavender">Lavender (Purple)</option>
                    <option value="sky">Sky (Blue)</option>
                    <option value="peach">Peach (Orange)</option>
                  </select>
                </label>
                <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
                  <button type="button" onClick={() => setEditHabit(null)} className="rounded-full border border-border px-5 py-2.5 text-xs hover:bg-secondary cursor-pointer">Cancel</button>
                  <button type="submit" className="rounded-full bg-foreground px-5 py-2.5 text-xs font-medium text-background hover:opacity-90 cursor-pointer">Save Changes</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
