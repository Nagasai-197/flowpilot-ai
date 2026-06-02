import { createLazyFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Zap,
  Coffee,
  Brain,
  Calendar,
  Loader2,
  Plus,
  Trash2,
  X,
  AlertCircle,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { usePlanner, ScheduleBlock } from "../hooks/usePlanner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createLazyFileRoute("/app/planner")({
  component: Planner,
});

const TYPE_ICONS = {
  focus: Brain,
  break: Coffee,
  meeting: Calendar,
  habit: Zap,
  routine: Coffee,
};

const COLORS = [
  { name: "lavender", label: "Lavender (Focus)" },
  { name: "mint", label: "Mint (Habit)" },
  { name: "sky", label: "Sky (Meeting)" },
  { name: "peach", label: "Peach (Break)" },
] as const;

// Helper to format ISO timestamps as local time (HH:MM)
const formatTime = (isoString: string) => {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "00:00";
  }
};

// Helper to compute block duration in minutes
const getDuration = (startIso: string, endIso: string) => {
  try {
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    return Math.max(0, Math.round((end - start) / (60 * 1000)));
  } catch {
    return 0;
  }
};

interface SortableBlockItemProps {
  b: ScheduleBlock;
  i: number;
  isCompleted: boolean;
  onToggleComplete: (id: string) => void;
  onEdit: (block: ScheduleBlock) => void;
  onRegenerate: (id: string) => void;
  isRegenerating: boolean;
}

function SortableBlockItem({
  b,
  i,
  isCompleted,
  onToggleComplete,
  onEdit,
  onRegenerate,
  isRegenerating,
}: SortableBlockItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: b.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  const Icon = TYPE_ICONS[b.type] || Zap;
  const blockDuration = getDuration(b.start_time, b.end_time);

  // Energy impact text
  const energyImpact =
    b.type === "focus"
      ? {
          text: "-15% energy drain",
          style: "text-red-500 bg-red-500/5 dark:bg-red-500/10 border-red-500/10",
        }
      : b.type === "break"
        ? {
            text: "+20% energy recovery",
            style: "text-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/10",
          }
        : b.type === "habit" || b.type === "routine"
          ? {
              text: "+10% energy stabilization",
              style: "text-amber-500 bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/10",
            }
          : {
              text: "-5% energy drain",
              style: "text-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500/10",
            };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative flex items-start gap-5 group select-none touch-none"
    >
      {/* Time column & Drag indicator acting as handle */}
      <div
        {...attributes}
        {...listeners}
        className="w-28 pt-3 text-right text-[10px] font-bold text-muted-foreground/80 tracking-tight font-mono whitespace-nowrap cursor-grab active:cursor-grabbing hover:text-primary transition-colors flex items-center justify-end gap-1.5"
      >
        <span className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 text-[12px] font-sans transition-opacity">
          ⋮⋮
        </span>
        {formatTime(b.start_time)} - {formatTime(b.end_time)}
      </div>

      <div
        className="relative z-10 mt-3.5 h-3 w-3 shrink-0 rounded-full border-2 border-card transition-all group-hover:scale-125"
        style={{ background: `var(--${b.color || "lavender"})` }}
      />

      <div
        className={cn(
          "flex-1 rounded-2xl border border-border/60 p-4 transition-all hover:shadow-soft flex items-center justify-between",
          isCompleted && "opacity-60",
        )}
        style={{
          background: `color-mix(in oklab, var(--${b.color || "lavender"}) 18%, var(--card))`,
        }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <input
            type="checkbox"
            checked={isCompleted}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={() => onToggleComplete(b.id)}
            className="rounded border-border text-primary outline-none accent-primary shrink-0 cursor-pointer h-4 w-4"
          />
          <div
            onClick={() => onEdit(b)}
            className="flex-1 cursor-pointer pr-4 min-w-0"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div
              className={cn(
                "flex items-center gap-2 text-sm font-medium text-foreground truncate",
                isCompleted && "line-through text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4 text-foreground/85 shrink-0" /> {b.label}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[10px] font-semibold">
              <span className="text-muted-foreground/80">{blockDuration} min</span>
              <span className={cn("px-1.5 py-0.5 rounded border", energyImpact.style)}>
                {energyImpact.text}
              </span>
            </div>
          </div>
        </div>

        {/* Quick actions on hover */}
        <div
          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {b.type === "focus" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRegenerate(b.id);
              }}
              disabled={isRegenerating}
              title="AI Cognitive Optimize"
              className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary cursor-pointer transition-colors"
            >
              {isRegenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(b);
            }}
            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-foreground/10 text-foreground hover:bg-foreground/20 cursor-pointer transition-all"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

function Planner() {
  const todayObj = new Date();
  const todayStr = todayObj.toISOString().split("T")[0];

  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().split("T")[0];

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Persisted client-side completion status for scheduled blocks
  const [completedBlockIds, setCompletedBlockIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`completed_blocks_${selectedDate}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(`completed_blocks_${selectedDate}`, JSON.stringify(completedBlockIds));
  }, [completedBlockIds, selectedDate]);

  const handleToggleComplete = (id: string) => {
    setCompletedBlockIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // Custom states for single-block AI optimization
  const [rationaleData, setRationaleData] = useState<{ title: string; rationale: string } | null>(
    null,
  );
  const [activeRegeneratingId, setActiveRegeneratingId] = useState<string | null>(null);

  // Modal editing & creation states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null); // null = creating
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState<"focus" | "break" | "meeting" | "habit">("focus");
  const [formColor, setFormColor] = useState<"lavender" | "mint" | "sky" | "peach">("lavender");
  const [formStart, setFormStart] = useState("09:00");
  const [formEnd, setFormEnd] = useState("10:30");

  const {
    schedule,
    recommendations,
    isLoading,
    isGenerating,
    generatePlan,
    createBlock,
    updateBlock,
    deleteBlock,
    regenerateBlock,
  } = usePlanner(selectedDate);

  // Timezone-resilient formatters
  const getTimeZoneOffsetStr = () => {
    const offsetMinutes = -new Date().getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const absMinutes = Math.abs(offsetMinutes);
    const hours = String(Math.floor(absMinutes / 60)).padStart(2, "0");
    const minutes = String(absMinutes % 60).padStart(2, "0");
    return `${sign}${hours}:${minutes}`;
  };

  const makeIsoString = (dateStr: string, timeStr: string, existingIso?: string) => {
    let offset = getTimeZoneOffsetStr();
    if (existingIso) {
      const match = existingIso.match(/[+-]\d{2}:\d{2}$/);
      if (match) {
        offset = match[0];
      } else if (existingIso.endsWith("Z")) {
        offset = "Z";
      }
    }
    const timeParts = timeStr.split(":");
    const hh = timeParts[0].padStart(2, "0");
    const mm = (timeParts[1] || "00").padStart(2, "0");
    return `${dateStr}T${hh}:${mm}:00${offset}`;
  };

  const getHHMM = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
    } catch {
      return "09:00";
    }
  };

  // Sensors for sortable lists
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // allows clicking to edit cards without triggering accidental drags
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeBlock = schedule.find((b) => b.id === active.id);
    const overBlock = schedule.find((b) => b.id === over.id);

    if (activeBlock && overBlock) {
      const activeStart = activeBlock.start_time;
      const activeEnd = activeBlock.end_time;
      const overStart = overBlock.start_time;
      const overEnd = overBlock.end_time;

      toast.promise(
        Promise.all([
          updateBlock({ id: activeBlock.id, start_time: overStart, end_time: overEnd }),
          updateBlock({ id: overBlock.id, start_time: activeStart, end_time: activeEnd }),
        ]),
        {
          loading: "Reordering chronological time slots...",
          success: "Planner schedule swapped successfully! 🔄",
          error: "Failed to reorder planner slots.",
        },
      );
    }
  };

  const handleGenerate = () => {
    const prefDeepWork = localStorage.getItem("pref_deep_work")
      ? parseInt(localStorage.getItem("pref_deep_work")!)
      : 90;
    const prefBreak = localStorage.getItem("pref_break")
      ? parseInt(localStorage.getItem("pref_break")!)
      : 15;

    toast.promise(
      new Promise((resolve, reject) => {
        generatePlan(
          {
            targetDate: selectedDate,
            preferredDeepWorkDuration: prefDeepWork,
            breakDuration: prefBreak,
          },
          {
            onSuccess: () => resolve("Plan updated"),
            onError: (err) => reject(err),
          },
        );
      }),
      {
        loading: `Generating customized AI schedule for ${selectedDate === todayStr ? "today" : "tomorrow"}...`,
        success: "Schedule auto-balanced successfully! 📅",
        error: "Failed to optimize schedule.",
      },
    );
  };

  const openEditModal = (block: ScheduleBlock) => {
    setEditingBlock(block);
    setFormTitle(block.label);
    setFormType(block.type as any);
    setFormColor(block.color as any);
    setFormStart(getHHMM(block.start_time));
    setFormEnd(getHHMM(block.end_time));
    setModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingBlock(null);
    setFormTitle("");
    setFormType("focus");
    setFormColor("lavender");
    setFormStart("09:00");
    setFormEnd("10:00");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error("Please enter a block description");
      return;
    }

    if (formEnd <= formStart) {
      toast.error("End time must be chronological (after Start time)");
      return;
    }

    const refIso = editingBlock ? editingBlock.start_time : schedule[0]?.start_time;
    const startIso = makeIsoString(selectedDate, formStart, refIso);
    const endIso = makeIsoString(selectedDate, formEnd, refIso);

    const payload = {
      title: formTitle,
      block_type: formType,
      color: formColor,
      start_time: startIso,
      end_time: endIso,
    };

    try {
      if (editingBlock) {
        await updateBlock({ id: editingBlock.id, ...payload });
        toast.success("Schedule slot updated! 📝");
      } else {
        await createBlock(payload);
        toast.success("Custom schedule slot added! ➕");
      }
      setModalOpen(false);
    } catch {
      toast.error("Failed to save schedule slot.");
    }
  };

  const handleDelete = async () => {
    if (!editingBlock) return;
    try {
      await deleteBlock(editingBlock.id);
      toast.success("Schedule slot excised successfully! 🗑️");
      setModalOpen(false);
    } catch {
      toast.error("Failed to delete slot.");
    }
  };

  const handleRegenerateBlock = async (id: string) => {
    setActiveRegeneratingId(id);
    const runRegen = async () => {
      try {
        const res = await regenerateBlock(id);
        setRationaleData({
          title: res.data.block.title,
          rationale: res.data.rationale,
        });
        return res;
      } finally {
        setActiveRegeneratingId(null);
      }
    };

    toast.promise(runRegen(), {
      loading: "FlowPilot AI is optimizing slot with cognitive psychology...",
      success: "Cognitive focus block balanced successfully! 🧠",
      error: "AI optimization failed.",
    });
  };

  // Memoized statistics and energy calculations to prevent long main-thread tasks
  const {
    focusTimeMin,
    completedFocusTimeMin,
    breakTimeMin,
    focusTimeStr,
    completedFocusStr,
    totalPlannedBlocks,
    completedPlannedBlocks,
    adherencePercent,
    cognitiveBattery,
    stats,
  } = useMemo(() => {
    const focusTimeMin = schedule
      .filter((b) => b.type === "focus")
      .reduce((sum, b) => sum + getDuration(b.start_time, b.end_time), 0);

    const completedFocusTimeMin = schedule
      .filter((b) => b.type === "focus" && completedBlockIds.includes(b.id))
      .reduce((sum, b) => sum + getDuration(b.start_time, b.end_time), 0);

    const breakTimeMin = schedule
      .filter((b) => b.type === "break")
      .reduce((sum, b) => sum + getDuration(b.start_time, b.end_time), 0);

    const focusHrs = Math.floor(focusTimeMin / 60);
    const focusMins = focusTimeMin % 60;
    const focusTimeStr = focusTimeMin > 0 ? `${focusHrs}h ${focusMins}m` : "0h";

    const completedFocusHrs = Math.floor(completedFocusTimeMin / 60);
    const completedFocusMins = completedFocusTimeMin % 60;
    const completedFocusStr =
      completedFocusTimeMin > 0 ? `${completedFocusHrs}h ${completedFocusMins}m` : "0h";

    const totalPlannedBlocks = schedule.length;
    const completedPlannedBlocks = schedule.filter((b) => completedBlockIds.includes(b.id)).length;
    const adherencePercent =
      totalPlannedBlocks > 0 ? Math.round((completedPlannedBlocks / totalPlannedBlocks) * 100) : 0;

    let energy = 80; // Starting baseline
    const sorted = [...schedule].sort((a, b) => a.start_time.localeCompare(b.start_time));
    for (const b of sorted) {
      if (b.type === "focus") {
        const duration = getDuration(b.start_time, b.end_time);
        energy -= Math.round((duration / 60) * 15);
      } else if (b.type === "break") {
        energy += 20;
      } else if (b.type === "habit" || b.type === "routine") {
        energy += 10;
      } else {
        energy -= 5;
      }
      energy = Math.max(5, Math.min(100, energy));
    }
    const cognitiveBattery = energy;

    const stats = [
      {
        l: "Focus Target",
        v: `${completedFocusStr} / ${focusTimeStr}`,
        d: `${Math.min(100, Math.round((completedFocusTimeMin / (focusTimeMin || 1)) * 100))}% focus completed`,
        c: "lavender",
        pct: Math.min(100, Math.round((completedFocusTimeMin / (focusTimeMin || 1)) * 100)),
      },
      {
        l: "Plan Adherence",
        v: `${adherencePercent}%`,
        d:
          totalPlannedBlocks > 0
            ? `${completedPlannedBlocks} of ${totalPlannedBlocks} blocks done`
            : "No blocks planned",
        c: "mint",
        pct: adherencePercent,
      },
      {
        l: "Cognitive Battery",
        v: `${cognitiveBattery}%`,
        d: cognitiveBattery >= 50 ? "🔋 Balanced Energy" : "⚠️ Schedule a Break Block!",
        c: "sky",
        pct: cognitiveBattery,
      },
    ];

    return {
      focusTimeMin,
      completedFocusTimeMin,
      breakTimeMin,
      focusTimeStr,
      completedFocusStr,
      totalPlannedBlocks,
      completedPlannedBlocks,
      adherencePercent,
      cognitiveBattery,
      stats,
    };
  }, [schedule, completedBlockIds]);

  // Format active selected date neatly
  const activeDateObj = new Date(selectedDate + "T00:00:00");
  const formattedActiveDate = activeDateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">AI Planner</h1>
          <p className="text-sm text-muted-foreground">
            Adaptive scheduling, optimized for your rhythm.
          </p>
        </div>

        {/* Date Selector Tabs */}
        <div className="flex rounded-xl bg-secondary/60 p-1 border border-border/40 shadow-soft">
          <button
            onClick={() => setSelectedDate(todayStr)}
            className={`rounded-lg px-5 py-2 text-xs font-semibold cursor-pointer transition-all ${
              selectedDate === todayStr
                ? "bg-background text-foreground shadow-soft border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setSelectedDate(tomorrowStr)}
            className={`rounded-lg px-5 py-2 text-xs font-semibold cursor-pointer transition-all ${
              selectedDate === tomorrowStr
                ? "bg-background text-foreground shadow-soft border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Tomorrow
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-full bg-secondary/60 px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary border border-border/40 shadow-soft cursor-pointer transition-all"
          >
            <Plus className="h-3.5 w-3.5" /> Add slot
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-60 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Optimizing...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" /> Generate new plan
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.l} className="rounded-3xl border border-border/60 bg-card p-5 shadow-soft">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.l}</div>
            <div className="mt-2 font-display text-3xl">{s.v}</div>
            <div className="mt-1 text-xs" style={{ color: `oklch(0.4 0.06 280)` }}>
              {s.d}
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${s.pct}%`, background: `var(--${s.c})` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* AI Cognitive Rationale Panel */}
      <AnimatePresence>
        {rationaleData && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-3xl border border-primary/20 bg-primary/5 p-5 shadow-soft flex items-start gap-4 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-2">
              <button
                onClick={() => setRationaleData(null)}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-2 rounded-2xl bg-primary/10 text-primary">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="space-y-1 pr-6">
              <div className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Cognitive Science Rationale
              </div>
              <div className="text-sm font-semibold text-foreground">
                Optimized: {rationaleData.title}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {rationaleData.rationale}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline blocks */}
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-primary">
              {selectedDate === todayStr ? "Today's timeline" : "Tomorrow's timeline"}
            </div>
            <h2 className="mt-1 text-lg font-semibold">{formattedActiveDate}</h2>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Drag & drop blocks to swap times
          </div>
        </div>

        {schedule.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="h-8 w-8 text-primary animate-pulse mb-3" />
            <h3 className="font-semibold text-base">Your timeline is empty</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Generate your first AI plan to organize your day.
            </p>
            <button
              onClick={handleGenerate}
              className="mt-4 inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl bg-foreground text-background hover:opacity-90 cursor-pointer transition-all"
            >
              Construct AI Plan
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="relative">
              {/* Timeline center line */}
              <div className="absolute left-[138px] top-0 bottom-0 w-px bg-border" />
              <div className="space-y-4">
                <SortableContext
                  items={schedule.map((b) => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {schedule.map((b, i) => (
                    <SortableBlockItem
                      key={b.id}
                      b={b}
                      i={i}
                      isCompleted={completedBlockIds.includes(b.id)}
                      onToggleComplete={handleToggleComplete}
                      onEdit={openEditModal}
                      onRegenerate={handleRegenerateBlock}
                      isRegenerating={activeRegeneratingId === b.id}
                    />
                  ))}
                </SortableContext>
              </div>
            </div>
          </DndContext>
        )}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-card to-secondary/40 p-6 shadow-soft">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" /> AI Recommendations
          </div>
          <div className="mt-3 space-y-2">
            {recommendations.map((rec, i) => (
              <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary">•</span> {rec}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Premium Glassmorphic Edit & Creation Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Content Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border/60 bg-card p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl text-foreground">
                  {editingBlock ? "Edit Schedule Block" : "Add Custom Block"}
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                {/* Description Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Block Description
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g., Deep Work: Database Design"
                    className="w-full rounded-xl border border-border/60 bg-secondary/40 px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
                  />
                </div>

                {/* Time Pickers */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={formStart}
                      onChange={(e) => setFormStart(e.target.value)}
                      className="w-full rounded-xl border border-border/60 bg-secondary/40 px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={formEnd}
                      onChange={(e) => setFormEnd(e.target.value)}
                      className="w-full rounded-xl border border-border/60 bg-secondary/40 px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
                    />
                  </div>
                </div>

                {/* Block Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Cognitive Block Type
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(["focus", "break", "meeting", "habit"] as const).map((t) => {
                      const TypeIcon = TYPE_ICONS[t] || Zap;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setFormType(t);
                            // Auto-set matching color recommendation
                            if (t === "focus") setFormColor("lavender");
                            else if (t === "habit") setFormColor("mint");
                            else if (t === "meeting") setFormColor("sky");
                            else if (t === "break") setFormColor("peach");
                          }}
                          className={`rounded-xl border p-2 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                            formType === t
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border/60 bg-secondary/20 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <TypeIcon className="h-4 w-4" />
                          <span className="text-[10px] font-medium capitalize">{t}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Block Theme Color */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Theme Color
                  </label>
                  <div className="flex gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setFormColor(c.name as any)}
                        style={{
                          background: `color-mix(in oklab, var(--${c.name}) 30%, var(--card))`,
                        }}
                        className={`flex-1 rounded-xl py-2 text-[10px] font-semibold text-foreground border cursor-pointer transition-all ${
                          formColor === c.name
                            ? "border-primary scale-105"
                            : "border-border/60 hover:scale-102"
                        }`}
                      >
                        <span
                          className="inline-block h-2 w-2 rounded-full mr-1.5"
                          style={{ background: `var(--${c.name})` }}
                        />
                        {c.label.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-border/40 gap-3">
                  {editingBlock ? (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      Save Slot
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
