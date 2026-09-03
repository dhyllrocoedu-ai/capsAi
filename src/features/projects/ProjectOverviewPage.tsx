import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  BotMessageSquare,
  ChevronLeft,
  FileText,
  Pencil,
  Target,
  Save,
  X,
  FileCode,
  FileText as FileTextIcon,
  FolderOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ErrorState } from "@/components/ui/states";
import { useProjectStore } from "@/lib/stores/projectStore";
import { emptyProjectProfile } from "@/types";
import {
  listAIGeneratedFiles,
  updateAIGeneratedFileStatus,
  deleteAIGeneratedFile,
} from "@/lib/repositories/aiFileRepo";
import type { AIGeneratedFile } from "@/types";

/**
 * Project Overview — editable basic info + the project knowledge profile
 * (problem → objectives → features → scope) that powers all AI context.
 * The full multi-step wizard arrives in Phase 2; this page already edits
 * the same underlying profile data.
 */
export function ProjectOverviewPage() {
  const { projectId } = useParams({ from: "/app/projects/$projectId" });
  const navigate = useNavigate();
  const projects = useProjectStore((s) => s.projects);
  const updateProject = useProjectStore((s) => s.updateProject);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const project = projects.find((p) => p.id === projectId);

  useEffect(() => {
    if (project) setActiveProject(project.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <ErrorState message="Project not found." onRetry={() => navigate({ to: "/app/projects" })} />
      </div>
    );
  }

  void emptyProjectProfile; // Phase 2 wizard will hydrate the full profile

  const patch = (key: keyof typeof project, value: string) =>
    updateProject(project.id, { [key]: value });

  const [aiFiles, setAiFiles] = useState<AIGeneratedFile[]>([]);

  useEffect(() => {
    setAiFiles(listAIGeneratedFiles(project.id));
  }, [project.id]);

  const acceptFile = (file: AIGeneratedFile) => {
    updateAIGeneratedFileStatus(file.id, "accepted");
    setAiFiles(listAIGeneratedFiles(project.id));
  };

  const rejectFile = (file: AIGeneratedFile) => {
    updateAIGeneratedFileStatus(file.id, "rejected");
    setAiFiles(listAIGeneratedFiles(project.id));
  };

  const removeFile = (file: AIGeneratedFile) => {
    deleteAIGeneratedFile(file.id);
    setAiFiles(listAIGeneratedFiles(project.id));
  };

  const pendingFiles = aiFiles.filter((f: AIGeneratedFile) => f.status === "pending");
  const acceptedFiles = aiFiles.filter((f: AIGeneratedFile) => f.status === "accepted");

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <button
        onClick={() => void navigate({ to: "/app/projects" })}
        className="inline-flex items-center gap-1 text-xs text-surface-500 hover:text-surface-800 dark:hover:text-surface-200"
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> All projects
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{project.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-surface-500">
            <Badge tone="brand">{project.projectType}</Badge>
            <span>{project.institution || "—"}</span>
            <span>·</span>
            <span>{project.courseProgram || "—"}</span>
            <span>·</span>
            <span>{project.academicYear || "—"}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              void navigate({
                to: "/app/projects/$projectId/documentation",
                params: { projectId: project.id },
              })
            }
          >
            <FileText className="h-4 w-4" /> Documentation
          </Button>
          <Button
            size="sm"
            onClick={() =>
              void navigate({
                to: "/app/projects/$projectId/adviser",
                params: { projectId: project.id },
              })
            }
          >
            <BotMessageSquare className="h-4 w-4" /> Ask Adviser
          </Button>
        </div>
      </div>

      {/* Basic info (editable) */}
      <Card>
        <CardHeader
          title="Basic information"
          subtitle="Changes save immediately."
          action={<Pencil className="h-3.5 w-3.5 text-surface-400" aria-hidden />}
        />
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Input
            id="ov-title"
            label="Title"
            defaultValue={project.title}
            onBlur={(e) => e.target.value.trim() && patch("title", e.target.value.trim())}
          />
          <Input
            id="ov-inst"
            label="Institution"
            defaultValue={project.institution}
            onBlur={(e) => patch("institution", e.target.value)}
          />
          <Input
            id="ov-course"
            label="Course / Program"
            defaultValue={project.courseProgram}
            onBlur={(e) => patch("courseProgram", e.target.value)}
          />
          <Select
            aria-label="Status"
            value={project.status}
            onChange={(e) => updateProject(project.id, { status: e.target.value as never })}
          >
            {["planning", "in_progress", "review", "completed"].map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>

      {/* Knowledge profile teaser (full wizard in Phase 2) */}
      <Card>
        <CardHeader
          title="Project knowledge profile"
          subtitle="Problem, objectives, features, and scope feed every AI feature."
        />
        <CardContent className="space-y-4">
          <Textarea
            id="ov-problem"
            label="What problem does your system solve?"
            rows={3}
            disabled
            defaultValue=""
          />
          <p className="flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-[11px] leading-relaxed text-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
            <Target className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            The structured onboarding wizard (problem → solution → objectives → scope →
            methodology) is coming in Phase 2. Your AI Adviser can already help you draft
            these answers — ask it in the chat.
          </p>
          <Link
            to="/app/projects/$projectId/wizard"
            params={{ projectId: project.id }}
            className="block text-center text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            Open project profile wizard →
          </Link>
        </CardContent>
      </Card>

      {/* AI Generated Files */}
      <Card>
        <CardHeader
          title="AI Generated Files"
          subtitle={pendingFiles.length > 0 ? `${pendingFiles.length} awaiting review` : "Files created by the AI Adviser"}
          action={
            pendingFiles.length > 0 && (
              <Badge tone="warning">{pendingFiles.length} pending</Badge>
            )
          }
        />
        <CardContent className="space-y-3">
          {pendingFiles.length === 0 && acceptedFiles.length === 0 && (
            <p className="text-center text-xs text-surface-500 py-4">
              No AI-generated files yet. Ask the Adviser to create code, docs, or research notes — it will offer to save them here.
            </p>
          )}

          {pendingFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-surface-600 dark:text-surface-400">
                Awaiting review
              </p>
              {pendingFiles.map((file: AIGeneratedFile) => (
                <div key={file.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/40">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {file.fileType === "code" ? (
                          <FileCode className="h-3.5 w-3.5 text-brand-600" />
                        ) : file.fileType === "documentation" ? (
                          <FileTextIcon className="h-3.5 w-3.5 text-brand-600" />
                        ) : (
                          <FolderOpen className="h-3.5 w-3.5 text-brand-600" />
                        )}
                        <span className="text-sm font-medium truncate">{file.title}</span>
                        <Badge tone="warning" className="text-[10px]">
                          {file.fileType}
                        </Badge>
                      </div>
                      {file.suggestedPath && (
                        <p className="mt-0.5 truncate text-[11px] text-surface-500">
                          Suggested: {file.suggestedPath}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-surface-500 line-clamp-2">
                        {file.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => rejectFile(file)}
                      >
                        <X className="h-3 w-3" /> Reject
                      </Button>
                      <Button size="sm" onClick={() => acceptFile(file)}>
                        <Save className="h-3 w-3" /> Accept
                      </Button>
                    </div>
                  </div>
                  <details className="mt-2">
                    <summary className="text-[11px] text-surface-500 cursor-pointer">
                      Preview content
                    </summary>
                    <pre className="mt-1.5 rounded bg-surface-100 p-2 text-[10px] overflow-auto max-h-32 dark:bg-surface-800">
                      {file.content.slice(0, 500)}{file.content.length > 500 ? "…" : ""}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          )}

          {acceptedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-surface-600 dark:text-surface-400">
                Accepted ({acceptedFiles.length})
              </p>
              {acceptedFiles.map((file: AIGeneratedFile) => (
                <div
                  key={file.id}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/40"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {file.fileType === "code" ? (
                        <FileCode className="h-3.5 w-3.5 text-emerald-600" />
                      ) : file.fileType === "documentation" ? (
                        <FileTextIcon className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <FolderOpen className="h-3.5 w-3.5 text-emerald-600" />
                      )}
                      <span className="text-sm font-medium truncate">{file.title}</span>
                      <Badge tone="success" className="text-[10px]">
                        {file.fileType}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(file)}
                    >
                      <X className="h-3 w-3" /> Remove
                    </Button>
                  </div>
                  {file.suggestedPath && (
                    <p className="mt-0.5 truncate text-[11px] text-surface-500">
                      Path: {file.suggestedPath}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
