export type AIMessageRole = "system" | "user" | "assistant";

export interface AIMessage {
  id: string;
  role: AIMessageRole;
  content: string;
  createdAt: string;
}

export const ADVISER_MODES = [
  "GENERAL_ADVISER",
  "CHAPTER_ASSISTANT",
  "METHODOLOGY_ADVISER",
  "SYSTEM_ANALYST",
  "RRL_ASSISTANT",
  "PANEL_REVIEWER",
] as const;

export type AdviserMode = (typeof ADVISER_MODES)[number];

export const ADVISER_MODE_LABELS: Record<AdviserMode, string> = {
  GENERAL_ADVISER: "General Adviser",
  CHAPTER_ASSISTANT: "Chapter Assistant",
  METHODOLOGY_ADVISER: "Methodology Adviser",
  SYSTEM_ANALYST: "System Analyst",
  RRL_ASSISTANT: "RRL Assistant",
  PANEL_REVIEWER: "Panel Reviewer",
};

export interface AIChatRequest {
  messages: Array<{ role: AIMessageRole; content: string }>;
  mode: AdviserMode;
  temperature?: number;
  maxTokens?: number;
  /** Optional explicit model override (per-conversation picker). */
  model?: string;
}

export interface AIChatResponse {
  content: string;
  model: string;
  provider: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
}

/**
 * Provider abstraction — the application must never depend on one
 * vendor's SDK directly. Swap implementations here.
 */
export interface AIProvider {
  readonly name: string;
  chat(request: AIChatRequest): Promise<AIChatResponse>;
  embed(texts: string[]): Promise<EmbeddingResponse>;
}

/** Structured review output consumed by the Review dashboard (Phase 7). */
export interface CapstoneReviewResult {
  score: number;
  summary: string;
  criticalIssues: string[];
  warnings: string[];
  suggestions: string[];
  strengths: string[];
}

// ---------------------------------------------------------------------------
// Usage quota — weighted credits, server-enforced, daily reset
// ---------------------------------------------------------------------------

/** Credit cost of each AI action. Reviews are the most expensive. */
export const AI_COSTS = { chat: 1, generate: 3, review: 5 } as const;
export type AICostKey = keyof typeof AI_COSTS;

export type UsageTier = "anon" | "user";

/** Daily weighted-credit allowance per tier. */
export const AI_DAILY_LIMITS: Record<UsageTier, number> = { anon: 10, user: 100 };

export interface UsageStatus {
  tier: UsageTier;
  used: number;
  limit: number;
  remaining: number;
  /** ISO timestamp of the next daily reset (UTC midnight). */
  resetsAt: string;
}
