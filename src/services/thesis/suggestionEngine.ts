/**
 * Comment-Thread Suggestion System
 * Margin comments with accept/dismiss/rewrite options
 */

import { getAIProvider } from "@/services/ai";

/** Types of suggestions the AI can make */
export const SUGGESTION_TYPES = [
  "rewrite",      // Rephrase for clarity/tone
  "add",          // Add missing content
  "remove",       // Remove redundant/irrelevant
  "cite",         // Add citation
  "clarify",      // Clarify ambiguous statement
  "restructure",  // Reorganize paragraphs
  "evidence",     // Add supporting evidence
  "transition",   // Improve flow between paragraphs
] as const;

export type SuggestionType = (typeof SUGGESTION_TYPES)[number];

/** Generate inline suggestions for a section */
export async function generateInlineSuggestions(
  _chapter: { id: string; title: string; number: number },
  section: {
    id: string;
    title: string;
    content: string;
    key: string;
  },
  profile: {
    title: string;
    problemStatement: string;
    objectives: { general: string; specific: string[] };
    methodology: any;
  }
): Promise<
  {
    id: string;
    type: SuggestionType;
    severity: "critical" | "major" | "minor" | "style";
    anchorText: string;
    startOffset: number;
    endOffset: number;
    originalText: string;
    suggestedText: string;
    rationale: string;
    alternatives: string[];
  }[]
> {
  const content = section.content;
  if (!content || content.length < 100) return [];

  const systemPrompt = `You are an expert academic editor reviewing a capstone thesis section.

SECTION: ${section.title}
CHAPTER CONTEXT: ${profile.title}

TASK: Review the following text and identify specific improvements. Return suggestions as JSON.

FOCUS AREAS:
1. Clarity & Flow - awkward phrasing, unclear antecedents, run-on sentences
2. Academic Tone - informal language, contractions, hedging, first-person
3. Evidence & Citations - unsupported claims, missing citations, weak evidence
4. Structure & Flow - paragraph organization, transitions, topic sentences
5. Alignment - does this support the objectives? consistent with methodology?
5. Formatting - citation format, heading hierarchy, table/figure references

OUTPUT FORMAT (JSON array):
[
  {
    "type": "rewrite|add|remove|cite|clarify|restructure|evidence|transition",
    "severity": "critical|major|minor|style",
    "anchorText": "exact text segment to comment on (5-50 chars)",
    "startOffset": 123,
    "endOffset": 178,
    "originalText": "the exact problematic text",
    "suggestedText": "improved version",
    "rationale": "why this change improves the text",
    "alternatives": ["alternative rewrite 1", "alternative rewrite 2"]
  }
]

RULES:
- Only flag REAL issues, not style preferences
- Anchor text must exist exactly in the provided text
- Offsets are character indices in the full text
- Provide 2-3 alternative rewrites per suggestion
- Max 8 suggestions per section
- Prioritize critical > major > minor > style`;

  const provider = getAIProvider();

  try {
    const response = await provider.chat({
      mode: "PANEL_REVIEWER",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Review this section:\n\n${section.content}`,
        },
      ],
      temperature: 0.2,
      maxTokens: 2048,
    });

    const parsed = JSON.parse(response.content);
    return parsed.map((s: any, i: number) => ({
      ...s,
      id: `sugg-${Date.now()}-${i}`,
      alternatives: s.alternatives || [s.suggestedText],
    }));
  } catch (e) {
    return [];
  }
}

/** Apply a suggestion to content */
export function applySuggestion(
  content: string,
  suggestion: {
    startOffset: number;
    endOffset: number;
    suggestedText: string;
  }
): string {
  return (
    content.slice(0, suggestion.startOffset) +
    suggestion.suggestedText +
    content.slice(suggestion.endOffset)
  );
}

/** Generate all suggestions for a chapter */
export async function generateChapterSuggestions(
  _chapter: { id: string; title: string; number: number },
  sections: { id: string; title: string; content: string; key: string }[],
  profile: any
): Promise<{
  sectionId: string;
  suggestions: {
    id: string;
    type: string;
    severity: "critical" | "major" | "minor" | "style";
    anchorText: string;
    startOffset: number;
    endOffset: number;
    originalText: string;
    suggestedText: string;
    rationale: string;
    alternatives: string[];
  }[];
}[]> {
  const results = [];

  for (const section of sections) {
    if (!section.content || section.content.length < 50) continue;

    const suggestions = await generateInlineSuggestions(
      { id: "", title: "", number: 0 },
      { id: section.id, title: section.title, content: section.content, key: section.key },
      profile
    );

    if (suggestions.length > 0) {
      results.push({ sectionId: section.id, suggestions });
    }
  }

  return results;
}

/** Quick suggestion types for common issues */
export const QUICK_SUGGESTIONS: Record<string, { pattern: RegExp; type: SuggestionType; message: string }> = {
  "contraction": { pattern: /\b(can't|won't|don't|doesn't|isn't|aren't|wasn't|weren't|haven't|hasn't|hadn't|wouldn't|shouldn't|couldn't|mustn't)\b/gi, type: "rewrite", message: "Expand contractions in academic writing" },
  "firstPerson": { pattern: /\b(I|we|my|our|me|us)\b/gi, type: "rewrite", message: "Avoid first person; use passive or 'the researcher'" },
  "hedging": { pattern: /\b(maybe|perhaps|probably|likely|seems|appears|somewhat|fairly|quite|rather)\b/gi, type: "rewrite", message: "Reduce hedging; be more assertive" },
  "informal": { pattern: /\b(a lot|lots of|kind of|sort of|basically|actually|really|very|extremely)\b/gi, type: "rewrite", message: "Use more precise academic vocabulary" },
  "citationNeeded": { pattern: /(studies show|research indicates|evidence suggests|it is known that|it has been found that|previous studies|researchers have found)/gi, type: "cite", message: "Add citation for this claim" },
  "passiveVoice": { pattern: /\b(was|were|been|being|is|are)\s+\w+ed\b/gi, type: "rewrite", message: "Consider active voice for clarity" },
};