import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  BotMessageSquare,
  FileText,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  Settings,
  X,
  FileCode,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/lib/stores/projectStore";

const NAV_ITEMS = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/projects", label: "Projects", icon: FolderKanban },
  { to: "/app/documentation", label: "Documentation", icon: FileText },
  { to: "/app/adviser", label: "AI Adviser", icon: BotMessageSquare },
] as const;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { projectId?: string };
  const projects = useProjectStore((s) => s.projects);
  const activeProject = projects.find(
    (p) => p.id === (params.projectId ?? null),
  );

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-surface-200 bg-white transition-transform dark:border-surface-800 dark:bg-surface-900",
          "lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand */}
        <div className="flex h-14 items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white">
              <GraduationCap className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Capstone AI
            </span>
          </Link>
          <button
            className="rounded-md p-1 text-surface-400 hover:bg-surface-100 lg:hidden dark:hover:bg-surface-800"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Active project context */}
        {activeProject && (
          <button
            onClick={() =>
              navigate({
                to: "/app/projects/$projectId",
                params: { projectId: activeProject.id },
              })
            }
            className="mx-3 mb-2 rounded-lg border border-brand-100 bg-brand-50/60 px-3 py-2.5 text-left transition-colors hover:bg-brand-50 dark:border-brand-950 dark:bg-brand-950/40 dark:hover:bg-brand-950/70"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              Active Project
            </p>
            <p className="mt-0.5 truncate text-xs font-medium text-surface-800 dark:text-surface-100">
              {activeProject.title}
            </p>
          </button>
        )}

        {/* Primary nav — always show global items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}>
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span>{label}</span>
            </NavLink>
          ))}

          {/* Project-scoped shortcuts when a project is active */}
          {activeProject && (
            <>
              <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                This Project
              </p>
              <NavLink
                to="/app/projects/$projectId"
                params={{ projectId: activeProject.id }}
                exact
              >
                <FolderKanban className="h-4 w-4 shrink-0" aria-hidden />
                <span>Overview</span>
              </NavLink>
              <NavLink
                to="/app/projects/$projectId/adviser"
                params={{ projectId: activeProject.id }}
              >
                <BotMessageSquare className="h-4 w-4 shrink-0" aria-hidden />
                <span>Adviser Chat</span>
              </NavLink>
              <NavLink
                to="/app/projects/$projectId/documentation"
                params={{ projectId: activeProject.id }}
              >
                <FileText className="h-4 w-4 shrink-0" aria-hidden />
                <span>Chapters</span>
              </NavLink>
              <NavLink
                to="/app/projects/$projectId/code"
                params={{ projectId: activeProject.id }}
              >
                <FileCode className="h-4 w-4 shrink-0" aria-hidden />
                <span>Code</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-surface-100 p-3 dark:border-surface-800">
          <NavLink to="/app/settings">
            <Settings className="h-4 w-4 shrink-0" aria-hidden />
            <span>Settings</span>
          </NavLink>
        </div>
      </aside>
    </>
  );
}

function NavLink({
  to,
  children,
  exact = false,
  params,
}: {
  to: string;
  children: React.ReactNode;
  exact?: boolean;
  params?: Record<string, string>;
}) {
  return (
    <Link
      to={to}
      params={params}
      activeOptions={{ exact }}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-surface-600 transition-colors hover:bg-surface-100 data-[status=active]:bg-brand-50 data-[status=active]:font-medium data-[status=active]:text-brand-700 dark:text-surface-300 dark:hover:bg-surface-800 dark:data-[status=active]:bg-brand-950/60 dark:data-[status=active]:text-brand-300"
    >
      {children}
    </Link>
  );
}
