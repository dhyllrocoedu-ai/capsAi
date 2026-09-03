/**
 * Frontend AI API client.
 *
 * Calls Cloudflare Pages Functions (/api/ai/*) when available.
 * Falls back to the local AI provider when the endpoint is unreachable
 * (e.g. during `npm run dev` before `wrangler pages dev` is started).
 *
 * The server-side function layer is the production target; this module
 * exists so that the SPA never calls NVIDIA directly in production.
 */

import type {
  AIChatRequest,
  AIChatResponse,
  CapstoneReviewResult,
  UsageStatus,
} from "@/types";
import { AI_COSTS } from "@/types";
import { getAIProvider } from "@/services/ai";
import {
  buildSystemPrompt,
  buildProjectContext,
} from "@/services/ai/prompts";
import type { ProjectContextInput } from "@/services/ai/prompts";

const AI_BASE = "/api/ai";
const DEVICE_ID_KEY = "capsai.deviceId";
const USAGE_MIRROR_KEY = "capsai.usage.mirror";
export const USAGE_CHANGED_EVENT = "capsai:usage-changed";

/** Thrown when the server rejects a call because the daily quota is spent. */
export class QuotaError extends Error {
  readonly usage: UsageStatus | null;
  constructor(message: string, usage: UsageStatus | null) {
    super(message);
    this.name = "QuotaError";
    this.usage = usage;
  }
}

function getDeviceId(): string {
  try {
    let id = window.localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

function getLocalToken(): string | null {
  try {
    return window.localStorage.getItem("capsai.session");
  } catch {
    return null;
  }
}

function currentTier(): "anon" | "user" {
  return getLocalToken() ? "user" : "anon";
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function nextResetIso(): string {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
}

interface UsageMirror {
  date: string;
  tier: string;
  used: number;
  limit: number;
}

function readMirror(): UsageStatus | null {
  try {
    const raw = window.localStorage.getItem(USAGE_MIRROR_KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as UsageMirror;
    if (m.date !== todayUtc() || m.tier !== currentTier()) return null;
    return {
      tier: m.tier as UsageStatus["tier"],
      used: m.used,
      limit: m.limit,
      remaining: Math.max(0, m.limit - m.used),
      resetsAt: nextResetIso(),
    };
  } catch {
    return null;
  }
}

function writeMirror(m: UsageMirror): void {
  try {
    window.localStorage.setItem(USAGE_MIRROR_KEY, JSON.stringify(m));
  } catch {
    // storage unavailable — meter simply stays blank
  }
  window.dispatchEvent(new Event(USAGE_CHANGED_EVENT));
}

function updateMirrorFromHeaders(headers: Headers): void {
  const used = headers.get("X-Usage-Used");
  const limit = headers.get("X-Usage-Limit");
  const tier = headers.get("X-Usage-Tier");
  if (used === null || limit === null) return;
  writeMirror({
    date: todayUtc(),
    tier: tier ?? currentTier(),
    used: Number.parseInt(used, 10) || 0,
    limit: Number.parseInt(limit, 10) || 0,
  });
}

/**
 * Offline/fallback accounting: mirrors the cost locally when the Functions
 * layer is unreachable (pure `npm run dev` without wrangler). Approximate —
 * clearing storage resets it — but keeps the meter honest in dev.
 */
function trackFallbackCost(cost: number): void {
  const base =
    readMirror() ??
    ({
      date: todayUtc(),
      tier: currentTier(),
      used: 0,
      limit: currentTier() === "user" ? 100 : 10,
    } satisfies UsageMirror);
  writeMirror({
    date: todayUtc(),
    tier: base.tier,
    used: base.used + cost,
    limit: base.limit,
  });
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getLocalToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const deviceId = getDeviceId();
  if (deviceId) headers["X-Device-Id"] = deviceId;
  return headers;
}

async function parseQuotaRejection(res: Response): Promise<never> {
  let message = "Daily AI quota reached.";
  let usage: UsageStatus | null = null;
  try {
    const body = (await res.json()) as { error?: string; usage?: UsageStatus };
    if (body.error) message = body.error;
    usage = body.usage ?? null;
  } catch {
    // keep defaults
  }
  updateMirrorFromHeaders(res.headers);
  throw new QuotaError(message, usage ?? readMirror());
}

async function postAI<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(`${AI_BASE}${path}`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(body),
    signal,
  });

  if (res.status === 429) await parseQuotaRejection(res);
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI API ${res.status}: ${detail.slice(0, 200)}`);
  }
  updateMirrorFromHeaders(res.headers);
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Usage meter — server truth first, local mirror as fallback
// ---------------------------------------------------------------------------

export async function fetchUsage(): Promise<UsageStatus | null> {
  try {
    const res = await fetch(`${AI_BASE}/usage`, { headers: buildHeaders() });
    if (!res.ok) throw new Error(`usage ${res.status}`);
    updateMirrorFromHeaders(res.headers);
    return (await res.json()) as UsageStatus;
  } catch {
    return readMirror();
  }
}

// ---------------------------------------------------------------------------
// Chat — try CF endpoint, fall back to local provider
// ---------------------------------------------------------------------------

export async function aiChat(
  request: AIChatRequest,
  projectContext?: ProjectContextInput,
  signal?: AbortSignal,
): Promise<AIChatResponse> {
  const systemContent = projectContext
    ? [buildSystemPrompt(request.mode ?? "GENERAL_ADVISER"), buildProjectContext(projectContext)].join("\n\n")
    : buildSystemPrompt(request.mode ?? "GENERAL_ADVISER");

  const messages = [
    { role: "system" as const, content: systemContent },
    ...request.messages,
  ];

  try {
    return await postAI<AIChatResponse>("/chat", {
      mode: request.mode,
      messages,
      projectContext,
    }, signal);
  } catch (err) {
    if (err instanceof QuotaError) throw err;
    const response = await getAIProvider().chat({ ...request, messages });
    trackFallbackCost(AI_COSTS.chat);
    return response;
  }
}

// ---------------------------------------------------------------------------
// Chat — streaming (SSE). Falls back to local provider as a single delta.
// ---------------------------------------------------------------------------

export async function aiChatStream(
  request: AIChatRequest,
  projectContext: ProjectContextInput | undefined,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const systemContent = projectContext
    ? [buildSystemPrompt(request.mode ?? "GENERAL_ADVISER"), buildProjectContext(projectContext)].join("\n\n")
    : buildSystemPrompt(request.mode ?? "GENERAL_ADVISER");

  const messages = [
    { role: "system" as const, content: systemContent },
    ...request.messages,
  ];

  const headers = buildHeaders();

  try {
    const res = await fetch(`${AI_BASE}/chat/stream`, {
      method: "POST",
      headers,
      body: JSON.stringify({ mode: request.mode, messages, projectContext }),
      signal,
    });
    if (res.status === 429) await parseQuotaRejection(res);
    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      throw new Error(`AI API ${res.status}: ${detail.slice(0, 200)}`);
    }
    updateMirrorFromHeaders(res.headers);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const evt = JSON.parse(data) as { delta?: string; error?: string };
          if (evt.error) throw new Error(evt.error);
          if (evt.delta) onDelta(evt.delta);
        } catch {
          // ignore malformed event lines
        }
      }
    }
  } catch (err) {
    if (err instanceof QuotaError || (err as Error).name === "AbortError") throw err;
    // Fallback: local provider, delivered as one delta
    const response = await getAIProvider().chat({ ...request, messages });
    trackFallbackCost(AI_COSTS.chat);
    onDelta(response.content);
  }
}

// ---------------------------------------------------------------------------
// Generate — single-turn draft for a chapter section
// ---------------------------------------------------------------------------

export interface AIGenerateRequest {
  projectContext: ProjectContextInput;
  sectionTitle: string;
  mode?: string;
  instructions?: string;
}

export interface AIGenerateResponse {
  system: string;
  user: string;
  assistant: string;
}

export async function aiGenerate(
  req: AIGenerateRequest,
  signal?: AbortSignal,
): Promise<AIGenerateResponse> {
  try {
    return await postAI<AIGenerateResponse>("/generate", req, signal);
  } catch (err) {
    if (err instanceof QuotaError) throw err;
    const provider = getAIProvider();
    const system = [
      buildSystemPrompt("CHAPTER_ASSISTANT"),
      buildProjectContext(req.projectContext),
      `SECTION TITLE: "${req.sectionTitle}"`,
      req.instructions ?? "",
      "Present your output as a suggested draft the student can adapt.",
    ]
      .filter(Boolean)
      .join("\n");
    const response = await provider.chat({
      mode: "CHAPTER_ASSISTANT",
      messages: [
        { role: "system", content: system },
        { role: "user", content: "Write the draft now." },
      ],
    });
    trackFallbackCost(AI_COSTS.generate);
    return { system, user: "Write the draft now.", assistant: response.content };
  }
}

// ---------------------------------------------------------------------------
// Review
// ---------------------------------------------------------------------------

export interface AIReviewRequest {
  projectContext: ProjectContextInput;
  reviewType?: "FULL_CAPSTONE_REVIEW" | "OBJECTIVE_ALIGNMENT" | "GRAMMAR_AND_CLARITY";
  chapterContent?: { chapterNumber: number; title: string; html: string }[];
}

export async function aiReview(
  req: AIReviewRequest,
  signal?: AbortSignal,
): Promise<CapstoneReviewResult> {
  try {
    return await postAI<CapstoneReviewResult>("/review", req, signal);
  } catch (err) {
    if (err instanceof QuotaError) throw err;
    const provider = getAIProvider();
    const system = [
      buildSystemPrompt("PANEL_REVIEWER"),
      buildProjectContext(req.projectContext),
    ].join("\n\n");
    const response = await provider.chat({
      mode: "PANEL_REVIEWER",
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Perform a ${req.reviewType ?? "FULL_CAPSTONE_REVIEW"}.` },
      ],
    });
    trackFallbackCost(AI_COSTS.review);
    return {
      score: 75,
      summary: response.content.slice(0, 300),
      criticalIssues: [],
      warnings: [],
      suggestions: [],
      strengths: [],
    };
  }
}