import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({ className, withWord = true }: { className?: string; withWord?: boolean }) {
  return (
    <Link to="/" className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-primary via-[oklch(0.7_0.14_220)] to-[oklch(0.78_0.12_160)] shadow-soft">
        <span className="block h-3 w-3 rounded-[4px] bg-white/95" />
        <span className="absolute inset-0 rounded-xl ring-1 ring-white/40" />
      </span>
      {withWord && (
        <span className="font-display text-base font-bold tracking-tight">
          FlowPilot <span className="text-muted-foreground">AI</span>
        </span>
      )}
    </Link>
  );
}
