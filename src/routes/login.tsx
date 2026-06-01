import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { api } from "../lib/api";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — FlowPilot AI" }] }),
  component: Login,
});

function Login() {
  return <AuthScreen mode="login" />;
}

export function AuthScreen({ mode }: { mode: "login" | "signup" }) {
  const isLogin = mode === "login";
  const navigate = useNavigate();
  const { login, signup, loading: authLoading } = useAuth();

  // Local Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please fill in all required credentials.");
      return;
    }
    if (!isLogin && !fullName.trim()) {
      setErrorMsg("Full name is required for registration.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      if (isLogin) {
        const { data, error } = await login(email, password);
        if (error) {
          setErrorMsg(error);
          toast.error(error);
        } else if (data) {
          toast.success("Successfully logged in!");
          navigate({ to: "/app/dashboard" });
        }
      } else {
        const { data, error } = await signup(email, password, fullName);
        if (error) {
          setErrorMsg(error);
          toast.error(error);
        } else if (data) {
          toast.success("Account registered successfully!");
          if (data.session) {
            navigate({ to: "/app/dashboard" });
          } else {
            toast.info("Please check your email inbox to confirm registration.");
            navigate({ to: "/login" });
          }
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/app/dashboard`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      const msg = err.message || "Failed to initialize Google authentication.";
      setErrorMsg(msg);
      toast.error(msg);
      setGoogleLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    setErrorMsg(null);
    try {
      const email = "demo@flowpilot.ai";
      const password = "demoflowpilot";
      
      // 1. Try to login
      let res = await login(email, password);
      
      // 2. If it fails, try to sign up and then login
      if (res.error) {
        if (res.error.toLowerCase().includes("credentials") || res.error.toLowerCase().includes("not found")) {
          // Register the demo account
          const signupRes = await signup(email, password, "Demo Pilot");
          if (signupRes.error) {
            throw new Error(signupRes.error);
          }
          // Login again after signup
          res = await login(email, password);
          if (res.error) {
            throw new Error(res.error);
          }
        } else {
          throw new Error(res.error);
        }
      }

      if (res.data) {
        toast.success("Welcome to Demo Mode! 🎓");
        
        // 3. Immediately trigger /demo/enable to seed the data!
        try {
          await api.post("/demo/enable");
          toast.success("Demo Workspace seeded successfully! ✨");
        } catch (err: any) {
          console.error("Failed to seed demo data:", err);
          // Don't block login if seeding fails (e.g. database already seeded)
        }
        
        navigate({ to: "/app/dashboard" });
      }
    } catch (err: any) {
      const msg = err?.message || err || "Failed to enter Demo Mode.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setDemoLoading(false);
    }
  };

  const isPending = loading || authLoading || googleLoading || demoLoading;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fafafa] px-4 py-12 dark:bg-[#09090b]">
      {/* Dynamic Background Mesh */}
      <div className="absolute inset-0 -z-10 gradient-mesh opacity-30" />
      <div className="absolute inset-0 -z-10 grid-bg opacity-25 [mask-image:radial-gradient(ellipse_at_center,black,transparent_60%)]" />

      <div className="w-full max-w-[420px] space-y-6">
        {/* Logo Section */}
        <div className="flex justify-center">
          <Logo />
        </div>

        {/* Minimalist Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl border border-border/50 bg-white p-8 shadow-soft dark:bg-card"
        >
          {/* Header Typography */}
          <div className="space-y-1.5">
            <h1 className="font-display text-[32px] font-bold tracking-tight text-foreground">
              {isLogin ? "Welcome Back" : "Create your account"}
            </h1>
            <p className="text-sm font-normal text-muted-foreground">
              {isLogin
                ? "Sign in to your FlowPilot workspace."
                : "Create your AI-powered workspace in seconds."}
            </p>
          </div>

          {/* Validation Error Message */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 overflow-hidden rounded-xl border border-red-200/40 bg-red-500/10 px-4 py-2.5 text-xs font-normal text-red-600 dark:text-red-400"
            >
              {errorMsg}
            </motion.div>
          )}

          {/* Input Form Fields */}
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {!isLogin && (
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Full name</span>
                <input
                  type="text"
                  required
                  placeholder="Maya Chen"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-4 py-2.5 text-sm font-normal outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/40 focus:ring-4 focus:ring-primary/10 disabled:opacity-60"
                />
              </label>
            )}
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Email</span>
              <input
                type="email"
                required
                placeholder="you@flow.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending}
                className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-4 py-2.5 text-sm font-normal outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/40 focus:ring-4 focus:ring-primary/10 disabled:opacity-60"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Password</span>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
                className="w-full rounded-xl border border-border bg-white/80 dark:bg-zinc-900/50 px-4 py-2.5 text-sm font-normal outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/40 focus:ring-4 focus:ring-primary/10 disabled:opacity-60"
              />
            </label>

            {/* Email Sign In Pill Button */}
            <button
              type="submit"
              disabled={isPending}
              className="group mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#09090b] py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 cursor-pointer dark:bg-foreground dark:text-background"
            >
              {isPending && !googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isLogin ? (
                "Sign in"
              ) : (
                "Create account"
              )}
              {!isPending && (
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              )}
            </button>
          </form>

          {/* Branded Separator */}
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground/60 font-normal">
            <span className="h-px flex-1 bg-border/60" /> or <span className="h-px flex-1 bg-border/60" />
          </div>

          {/* Demo Mode Instant Login */}
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isPending}
            className="mb-3.5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-[oklch(0.75_0.13_220)] py-3.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 cursor-pointer shadow-lg shadow-primary/25 border border-primary/20"
          >
            {demoLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <Sparkles className="h-4 w-4 text-white animate-pulse" />
            )}
            {demoLoading ? "Preparing Demo Workspace..." : "Explore with Demo Mode (Instant)"}
          </button>

          {/* Dedicated Branded Google Login */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border/80 bg-card py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-60 cursor-pointer"
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
            )}
            {googleLoading ? "Connecting to Google..." : "Sign in with Google"}
          </button>

          {/* Navigation Links */}
          <p className="mt-6 text-center text-xs font-normal text-muted-foreground">
            {isLogin ? "New to FlowPilot? " : "Already have an account? "}
            <Link
              to={isLogin ? "/signup" : "/login"}
              className="font-semibold text-foreground underline-offset-2 hover:underline"
            >
              {isLogin ? "Create an account" : "Sign in"}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
