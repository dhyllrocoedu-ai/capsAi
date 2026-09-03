/**
 * Builds the AI-side documentation context from stored chapters & sections.
 * Provides the adviser with awareness of what the student has actually written.
 */
import { listChapters, listSections } from "@/lib/repositories/projectRepo";
import type { DocumentContextInput } from "@/services/ai/prompts";

const SNIPPET_LENGTH = 600;

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildDocumentContext(projectId: string): DocumentContextInput {
  const chapters = listChapters(projectId);
  const allSections = listSections(chapters.map((c) => c.id));

  let totalWords = 0;
  const chapterBlocks = chapters
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((ch) => {
      const chSections = allSections
        .filter((s) => s.chapterId === ch.id)
        .sort((a, b) => a.orderIndex - b.orderIndex);
      const sectionMeta = chSections.map((s) => {
        totalWords += s.wordCount ?? 0;
        return {
          title: s.title,
          status: s.status,
          wordCount: s.wordCount ?? 0,
          snippet: stripHtml(s.content ?? "").slice(0, SNIPPET_LENGTH),
        };
      });
      return {
        number: ch.number,
        title: ch.title,
        sections: sectionMeta,
      };
    });

  return { totalWords, chapters: chapterBlocks };
}
