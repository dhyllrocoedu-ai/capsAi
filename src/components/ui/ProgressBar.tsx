import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number; // 0..100
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  size = "md",
  showLabel = false,
  className,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn(
          "flex-1 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-800",
          size === "sm" ? "h-1.5" : "h-2.5",
        )}
      >
        <div
          className="h-full rounded-full bg-brand-600 transition-all duration-500 dark:bg-brand-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="w-9 text-right text-xs font-medium tabular-nums text-surface-600 dark:text-surface-300">
          {pct}%
        </span>
      )}
    </div>
  );
}
