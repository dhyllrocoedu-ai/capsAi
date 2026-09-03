import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, Menu, Moon, Sun } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useAuthStore } from "@/lib/stores/authStore";
import { useProjectStore } from "@/lib/stores/projectStore";
import { cn } from "@/lib/utils";

function useTheme(): [boolean, () => void] {
  const [dark, setDark] = useState<boolean>(() => {
    const saved = window.localStorage.getItem("capsai.theme");
    return saved ? saved === "dark" : true; // dark-first academic theme
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    window.localStorage.setItem("capsai.theme", dark ? "dark" : "light");
  }, [dark]);
  return [dark, () => setDark((d) => !d)];
}

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const activeProject = useProjectStore((s) =>
    s.projects.find((p) => p.id === s.activeProjectId),
  );
  const [dark, toggleTheme] = useTheme();

  const handleLogout = () => {
    logout();
    void navigate({ to: "/login" });
  };

  const initials =
    user?.fullName
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "U";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-surface-200 bg-white/80 px-4 backdrop-blur dark:border-surface-800 dark:bg-surface-900/80">
      <div className="flex items-center gap-3">
        <button
          className="rounded-md p-1.5 text-surface-500 hover:bg-surface-100 lg:hidden dark:hover:bg-surface-800"
          onClick={onMenuClick}
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        {activeProject ? (
          <span
            className="truncate text-sm font-medium text-surface-700 dark:text-surface-200"
            title={activeProject.title}
          >
            {activeProject.title}
          </span>
        ) : (
          <span className="text-sm text-surface-400">No active project</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Badge tone="brand">Local mode</Badge>

        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="rounded-md p-2 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
        >
          {dark ? (
            <Sun className="h-4 w-4" aria-hidden />
          ) : (
            <Moon className="h-4 w-4" aria-hidden />
          )}
        </button>

        <div className="group relative">
          <button
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white",
              "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-surface-900",
            )}
            aria-label="Account menu"
          >
            {initials}
          </button>
          <div className="invisible absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-surface-200 bg-white py-1 opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100 dark:border-surface-700 dark:bg-surface-900">
            <div className="border-b border-surface-100 px-3 py-2 dark:border-surface-800">
              <p className="truncate text-xs font-medium">{user?.fullName}</p>
              <p className="truncate text-[10px] text-surface-400">
                {user?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden /> Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
