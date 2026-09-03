/**
 * Review Dashboard — Alignment Matrix, Panel Simulation, Citation Audit
 */

import type {
  AlignmentCheck,
  BibliographyEntry,
  Chapter,
  ProjectProfile,
} from "@/types";
import { buildProjectContext } from "@/services/ai/prompts";
import { getAIProvider } from "@/services/ai";

/** 1. ALIGNMENT MATRIX — Objectives ↔ Chapters/Sections */
export async function generateAlignmentMatrix(
  chapters: Chapter[],
  profile: ProjectProfile
): Promise<AlignmentCheck[]> {
  const specificObjectives = profile.objectives?.specific || profile.specificObjectives || [];
  if (!specificObjectives.length) return [];

  const allSections = chapters.flatMap((ch) =>
    (ch.sections || []).map((s) => ({
      chapterId: ch.id,
      chapterTitle: ch.title,
      chapterNumber: ch.number,
      sectionId: s.id,
      sectionTitle: s.title,
      sectionKey: s.key,
      content: (s.alternatives || []).find((a) => a.id === s.selectedAlternativeId)?.content || "",
    }))
  );

  const systemPrompt = `You are an academic alignment auditor. Map each specific objective to the thesis sections that address it.

OBJECTIVES:
${specificObjectives.map((o, i) => `${i + 1}. ${o}`).join("\n")}

SECTIONS:
${allSections.map((s, i) => `${i + 1}. [Ch${s.chapterNumber}] ${s.sectionTitle} (${s.sectionKey})\n${s.content.slice(0, 800)}`).join("\n\n---\n\n")}

OUTPUT JSON:
[
  {
    "objectiveId": "obj-1",
    "objectiveText": "full objective text",
    "coveredIn": [
      {
        "chapterId": "ch1",
        "sectionId": "ch1-background",
        "coverage": "full|partial|none"
      }
    ],
    "gaps": ["specific gap descriptions"],
    "score": 85
  }
]

SCORING: 100=fully addressed with evidence, 75=partially addressed, 50=mentioned, 25=implied, 0=not addressed`;

  const provider = getAIProvider();

  try {
    const response = await provider.chat({
      mode: "PANEL_REVIEWER",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate alignment matrix." },
      ],
      temperature: 0.2,
      maxTokens: 3072,
    });

    return JSON.parse(response.content);
  } catch (e) {
    // Fallback: basic keyword matching
    return specificObjectives.map((obj, i) => ({
      objectiveId: `obj-${i}`,
      objectiveText: obj,
      coveredIn: [],
      gaps: ["Alignment analysis requires AI generation"],
      score: 0,
    }));
  }
}

/** 2. PANEL SIMULATION — AI role-plays defense panel */
const PANEL_PERSONAS = [
  {
    id: "chair",
    name: "Panel Chair",
    focus: ["scope", "contribution", "presentation"],
    style: "authoritative but fair; asks big-picture questions",
  },
  {
    id: "methodologist",
    name: "Methodology Expert",
    focus: ["methodology", "ethics"],
    style: "technical; probes design validity, sampling, analysis rigor",
  },
  {
    id: "subject-expert",
    name: "Subject Matter Expert",
    focus: ["scope", "results", "contribution"],
    style: "domain-focused; checks technical accuracy, relevance",
  },
  {
    id: "statistician",
    name: "Statistician",
    focus: ["methodology", "results"],
    style: "quantitative; probes statistical assumptions, power, tests",
  },
];

export async function generatePanelQuestions(
  chapters: Chapter[],
  profile: ProjectProfile,
  questionCount: number = 12
): Promise<{
  id: string;
  persona: "chair" | "methodologist" | "subject-expert" | "statistician";
  question: string;
  category: "scope" | "methodology" | "results" | "contribution" | "ethics" | "presentation";
  difficulty: "easy" | "medium" | "hard";
  suggestedAnswerPoints: string[];
}[]> {
  const systemPrompt = `You are simulating a capstone defense panel. Generate realistic questions.

PANEL COMPOSITION:
${PANEL_PERSONAS.map((p) => `- ${p.name} (${p.id}): ${p.style}`).join("\n")}

THESIS CONTEXT:
Title: ${buildProjectContext({ title: "", problemStatement: "", proposedSystem: "", primaryUsers: "", majorFeatures: [], technologies: [], generalObjective: "", specificObjectives: [], methodology: null })}
Problem: ${profile.problemStatement}
Objectives: ${(profile.objectives?.specific || profile.specificObjectives || []).join("; ")}
Methodology: ${JSON.stringify(profile.methodology)}

CHAPTERS AVAILABLE:
${chapters.map((c) => `Ch${c.number}: ${c.title} - ${(c.sections || []).map((s) => s.title).join(", ")}`).join("\n")}

GENERATE ${questionCount} questions across all personas and categories.

OUTPUT JSON:
[
  {
    "id": "q1",
    "persona": "chair|methodologist|subject-expert|statistician",
    "question": "Full question text",
    "category": "scope|methodology|results|contribution|ethics|presentation",
    "difficulty": "easy|medium|hard",
    "suggestedAnswerPoints": ["key point 1", "key point 2", "key point 3"]
  }
]

DIFFICULTY GUIDE:
- easy: factual recall, basic scope
- medium: justification, interpretation
- hard: critique, alternative approaches, limitations

DISTRIBUTION: ~3 easy, 6 medium, 3 hard per 12 questions.`;

  const provider = getAIProvider();

  try {
    const response = await provider.chat({
      mode: "PANEL_REVIEWER",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate ${questionCount} panel questions.` },
      ],
      temperature: 0.5,
      maxTokens: 3072,
    });

    return JSON.parse(response.content);
  } catch (e) {
    return generateFallbackQuestions(profile);
  }
}

function generateFallbackQuestions(profile: ProjectProfile) {
  const questions = [
    {
      id: "q1",
      persona: "chair" as const,
      question: `What is the primary contribution of your study on "${profile.title}"?`,
      category: "contribution" as const,
      difficulty: "easy" as const,
      suggestedAnswerPoints: ["Novelty vs existing solutions", "Practical impact", "Academic contribution"],
    },
    {
      id: "q2",
      persona: "methodologist" as const,
      question: `How did you justify your choice of ${profile.methodology || "your research design"}?`,
      category: "methodology" as const,
      difficulty: "medium" as const,
      suggestedAnswerPoints: ["Alignment with objectives", "Comparison with alternatives", "Feasibility"],
    },
    {
      id: "q3",
      persona: "statistician" as const,
      question: `What statistical tests did you use and why were they appropriate?`,
      category: "methodology" as const,
      difficulty: "medium" as const,
      suggestedAnswerPoints: ["Test assumptions", "Power analysis", "Alternative tests considered"],
    },
    {
      id: "q4",
      persona: "subject-expert" as const,
      question: `How does your proposed system address the specific problem of ${profile.problemStatement.slice(0, 100)}?`,
      category: "scope" as const,
      difficulty: "medium" as const,
      suggestedAnswerPoints: ["Direct problem-solution mapping", "Feature-problem alignment", "Scope boundaries"],
    },
    {
      id: "q5",
      persona: "chair" as const,
      question: `What are the limitations of your study and how do they affect your conclusions?`,
      category: "contribution" as const,
      difficulty: "hard" as const,
      suggestedAnswerPoints: ["Internal validity threats", "External validity limits", "Future work needed"],
    },
  ];
  return questions;
}

/** 3. CITATION AUDIT */
export async function generateCitationAudit(
  chapters: Chapter[],
  bibliography: any[],
  _profile: ProjectProfile
): Promise<{
  missingCitations: {
    claim: string;
    location: { chapterId: string; sectionId: string; text: string };
    suggestedSources: BibliographyEntry[];
  }[];
  weakClaims: {
    claim: string;
    location: { chapterId: string; sectionId: string; text: string };
    reason: string;
  }[];
  outdatedSources: {
    entry: BibliographyEntry;
    newerAlternatives: BibliographyEntry[];
  }[];
  duplicateCitations: BibliographyEntry[];
  formattingIssues: {
    entry: BibliographyEntry;
    issue: string;
  }[];
}> {
  const allContent = chapters.flatMap((ch) =>
    (ch.sections || []).map((s) => ({
      chapterId: ch.id,
      sectionId: s.id,
      text: (s.alternatives || []).find((a) => a.id === s.selectedAlternativeId)?.content || "",
    }))
  );

  const systemPrompt = `You are a citation auditor for an academic thesis. Identify issues.

BIBLIOGRAPHY (${bibliography.length} entries):
${bibliography.map((b, i) => `${i + 1}. ${b.authors.join(", ")} (${b.year}). ${b.title}. ${b.venue || ""}. ${b.doi || b.url || ""}`).join("\n")}

THESIS CONTENT:
${allContent.map((s) => `[${s.chapterId}] ${s.text.slice(0, 1500)}`).join("\n\n---\n\n")}

OUTPUT JSON:
{
  "missingCitations": [
    {
      "claim": "unsupported claim text",
      "location": { "chapterId": "ch2", "sectionId": "ch2-relatedStudies", "text": "surrounding context" },
      "suggestedSources": [ { "id": "bib-1", "title": "...", "authors": [...], "year": 2023, "type": "journal" } ]
    }
  ],
  "weakClaims": [
    {
      "claim": "vague claim",
      "location": { "chapterId": "ch4", "sectionId": "ch4-findings", "text": "context" },
      "reason": "why this is weak"
    }
  ],
  "outdatedSources": [
    { "entry": { "id": "bib-5", "title": "...", "year": 2015 }, "newerAlternatives": [ { "id": "bib-20", "title": "...", "year": 2023 } ] }
  ],
  "duplicateCitations": [],
  "formattingIssues": [
    { "entry": { "id": "bib-3" }, "issue": "missing DOI" }
  ]
}

CHECK FOR:
- Claims without citations (especially "studies show", "research indicates")
- Vague/weasel words without evidence
- Sources older than 5 years (unless seminal)
- Duplicate bibliography entries
- APA/IEEE formatting: DOI, capitalization, italics, punctuation`;

  const provider = getAIProvider();

  try {
    const response = await provider.chat({
      mode: "PANEL_REVIEWER",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Audit citations." },
      ],
      temperature: 0.1,
      maxTokens: 3072,
    });

    return JSON.parse(response.content);
  } catch (e) {
    return {
      missingCitations: [],
      weakClaims: [],
      outdatedSources: [],
      duplicateCitations: [],
      formattingIssues: [],
    };
  }
}