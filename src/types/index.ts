export type { User } from "./user";
export type {
  Project,
  ProjectProfile as BaseProjectProfile,
  ProjectStatus,
  DevelopmentMethodology,
} from "./project";
export { emptyProjectProfile } from "./project";
export type {
  ChapterVersion,
  SectionStatus,
  ActivityEntry,
} from "./chapter";
export { DEFAULT_CHAPTER_STRUCTURE } from "./chapter";
export type {
  AIMessage,
  AIMessageRole,
  AIChatRequest,
  AIChatResponse,
  EmbeddingResponse,
  AIProvider,
  AdviserMode,
  CapstoneReviewResult,
  UsageTier,
  UsageStatus,
} from "./ai";
export type { AdviserConversation } from "./chat";
export type { AIGeneratedFile, CreateAIGeneratedFileInput } from "./aiFile";
export type { VirtualFile, CreateVirtualFileInput } from "./virtualFile";
export type {
  ChapterTemplate,
  StandardChapterId,
  Chapter,
  ChapterSection,
  SectionAlternative,
  ThesisDocument,
  DocumentSettings,
  BibliographyEntry,
  ProjectProfile,
  GenerateAlternativesRequest,
  GenerateAlternativesResponse,
  GenerateChapterRequest,
  GenerateChapterResponse,
  InlineSuggestion,
  AlignmentCheck,
  PanelQuestion,
  CitationAudit,
  RRLGenerationRequest,
} from "./thesis";
export {
  STANDARD_CHAPTERS,
  SECTION_TEMPLATES,
  getSectionTemplates,
  getSectionApproaches,
  buildThesisDocument,
} from "./thesis";
export {
  ADVISER_MODES,
  ADVISER_MODE_LABELS,
  AI_COSTS,
  AI_DAILY_LIMITS,
} from "./ai";
