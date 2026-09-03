import type {
  AIChatRequest,
  AIChatResponse,
  AIProvider,
  EmbeddingResponse,
} from "@/types";

const MOCK_REPLIES: Record<string, string> = {
  GENERAL_ADVISER: `Thanks for the context. Here are my initial thoughts:

**Strengths I can see**
- Your problem statement has a clear beneficiary.

**Questions before we go further**
1. How is this process handled today, step by step?
2. What measurable outcome would make this project "successful" for your users?

Once you answer those, I can help you sharpen your specific objectives.`,
  CHAPTER_ASSISTANT: `I can help draft this section. Based on your project profile, here is a **suggested outline** (a suggestion — adapt freely):

1. Open with the general problem area
2. Narrow to your specific setting
3. State how the proposed system addresses it

Tell me which part to expand first.`,
  METHODOLOGY_ADVISER: `Given your scope, an iterative methodology fits better than pure Waterfall: you can validate features with users early.

**Suggestion:** consider Prototyping or Agile with 2-week iterations, documenting each iteration for Chapter 3.

Which constraint worries you most — time, skills, or user availability?`,
  SYSTEM_ANALYST: `Feature-to-objective check:

- Objective 1 → covered by core feature set ✓
- Objective 2 → partially covered ⚠ (no feature clearly generates reports)
- Feature "notifications" → no matching objective ✗

Would you like me to propose wording to close these gaps?`,
  RRL_ASSISTANT: `I can't invent sources — but here's what I suggest:

**Search terms to try in the Research tab:** "web-based management system", "records automation", plus your domain keyword.

**Synthesis tip:** group literature by theme (existing systems, methods used, gaps found), not paper-by-paper.`,
  PANEL_REVIEWER: `Panel question simulation:

1. "Your objective says 'efficient' — efficient compared to what? What baseline?"
2. "How will you measure accuracy of the system's output?"
3. "What happens if the internet connection fails during demo?"

Prepare concrete answers to those three.`,
};

function fallbackReply(mode: string, lastUser: string): string {
  return (
    MOCK_REPLIES[mode] ??
    `I'm running in **local mock mode** (no NVIDIA API key configured).

You asked: “${lastUser.slice(0, 140)}”

Add VITE_NVIDIA_API_KEY to .env.local to enable live adviser responses.`
  );
}

/**
 * Deterministic offline provider so the whole UX works without credentials.
 * Clearly surfaced in the UI via a "Mock mode" badge.
 */
export class MockAIProvider implements AIProvider {
  readonly name = "mock";

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    await new Promise((r) => setTimeout(r, 700));
    const lastUser =
      [...request.messages].reverse().find((m) => m.role === "user")?.content ?? "";
    return {
      content: fallbackReply(request.mode, lastUser),
      model: "mock-adviser",
      provider: this.name,
    };
  }

  async embed(texts: string[]): Promise<EmbeddingResponse> {
    return {
      embeddings: texts.map(() => new Array(64).fill(0)),
      model: "mock-embedding",
    };
  }
}
