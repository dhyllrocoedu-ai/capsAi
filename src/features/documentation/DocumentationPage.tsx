import { useEffect, useMemo, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { BotMessageSquare, X } from "lucide-react";
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

      {/* Editor */}
      <div className="min-h-0 min-w-0 flex-1 bg-surface-50 dark:bg-surface-950">
        <ChapterEditor
          pendingInsertHtml={pendingInsert}
          onInsertConsumed={() => setPendingInsert(null)}
        />
      </div>

      {/* AI panel — desktop right rail, toggled by button */}
      {aiOpen && (
        <aside className="hidden min-h-0 w-80 shrink-0 overflow-y-auto border-l border-surface-200 bg-white p-3 dark:border-surface-800 dark:bg-surface-900 lg:block">
          <AIActionPanel
            sectionTitle={selectedSection?.title ?? "Unknown section"}
            sectionHtml={selectedSection?.content ?? ""}
            projectTitle={projectTitle}
            hasProfile={hasProfile}
            onInsert={(html) => setPendingInsert(html)}
          />
        </aside>
      )}

      {/* Toggle — visible on all screen sizes; panel overlays bottom-sheet style on mobile */}
      {!aiOpen && (
        <div className="fixed bottom-6 right-6 z-30 lg:static lg:z-auto lg:mr-3 lg:mt-3 lg:self-start">
          <Button size="sm" onClick={() => setAiOpen(true)}>
            <BotMessageSquare className="h-4 w-4" /> AI Writer
          </Button>
        </div>
      )}
      {aiOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setAiOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">AI Writing Panel</h3>
              <button
                onClick={() => setAiOpen(false)}
                className="rounded-md p-1 text-surface-400 hover:bg-surface-100"
                aria-label="Close AI panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <AIActionPanel
              sectionTitle={selectedSection?.title ?? "Unknown section"}
              sectionHtml={selectedSection?.content ?? ""}
              projectTitle={projectTitle}
              hasProfile={hasProfile}
              onInsert={(html) => setPendingInsert(html)}
            />
          </div>
        </div>
      )}
    </div>
  );
}