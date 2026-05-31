import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Sparkles, Calendar, Brain, BarChart3, Zap, CheckCircle2,
  ArrowRight, Command, Bot, Target, Clock, TrendingUp, Star,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { DashboardPreview } from "@/components/landing/DashboardPreview";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FlowPilot AI — Your AI-Powered Personal Life OS" },
      { name: "description", content: "FlowPilot AI plans your day, balances your focus, and adapts to how you work. Built for makers, students, and operators." },
    ],
  }),
  component: Landing,
});

const fade = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
};

function Nav() {
  return (
    <header className="sticky top-0 z-40 mx-auto w-full max-w-7xl px-4 pt-4">
      <div className="glass flex items-center justify-between rounded-2xl px-4 py-2.5 shadow-soft">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#how" className="hover:text-foreground">How it works</a>
          <a href="#testimonials" className="hover:text-foreground">Loved by</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground sm:inline">Sign in</Link>
          <Link to="/app/dashboard" className="group inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-all hover:opacity-90">
            Launch app <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden pt-12 md:pt-20">
      <div className="absolute inset-0 -z-10 gradient-mesh opacity-90" />
      <div className="absolute inset-x-0 top-0 -z-10 h-[600px] grid-bg [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />

      <div className="mx-auto max-w-6xl px-4 text-center">
        <motion.div
          {...fade}
          className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/50 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur"
        >
          <Sparkles className="h-3 w-3 text-primary" />
          Introducing FlowPilot AI · v1.0
        </motion.div>

        <motion.h1
          {...fade}
          transition={{ ...fade.transition, delay: 0.05 }}
          className="mt-6 font-display text-5xl leading-[1.05] sm:text-6xl md:text-7xl lg:text-[88px]"
        >
          Your AI-Powered <br className="hidden sm:block" />
          <span className="text-gradient italic">Personal Life</span> Operating System
        </motion.h1>

        <motion.p
          {...fade}
          transition={{ ...fade.transition, delay: 0.1 }}
          className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg"
        >
          Plan your day, balance focus and rest, and let an adaptive AI co-pilot
          orchestrate tasks, habits, and deadlines — beautifully.
        </motion.p>

        <motion.div
          {...fade}
          transition={{ ...fade.transition, delay: 0.15 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Link to="/app/dashboard" className="group inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background shadow-float transition-all hover:scale-[1.02]">
            Open FlowPilot <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a href="#features" className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-6 py-3 text-sm font-medium backdrop-blur hover:bg-white">
            <Command className="h-4 w-4" /> See it in action
          </a>
        </motion.div>

        <motion.div
          {...fade}
          transition={{ ...fade.transition, delay: 0.25 }}
          className="mt-16 md:mt-20"
        >
          <DashboardPreview />
        </motion.div>
      </div>
    </section>
  );
}

const features = [
  { icon: Brain, color: "lavender", title: "Adaptive AI Planner", desc: "An AI that learns your rhythm and rewrites your day when life shifts." },
  { icon: Target, color: "mint", title: "Smart Task Triage", desc: "Auto-prioritized tasks with deadline awareness and effort estimation." },
  { icon: BarChart3, color: "sky", title: "Productivity Analytics", desc: "Beautiful charts that turn your effort into insights you can act on." },
  { icon: Zap, color: "peach", title: "Focus Sessions", desc: "Distraction-free sprints with dynamic breaks and ambient cues." },
  { icon: Calendar, color: "lavender", title: "Unified Calendar", desc: "Tasks, meetings, and habits — orchestrated in one elegant timeline." },
  { icon: Bot, color: "sky", title: "Conversational Assistant", desc: "Ask anything: \"Plan my week\", \"Reschedule unfinished work\"." },
];

function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 py-24 md:py-32">
      <motion.div {...fade} className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium text-primary">Everything you need</p>
        <h2 className="mt-2 font-display text-4xl md:text-5xl">An operating system, not an app.</h2>
        <p className="mt-3 text-muted-foreground">
          A connected suite of intelligent tools that compose into your perfect workday.
        </p>
      </motion.div>

      <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            {...fade}
            transition={{ ...fade.transition, delay: i * 0.04 }}
            className="group relative rounded-3xl border border-border/60 bg-card p-6 shadow-soft transition-all hover:shadow-float hover:-translate-y-0.5"
          >
            <div
              className="mb-5 grid h-11 w-11 place-items-center rounded-2xl"
              style={{ background: `color-mix(in oklab, var(--${f.color}) 60%, white)` }}
            >
              <f.icon className="h-5 w-5 text-foreground/80" />
            </div>
            <h3 className="text-base font-semibold">{f.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

const stats = [
  { v: "3.4×", l: "Faster planning" },
  { v: "92%", l: "Tasks completed on time" },
  { v: "27h", l: "Saved monthly" },
  { v: "4.9", l: "Avg user rating" },
];

function Stats() {
  return (
    <section className="mx-auto max-w-7xl px-4">
      <div className="rounded-3xl border border-border/60 bg-card/70 p-8 shadow-soft md:p-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.l}>
              <div className="font-display text-4xl md:text-5xl text-gradient">{s.v}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const steps = [
  { n: "01", title: "Connect your life", desc: "Bring your tasks, calendars, and habits into a single, calm canvas." },
  { n: "02", title: "Let AI plan", desc: "Your assistant designs the perfect day, balancing focus, energy, and rest." },
  { n: "03", title: "Stay in flow", desc: "Gentle nudges, smart reschedules, and analytics that learn what works for you." },
];

function How() {
  return (
    <section id="how" className="mx-auto max-w-7xl px-4 py-24 md:py-32">
      <motion.div {...fade} className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium text-primary">How it works</p>
        <h2 className="mt-2 font-display text-4xl md:text-5xl">Three steps to your best week.</h2>
      </motion.div>
      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {steps.map((s, i) => (
          <motion.div key={s.n} {...fade} transition={{ ...fade.transition, delay: i * 0.06 }}
            className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-8 shadow-soft">
            <div className="font-display text-6xl text-muted-foreground/30">{s.n}</div>
            <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

const testimonials = [
  { name: "Maya Chen", role: "Founder, Loomly", quote: "FlowPilot is the first productivity tool that actually feels like a teammate. The AI planner is uncanny.", color: "lavender" },
  { name: "Daniel Ortiz", role: "Senior Engineer, Stripe", quote: "It quietly orchestrates my week. I open my laptop and my day is already drafted, beautifully.", color: "mint" },
  { name: "Aisha Khan", role: "PhD Candidate, MIT", quote: "I dropped three apps the week I started using FlowPilot. The focus sessions alone are worth it.", color: "sky" },
];

function Testimonials() {
  return (
    <section id="testimonials" className="mx-auto max-w-7xl px-4 pb-24">
      <motion.div {...fade} className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium text-primary">Loved by makers</p>
        <h2 className="mt-2 font-display text-4xl md:text-5xl">A calm advantage.</h2>
      </motion.div>
      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {testimonials.map((t, i) => (
          <motion.div key={t.name} {...fade} transition={{ ...fade.transition, delay: i * 0.06 }}
            className="rounded-3xl border border-border/60 bg-card p-7 shadow-soft">
            <div className="flex gap-0.5 text-[oklch(0.78_0.13_70)]">
              {Array.from({ length: 5 }).map((_, k) => <Star key={k} className="h-4 w-4 fill-current" />)}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-foreground/85">"{t.quote}"</p>
            <div className="mt-6 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full" style={{ background: `color-mix(in oklab, var(--${t.color}) 70%, white)` }} />
              <div>
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

const faqs = [
  { q: "Is FlowPilot really powered by AI?", a: "Yes. Our adaptive planner uses an LLM-backed engine to score, schedule, and reflow your day based on context." },
  { q: "Can I use it for free?", a: "FlowPilot has a generous free tier including core planning, tasks, and analytics." },
  { q: "Does it work on mobile?", a: "Absolutely. The app is fully responsive and built for touch-first interactions." },
  { q: "What integrations are supported?", a: "Google Calendar, Notion, GitHub, Linear, Slack, and more on the roadmap." },
];

function FAQ() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 pb-24">
      <motion.div {...fade} className="text-center">
        <p className="text-sm font-medium text-primary">Questions</p>
        <h2 className="mt-2 font-display text-4xl md:text-5xl">Good questions, asked often.</h2>
      </motion.div>
      <div className="mt-10 divide-y divide-border rounded-3xl border border-border/60 bg-card shadow-soft">
        {faqs.map((f) => (
          <details key={f.q} className="group p-6">
            <summary className="flex cursor-pointer items-center justify-between text-sm font-medium">
              {f.q}
              <span className="ml-4 grid h-6 w-6 place-items-center rounded-full bg-secondary text-foreground transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-24">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-10 text-center shadow-float md:p-16">
        <div className="absolute inset-0 -z-10 gradient-mesh opacity-80" />
        <h2 className="font-display text-4xl md:text-6xl">Begin your flow.</h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Sign up in seconds. Your AI co-pilot is already drafting your week.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link to="/signup" className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background shadow-float hover:opacity-90">
            Get started free
          </Link>
          <Link to="/app/dashboard" className="rounded-full border border-border bg-white/70 px-6 py-3 text-sm font-medium backdrop-blur hover:bg-white">
            Explore the demo
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card/40">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-10 md:flex-row md:items-center">
        <div>
          <Logo />
          <p className="mt-2 max-w-sm text-xs text-muted-foreground">
            An AI productivity OS for the next generation of makers, students, and operators.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-10 text-xs text-muted-foreground">
          <div className="space-y-2">
            <div className="font-medium text-foreground">Product</div>
            <a href="#features" className="block hover:text-foreground">Features</a>
            <a href="#how" className="block hover:text-foreground">How it works</a>
          </div>
          <div className="space-y-2">
            <div className="font-medium text-foreground">Company</div>
            <a className="block hover:text-foreground">About</a>
            <a className="block hover:text-foreground">Careers</a>
          </div>
          <div className="space-y-2">
            <div className="font-medium text-foreground">Legal</div>
            <a className="block hover:text-foreground">Privacy</a>
            <a className="block hover:text-foreground">Terms</a>
          </div>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © 2026 FlowPilot AI. Designed with intention.
      </div>
    </footer>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <Hero />
      <Features />
      <Stats />
      <How />
      <Testimonials />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}
