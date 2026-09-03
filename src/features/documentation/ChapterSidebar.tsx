import { CheckCircle2, Circle, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDocumentationStore } from "@/lib/stores/documentationStore";
import { countWords } from "@/lib/utils";
import type { SectionStatus } from "@/types";

function StatusIcon({ status }: { status: SectionStatus }) {
  if (status === "complete")
    return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />;
  if (status === "in_progress")
    return <CircleDot className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />;
  return <Circle className="h-3.5 w-3.5 shrink-0 text-surface-300 dark:text-surface-600" aria-hidden />;
}

export function ChapterSidebar() {
  const chapters = useDocumentationStore((s) => s.chapters);
  const sections = useDocumentationStore((s) => s.sections);
  const selectedSectionId = useDocumentationStore((s) => s.selectedSectionId);
  const selectSection = useDocumentationStore((s) => s.selectSection);

  return (
    <nav aria-label="Chapters" className="space-y-4">
      {chapters.map((chapter) => {
        const chSections = sections.filter((s) => s.chapterId === chapter.id);
        return (
          <div key={chapter.id}>
            <div className="mb-1 flex items-center gap-2 px-1">
              <StatusIcon status={chapter.status} />
              <h3 className="truncate text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
                {chapter.title}
              </h3>
            </div>
            <ul className="space-y-0.5">
              {chSections.map((section) => (
                <li key={section.id}>
                  <button
                    onClick={() => selectSection(section.id)}
                    data-active={selectedSectionId === section.id}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md px-3 py-1.5 text-left text-xs transition-colors",
                      "hover:bg-surface-100 dark:hover:bg-surface-800",
                      selectedSectionId === section.id
                        ? "bg-brand-50 font-medium text-brand-800 dark:bg-brand-950/60 dark:text-brand-200"
                        : "text-surface-600 dark:text-surface-300",
                    )}
                  >
                    <span className="truncate">{section.title}</span>
                    {section.wordCount > 0 && (
                      <span className="shrink-0 tabular-nums text-[10px] text-surface-400">
                        {countWords(section.content)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
