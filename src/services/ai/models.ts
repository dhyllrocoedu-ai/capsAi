import type { AdviserMode } from "@/types";

/**
 * NVIDIA NIM model catalog (verified active as of 2026-09-03).
 * All earlier llama-3.3 / llama-3.1 / nemotron-3-nano builds reached
 * end-of-life and return 410/430 errors on the NVIDIA API.
 */
export const NIVIDA_MODELS = [
  {
    id: "nvidia/nemotron-3.5-lightning-30b-a3b",
    label: "Nemotron 3.5 Lightning (30B)",
    speed: "fast",
    quality: "medium",
    maxTokens: 4096,
    context: 1_000_000,
    supportsThinking: true,
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b",
    label: "Nemotron 3 Ultra (550B)",
    speed: "slow",
    quality: "high",
    maxTokens: 8192,
    context: 131_072,
    supportsThinking: false,
  },
] as const;

export type ChatModelId = (typeof NIVIDA_MODELS)[number]["id"];

export const DEFAULT_CHAT_MODEL: ChatModelId =
  "nvidia/nemotron-3.5-lightning-30b-a3b";

export const DEFAULT_EMBED_MODEL = "nvidia/nv-embedqa-e5-v5";

/** Per-adviser-mode default models (heavy modes get the frontier model). */
const MODE_MODELS: Record<AdviserMode, ChatModelId> = {
  GENERAL_ADVISER: "nvidia/nemotron-3.5-lightning-30b-a3b",
  CHAPTER_ASSISTANT: "nvidia/nemotron-3.5-lightning-30b-a3b",
  METHODOLOGY_ADVISER: "nvidia/nemotron-3.5-lightning-30b-a3b",
  SYSTEM_ANALYST: "nvidia/nemotron-3-ultra-550b-a55b",
  RRL_ASSISTANT: "nvidia/nemotron-3-ultra-550b-a55b",
  PANEL_REVIEWER: "nvidia/nemotron-3-ultra-550b-a55b",
};

/** Query complexity heuristic — short messages tend to be quick Q&A. */
function estimatePromptLength(messages: Array<{ content: string }>): number {
  return messages.reduce((sum, m) => sum + (m.content?.length ?? 0), 0);
}

/**
 * Resolve which model to use for a request.
 *
 * Priority (Feature #2 — option D, "A+B+C combined"):
 *  1. Explicit override (per-conversation picker)
 *  2. Per-mode default
 *  3. Auto-routing fallback: short/trivial prompts use the fast model,
 *     long prompts use the frontier model.
 */
export function resolveChatModel(
  mode: AdviserMode,
  messages: Array<{ content: string }>,
  override?: string,
): string {
  if (override) return override;
  const defaultForMode = MODE_MODELS[mode] ?? DEFAULT_CHAT_MODEL;

  const len = estimatePromptLength(messages);
  // Long or content-heavy prompts (e.g. generating a chapter section) get
  // the frontier model even in light modes.
  if (len > 2000 && defaultForMode === DEFAULT_CHAT_MODEL) {
    return "nvidia/nemotron-3-ultra-550b-a55b";
  }
  return defaultForMode;
}
