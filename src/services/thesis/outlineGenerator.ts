/**
 * Outline Generator — creates chapter outlines with alternative structures
 * Uses the project profile to generate context-aware outlines with multiple approaches
 */

import type {
  StandardChapterId,
  Chapter,
  ProjectProfile,
  ThesisDocument,
} from "@/types";
import { STANDARD_CHAPTERS } from "@/types";
import { buildProjectContext } from "@/services/ai/prompts";
import { getAIProvider } from "@/services/ai";

/** Default section templates for each standard chapter */
const SECTION_TEMPLATES: Record<string, { key: string; title: string; description: string; approaches: string[] }[]> = {
  ch1: [
    {
      key: "background",
      title: "Background of the Study",
      description: "Context and rationale for the research",
      approaches: ["problem-to-solution", "historical-context", "industry-gap"],
    },
    {
      key: "problemStatement",
      title: "Statement of the Problem",
      description: "Clear, specific problem statements (general + specific)",
      approaches: ["general-specific", "gap-oriented", "stakeholder-perspective"],
    },
    {
      key: "objectives",
      title: "Objectives of the Study",
      description: "General and specific objectives (SMART)",
      approaches: ["hierarchical", "outcome-based", "research-question-aligned"],
    },
    {
      key: "scopeDelimitations",
      title: "Scope and Delimitations",
      description: "Boundaries: what's included/excluded",
      approaches: ["inclusion-exclusion", "boundary-mapping", "constraint-based"],
    },
    {
      key: "significance",
      title: "Significance of the Study",
      description: "Beneficiaries and contribution",
      approaches: ["stakeholder-benefits", "theoretical-practical", "impact-levels"],
    },
    {
      key: "definitions",
      title: "Definition of Terms",
      description: "Operational and conceptual definitions",
      approaches: ["alphabetical", "by-concept", "by-importance"],
    },
  ],
  ch2: [
    {
      key: "theoreticalFramework",
      title: "Theoretical Framework",
      description: "Theories grounding the study",
      approaches: ["theory-cluster", "single-theory-deep", "integrated-framework"],
    },
    {
      key: "conceptualFramework",
      title: "Conceptual Framework",
      description: "Conceptual model with variables",
      approaches: ["input-process-output", "paradigm-diagram", "variable-relationship"],
    },
    {
      key: "relatedStudies",
      title: "Related Literature and Studies",
      description: "Review of relevant literature (local & foreign)",
      approaches: ["thematic", "chronological", "methodological", "geographical"],
    },
    {
      key: "synthesis",
      title: "Synthesis of the State of the Art",
      description: "Integration and critique of reviewed literature",
      approaches: ["gap-focused", "thematic-synthesis", "contradiction-highlight"],
    },
    {
      key: "gapAnalysis",
      title: "Research Gap",
      description: "Explicit identification of the gap this study fills",
      approaches: ["direct-gap", "multi-gap", "gap-bridging"],
    },
  ],
  ch3: [
    {
      key: "researchDesign",
      title: "Research Design",
      description: "Overall approach (qualitative/quantitative/mixed)",
      approaches: ["design-justification", "comparative-designs", "paradigm-based"],
    },
    {
      key: "participants",
      title: "Participants/Respondents",
      description: "Sampling method, size, criteria",
      approaches: ["sampling-strategy", "demographic-profile", "selection-criteria"],
    },
    {
      key: "instruments",
      title: "Research Instruments",
      description: "Tools: questionnaires, interviews, observation guides",
      approaches: ["instrument-type", "validation-process", "reliability-focus"],
    },
    {
      key: "dataCollection",
      title: "Data Collection Procedure",
      description: "Step-by-step procedure",
      approaches: ["chronological", "phase-based", "ethical-first"],
    },
    {
      key: "dataAnalysis",
      title: "Data Analysis",
      description: "Statistical/qualitative methods",
      approaches: ["method-per-objective", "statistical-rationale", "software-focused"],
    },
    {
      key: "ethicalConsiderations",
      title: "Ethical Considerations",
      description: "IRB, consent, confidentiality",
      approaches: ["principle-based", "procedural", "risk-mitigation"],
    },
  ],
  ch4: [
    {
      key: "findings",
      title: "Presentation of Findings",
      description: "Tables, figures, qualitative excerpts",
      approaches: ["objective-order", "theme-order", "significance-order"],
    },
    {
      key: "discussion",
      title: "Discussion",
      description: "Interpretation, comparison with literature",
      approaches: ["finding-by-finding", "thematic-discussion", "implication-focused"],
    },
    {
      key: "interpretation",
      title: "Interpretation",
      description: "Meaning and implications",
      approaches: ["theoretical-implications", "practical-implications", "policy-implications"],
    },
  ],
  ch5: [
    {
      key: "summary",
      title: "Summary of Findings",
      description: "Concise recap per objective",
      approaches: ["objective-mapped", "key-findings-first", "narrative-summary"],
    },
    {
      key: "conclusions",
      title: "Conclusions",
      description: "Answers to problem statements",
      approaches: ["direct-answers", "generalizations", "theoretical-contributions"],
    },
    {
      key: "recommendations",
      title: "Recommendations",
      description: "For practice, policy, future research",
      approaches: ["stakeholder-targeted", "priority-ranked", "actionable-steps"],
    },
  ],
};

/** Build system prompt for outline generation */
function buildOutlineSystemPrompt(chapterId: StandardChapterId, profile: ProjectProfile): string {
  const chapter = STANDARD_CHAPTERS.find((c) => c.id === chapterId);
  const chapterTitle = chapter?.title || "Chapter";
  
  return `You are an expert academic capstone adviser helping a student create a detailed outline for Chapter ${chapter?.number}: ${chapterTitle}.

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

TASK: Generate a detailed outline for this chapter with 3 alternative structural approaches for EACH section.

For each section, provide:
1. Section title and description
2. 3 alternative approaches with:
   - Approach name (e.g., "Thematic (Recommended)", "Chronological", "Methodological")
   - Brief rationale for when to use this approach
   - 4-6 bullet points of what content goes in this approach
   - Estimated word count range

OUTPUT FORMAT (JSON):
{
  "chapterId": "ch1",
  "chapterTitle": "Introduction",
  "sections": [
    {
      "key": "background",
      "title": "Background of the Study",
      "description": "Context and rationale for the research",
      "approaches": [
        {
          "label": "Problem-to-Solution (Recommended)",
          "approach": "problem-to-solution",
          "rationale": "Best when the problem is well-defined and solution is novel",
          "points": [
            "Current state of the problem domain",
            "Existing solutions and their limitations",
            "Why a new approach is needed",
            "How this study's solution addresses the gap"
          ],
          "wordCountRange": "400-600"
        },
        {
          "label": "Historical Context",
          "approach": "historical-context",
          "rationale": "Best when problem has evolved over time",
          "points": [
            "Historical evolution of the problem",
            "Key milestones and turning points",
            "Current state and emerging trends",
            "Position of this study in the timeline"
          ],
          "wordCountRange": "350-550"
        },
        {
          "label": "Industry Gap",
          "approach": "industry-gap",
          "rationale": "Best for applied/capstone projects with industry partners",
          "points": [
            "Current industry practices",
            "Identified pain points or inefficiencies",
            "Cost/impact of the gap",
            "How this project bridges the gap"
          ],
          "wordCountRange": "400-600"
        }
      ]
    }
    // ... repeat for each section
  ]
}

RULES:
- Generate exactly 3 approaches per section
- Mark one as "(Recommended)" with clear rationale
- Approaches must be structurally different, not just wording changes
- Word count ranges should be realistic for undergraduate capstone
- Tailor all content to the specific project profile provided`;
}

/** Generate outline with alternatives for a chapter */
export async function generateChapterOutline(
  chapterId: StandardChapterId,
  profile: ProjectProfile
): Promise<{
  chapterId: StandardChapterId;
  chapterTitle: string;
  sections: {
    key: string;
    title: string;
    description: string;
    approaches: {
      label: string;
      approach: string;
      rationale: string;
      points: string[];
      wordCountRange: string;
    }[];
  }[];
}> {
  const systemPrompt = buildOutlineSystemPrompt(chapterId, profile);
  const provider = getAIProvider();

  const response = await provider.chat({
    mode: "SYSTEM_ANALYST",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Generate the detailed outline with 3 alternatives per section for Chapter: ${STANDARD_CHAPTERS.find(c => c.id === chapterId)?.title}. Return ONLY valid JSON.`,
      },
    ],
    temperature: 0.3,
    maxTokens: 4096,
  });

  try {
    const parsed = JSON.parse(response.content);
    return parsed;
  } catch (e) {
    // Fallback to template-based outline
    return buildTemplateOutline(chapterId);
  }
}

/** Fallback template-based outline */
function buildTemplateOutline(chapterId: StandardChapterId) {
  const templates = SECTION_TEMPLATES[chapterId] || [];
  const chapter = STANDARD_CHAPTERS.find((c) => c.id === chapterId);

  return {
    chapterId,
    chapterTitle: chapter?.title || "Chapter",
    sections: templates.map((t) => ({
      key: t.key,
      title: t.title,
      description: t.description,
      approaches: t.approaches.map((a, i) => ({
        label: `${a.charAt(0).toUpperCase() + a.slice(1)} ${i === 0 ? "(Recommended)" : ""}`,
        approach: a,
        rationale: `Standard ${a} approach for this section type`,
        points: [
          "Key point 1 for this approach",
          "Key point 2 for this approach",
          "Key point 3 for this approach",
          "Key point 4 for this approach",
        ],
        wordCountRange: "300-500",
      })),
    })),
  };
}

/** Build full thesis document structure with all chapters */
export function buildThesisDocument(
  projectId: string,
  title: string,
  author: string,
  program: string,
  institution: string
): ThesisDocument {
  const now = new Date().toISOString();
  const chapters: Chapter[] = STANDARD_CHAPTERS.map((c, cIdx) => ({
    id: c.id,
    projectId,
    number: c.number,
    title: c.title,
    templateId: c.id,
    orderIndex: cIdx,
    sections: SECTION_TEMPLATES[c.id]?.map((s, idx) => ({
      id: `${c.id}-${s.key}`,
      chapterId: c.id,
      key: s.key,
      title: s.title,
      description: s.description,
      order: idx,
      orderIndex: idx,
      content: "",
      alternatives: [],
      selectedAlternativeId: null,
      status: "not_started" as const,
      wordCount: 0,
      updatedAt: new Date().toISOString(),
    })) || [],
    status: "not_started" as const,
    createdAt: now,
    updatedAt: now,
  }));

  return {
    projectId,
    title,
    subtitle: "",
    author,
    program,
    institution,
    year: new Date().getFullYear().toString(),
    chapters,
    customChapters: [],
    bibliography: [],
    settings: {
      citationStyle: "APA",
      fontFamily: "Times New Roman",
      fontSize: 12,
      lineSpacing: 1.5,
      margins: "normal",
      pageSize: "A4",
      includePageNumbers: true,
      includeTOC: true,
      includeLOF: false,
      includeLOT: false,
    },
    createdAt: now,
    updatedAt: now,
  };
}

/** Get section template for a chapter */
export function getSectionTemplates(chapterId: StandardChapterId) {
  return SECTION_TEMPLATES[chapterId] || [];
}