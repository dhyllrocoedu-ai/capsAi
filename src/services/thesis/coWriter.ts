/**
 * Co-Writer Engine — Sentence completion, paragraph continuation, rewrite selection
 */

import type { ProjectProfile } from "@/types";
import { buildProjectContext } from "@/services/ai/prompts";
import { getAIProvider } from "@/services/ai";

/** Sentence completion — returns 3 completions for the current partial sentence */
export async function completeSentence(
  context: {
    precedingText: string;      // last ~500 chars before cursor
    followingText?: string;     // text after cursor (optional)
    chapterTitle: string;
    sectionTitle: string;
    sectionKey: string;
  },
  profile: ProjectProfile
): Promise<string[]> {
  const systemPrompt = `You are an academic co-writer completing sentences for a capstone thesis.

CHAPTER: ${context.chapterTitle}
SECTION: ${context.sectionTitle} (${context.sectionKey})

PROJECT:
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

TEXT BEFORE CURSOR (last 500 chars):
${context.precedingText.slice(-500)}

${context.followingText ? `TEXT AFTER CURSOR (first 200 chars):\n${context.followingText.slice(0, 200)}` : ""}

TASK: Complete the current sentence naturally. Return 3 distinct completions as JSON array.
RULES:
- Match academic tone (formal, precise, third-person)
- Maintain consistency with preceding context
- Don't repeat what's already written
- Each completion should be 1-2 sentences
- No markdown, just plain text

OUTPUT: ["completion 1", "completion 2", "completion 3"]`;

  const provider = getAIProvider();

  try {
    const response = await provider.chat({
      mode: "CHAPTER_ASSISTANT",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Complete the sentence." },
      ],
      temperature: 0.5,
      maxTokens: 256,
    });

    const parsed = JSON.parse(response.content);
    return Array.isArray(parsed) ? parsed : [response.content.trim()];
  } catch (e) {
    return [
      "This approach provides a systematic way to address the identified gaps.",
      "The proposed method builds upon established principles in the field.",
      "Further validation will be conducted in subsequent phases.",
    ];
  }
}

/** Paragraph continuation — generates the next logical paragraph */
export async function continueParagraph(
  context: {
    currentParagraph: string;    // full text of current paragraph
    precedingParagraphs: string[]; // last 2-3 paragraphs
    chapterTitle: string;
    sectionTitle: string;
    sectionKey: string;
  },
  _profile: ProjectProfile
): Promise<string[]> {
  const systemPrompt = `You are an academic co-writer continuing a paragraph in a capstone thesis.

CHAPTER: ${context.chapterTitle}
SECTION: ${context.sectionTitle} (${context.sectionKey})

PRECEDING PARAGRAPHS:
${context.precedingParagraphs.slice(-3).join("\n\n")}

CURRENT PARAGRAPH (to continue from):
${context.currentParagraph}

TASK: Write the next logical paragraph that flows naturally from the current one.
Return 2 distinct continuations as JSON array.
RULES:
- Academic tone, third-person, formal
- Logical flow from current paragraph
- Advance the argument or add supporting detail
- 4-6 sentences per continuation
- No markdown

OUTPUT: ["continuation 1", "continuation 2"]`;

  const provider = getAIProvider();

  try {
    const response = await provider.chat({
      mode: "CHAPTER_ASSISTANT",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Continue the paragraph." },
      ],
      temperature: 0.5,
      maxTokens: 512,
    });

    const parsed = JSON.parse(response.content);
    return Array.isArray(parsed) ? parsed : [response.content.trim()];
  } catch (e) {
    return [
      "Furthermore, this approach aligns with the established methodology outlined in the previous chapter.",
      "The implications of these findings extend beyond the immediate scope of the study.",
    ];
  }
}

/** Rewrite selection — rewrite highlighted text in different styles */
export type RewriteStyle = "formal" | "concise" | "academic" | "simple" | "persuasive" | "technical";

export async function rewriteSelection(
  text: string,
  style: RewriteStyle,
  context: {
    chapterTitle: string;
    sectionTitle: string;
    sectionKey: string;
  },
  _profile: ProjectProfile
): Promise<string[]> {
  const stylePrompts: Record<RewriteStyle, string> = {
    formal: "Rewrite in formal academic style with precise terminology and complex sentence structures",
    concise: "Rewrite concisely without losing meaning; eliminate redundancy and wordiness",
    academic: "Rewrite in standard academic style with proper citations placeholders and hedging where appropriate",
    simple: "Rewrite in plain language while maintaining accuracy; suitable for broader audience",
    persuasive: "Rewrite to emphasize benefits and significance; stronger rhetorical force",
    technical: "Rewrite with precise technical terminology; assume expert audience",
  };

  const systemPrompt = `You are an academic rewriter. Rewrite the given text in the specified style.

CONTEXT: ${context.chapterTitle} > ${context.sectionTitle}

REWRITE STYLE: ${stylePrompts[style]}

ORIGINAL TEXT:
${text}

TASK: Return 3 rewritten versions as JSON array.
RULES:
- Preserve all factual content and meaning
- Match the requested style exactly
- Maintain academic integrity (no invented facts)
- Each version should be distinct in approach
- No markdown, plain text only

OUTPUT: ["version 1", "version 2", "version 3"]`;

  const provider = getAIProvider();

  try {
    const response = await provider.chat({
      mode: "CHAPTER_ASSISTANT",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Rewrite the text." },
      ],
      temperature: 0.6,
      maxTokens: 512,
    });

    const parsed = JSON.parse(response.content);
    return Array.isArray(parsed) ? parsed : [response.content.trim()];
  } catch (e) {
    return [
      text, // fallback
      `Rewritten (${style}): ${text}`,
      `Alternative (${style}): ${text}`,
    ];
  }
}

/** Expand bullet points into full paragraphs */
export async function expandBullets(
  bullets: string[],
  context: {
    chapterTitle: string;
    sectionTitle: string;
  },
  _profile: ProjectProfile
): Promise<string[]> {
  const systemPrompt = `You are an academic writer expanding bullet points into full paragraphs.

CHAPTER: ${context.chapterTitle}
SECTION: ${context.sectionTitle}

BULLET POINTS:
${bullets.map((b, i) => `${i + 1}. ${b}`).join("\n")}

TASK: Expand each bullet into a full academic paragraph (3-5 sentences).
Return as JSON array where each element corresponds to a bullet.
RULES:
- Academic tone, third-person
- Add supporting detail and context
- Maintain logical flow between expanded paragraphs
- No markdown`;

  const provider = getAIProvider();

  try {
    const response = await provider.chat({
      mode: "CHAPTER_ASSISTANT",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Expand the bullets." },
      ],
      temperature: 0.4,
      maxTokens: 1024,
    });

    const parsed = JSON.parse(response.content);
    return Array.isArray(parsed) ? parsed : [response.content.trim()];
  } catch (e) {
    return bullets.map((b) => `Expanded: ${b}`);
  }
}

/** Summarize a section into key points */
export async function summarizeSection(
  content: string,
  context: {
    chapterTitle: string;
    sectionTitle: string;
  }
): Promise<{ summary: string; keyPoints: string[] }> {
  const systemPrompt = `Summarize the following academic section into a concise summary and 5 key points.

SECTION: ${context.sectionTitle} (${context.chapterTitle})

CONTENT:
${content}

OUTPUT JSON:
{
  "summary": "2-3 sentence summary",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"]
}`;

  const provider = getAIProvider();

  try {
    const response = await provider.chat({
      mode: "PANEL_REVIEWER",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Summarize this section." },
      ],
      temperature: 0.2,
      maxTokens: 512,
    });

    return JSON.parse(response.content);
  } catch (e) {
    return {
      summary: "Summary unavailable.",
      keyPoints: ["Summary generation failed."],
    };
  }
}

/** Generate transition between two sections */
export async function generateTransition(
  fromSection: { title: string; content: string; key: string },
  toSection: { title: string; content: string; key: string },
  _profile: ProjectProfile
): Promise<string[]> {
  const systemPrompt = `Write a transition paragraph connecting two thesis sections.

FROM: ${fromSection.title} (${fromSection.key})
LAST PARAGRAPH: ${fromSection.content.slice(-500)}

TO: ${toSection.title} (${toSection.key})
FIRST PARAGRAPH: ${toSection.content.slice(0, 500)}

TASK: Write 2-3 transition paragraphs that bridge these sections naturally.
Return 2 options as JSON array.
RULES:
- Academic tone
- Explicitly link the topics
- Forward-looking to next section
- 2-3 sentences each`;

  const provider = getAIProvider();

  try {
    const response = await provider.chat({
      mode: "CHAPTER_ASSISTANT",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate transition." },
      ],
      temperature: 0.4,
      maxTokens: 512,
    });

    const parsed = JSON.parse(response.content);
    return Array.isArray(parsed) ? parsed : [response.content.trim()];
  } catch (e) {
    return [
      `Having discussed ${fromSection.title.toLowerCase()}, we now turn to ${toSection.title.toLowerCase()}.`,
      `This leads naturally to the examination of ${toSection.title.toLowerCase()}.`,
    ];
  }
}