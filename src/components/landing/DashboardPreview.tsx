import { motion } from "framer-motion";
import { CheckCircle2, Sparkles, Clock, TrendingUp, Bot } from "lucide-react";

export function DashboardPreview() {
  return (
    <div className="relative mx-auto max-w-5xl">
      <div className="absolute -inset-x-10 -bottom-10 top-10 -z-10 rounded-[40px] bg-gradient-to-b from-primary/10 via-[oklch(0.85_0.08_220)]/20 to-transparent blur-2xl" />
      <div className="overflow-hidden rounded-[28px] border border-border/60 bg-card shadow-float">
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-border/60 bg-secondary/50 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.85_0.13_25)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.86_0.13_85)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.82_0.13_150)]" />
          <div className="ml-3 inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-0.5 text-[10px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.7_0.15_160)]" />
            app.flowpilot.ai/dashboard
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4 p-4 md:p-6">
          {/* sidebar */}
          <div className="col-span-3 hidden flex-col gap-1.5 rounded-2xl bg-sidebar p-3 md:flex">
            {["Dashboard","Tasks","AI Planner","Analytics","Habits","Calendar","Settings"].map((l, i) => (
              <div key={l} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${i===0 ? "bg-card shadow-soft font-medium" : "text-muted-foreground"}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />{l}
              </div>
            ))}
          </div>

          {/* main */}
          <div className="col-span-12 space-y-4 md:col-span-9">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tuesday morning</p>
                <h3 className="font-display text-2xl md:text-3xl">Good morning, Maya ☀️</h3>
              </div>
              <div className="hidden items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs sm:flex">
                <Sparkles className="h-3 w-3 text-primary" /> AI ready
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { l: "Focus score", v: "92", icon: TrendingUp, color: "lavender" },
                { l: "Tasks done", v: "14/18", icon: CheckCircle2, color: "mint" },
                { l: "Deep work", v: "3h 40m", icon: Clock, color: "sky" },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl border border-border/60 bg-card p-3">
                  <div className="flex items-center gap-2">
                    <div className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: `color-mix(in oklab, var(--${s.color}) 65%, var(--card))` }}>
                      <s.icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="text-[10px] text-muted-foreground">{s.l}</div>
                  </div>
                  <div className="mt-2 font-display text-2xl">{s.v}</div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card to-secondary/40 p-4">
              <div className="flex items-center gap-2 text-xs font-medium">
                <Bot className="h-3.5 w-3.5 text-primary" /> AI-generated plan
              </div>
              <div className="mt-3 space-y-2">
                {[
                  { t: "09:00", l: "Deep work · Auth refactor", w: "70%", c: "lavender" },
                  { t: "11:30", l: "Stand-up · 15min", w: "20%", c: "sky" },
                  { t: "13:00", l: "Focus · Hackathon UI polish", w: "85%", c: "mint" },
                  { t: "16:00", l: "Habit · 20-min walk", w: "30%", c: "peach" },
                ].map((b, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    className="flex items-center gap-3 rounded-xl bg-card px-3 py-2 text-xs"
                  >
                    <span className="w-10 text-muted-foreground">{b.t}</span>
                    <span className="flex-1 font-medium">{b.l}</span>
                    <span className="relative h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                      <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: b.w, background: `var(--${b.c})` }} />
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
