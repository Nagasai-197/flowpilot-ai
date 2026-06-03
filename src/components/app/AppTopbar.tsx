import {
  Bell,
  Search,
  Command,
  Plus,
  Sparkles,
  Target,
  Zap,
  Folder,
  CheckCircle,
  ArrowRight,
  Sun,
  Moon,
  Trash2,
  X,
  Check,
  Eye,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTasks } from "../../hooks/useTasks";
import { useHabits } from "../../hooks/useHabits";
import { useGoals } from "../../hooks/useGoals";
import { useNotifications } from "../../hooks/useNotifications";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Prioritized exact/starts-with/contains ranking function
function rankResults<T>(items: T[], query: string, titleKey: keyof T): T[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  return items
    .map((item) => {
      const title = String(item[titleKey] || "")
        .toLowerCase()
        .trim();
      let score = 0;

      if (title === q) {
        score = 3; // Exact match
      } else if (title.startsWith(q)) {
        score = 2; // Starts with match
      } else if (title.includes(q)) {
        score = 1; // Contains match
      }

      return { item, score };
    })
    .filter((res) => res.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((res) => res.item);
}

export function AppTopbar({
  onMenuClick,
  onNewTaskClick,
  title,
}: {
  onMenuClick: () => void;
  onNewTaskClick?: () => void;
  title: string;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load database resources for search index
  const { tasks } = useTasks();
  const { habits } = useHabits();
  const { goals } = useGoals();
  const { notifications, unreadCount, markAsRead, clearAll, deleteNotification } =
    useNotifications();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTheme, setCurrentTheme] = useState("system");

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const initialLetter = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "system";
    setCurrentTheme(saved);

    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", handler);

    // Sync theme if changed elsewhere
    const syncTheme = () => {
      setCurrentTheme(localStorage.getItem("theme") || "system");
    };
    window.addEventListener("themeChanged", syncTheme);

    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);

    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("themeChanged", syncTheme);
      window.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    setCurrentTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);

    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    if (nextTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.add("light");
    }

    // Broadcast change to settings page
    window.dispatchEvent(new Event("themeChanged"));
  };

  const handleNavigate = (to: string) => {
    setPaletteOpen(false);
    setSearchQuery("");
    navigate({ to });
  };

  // Perform search ranking across tables
  const matchedTasks = rankResults(tasks, searchQuery, "title").slice(0, 4);
  const matchedHabits = rankResults(habits, searchQuery, "name").slice(0, 4);
  const matchedGoals = rankResults(goals, searchQuery, "title").slice(0, 4);
  const hasAnyMatches =
    matchedTasks.length > 0 || matchedHabits.length > 0 || matchedGoals.length > 0;

  const navSuggestions = [
    { label: "Go to Dashboard", to: "/app/dashboard" },
    { label: "Go to Goals", to: "/app/goals" },
    { label: "Go to Planner", to: "/app/planner" },
    { label: "Go to Tasks", to: "/app/tasks" },
    { label: "Go to AI Coach", to: "/app/coach" },
    { label: "Go to Review Reflection", to: "/app/review" },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl md:px-6">
        <button
          onClick={onMenuClick}
          className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary md:hidden"
          aria-label="Open menu"
        >
          <div className="space-y-1">
            <span className="block h-0.5 w-4 bg-current" />
            <span className="block h-0.5 w-4 bg-current" />
          </div>
        </button>

        <div className="text-sm font-medium">{title}</div>

        <button
          onClick={() => setPaletteOpen(true)}
          className="ml-auto inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Ask FlowPilot or search…</span>
          <kbd className="hidden items-center gap-1 rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-flex">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>

        <button
          onClick={onNewTaskClick}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-foreground px-3 text-xs font-medium text-background hover:opacity-90 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">New task</span>
        </button>

        {/* Notifications Popover bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setNotificationsOpen((v) => !v)}
            className={cn(
              "relative grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-secondary cursor-pointer transition-all",
              notificationsOpen && "bg-secondary text-foreground border-primary/30",
            )}
            title="Notifications Alerts"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notificationsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                className="absolute right-0 mt-2 z-50 w-80 rounded-3xl p-4 border border-border/60 bg-card/95 shadow-float backdrop-blur-xl space-y-3"
              >
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Alerts Dashboard
                    </span>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <button
                      onClick={() => {
                        clearAll();
                        toast.success("Cleared all notifications.");
                      }}
                      className="text-[10px] font-bold text-muted-foreground hover:text-red-500 cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5 scrollbar-thin">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-1.5">
                      <Sparkles className="h-6 w-6 text-primary/60 animate-pulse" />
                      <p className="text-xs font-medium">You are completely in flow!</p>
                      <p className="text-[10px] text-muted-foreground/80">
                        No unread notifications system alerts.
                      </p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (!n.is_read) markAsRead(n.id);
                        }}
                        className={cn(
                          "group relative flex items-start gap-2.5 rounded-2xl border border-transparent p-2.5 transition-all hover:bg-secondary/40 cursor-pointer",
                          !n.is_read && "bg-primary/5 border-primary/10",
                        )}
                      >
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full shrink-0 mt-1.5",
                            n.priority === "critical"
                              ? "bg-red-500 animate-ping"
                              : n.priority === "high"
                                ? "bg-orange-500"
                                : n.priority === "medium"
                                  ? "bg-sky-500"
                                  : "bg-zinc-400",
                          )}
                        />
                        <div className="min-w-0 flex-1 pr-4">
                          <p
                            className={cn(
                              "text-xs leading-snug",
                              !n.is_read ? "font-bold" : "text-foreground/80",
                            )}
                          >
                            {n.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                            {n.description}
                          </p>
                          <p className="text-[8px] text-muted-foreground/60 mt-1 font-semibold">
                            {new Date(n.created_at).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(n.id);
                            toast.success("Notification removed");
                          }}
                          className="absolute right-2 top-2 p-0.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 rounded hover:bg-secondary/80 transition-all cursor-pointer"
                          title="Delete Alert"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={toggleTheme}
          className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-secondary cursor-pointer transition-colors"
          title={`Switch to ${currentTheme === "dark" ? "Light theme" : "Dark theme"}`}
        >
          {currentTheme === "dark" ? (
            <Sun className="h-4 w-4 text-[oklch(0.78_0.13_70)]" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        <Link
          to="/app/settings"
          className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-[oklch(0.75_0.13_220)] text-xs font-semibold text-white hover:opacity-90 cursor-pointer shadow-soft transition-all"
        >
          {initialLetter}
        </Link>
      </header>

      <AnimatePresence>
        {paletteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/30 backdrop-blur-md p-4 pt-[15vh]"
            onClick={() => {
              setPaletteOpen(false);
              setSearchQuery("");
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong w-full max-w-xl overflow-hidden rounded-2xl shadow-float border border-border/40"
            >
              <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ask FlowPilot anything or search tasks, habits, goals..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 text-foreground"
                />
                <kbd className="rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[10px]">
                  ESC
                </kbd>
              </div>

              <div className="max-h-96 overflow-y-auto p-2 text-sm space-y-4">
                {/* 1. Quick Navigation (when search query is empty) */}
                {!searchQuery && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Quick Navigation
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {navSuggestions.map((s) => (
                        <button
                          key={s.to}
                          onClick={() => handleNavigate(s.to)}
                          className="flex items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-secondary/60 text-xs text-foreground/80 cursor-pointer"
                        >
                          <span className="flex items-center gap-2">{s.label}</span>
                          <ArrowRight className="h-3 w-3 opacity-45" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Search Results Display */}
                {searchQuery && (
                  <div className="space-y-4">
                    {!hasAnyMatches && (
                      <div className="py-8 text-center text-muted-foreground flex flex-col items-center">
                        <Folder className="h-8 w-8 text-muted-foreground/40 mb-2" />
                        <p className="text-xs">No matches found for "{searchQuery}"</p>
                      </div>
                    )}

                    {/* Tasks Matches */}
                    {matchedTasks.length > 0 && (
                      <div>
                        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <CheckCircle className="h-3 w-3 text-lavender" /> Tasks
                        </div>
                        <div className="space-y-1">
                          {matchedTasks.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => handleNavigate("/app/tasks")}
                              className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-secondary/60 text-left text-xs cursor-pointer"
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <p className="font-medium text-foreground line-clamp-1">
                                  {t.title}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                                  {t.tag || "Task"} · {t.status}
                                </p>
                              </div>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                  t.priority === "high"
                                    ? "bg-red-50 text-red-600 border border-red-100"
                                    : t.priority === "med"
                                      ? "bg-orange-50 text-orange-600 border border-orange-100"
                                      : "bg-green-50 text-green-600 border border-green-100"
                                }`}
                              >
                                {t.priority}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Habits Matches */}
                    {matchedHabits.length > 0 && (
                      <div>
                        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Zap className="h-3 w-3 text-mint" /> Habits
                        </div>
                        <div className="space-y-1">
                          {matchedHabits.map((h) => (
                            <button
                              key={h.id}
                              onClick={() => handleNavigate("/app/dashboard")}
                              className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-secondary/60 text-left text-xs cursor-pointer"
                            >
                              <span className="font-medium text-foreground">{h.name}</span>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                🔥 {h.streak}d streak
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Goals Matches */}
                    {matchedGoals.length > 0 && (
                      <div>
                        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Target className="h-3 w-3 text-sky" /> Goals
                        </div>
                        <div className="space-y-1">
                          {matchedGoals.map((g) => (
                            <button
                              key={g.id}
                              onClick={() => handleNavigate("/app/goals")}
                              className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-secondary/60 text-left text-xs cursor-pointer"
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <p className="font-medium text-foreground line-clamp-1">
                                  {g.title}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {g.type} · {g.status}
                                </p>
                              </div>
                              <span className="text-[10px] font-semibold text-primary font-mono">
                                {g.progress ?? 0}%
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
