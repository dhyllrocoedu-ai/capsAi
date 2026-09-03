import type { ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-surface-500 dark:text-surface-400">
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {icon && (
        <div className="rounded-full bg-surface-100 p-4 text-surface-400 dark:bg-surface-800">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
        {title}
      </h3>
      {description && (
        <p className="max-w-sm text-xs text-surface-500 dark:text-surface-400">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="rounded-full bg-red-50 p-3 text-red-500 dark:bg-red-950/60">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </div>
      <p className="max-w-md text-sm text-surface-700 dark:text-surface-300">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function InlineSpinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      {label && <span>{label}</span>}
    </span>
  );
}
