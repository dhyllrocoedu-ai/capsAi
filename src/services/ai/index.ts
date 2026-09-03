import type { AIProvider } from "@/types";
import { MockAIProvider } from "./mock";
import { NvidiaNimProvider } from "./nvidia";

let cached: AIProvider | null = null;

/**
 * Provider factory — single place where the active AI backend is chosen.
 * Falls back to the deterministic mock when no key is configured so the
 * application remains fully usable offline / in CI.
 */
export function getAIProvider(): AIProvider {
  if (cached) return cached;
  const nvidia = new NvidiaNimProvider();
  cached = nvidia.isConfigured ? nvidia : new MockAIProvider();
  return cached;
}

/** Test hook: inject a provider explicitly (used by unit tests). */
export function setAIProvider(provider: AIProvider | null): void {
  cached = provider;
}

export { NvidiaNimProvider } from "./nvidia";
export { MockAIProvider } from "./mock";
export { buildSystemPrompt, buildProjectContext } from "./prompts";
export type { ProjectContextInput } from "./prompts";
