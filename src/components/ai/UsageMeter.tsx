import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import { fetchUsage, USAGE_CHANGED_EVENT } from "@/lib/api/ai";
import type { UsageStatus } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Compact daily-quota meter. Reads server truth via /api/ai/usage and
 * refreshes whenever an AI call updates the local mirror.
 */
export function UsageMeter({ className }: { className?: string }) {
  const [usage, setUsage] = useState<UsageStatus | null>(null);

  const load = useCallback(() => {
    void fetchUsage().then(setUsage);
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(USAGE_CHANGED_EVENT, load);
    return () => window.removeEventListener(USAGE_CHANGED_EVENT, load);
  }, [load]);

  if (!usage) return null;

  const pct = usage.limit === 0 ? 100 : Math.min(100, (usage.used / usage.limit) * 100);
  const tone =
    pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-brand-500";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-3 py-1.5 dark:border-surface-700 dark:bg-surface-800",
        className,
      )}
    >
      <Zap
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          pct >= 90
            ? "text-red-500"
            : pct >= 70
              ? "text-amber-500"
              : "text-brand-500 dark:text-brand-400",
        )}
        aria-hidden
      />
      <div className="min-w-[110px]">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-medium tabular-nums text-surface-700 dark:text-surface-200">
            {usage.used}/{usage.limit}
            <span className="ml-1 font-normal text-surface-400">credits today</span>
          </span>
        </div>
        <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
          <div
            className={cn("h-full rounded-full transition-all", tone)}
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={usage.used}
            aria-valuemin={0}
            aria-valuemax={usage.limit}
            aria-label="Daily AI credit usage"
          />
        </div>
      </div>
      {usage.tier === "anon" && (
        <Link
          to="/register"
          className="shrink-0 rounded-md bg-brand-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-brand-700"
        >
          Sign up — 100/day
        </Link>
      )}
    </div>
  );
}

/** Full-block state shown when a QuotaError surfaces in a feature. */
export function QuotaBlockedCard({
  message,
  tier,
  onDismiss,
}: {
  message: string;
  tier?: "anon" | "user";
  onDismiss?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-950/40"
    >
      <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
        Daily AI limit reached
      </p>
      <p className="mt-1 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
        {message} Credits reset at UTC midnight.
      </p>
      <div className="mt-3 flex items-center gap-2">
        {tier !== "user" && (
          <Link
            to="/register"
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
          >
            Create free account — 100 credits/day
          </Link>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
