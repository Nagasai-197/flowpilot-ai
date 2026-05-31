import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background gradient-mesh px-4">
      <div className="max-w-md text-center glass rounded-3xl p-10 shadow-float">
        <h1 className="font-display text-7xl text-foreground">404</h1>
        <h2 className="mt-2 text-lg font-medium text-foreground">Lost in flow</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for drifted somewhere else.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background gradient-mesh px-4">
      <div className="max-w-md text-center glass rounded-3xl p-10 shadow-float">
        <h1 className="font-display text-3xl text-foreground">Something stalled</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A small turbulence — let's try that again.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
          <a href="/" className="inline-flex items-center justify-center rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-accent">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FlowPilot AI — Your AI-Powered Personal Life OS" },
      { name: "description", content: "FlowPilot AI is an intelligent personal life operating system that plans your day, balances your focus, and adapts to how you work." },
      { property: "og:title", content: "FlowPilot AI — Your AI-Powered Personal Life OS" },
      { property: "og:description", content: "Plan, focus, and flow with an AI productivity OS designed for makers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var theme = localStorage.getItem('theme') || 'system';
              var root = document.documentElement;
              root.classList.remove('light', 'dark');
              if (theme === 'dark') {
                root.classList.add('dark');
              } else if (theme === 'light') {
                root.classList.add('light');
              } else {
                var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                root.classList.add(systemDark ? 'dark' : 'light');
              }
            } catch (e) {}
          })();
        ` }} />
      </head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

import { useEffect } from "react";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const activeTheme = localStorage.getItem("theme") || "system";
      if (activeTheme === "system") {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(mediaQuery.matches ? "dark" : "light");
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
