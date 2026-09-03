import { useEffect, useMemo, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { BotMessageSquare, ChevronUp } from "lucide-react";
import { ChapterSidebar } from "./ChapterSidebar";
import { ChapterEditor } from "./ChapterEditor";
import { AIActionPanel } from "./ai-write-panel/AIActionPanel";
import {
  useDocumentationStore,
} from "@/lib/stores/documentationStore";
import { getProfile } from "@/lib/repositories/projectRepo";
import { useProjectStore } from "@/lib/stores/projectStore";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Documentation Workspace — chapter/section navigation + TipTap editor
 * + AI Writing Panel (Phase 3).
 */
export function DocumentationPage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const projects = useProjectStore((s) => s.projects);
  const projectId =
    params.projectId ??
    activeProjectId ??
    projects[0]?.id ??
    null;

  const loadedProjectId = useDocumentationStore((s) => s.projectId);
  const loadDocumentation = useDocumentationStore((s) => s.loadDocumentation);
  const chapters = useDocumentationStore((s) => s.chapters);
  const sections = useDocumentationStore((s) => s.sections);
  const selectedSectionId = useDocumentationStore((s) => s.selectedSectionId);

  const project = useMemo(
    () => projects.find((p) => p.id === projectId) ?? null,
    [projects, projectId],
  );
  const projectTitle = project?.title ?? "";
  const profile = useMemo(
    () => (projectId ? getProfile(projectId) : null),
    [projectId],
  );
  const hasProfile = !!(
    profile?.problemStatement ??
    profile?.proposedSystem ??
    profile?.generalObjective
  );

  const [aiOpen, setAiOpen] = useState(false);
  const [pendingInsert, setPendingInsert] = useState<string | null>(null);
  const selectedSection = sections.find((s) => s.id === selectedSectionId);

  useEffect(() => {
    if (projectId && loadedProjectId !== projectId) {
      loadDocumentation(projectId);
    }
  }, [projectId, loadedProjectId, loadDocumentation]);

  if (!projectId) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <ErrorState message="No project selected. Create or open a project first." />
      </div>
    );
  }

  if (loadedProjectId !== projectId || chapters.length === 0) {
    return <LoadingState label="Loading documentation structure…" />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      {/* Chapter navigation */}
      <aside className="shrink-0 overflow-y-auto border-b border-surface-200 bg-white px-3 py-4 dark:border-surface-800 dark:bg-surface-900 lg:w-72 lg:border-b-0 lg:border-r">
        <ChapterSidebar />
      </aside>

      {/* Editor region + bottom AI dock */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface-50 dark:bg-surface-950">
        <div className="min-h-0 min-w-0 flex-1">
          <ChapterEditor
            pendingInsertHtml={pendingInsert}
            onInsertConsumed={() => setPendingInsert(null)}
          />
        </div>

        {/* Bottom AI dock — persistent strip, expands into the AI panel */}
        <div className="shrink-0 border-t border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
              <BotMessageSquare className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden />
              <span className="truncate">
                {selectedSection?.title ?? "No section selected"}
              </span>
            </div>
            <Button size="sm" onClick={() => setAiOpen((v) => !v)}>
              {aiOpen ? "Hide AI assistant" : "AI assistant"}
              <ChevronUp
                className={cn("h-4 w-4 transition-transform", aiOpen ? "rotate-0" : "rotate-180")}
                aria-hidden
              />
            </Button>
          </div>

          {/* Expanded panel */}
          {aiOpen && (
            <div className="max-h-[45vh] overflow-y-auto border-t border-surface-100 p-3 dark:border-surface-800">
              <AIActionPanel
                sectionTitle={selectedSection?.title ?? "Unknown section"}
                sectionHtml={selectedSection?.content ?? ""}
                projectTitle={projectTitle}
                hasProfile={hasProfile}
                onInsert={(html) => setPendingInsert(html)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}