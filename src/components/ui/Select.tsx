import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-lg border border-surface-300 bg-white px-3 text-sm text-surface-900",
        "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20",
        "dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
