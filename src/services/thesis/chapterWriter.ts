/**
 * Chapter Writer — generates full chapter content with section alternatives
 * Supports generating 3 alternative drafts per section
 */

import type {
  GenerateChapterRequest,
  GenerateChapterResponse,
  SectionAlternative,
  Chapter,
  ChapterSection,
  ProjectProfile,
} from "@/types";
import { STANDARD_CHAPTERS, getSectionTemplates } from "@/types/thesis";
import { buildProjectContext } from "@/services/ai/prompts";
import { getAIProvider } from "@/services/ai";

/** Build system prompt for writing a specific section with a specific approach */
function buildSectionWriterPrompt(
  chapter: Chapter,
  section: ChapterSection,
  approach: string,
  profile: ProjectProfile,
  context: {
    previousSections: string;
    nextSections: string;
  }
): string {
  const chapterInfo = STANDARD_CHAPTERS.find((c) => c.id === chapter.id);
  const chapterTitle = chapterInfo?.title || chapter.title || "Chapter";

  return `You are an expert academic writer helping a student write a section of their capstone thesis.

CHAPTER: ${chapter.number}. ${chapterTitle}
SECTION: ${section.title} (${section.key ?? "section"})
APPROACH: ${approach}

PROJECT CONTEXT:
${buildProjectContext({
  title: profile.title || "",
  problemStatement: profile.problemStatement,
  proposedSystem: profile.proposedSystem,
  primaryUsers: profile.primaryUsers,
  majorFeatures: profile.majorFeatures,
  technologies: profile.technologies,
  generalObjective: profile.objectives?.general || profile.generalObjective || "",
  specificObjectives: profile.objectives?.specific || profile.specificObjectives || [],
  methodology: profile.methodology,
})}

PREVIOUS SECTIONS (for flow):
${context.previousSections || "This is the first section."}

NEXT SECTIONS (for setup):
${context.nextSections || "This is the last section."}

TASK: Write a complete, polished academic section following the "${approach}" approach.

REQUIREMENTS:
- Write in formal academic tone appropriate for Philippine undergraduate capstone
- Use proper paragraph structure with topic sentences
- Include in-text citations where appropriate (use [Author, Year] format)
- Target word count: ${section.wordCount || 400}-${(section.wordCount || 400) + 200} words
- Write as a DRAFT the student can adapt — not final submission
- Do NOT invent statistics, citations, or specific data you cannot verify
- Use standard capstone manuscript structure for Philippine universities
- Maintain logical flow from previous sections and set up next sections
- Where a data summary or comparison fits, include a Markdown TABLE (using | columns |)
- Where a diagram/figure would help, insert a placeholder line like: [FIGURE: caption describing the diagram]
- Insert in-text citation placeholders as [Author, Year] wherever a claim would be evidenced
- End the section with a short one-line transition sentence that sets up the NEXT section

FORMAT:
Return ONLY the section content in Markdown format.
Start with the section heading (e.g., "## Background of the Study").
Do NOT include meta-commentary.`;
}

/** Generate all alternatives for a section */
export async function generateSectionAlternatives(
  chapter: Chapter,
  section: ChapterSection,
  profile: ProjectProfile,
  context: { previousSections: string; nextSections: string },
  approaches: string[] = ["thematic", "chronological", "methodological"]
): Promise<SectionAlternative[]> {
  const provider = getAIProvider();
  const alternatives: SectionAlternative[] = [];

  for (const approach of approaches) {
    const prompt = buildSectionWriterPrompt(chapter, section, approach, profile, context);

    try {
      const response = await provider.chat({
        mode: "CHAPTER_ASSISTANT",
        messages: [
          { role: "system", content: prompt },
          {
            role: "user",
            content: `Write the "${section.title}" section using the ${approach} approach.`,
          },
        ],
        temperature: 0.4,
        maxTokens: 2048,
      });

      const wordCount = response.content.split(/\s+/).length;

      alternatives.push({
        id: `${section.id}-alt-${approach}`,
        label: `${approach.charAt(0).toUpperCase() + approach.slice(1)} ${approaches.indexOf(approach) === 0 ? "(Recommended)" : ""}`,
        content: response.content,
        approach,
        generatedAt: new Date().toISOString(),
        model: "nvidia/nemotron-3-nano-30b-a3b",
        wordCount,
      });
    } catch (e) {
      alternatives.push({
        id: `${section.id}-alt-${approach}-fallback`,
        label: `${approach.charAt(0).toUpperCase() + approach.slice(1)} (Draft)`,
        content: `## ${section.title}\n\n[Draft using ${approach} approach — AI generation temporarily unavailable. Please write this section manually based on the outline.]`,
        approach,
        generatedAt: new Date().toISOString(),
        wordCount: 0,
      });
    }
  }

  return alternatives;
}

/** Generate full chapter with all sections */
export async function generateFullChapter(
  request: GenerateChapterRequest
): Promise<GenerateChapterResponse> {
  const { chapterId, profile, selectedApproaches, includeAlternatives } = request;

  const chapterTitle = STANDARD_CHAPTERS.find((c) => c.id === chapterId)?.title || "Chapter";

  const templates = getSectionTemplates(chapterId);
  const sections: ChapterSection[] = templates.map((t, idx) => ({
    id: `${chapterId}-${t.key}`,
    chapterId,
    orderIndex: idx,
    key: t.key,
    title: t.title,
    description: t.description,
    order: idx,
    alternatives: [],
    selectedAlternativeId: null,
    status: "not_started" as const,
    wordCount: 0,
    updatedAt: new Date().toISOString(),
    content: "",
  }));

  const generatedSections: ChapterSection[] = [];
  const allAlternatives: Record<string, SectionAlternative[]> = {};

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const approach = selectedApproaches[section.key!] || "thematic";

    const previousContent = generatedSections
      .slice(Math.max(0, i - 2), i)
      .map((s) => s.alternatives![0]?.content?.slice(0, 500))
      .join("\n\n---\n\n");

    const nextContent = sections
      .slice(i + 1, i + 3)
      .map((s) => s.title)
      .join(", ");

    if (includeAlternatives) {
      const alternatives = await generateSectionAlternatives(
        { id: chapterId, projectId: chapterId, number: 1, title: chapterTitle, status: "not_started", orderIndex: 0, createdAt: "", updatedAt: "" } as unknown as Chapter,
        section,
        profile,
        { previousSections: previousContent, nextSections: nextContent },
        ["thematic", "chronological", "methodological"]
      );

      const selected = alternatives.find((a) => a.approach === approach) || alternatives[0];

      allAlternatives[section.key!] = alternatives;

      generatedSections.push({
        ...section,
        alternatives,
        selectedAlternativeId: selected.id,
        status: "in_progress",
        wordCount: selected.wordCount,
        updatedAt: new Date().toISOString(),
      });
    } else {
      const prompt = buildSectionWriterPrompt(
        { id: chapterId, projectId: chapterId, number: 1, title: chapterTitle, status: "not_started", orderIndex: 0, createdAt: "", updatedAt: "" } as unknown as Chapter,
        section,
        approach,
        profile,
        { previousSections: previousContent, nextSections: nextContent },
      );

      const provider = getAIProvider();
      try {
        const response = await provider.chat({
          mode: "CHAPTER_ASSISTANT",
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: `Write the "${section.title}" section using the ${approach} approach.` },
          ],
          temperature: 0.4,
          maxTokens: 2048,
        });

        const wordCount = response.content.split(/\s+/).length;
        const alt: SectionAlternative = {
          id: `${section.id}-alt-${approach}`,
          label: approach,
          content: response.content,
          approach,
          generatedAt: new Date().toISOString(),
          wordCount,
        };

        allAlternatives[section.key!] = [alt];

        generatedSections.push({
          ...section,
          alternatives: [alt],
          selectedAlternativeId: alt.id,
          status: "in_progress",
          wordCount,
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        const alt: SectionAlternative = {
          id: `${section.id}-alt-${approach}-fallback`,
          label: approach,
          content: `## ${section.title}\n\n[Draft — AI generation temporarily unavailable.]`,
          approach,
          generatedAt: new Date().toISOString(),
          wordCount: 0,
        };
        allAlternatives[section.key!] = [alt];
        generatedSections.push({
          ...section,
          alternatives: [alt],
          selectedAlternativeId: alt.id,
          status: "in_progress",
          wordCount: 0,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  return {
    sections: generatedSections,
    alternatives: allAlternatives,
  };
}

/** Get available approaches for a section key */
export function getSectionApproaches(sectionKey: string): string[] {
  const approachMap: Record<string, string[]> = {
    background: ["problem-to-solution", "historical-context", "industry-gap"],
    problemStatement: ["general-specific", "gap-oriented", "stakeholder-perspective"],
    objectives: ["hierarchical", "outcome-based", "research-question-aligned"],
    scopeDelimitations: ["inclusion-exclusion", "boundary-mapping", "constraint-based"],
    significance: ["stakeholder-benefits", "theoretical-practical", "impact-levels"],
    definitions: ["alphabetical", "by-concept", "by-importance"],
    theoreticalFramework: ["theory-cluster", "single-theory-deep", "integrated-framework"],
    conceptualFramework: ["input-process-output", "paradigm-diagram", "variable-relationship"],
    relatedStudies: ["thematic", "chronological", "methodological", "geographical"],
    synthesis: ["gap-focused", "thematic-synthesis", "contradiction-highlight"],
    gapAnalysis: ["direct-gap", "multi-gap", "gap-bridging"],
    researchDesign: ["design-justification", "comparative-designs", "paradigm-based"],
    participants: ["sampling-strategy", "demographic-profile", "selection-criteria"],
    instruments: ["instrument-type", "validation-process", "reliability-focus"],
    dataCollection: ["chronological", "phase-based", "ethical-first"],
    dataAnalysis: ["method-per-objective", "statistical-rationale", "software-focused"],
    ethicalConsiderations: ["principle-based", "procedural", "risk-mitigation"],
    findings: ["objective-order", "theme-order", "significance-order"],
    discussion: ["finding-by-finding", "thematic-discussion", "implication-focused"],
    interpretation: ["theoretical-implications", "practical-implications", "policy-implications"],
    summary: ["objective-mapped", "key-findings-first", "narrative-summary"],
    conclusions: ["direct-answers", "generalizations", "theoretical-contributions"],
    recommendations: ["stakeholder-targeted", "priority-ranked", "actionable-steps"],
  };

  return approachMap[sectionKey] || ["thematic", "chronological", "methodological"];
}