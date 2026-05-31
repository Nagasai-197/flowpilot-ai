import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bell, CheckCircle2, Sparkles, Calendar, Bot, Trash2, Check, AlertCircle, Loader2, X, RefreshCw } from "lucide-react";
import { useNotifications, Notification } from "../hooks/useNotifications";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/app/notifications")({
  component: Notifications,
});

const PRIORITY_BADGES = {
  low: "bg-green-50 text-green-600 border-green-100 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/40",
  medium: "bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/40",
  high: "bg-red-50 text-red-600 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/40",
  critical: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800/40 animate-pulse",
};

const COLOR_MAPS = {
  low: "green",
  medium: "orange",
  high: "red",
  critical: "red",
};

const TYPE_ICONS = {
  overdue_task: AlertCircle,
  due_today: Calendar,
  habit_reminder: Bot,
  planner_reminder: Sparkles,
  productivity_alert: Bell,
};

function Notifications() {
  const { notifications, unreadCount, isLoading, isError, generateNotifications, isGenerating, markAsRead, deleteNotification, clearAll } = useNotifications();

  const handleGenerate = () => {
    toast.promise(
      new Promise((resolve, reject) => {
        generateNotifications(undefined, {
          onSuccess: (res: any) => resolve(res?.data?.generated ?? 0),
          onError: (err) => reject(err),
        });
      }),
      {
        loading: "Scanning workspace for alerts...",
        success: (n) => `Scan complete — ${n} new notification${(n as number) !== 1 ? 's' : ''} generated`,
        error: "Scan failed. Try again.",
      }
    );
  };

  const navigate = useNavigate();

  const handleMarkAsRead = (id: string, isRead: boolean, type: string) => {
    if (!isRead) {
      markAsRead(id);
    }
    
    // Notification Navigation logic to map specific alert types to exact page contexts
    switch (type) {
      case "overdue_task":
      case "due_today":
        navigate({ to: "/app/tasks" });
        break;
      case "habit_reminder":
        navigate({ to: "/app/habits" });
        break;
      case "planner_reminder":
        navigate({ to: "/app/planner" });
        break;
      case "productivity_alert":
        navigate({ to: "/app/analytics" });
        break;
      default:
        break;
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // prevent triggering mark-as-read click handler
    deleteNotification(id);
    toast.success("Notification deleted");
  };

  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear your entire notifications history log?")) {
      clearAll();
      toast.success("Notification history cleared");
    }
  };

  // Dynamic date grouping helper
  const getGroupedNotifications = () => {
    const today = new Date().toISOString().split("T")[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split("T")[0];

    const todayItems: Notification[] = [];
    const yesterdayItems: Notification[] = [];
    const olderItems: Notification[] = [];

    notifications.forEach((n) => {
      const dateStr = n.created_at.split("T")[0];
      if (dateStr === today) {
        todayItems.push(n);
      } else if (dateStr === yesterday) {
        yesterdayItems.push(n);
      } else {
        olderItems.push(n);
      }
    });

    const groups: { label: string; items: Notification[] }[] = [];
    if (todayItems.length > 0) groups.push({ label: "Today", items: todayItems });
    if (yesterdayItems.length > 0) groups.push({ label: "Yesterday", items: yesterdayItems });
    if (olderItems.length > 0) groups.push({ label: "Older Signals", items: olderItems });

    return groups;
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground animate-pulse">Synchronizing workspace alerts...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center glass rounded-3xl p-8 max-w-sm">
          <p className="text-sm text-red-500 font-medium">Failed to fetch notification timelines</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const grouped = getGroupedNotifications();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Notifications</h1>
          <p className="text-sm text-muted-foreground">Calm signals, never noise. ({unreadCount} unread)</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs hover:bg-secondary cursor-pointer disabled:opacity-60"
          >
            {isGenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 text-primary" />
            )}
            Scan workspace
          </button>
          {notifications.length > 0 && (
            <button 
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs hover:bg-secondary cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" /> Clear all
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-card p-12 text-center shadow-soft">
          <CheckCircle2 className="h-8 w-8 text-primary mb-3" />
          <h3 className="font-semibold text-lg">Inbox clear</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">You are completely caught up! No active nudges or warnings outstanding.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((g) => (
            <div key={g.label}>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{g.label}</div>
              <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-soft">
                {g.items.map((n, i) => {
                  const Icon = TYPE_ICONS[n.type as keyof typeof TYPE_ICONS] || Bell;
                  const colorTheme = COLOR_MAPS[n.priority] || "lavender";
                  return (
                    <div 
                      key={n.id} 
                      onClick={() => handleMarkAsRead(n.id, n.is_read, n.type)}
                      className={cn(
                        "flex items-start gap-4 border-b border-border/60 p-4 last:border-0 hover:bg-secondary/30 transition-colors cursor-pointer relative",
                        !n.is_read && "bg-secondary/15"
                      )}
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                        style={{ background: `color-mix(in oklab, var(--${colorTheme}) 65%, white)` }}>
                        <Icon className="h-4 w-4 text-foreground/80" />
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{n.title}</span>
                            <span className={cn("px-1.5 py-0.5 rounded text-[8px] uppercase font-bold tracking-wider border", PRIORITY_BADGES[n.priority])}>
                              {n.priority}
                            </span>
                            {!n.is_read && (
                              <span className="h-1.5 w-1.5 rounded-full bg-primary" title="Unread alert" />
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <button 
                              onClick={(e) => handleDelete(e, n.id)}
                              className="text-muted-foreground hover:text-red-500 cursor-pointer"
                              title="Delete notification"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{n.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
