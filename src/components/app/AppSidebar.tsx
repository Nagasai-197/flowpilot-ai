import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, CheckSquare, Brain, BarChart3, Bot,
  Repeat, Calendar, Bell, Settings, ChevronLeft, ChevronRight, Target,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { useAuth } from "../../hooks/useAuth";

const items = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/app/goals", label: "Goals", icon: Target },
  { to: "/app/planner", label: "AI Planner", icon: Brain },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/app/assistant", label: "AI Assistant", icon: Bot },
  { to: "/app/habits", label: "Habits", icon: Repeat },
  { to: "/app/calendar", label: "Calendar", icon: Calendar },
  { to: "/app/notifications", label: "Notifications", icon: Bell },
  { to: "/app/settings", label: "Settings", icon: Settings },
] as const;

export function AppSidebar({ mobileOpen, onMobileClose }: { mobileOpen: boolean; onMobileClose: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const initialLetter = displayName.charAt(0).toUpperCase();

  return (
    <>
      {/* mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onMobileClose}
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        "md:sticky md:top-0 md:h-screen md:translate-x-0",
        collapsed ? "md:w-[72px]" : "md:w-[248px]",
        mobileOpen ? "w-[260px] translate-x-0" : "w-[260px] -translate-x-full"
      )}>
        <div className="flex h-14 items-center justify-between px-4">
          <div className={cn("overflow-hidden transition-all", collapsed && "md:opacity-0")}>
            <Logo withWord={!collapsed || mobileOpen} />
          </div>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="hidden h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-sidebar-accent md:grid"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {items.map((item) => {
            const active = pathname === item.to || (item.to !== "/app/dashboard" && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onMobileClose}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                  active
                    ? "bg-card text-foreground shadow-soft"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                <span className={cn("truncate transition-all", collapsed && "md:hidden")}>{item.label}</span>
                {active && (
                  <motion.span layoutId="sidebar-pill" className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className={cn(
          "m-3 rounded-2xl border border-sidebar-border bg-gradient-to-br from-card to-secondary/60 p-3 text-xs",
          collapsed && "md:hidden"
        )}>
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-primary to-[oklch(0.75_0.13_220)] text-xs font-semibold text-white">
              {initialLetter}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{displayName}</div>
              {user?.email === "demo@flowpilot.ai" ? (
                <div className="truncate text-[10px] text-primary font-semibold flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                  </span>
                  Demo Workspace
                </div>
              ) : (
                <div className="truncate text-[10px] text-muted-foreground">Pro plan</div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
