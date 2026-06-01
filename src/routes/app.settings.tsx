import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { Loader2, LogOut } from "lucide-react";

export const Route = createFileRoute("/app/settings")({
  component: Settings,
});

const tabs = [
  "Profile",
  "Notifications",
  "AI personalization",
  "Integrations",
  "Security",
] as const;

function Toggle({
  defaultOn = false,
  onChange,
}: {
  defaultOn?: boolean;
  onChange?: (val: boolean) => void;
}) {
  const [on, setOn] = useState(defaultOn);

  const handleToggle = () => {
    const nextOn = !on;
    setOn(nextOn);
    if (onChange) onChange(nextOn);
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors cursor-pointer border-transparent",
        on ? "bg-primary" : "bg-secondary",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
          on ? "left-[22px]" : "left-0.5",
        )}
      />
    </button>
  );
}

function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Profile");

  // Live profile states
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [workingHoursStart, setWorkingHoursStart] = useState("09:00:00");
  const [workingHoursEnd, setWorkingHoursEnd] = useState("17:00:00");
  const [preferredDeepWorkDuration, setPreferredDeepWorkDuration] = useState<number>(90);
  const [breakDuration, setBreakDuration] = useState<number>(15);
  const [theme, setTheme] = useState<string>("system");

  useEffect(() => {
    if (!user) return;

    // Fetch live user settings profile from Supabase
    async function fetchProfile() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user!.id)
          .single();

        if (error) throw error;

        if (data) {
          setFullName(data.full_name || user?.user_metadata?.full_name || "");
          setTimezone(data.timezone || "UTC");
          setWorkingHoursStart(data.working_hours_start || "09:00:00");
          setWorkingHoursEnd(data.working_hours_end || "17:00:00");
          setPreferredDeepWorkDuration(
            data.preferred_deep_work_duration ||
              (localStorage.getItem("pref_deep_work")
                ? parseInt(localStorage.getItem("pref_deep_work")!)
                : 90),
          );
          setBreakDuration(
            data.break_duration ||
              (localStorage.getItem("pref_break")
                ? parseInt(localStorage.getItem("pref_break")!)
                : 15),
          );
        }
      } catch (err: any) {
        console.error("Failed to fetch settings profile: ", err.message);
        // Load from localStorage if supabase fails
        setPreferredDeepWorkDuration(
          localStorage.getItem("pref_deep_work")
            ? parseInt(localStorage.getItem("pref_deep_work")!)
            : 90,
        );
        setBreakDuration(
          localStorage.getItem("pref_break") ? parseInt(localStorage.getItem("pref_break")!) : 15,
        );
      } finally {
        const savedTheme = localStorage.getItem("theme") || "system";
        setTheme(savedTheme);
        setProfileLoading(false);
      }
    }

    fetchProfile();
  }, [user]);

  useEffect(() => {
    const syncTheme = () => {
      setTheme(localStorage.getItem("theme") || "system");
    };
    window.addEventListener("themeChanged", syncTheme);
    return () => window.removeEventListener("themeChanged", syncTheme);
  }, []);

  const handleThemeChange = (nextTheme: string) => {
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);

    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    if (nextTheme === "dark") {
      root.classList.add("dark");
    } else if (nextTheme === "light") {
      root.classList.add("light");
    } else {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    }
    // Broadcast to Topbar toggle button
    window.dispatchEvent(new Event("themeChanged"));
    toast.success(`Theme updated to ${nextTheme === "system" ? "system default" : nextTheme}`);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const baseUpdates = {
        full_name: fullName,
        timezone,
        working_hours_start: workingHoursStart,
        working_hours_end: workingHoursEnd,
      };

      // Resilient write: try to save durations to profiles, but catch error and fallback
      try {
        const { error } = await supabase
          .from("profiles")
          .update({
            ...baseUpdates,
            preferred_deep_work_duration: preferredDeepWorkDuration,
            break_duration: breakDuration,
          })
          .eq("id", user!.id);

        if (error) {
          console.warn("Database mismatch. Falling back to base updates.", error.message);
          const { error: fallbackError } = await supabase
            .from("profiles")
            .update(baseUpdates)
            .eq("id", user!.id);

          if (fallbackError) throw fallbackError;
        }
      } catch (dbErr: any) {
        console.warn("Resilient fallback active:", dbErr.message);
        const { error: fallbackError } = await supabase
          .from("profiles")
          .update(baseUpdates)
          .eq("id", user!.id);

        if (fallbackError) throw fallbackError;
      }

      // Always write to localStorage as primary client config / fallback
      localStorage.setItem("pref_deep_work", String(preferredDeepWorkDuration));
      localStorage.setItem("pref_break", String(breakDuration));

      // Update user auth metadata as well
      await supabase.auth.updateUser({
        data: { full_name: fullName },
      });

      toast.success("Profile and AI planner settings updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile changes");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    navigate({ to: "/login" });
  };

  if (profileLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const initialLetter = fullName
    ? fullName.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || "M";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Settings</h1>
          <p className="text-sm text-muted-foreground">Tune FlowPilot to feel uniquely yours.</p>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 px-4 py-2 text-xs font-semibold text-red-500 transition-colors cursor-pointer border border-transparent"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>

      <div className="flex flex-wrap gap-1 rounded-2xl border border-border/60 bg-card p-1.5 shadow-soft">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer border-transparent",
              tab === t
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Profile" && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
            <div className="flex flex-wrap items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-primary to-[oklch(0.75_0.13_220)] text-xl font-semibold text-white">
                {initialLetter}
              </div>
              <div>
                <div className="text-base font-medium">{fullName || "FlowPilot user"}</div>
                <div className="text-xs text-muted-foreground">
                  {user?.email} · Premium workspace
                </div>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSaveProfile}
            className="rounded-3xl border border-border/60 bg-card shadow-soft p-5 space-y-4"
          >
            <div className="border-b border-border/60 pb-3 text-sm font-medium">
              Personal details
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Full Name
                </span>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2.5 text-sm outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Timezone
                </span>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2.5 text-sm outline-none cursor-pointer"
                >
                  <option value="UTC">UTC (Universal Time)</option>
                  <option value="America/New_York">EST (New York)</option>
                  <option value="Europe/London">GMT (London)</option>
                  <option value="Europe/Paris">CET (Paris)</option>
                  <option value="Asia/Tokyo">JST (Tokyo)</option>
                  <option value="Asia/Kolkata">IST (India)</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Working Hours Start
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. 09:00:00"
                  value={workingHoursStart}
                  onChange={(e) => setWorkingHoursStart(e.target.value)}
                  className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2.5 text-sm outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Working Hours End
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. 17:00:00"
                  value={workingHoursEnd}
                  onChange={(e) => setWorkingHoursEnd(e.target.value)}
                  className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2.5 text-sm outline-none"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Preferred Deep Work Duration
                </span>
                <select
                  value={preferredDeepWorkDuration}
                  onChange={(e) => setPreferredDeepWorkDuration(parseInt(e.target.value))}
                  className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2.5 text-sm outline-none cursor-pointer"
                >
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                  <option value={120}>120 minutes</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Break Duration
                </span>
                <select
                  value={breakDuration}
                  onChange={(e) => setBreakDuration(parseInt(e.target.value))}
                  className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2.5 text-sm outline-none cursor-pointer"
                >
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={20}>20 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
              </label>
            </div>

            <div className="border-t border-border/60 pt-4 mt-4 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Appearance Theme
              </div>
              <label className="block max-w-sm">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Select Application Theme
                </span>
                <select
                  value={theme}
                  onChange={(e) => handleThemeChange(e.target.value)}
                  className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-3.5 py-2.5 text-sm outline-none cursor-pointer"
                >
                  <option value="system">💻 System Default</option>
                  <option value="light">☀️ Light Theme</option>
                  <option value="dark">🌙 Dark Theme</option>
                </select>
              </label>
            </div>

            <div className="flex justify-end pt-3 border-t border-border/60">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-foreground px-6 py-2.5 text-xs font-medium text-background hover:opacity-90 disabled:opacity-60 cursor-pointer flex items-center gap-2"
              >
                {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === "Notifications" && (
        <ToggleCard
          items={[
            ["Daily plan summary", "Every morning at 8:00", true],
            ["Smart focus reminders", "Pings before deep work blocks", true],
            ["Habit nudges", "Gentle prompts to stay consistent", false],
            ["Weekly review", "Sundays at 7pm", true],
          ]}
        />
      )}

      {tab === "AI personalization" && (
        <ToggleCard
          items={[
            ["Adaptive scheduling", "AI re-balances your day in real time", true],
            ["Learn from completions", "Improves estimates and priority", true],
            ["Energy-based planning", "Schedule deep work in peak hours", true],
            ["Auto-snooze low-energy days", "Reduces load when you're tired", false],
          ]}
        />
      )}

      {tab === "Integrations" && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Active integrations with live mock states */}
          <div className="glass rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-soft hover:shadow-float transition-all duration-300 flex flex-col justify-between h-40 text-left">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                  📅 Google Calendar
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <p className="text-xs text-muted-foreground">Synchronized 2 focus blocks today</p>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border/30 pt-3">
              <span className="text-[10px] text-muted-foreground font-mono">Last sync: 2m ago</span>
              <button
                onClick={() => toast.success("Google Calendar re-synchronized successfully!")}
                className="rounded-full bg-foreground px-3.5 py-1.5 text-xs font-semibold text-background hover:opacity-90 cursor-pointer"
              >
                Sync Now
              </button>
            </div>
          </div>

          <div className="glass rounded-3xl border border-indigo-500/20 bg-indigo-500/5 p-5 shadow-soft hover:shadow-float transition-all duration-300 flex flex-col justify-between h-40 text-left">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                  📝 Notion Workspace
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Database loaded: 4 Active Goals mapped
                </p>
              </div>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border/30 pt-3">
              <span className="text-[10px] text-muted-foreground font-mono">
                Last sync: 15m ago
              </span>
              <button
                onClick={() => toast.success("Notion database sync refreshed!")}
                className="rounded-full bg-foreground px-3.5 py-1.5 text-xs font-semibold text-background hover:opacity-90 cursor-pointer"
              >
                Refresh DB
              </button>
            </div>
          </div>

          <div className="glass rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5 shadow-soft hover:shadow-float transition-all duration-300 flex flex-col justify-between h-40 text-left">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                  💻 GitHub Contributions
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                </div>
                <p className="text-xs text-muted-foreground">Streaks logged: 12 Commits read</p>
              </div>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border/30 pt-3">
              <span className="text-[10px] text-muted-foreground font-mono">Last sync: 1h ago</span>
              <button
                onClick={() => toast.success("GitHub commit history parsed!")}
                className="rounded-full bg-foreground px-3.5 py-1.5 text-xs font-semibold text-background hover:opacity-90 cursor-pointer"
              >
                Configure
              </button>
            </div>
          </div>

          {/* Upcoming Beta Integrations */}
          {["Linear Ticket Sync", "Slack Flow Nudges", "Spotify Focus Session"].map((p) => (
            <div
              key={p}
              className="flex items-center justify-between rounded-3xl border border-border/60 bg-card/40 backdrop-blur-md p-5 shadow-soft opacity-60 text-left"
            >
              <div>
                <div className="text-sm font-medium text-foreground">{p}</div>
                <div className="text-xs text-muted-foreground">Beta coming soon</div>
              </div>
              <button
                onClick={() => toast.success(`Access requested for ${p} Beta!`)}
                className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold hover:bg-secondary cursor-pointer"
              >
                Request Access
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "Security" && (
        <ToggleCard
          items={[
            ["Two-factor authentication", "Add an extra layer of protection", true],
            ["Magic-link sign in", "Passwordless login by email", false],
            ["Session expiry", "Sign out after 14 days of inactivity", true],
          ]}
        />
      )}
    </div>
  );
}

function ToggleCard({ items }: { items: [string, string, boolean][] }) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card shadow-soft">
      <div className="divide-y divide-border/60">
        {items.map(([t, d, on]) => (
          <div key={t} className="flex items-center justify-between p-5">
            <div>
              <div className="text-sm font-medium">{t}</div>
              <div className="text-xs text-muted-foreground">{d}</div>
            </div>
            <Toggle defaultOn={on} />
          </div>
        ))}
      </div>
    </div>
  );
}
