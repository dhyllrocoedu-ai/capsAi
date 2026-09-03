/**
 * functions/api/_handlers/ai.ts
 *
 * Server-side AI handlers for Capstone AI.
 *
 * Designed to run inside Cloudflare Pages Functions (or Workers).
 * All secrets (NVIDIA_API_KEY) stay server-side — never exposed to the browser.
 *
 * Local testing: auth is skipped when Supabase env vars are absent;
 * the handlers rely on the caller being trusted. Wrap behind CF
 * access-control or a lightweight token check before production.
 */

import type {
  AIChatRequest,
  AIChatResponse,
  CapstoneReviewResult,
} from "../../../src/types";
import {
  buildSystemPrompt,
  buildProjectContext,
  type ProjectContextInput,
} from "../../../src/services/ai/prompts";
import {
  addUsage,
  COSTS,
  getUsage,
  quotaExceededResponse,
  withUsage,
} from "./quota";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

function serverError(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}

function cors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return new Response(response.body, { status: response.status, headers });
}

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------

type Env = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  NVIDIA_API_KEY?: string;
  NVIDIA_CHAT_MODEL?: string;
};

/**
 * Extracts a Supabase access token from the Authorization header and
 * verifies it by calling Supabase's /auth/v1/user endpoint.
 *
 * Returns the user id on success, null when absent/unverified.
 * null is NOT an error — anonymous callers are allowed under a smaller
 * daily quota (see ./quota.ts).
 * Skips verification if Supabase env vars are not set (local dev mode).
 */
export async function requireUserId(
  request: Request,
  env: Env,
): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // Local dev mode: accept any non-empty token.
    return "local-user";
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { id?: string };
    return data.id ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// NVIDIA proxy (centralized)
// ---------------------------------------------------------------------------

const DEFAULT_CHAT_MODEL = "meta/llama-3.3-70b-instruct";

interface ChatMessage {
  role: string;
  content: string;
}

async function nvidiaChat(
  messages: ChatMessage[],
  mode: string,
  env: Env,
  signal?: AbortSignal,
): Promise<AIChatResponse> {
  const apiKey = env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY is not configured on the server.");
  }

  const model = env.NVIDIA_CHAT_MODEL ?? DEFAULT_CHAT_MODEL;

  const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      top_p: 0.9,
      max_tokens: 2048,
      stream: false,
    }),
    signal,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`NVIDIA error ${res.status}: ${detail.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI provider returned an empty response.");

  void mode;
  return {
    content,
    model,
    provider: "nvidia-nim",
  };
}

// ---------------------------------------------------------------------------
// Shared chat-request parsing
// ---------------------------------------------------------------------------

async function parseChatRequest(
  request: Request,
): Promise<{ messages: ChatMessage[]; mode?: string } | Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const parsed = body as AIChatRequest;
  if (!parsed?.messages?.length) return badRequest("messages array is required.");

  const ctx = (parsed as { projectContext?: ProjectContextInput }).projectContext;
  const systemContent = ctx
    ? [buildSystemPrompt(parsed.mode ?? "GENERAL_ADVISER"), buildProjectContext(ctx)].join("\n\n")
    : buildSystemPrompt(parsed.mode ?? "GENERAL_ADVISER");

  const messages: ChatMessage[] = [
    { role: "system", content: systemContent },
    ...parsed.messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  return { messages, mode: parsed.mode };
}

// ---------------------------------------------------------------------------
// Handler: POST /api/ai/chat
// ---------------------------------------------------------------------------

export async function handleAIChat(
  request: Request,
  env: Env,
): Promise<Response> {
  const userId = await requireUserId(request, env);

  const parsed = await parseChatRequest(request);
  if (parsed instanceof Response) return cors(parsed);

  const usage = await getUsage(env, request, userId);
  if (usage.remaining < COSTS.chat) return cors(quotaExceededResponse(usage));

  try {
    const response = await nvidiaChat(parsed.messages, parsed.mode ?? "GENERAL_ADVISER", env);
    const charged = await addUsage(env, request, userId, COSTS.chat);
    return cors(withUsage(new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }), charged));
  } catch (err) {
    return cors(serverError(err instanceof Error ? err.message : "Chat failed."));
  }
}

// ---------------------------------------------------------------------------
// Handler: POST /api/ai/chat/stream  (SSE)
// ---------------------------------------------------------------------------

export async function handleAIChatStream(
  request: Request,
  env: Env,
): Promise<Response> {
  const userId = await requireUserId(request, env);

  const parsed = await parseChatRequest(request);
  if (parsed instanceof Response) return cors(parsed);

  const usage = await getUsage(env, request, userId);
  if (usage.remaining < COSTS.chat) return cors(quotaExceededResponse(usage));

  const apiKey = env.NVIDIA_API_KEY;
  if (!apiKey) return cors(serverError("NVIDIA_API_KEY is not configured on the server."));

  const model = env.NVIDIA_CHAT_MODEL ?? DEFAULT_CHAT_MODEL;

  let upstream: globalThis.Response;
  try {
    upstream = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: parsed.messages,
        temperature: 0.4,
        top_p: 0.9,
        max_tokens: 2048,
        stream: true,
      }),
    });
  } catch (err) {
    return cors(serverError(err instanceof Error ? err.message : "Upstream fetch failed."));
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return cors(serverError(`NVIDIA error ${upstream.status}: ${detail.slice(0, 200)}`));
  }

// Upstream accepted — charge the caller before streaming begins.
  const charged = await addUsage(env, request, userId, COSTS.chat);

  // Re-emit upstream OpenAI-style SSE chunks as simple {delta} events.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";
  const source = upstream.body;

  const push = (obj: unknown) =>
    encoder.encode(`data: ${JSON.stringify(obj)}\n\n`);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = source.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const json = JSON.parse(data) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(push({ delta }));
            } catch {
              // skip malformed upstream line
            }
          }
        }
      } finally {
        controller.close();
        reader.releaseLock();
      }
    },
  });

  return cors(withUsage(new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  }), charged));
}

  // ---------------------------------------------------------------------------
  // Handler: POST /api/ai/wizard-suggest
// ---------------------------------------------------------------------------

export async function handleWizardSuggest(
  request: Request,
  env: Env,
): Promise<Response> {
  const userId = await requireUserId(request, env);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return cors(badRequest("Invalid JSON body."));
  }

  const parsed = body as {
    currentProfile: Record<string, unknown>;
    step?: string;
    action: "analyze" | "autofill" | "questions";
  };

  if (!parsed?.currentProfile) return cors(badRequest("currentProfile is required."));
  if (!parsed?.action) return cors(badRequest("action is required."));

  const usage = await getUsage(env, request, userId);
  if (usage.remaining < COSTS.wizard) return cors(quotaExceededResponse(usage));

  const systemPrompt = `You are an expert capstone adviser helping a student fill out their project knowledge profile wizard. 

CURRENT PROFILE STATE:
${JSON.stringify(parsed.currentProfile, null, 2)}

CURRENT STEP: ${parsed.step || "unknown"}
ACTION: ${parsed.action}

${parsed.action === "analyze" 
  ? `TASK: Analyze the current profile and provide specific suggestions for improvement.
OUTPUT JSON FORMAT:
{
  "analysis": {
    "strengths": string[],
    "gaps": string[],
    "fieldSuggestions": { fieldName: { suggestedValue: string, reasoning: string } }
  }
}`
  : parsed.action === "autofill"
  ? `TASK: Fill in ALL missing/empty fields with reasonable academic values based on the provided context.
Only return fields that are currently empty or have placeholder values.
OUTPUT JSON FORMAT:
{
  "autofill": { fieldName: { value: string, reasoning: string } }
}`
  : `TASK: Generate 3-5 clarifying questions to help the student improve their profile.
Each question should have 3-4 specific, clickable answer choices.
OUTPUT JSON FORMAT:
{
  "questions": [
    {
      "field": "fieldName",
      "question": "Clear question text",
      "choices": [
        { "label": "Choice 1", "value": "Value for field" },
        { "label": "Choice 2", "value": "Value for field" },
        { "label": "Choice 3", "value": "Value for field" }
      ]
    }
  ]
}`}

IMPORTANT: Return ONLY valid JSON. No extra prose.`;

  try {
    const response = await nvidiaChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Please provide ${parsed.action} suggestions for the wizard profile.` },
      ],
      "GENERAL_ADVISER",
      env,
    );

    let parsedResult: any;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      parsedResult = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Failed to parse AI response" };
    } catch {
      parsedResult = { error: "Failed to parse AI response" };
    }

    const charged = await addUsage(env, request, userId, COSTS.wizard);
    return cors(withUsage(new Response(JSON.stringify(parsedResult), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }), charged));
  } catch (err) {
    return cors(serverError(err instanceof Error ? err.message : "Wizard suggestion failed."));
  }
}
        }
        push("[DONE]");
      } catch (err) {
        push({ error: err instanceof Error ? err.message : "stream failed" });
        push("[DONE]");
      } finally {
        controller.close();
        reader.releaseLock();
      }
    },
  });

  return cors(withUsage(new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  }), charged));
}

// ---------------------------------------------------------------------------
// Handler: POST /api/ai/generate
// ---------------------------------------------------------------------------

export async function handleAIGenerate(
  request: Request,
  env: Env,
): Promise<Response> {
  const userId = await requireUserId(request, env);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return cors(badRequest("Invalid JSON body."));
  }

  const parsed = body as {
    projectContext: ProjectContextInput;
    sectionTitle: string;
    mode?: string;
    instructions?: string;
  };

  if (!parsed?.sectionTitle) return cors(badRequest("sectionTitle is required."));
  if (!parsed.projectContext) return cors(badRequest("projectContext is required."));

  const usage = await getUsage(env, request, userId);
  if (usage.remaining < COSTS.generate) return cors(quotaExceededResponse(usage));

  const system = [
    buildSystemPrompt("CHAPTER_ASSISTANT"),
    buildProjectContext(parsed.projectContext),
    "TASK: Write a full first draft for the section the student named.",
    `SECTION TITLE: "${parsed.sectionTitle}"`,
    parsed.instructions ? `STUDENT INSTRUCTIONS: ${parsed.instructions}` : "",
    "RULES:",
    "- Present your output as a suggested draft the student can adapt.",
    "- Do not invent statistics, real names, or citations you cannot verify.",
    "- Use standard capstone manuscript structure appropriate to Philippine universities.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await nvidiaChat(
      [
        { role: "system", content: system },
        { role: "user", content: "Please write the draft now." },
      ],
      "CHAPTER_ASSISTANT",
      env,
    );
    const charged = await addUsage(env, request, userId, COSTS.generate);

    const fullTurn = {
      system,
      user: "Please write the draft now.",
      assistant: response.content,
    };

    return cors(withUsage(new Response(JSON.stringify(fullTurn), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }), charged));
  } catch (err) {
    return cors(serverError(err instanceof Error ? err.message : "Generate failed."));
  }
}

// ---------------------------------------------------------------------------
// Handler: POST /api/ai/review
// ---------------------------------------------------------------------------

export async function handleAIReview(
  request: Request,
  env: Env,
): Promise<Response> {
  const userId = await requireUserId(request, env);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return cors(badRequest("Invalid JSON body."));
  }

  const parsed = body as {
    projectContext: ProjectContextInput;
    reviewType?: "FULL_CAPSTONE_REVIEW" | "OBJECTIVE_ALIGNMENT" | "GRAMMAR_AND_CLARITY";
    chapterContent?: { chapterNumber: number; title: string; html: string }[];
  };

  if (!parsed?.projectContext) return cors(badRequest("projectContext is required."));

  const usage = await getUsage(env, request, userId);
  if (usage.remaining < COSTS.review) return cors(quotaExceededResponse(usage));

  const reviewType = parsed.reviewType ?? "FULL_CAPSTONE_REVIEW";

  const system = [
    buildSystemPrompt("PANEL_REVIEWER"),
    buildProjectContext(parsed.projectContext),
    `REVIEW TYPE: ${reviewType}`,
    parsed.chapterContent?.length
      ? `CHAPTER CONTENT (HTML, ${parsed.chapterContent.length} chapters):\n` +
        parsed.chapterContent
          .map(
            (c) =>
              `--- Chapter ${c.chapterNumber}: ${c.title} ---\n${c.html.slice(0, 3000)}`,
          )
          .join("\n\n")
      : "No chapter content provided.",
    'OUTPUT FORMAT: Return ONLY a JSON object shaped {"score": number 0-100, "summary": string, "criticalIssues": string[], "warnings": string[], "suggestions": string[], "strengths": string[]}. No extra prose.',
  ].join("\n\n");

  try {
    const response = await nvidiaChat(
      [
        { role: "system", content: system },
        { role: "user", content: `Please perform the ${reviewType} now.` },
      ],
      "PANEL_REVIEWER",
      env,
    );

    // Best-effort JSON extraction from the response.
    let parsedResult: CapstoneReviewResult;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      parsedResult = jsonMatch
        ? (JSON.parse(jsonMatch[0]) as CapstoneReviewResult)
        : {
            score: 70,
            summary: response.content.slice(0, 300),
            criticalIssues: [],
            warnings: [],
            suggestions: [],
            strengths: [],
          };
    } catch {
      parsedResult = {
        score: 70,
        summary: response.content.slice(0, 300),
        criticalIssues: [],
        warnings: [],
        suggestions: [],
        strengths: [],
      };
    }

    const charged = await addUsage(env, request, userId, COSTS.review);
    return cors(withUsage(new Response(JSON.stringify(parsedResult), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }), charged));
  } catch (err) {
    return cors(serverError(err instanceof Error ? err.message : "Review failed."));
  }
}
