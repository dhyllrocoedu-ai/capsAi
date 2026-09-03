import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BotMessageSquare,
  CheckCircle2,
  Circle,
  CircleDot,
  FileText,
  FolderKanban,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/states";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useAuthStore } from "@/lib/stores/authStore";
import { useProjectStore } from "@/lib/stores/projectStore";
import { useDocumentationStore } from "@/lib/stores/documentationStore";
import { listActivities } from "@/lib/repositories/projectRepo";
import { countWords, greeting, timeAgo } from "@/lib/utils";
import type { SectionStatus } from "@/types";

function StatusIcon({ status }: { status: SectionStatus }) {
  if (status === "complete")
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />;
  if (status === "in_progress")
    return <CircleDot className="h-4 w-4 text-amber-500" aria-hidden />;
  return <Circle className="h-4 w-4 text-surface-300 dark:text-surface-600" aria-hidden />;
}

export function DashboardPage() {
  const navigate = useNavigate({ from: "/app/dashboard" });
  const user = useAuthStore((s) => s.user);
  const projects = useProjectStore((s) => s.projects);
  const loadProjects = useProjectStore((s) => s.loadProjects);
  const activeProject = useProjectStore((s) =>
    s.projects.find((p) => p.id === s.activeProjectId) ?? null,
  );
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const doc = useDocumentationStore();
  const activities = user ? listActivities(user.id, 6) : [];

  useEffect(() => {
    if (user) loadProjects(user.id);
  }, [user, loadProjects]);

  useEffect(() => {
    if (activeProject && doc.projectId !== activeProject.id) {
      doc.loadDocumentation(activeProject.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.id]);

  const totalSections = doc.sections.length;
  const completeSections = doc.sections.filter(
    (s) => s.status === "complete",
  ).length;
  const writtenSections = doc.sections.filter((s) => s.wordCount > 0).length;
  const totalWords = doc.sections.reduce((sum, s) => sum + countWords(s.content), 0);
  const progress =
    totalSections === 0 ? 0 : Math.round((completeSections / totalSections) * 100);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">
          {greeting()}, {user?.fullName.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          Here's where your capstone stands today.
        </p>
      </div>

      {!activeProject ? (
        <Card>
          <EmptyState
            icon={<FolderKanban className="h-6 w-6" />}
            title="No active project yet"
            description="Create your first capstone project to unlock documentation, research, and AI guidance."
            action={
              <Button onClick={() => navigate({ to: "/app/projects" })}>
                <Plus className="h-4 w-4" /> Create project
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {/* Progress overview */}
          <Card>
            <CardHeader
              title={activeProject.title}
              subtitle={`${activeProject.courseProgram || "Program N/A"} · ${activeProject.institution || "Institution N/A"} · AY ${activeProject.academicYear || "—"}`}
              action={
                <Badge
                  tone={
                    activeProject.status === "completed"
                      ? "success"
                      : activeProject.status === "review"
                        ? "warning"
                        : "brand"
                  }
                >
                  {activeProject.status.replace("_", " ")}
                </Badge>
              }
            />
            <CardContent className="space-y-5">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-surface-600 dark:text-surface-300">
                    Documentation progress
                  </span>
                  <span className="text-surface-500">
                    {completeSections}/{totalSections} sections complete ·{" "}
                    {totalWords.toLocaleString()} words
                  </span>
                </div>
                <ProgressBar value={progress} showLabel />
              </div>

              {/* Chapter checklist */}
              <div className="grid gap-1.5 sm:grid-cols-2">
                {doc.chapters.map((ch) => {
                  const chSections = doc.sections.filter(
                    (s) => s.chapterId === ch.id,
                  );
                  return (
                    <button
                      key={ch.id}
                      onClick={() => {
                        setActiveProject(activeProject.id);
                        void navigate({
                          to: "/app/projects/$projectId/documentation",
                          params: { projectId: activeProject.id },
                        });
                      }}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-surface-100 dark:hover:bg-surface-800"
                    >
                      <StatusIcon status={ch.status} />
                      <span className="truncate font-medium">{ch.title}</span>
                      <span className="ml-auto shrink-0 text-surface-400">
                        {chSections.filter((s) => s.status === "complete").length}
                        /{chSections.length}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
                {[
                  {
                    label: "Ask AI Adviser",
                    icon: BotMessageSquare,
                    go: () =>
                      void navigate({
                        to: "/app/projects/$projectId/adviser",
                        params: { projectId: activeProject.id },
                      }),
                    disabled: false,
                  },
                  {
                    label: "Continue Writing",
                    icon: FileText,
                    go: () =>
                      void navigate({
                        to: "/app/projects/$projectId/documentation",
                        params: { projectId: activeProject.id },
                      }),
                    disabled: false,
                  },
                  {
                    label: "Search Research",
                    icon: Search,
                    go: () => undefined,
                    disabled: true,
                  },
                  {
                    label: "Run AI Review",
                    icon: ShieldCheck,
                    go: () => undefined,
                    disabled: true,
                  },
                ].map(({ label, icon: Icon, go, disabled }) => (
                  <button
                    key={label}
                    disabled={disabled}
                    onClick={go}
                    className="flex flex-col items-center gap-2 rounded-xl border border-surface-200 px-3 py-4 text-xs font-medium transition-colors hover:border-brand-300 hover:bg-brand-50/40 disabled:pointer-events-none disabled:opacity-40 dark:border-surface-800 dark:hover:border-brand-800 dark:hover:bg-brand-950/30"
                  >
                    <Icon className="h-5 w-5 text-brand-600 dark:text-brand-400" aria-hidden />
                    {label}
                    {disabled && (
                      <Badge className="mt-0.5">Soon</Badge>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader title="Recent activity" />
            <CardContent>
              {activities.length === 0 ? (
                <p className="py-4 text-center text-xs text-surface-400">
                  Activity will appear here as you work.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {activities.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-4 text-xs"
                    >
                      <span className="truncate text-surface-700 dark:text-surface-300">
                        {a.description}
                      </span>
                      <span className="shrink-0 text-surface-400">
                        {timeAgo(a.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 border-t border-surface-100 pt-3 text-[11px] text-surface-400 dark:border-surface-800">
                {writtenSections > 0
                  ? `${writtenSections} of ${totalSections} sections have content started.`
                  : "Start writing in the Documentation tab to track progress."}
              </p>
            </CardContent>
          </Card>

          {/* All projects shortcut */}
          {projects.length > 1 && (
            <Link
              to="/app/projects"
              className="block text-center text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              View all {projects.length} projects →
            </Link>
          )}
        </>
      )}
    </div>
  );
}
