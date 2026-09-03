import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-surface-200 bg-white shadow-sm dark:border-surface-800 dark:bg-surface-900",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-surface-100 px-5 py-4 dark:border-surface-800">
      <div>
        <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}
