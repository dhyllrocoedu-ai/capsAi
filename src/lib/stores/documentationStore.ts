import { create } from "zustand";
import {
  listChapters,
  listSections,
  setSectionStatus,
  updateSectionContent,
} from "@/lib/repositories/projectRepo";
import type { Chapter, ChapterSection, SectionStatus } from "@/types";

interface LoadedDoc {
  chapters: Chapter[];
  sections: ChapterSection[];
}

interface DocumentationState extends LoadedDoc {
  projectId: string | null;
  selectedSectionId: string | null;
  loadDocumentation: (projectId: string) => void;
  selectSection: (sectionId: string) => void;
  saveSectionContent: (
    sectionId: string,
    content: string,
    wordCount: number,
  ) => void;
  changeStatus: (sectionId: string, status: SectionStatus) => void;
}

function computeChapterStatus(
  sections: ChapterSection[],
): Record<string, SectionStatus> {
  const byChapter = new Map<string, SectionStatus[]>();
  for (const s of sections) {
    const arr = byChapter.get(s.chapterId) ?? [];
    arr.push(s.status);
    byChapter.set(s.chapterId, arr);
  }
  const result: Record<string, SectionStatus> = {};
  for (const [chapterId, statuses] of byChapter) {
    if (statuses.every((s) => s === "complete")) result[chapterId] = "complete";
    else if (statuses.some((s) => s !== "not_started"))
      result[chapterId] = "in_progress";
    else result[chapterId] = "not_started";
  }
  return result;
}

export const useDocumentationStore = create<DocumentationState>((set) => ({
  chapters: [],
  sections: [],
  projectId: null,
  selectedSectionId: null,

  loadDocumentation: (projectId) => {
    const chapters = listChapters(projectId);
    const chapterIds = chapters.map((c) => c.id);
    const sections = listSections(chapterIds);
    const statuses = computeChapterStatus(sections);
    const chaptersWithStatus = chapters.map((c) => ({
      ...c,
      status: statuses[c.id] ?? c.status,
    }));
    set({
      projectId,
      chapters: chaptersWithStatus,
      sections,
      selectedSectionId:
        sections.find((s) => s.content)?.id ?? sections[0]?.id ?? null,
    });
  },

  selectSection: (sectionId) => set({ selectedSectionId: sectionId }),

  saveSectionContent: (sectionId, content, wordCount) => {
    const updated = updateSectionContent(sectionId, content, wordCount);
    if (!updated) return;
    set((state) => {
      const sections = state.sections.map((s) =>
        s.id === sectionId ? updated : s,
      );
      const statuses = computeChapterStatus(sections);
      return {
        sections,
        chapters: state.chapters.map((c) => ({
          ...c,
          status: statuses[c.id] ?? c.status,
        })),
      };
    });
  },

  changeStatus: (sectionId, status) => {
    const updated = setSectionStatus(sectionId, status);
    if (!updated) return;
    set((state) => {
      const sections = state.sections.map((s) =>
        s.id === sectionId ? updated : s,
      );
      const statuses = computeChapterStatus(sections);
      return {
        sections,
        chapters: state.chapters.map((c) => ({
          ...c,
          status: statuses[c.id] ?? c.status,
        })),
      };
    });
  },
}));
