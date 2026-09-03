import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "success" | "warning" | "brand" | "danger";

const TONES: Record<BadgeTone, string> = {
  neutral:
    "bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300",
  success:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  warning:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  brand: "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300",
  danger: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
