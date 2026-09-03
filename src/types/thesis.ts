/**
 * Capstone/Thesis Document Structure
 * Supports standard 5-chapter format + custom chapters
 * Each section can have multiple alternative drafts
 */

import type { ProjectProfile as BaseProjectProfile } from "./project";
import type { Chapter as BaseChapter, ChapterSection as BaseChapterSection } from "./chapter";

/** Standard Philippine capstone chapter structure */
export const STANDARD_CHAPTERS = [
  {
    id: "ch1",
    number: 1,
    title: "Introduction",
    requiredSections: [
      "background",
      "problemStatement",
      "objectives",
      "scopeDelimitations",
      "significance",
      "definitions",
    ],
  },
  {
    id: "ch2",
    number: 2,
    title: "Review of Related Literature",
    requiredSections: [
      "theoreticalFramework",
      "conceptualFramework",
      "relatedStudies",
      "synthesis",
      "gapAnalysis",
    ],
  },
  {
    id: "ch3",
    number: 3,
    title: "Methodology",
    requiredSections: [
      "researchDesign",
      "participants",
      "instruments",
      "dataCollection",
      "dataAnalysis",
      "ethicalConsiderations",
    ],
  },
  {
    id: "ch4",
    number: 4,
    title: "Results and Discussion",
    requiredSections: [
      "findings",
      "discussion",
      "interpretation",
    ],
  },
  {
    id: "ch5",
    number: 5,
    title: "Summary, Conclusions, and Recommendations",
    requiredSections: [
      "summary",
      "conclusions",
      "recommendations",
    ],
  },
] as const;

export type StandardChapterId = (typeof STANDARD_CHAPTERS)[number]["id"];

/** Extended project profile for thesis generation (extends base; thesis-specific fields optional) */
export interface ProjectProfile extends BaseProjectProfile {
  title?: string;
  objectives?: {
    general: string;
    specific: string[];
  };
}

/** A single alternative draft for a section */
export interface SectionAlternative {
  id: string;
  label: string;
  content: string;
  approach: string;
  generatedAt: string;
  model?: string;
  wordCount: number;
}

/** A section within a chapter (chapter.ts fields + optional thesis-specific fields) */
export interface ChapterSection extends BaseChapterSection {
  key?: string;
  description?: string;
  order?: number;
  alternatives?: SectionAlternative[];
  selectedAlternativeId?: string | null;
}

/** A chapter containing sections (chapter.ts fields + optional thesis-specific fields) */
export interface Chapter extends BaseChapter {
  content?: string;
  wordCount?: number;
  templateId?: string;
  sections?: ChapterSection[];
}

/** Custom chapter (user-defined) */
export interface CustomChapter extends Chapter {
  isCustom: true;
}

/** Document-level metadata */
export interface ThesisDocument {
  projectId: string;
  title: string;
  subtitle?: string;
  author: string;
  program: string;
  institution: string;
  year: string;
  chapters: Chapter[];
  customChapters: Chapter[];
  bibliography: BibliographyEntry[];
  settings: DocumentSettings;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentSettings {
  citationStyle: "APA" | "IEEE" | "CHICAGO" | "MLA";
  fontFamily: "Times New Roman" | "Arial" | "Calibri" | "Georgia";
  fontSize: 11 | 12;
  lineSpacing: 1.5 | 2.0;
  margins: "normal" | "narrow" | "wide";
  pageSize: "A4" | "Letter";
  includePageNumbers: boolean;
  includeTOC: boolean;
  includeLOF: boolean;
  includeLOT: boolean;
}

export interface BibliographyEntry {
  id: string;
  type: "journal" | "conference" | "book" | "thesis" | "web" | "other";
  title: string;
  authors: string[];
  year: number;
  venue?: string;
  doi?: string;
  url?: string;
  abstract?: string;
  tags: string[];
  source: "openalex" | "crossref" | "semantic-scholar" | "user-upload" | "manual";
  pdfPath?: string;
  addedAt: string;
}

export interface ChapterTemplate {
  id: string;
  number: number;
  title: string;
  requiredSections: string[];
  description?: string;
}

/** ========================================================================
 * AI Generation Types
 * ======================================================================== */

export interface GenerateAlternativesRequest {
  projectId: string;
  chapterId: string;
  sectionKey: string;
  profile: ProjectProfile;
  existingContent?: string;
  count?: number;
  approaches?: string[];
}

export interface GenerateAlternativesResponse {
  alternatives: SectionAlternative[];
  suggestedApproach: string;
}

export interface GenerateChapterRequest {
  projectId: string;
  chapterId: string;
  profile: ProjectProfile;
  selectedApproaches: Record<string, string>;
  includeAlternatives: boolean;
}

export interface GenerateChapterResponse {
  sections: ChapterSection[];
  alternatives: Record<string, SectionAlternative[]>;
}

/** Comment-thread suggestion */
export interface InlineSuggestion {
  id: string;
  chapterId: string;
  sectionId: string;
  anchorText: string;
  startOffset: number;
  endOffset: number;
  type: "rewrite" | "add" | "remove" | "cite" | "clarify" | "restructure" | "evidence" | "transition";
  severity: "critical" | "major" | "minor" | "style";
  originalText: string;
  suggestedText: string;
  rationale: string;
  alternatives: string[];
  status: "open" | "accepted" | "dismissed";
  createdAt: string;
  createdBy: "ai" | "user";
}

/** Alignment check result */
export interface AlignmentCheck {
  objectiveId: string;
  objectiveText: string;
  coveredIn: {
    chapterId: string;
    sectionId: string;
    coverage: "full" | "partial" | "none";
  }[];
  gaps: string[];
  score: number;
}

/** Panel simulation question */
export interface PanelQuestion {
  id: string;
  persona: "chair" | "methodologist" | "subject-expert" | "statistician";
  question: string;
  category: "scope" | "methodology" | "results" | "contribution" | "ethics" | "presentation";
  difficulty: "easy" | "medium" | "hard";
  suggestedAnswerPoints: string[];
}

/** Citation audit result */
export interface CitationAudit {
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
}

export interface RRLGenerationRequest {
  topic: string;
  subtopics: string[];
  profile: {
    title: string;
    problemStatement: string;
    objectives: { general: string; specific: string[] };
  };
  options: {
    organization: "thematic" | "chronological" | "methodological" | "geographical";
    includeGapAnalysis: boolean;
    maxSourcesPerSubtopic: number;
    yearRange: [number, number];
  };
}

/** ========================================================================
 * Section Templates & Helpers
 * ======================================================================== */

export const SECTION_TEMPLATES: Record<string, { key: string; title: string; description: string; approaches: string[] }[]> = {
  ch1: [
    { key: "background", title: "Background of the Study", description: "Context and rationale for the research", approaches: ["problem-to-solution", "historical-context", "industry-gap"] },
    { key: "problemStatement", title: "Statement of the Problem", description: "Clear, specific problem statements", approaches: ["general-specific", "gap-oriented", "stakeholder-perspective"] },
    { key: "objectives", title: "Objectives of the Study", description: "General and specific objectives (SMART)", approaches: ["hierarchical", "outcome-based", "research-question-aligned"] },
    { key: "scopeDelimitations", title: "Scope and Delimitations", description: "Boundaries: what's included/excluded", approaches: ["inclusion-exclusion", "boundary-mapping", "constraint-based"] },
    { key: "significance", title: "Significance of the Study", description: "Beneficiaries and contribution", approaches: ["stakeholder-benefits", "theoretical-practical", "impact-levels"] },
    { key: "definitions", title: "Definition of Terms", description: "Operational and conceptual definitions", approaches: ["alphabetical", "by-concept", "by-importance"] },
  ],
  ch2: [
    { key: "theoreticalFramework", title: "Theoretical Framework", description: "Theories grounding the study", approaches: ["theory-cluster", "single-theory-deep", "integrated-framework"] },
    { key: "conceptualFramework", title: "Conceptual Framework", description: "Conceptual model with variables", approaches: ["input-process-output", "paradigm-diagram", "variable-relationship"] },
    { key: "relatedStudies", title: "Related Literature and Studies", description: "Review of relevant literature", approaches: ["thematic", "chronological", "methodological", "geographical"] },
    { key: "synthesis", title: "Synthesis of the State of the Art", description: "Integration and critique of reviewed literature", approaches: ["gap-focused", "thematic-synthesis", "contradiction-highlight"] },
    { key: "gapAnalysis", title: "Research Gap", description: "Explicit identification of the gap this study fills", approaches: ["direct-gap", "multi-gap", "gap-bridging"] },
  ],
  ch3: [
    { key: "researchDesign", title: "Research Design", description: "Overall approach (qualitative/quantitative/mixed)", approaches: ["design-justification", "comparative-designs", "paradigm-based"] },
    { key: "participants", title: "Participants/Respondents", description: "Sampling method, size, criteria", approaches: ["sampling-strategy", "demographic-profile", "selection-criteria"] },
    { key: "instruments", title: "Research Instruments", description: "Tools: questionnaires, interviews, observation guides", approaches: ["instrument-type", "validation-process", "reliability-focus"] },
    { key: "dataCollection", title: "Data Collection Procedure", description: "Step-by-step procedure", approaches: ["chronological", "phase-based", "ethical-first"] },
    { key: "dataAnalysis", title: "Data Analysis", description: "Statistical/qualitative methods", approaches: ["method-per-objective", "statistical-rationale", "software-focused"] },
    { key: "ethicalConsiderations", title: "Ethical Considerations", description: "IRB, consent, confidentiality", approaches: ["principle-based", "procedural", "risk-mitigation"] },
  ],
  ch4: [
    { key: "findings", title: "Presentation of Findings", description: "Tables, figures, qualitative excerpts", approaches: ["objective-order", "theme-order", "significance-order"] },
    { key: "discussion", title: "Discussion", description: "Interpretation, comparison with literature", approaches: ["finding-by-finding", "thematic-discussion", "implication-focused"] },
    { key: "interpretation", title: "Interpretation", description: "Meaning and implications", approaches: ["theoretical-implications", "practical-implications", "policy-implications"] },
  ],
  ch5: [
    { key: "summary", title: "Summary of Findings", description: "Concise recap per objective", approaches: ["objective-mapped", "key-findings-first", "narrative-summary"] },
    { key: "conclusions", title: "Conclusions", description: "Answers to problem statements", approaches: ["direct-answers", "generalizations", "theoretical-contributions"] },
    { key: "recommendations", title: "Recommendations", description: "For practice, policy, future research", approaches: ["stakeholder-targeted", "priority-ranked", "actionable-steps"] },
  ],
};

/** Get section templates for a chapter */
export function getSectionTemplates(chapterId: string) {
  return SECTION_TEMPLATES[chapterId] || [];
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

/** Build full thesis document structure */
export function buildThesisDocument(
  projectId: string,
  title: string,
  author: string,
  program: string,
  institution: string
): ThesisDocument {
  const now = new Date().toISOString();
  const chapters = STANDARD_CHAPTERS.map((c) => ({
    id: c.id,
    projectId,
    orderIndex: c.number - 1,
    number: c.number,
    title: c.title,
    templateId: c.id,
    sections: getSectionTemplates(c.id).map((s, idx) => ({
      id: `${c.id}-${s.key}`,
      chapterId: c.id,
      orderIndex: idx,
      key: s.key,
      title: s.title,
      description: s.description,
      order: idx,
      alternatives: [],
      selectedAlternativeId: null,
      status: "not_started" as const,
      wordCount: 0,
      content: "",
      updatedAt: now,
    })),
    status: "not_started" as const,
    createdAt: now,
    updatedAt: now,
    content: "",
    wordCount: 0,
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}