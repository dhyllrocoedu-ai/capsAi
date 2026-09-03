import type {
  AIChatRequest,
  AIChatResponse,
  AIProvider,
  EmbeddingResponse,
} from "@/types";

import { DEFAULT_EMBED_MODEL, resolveChatModel } from "./models";

const DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";
const AI_PROXY_URL = "/api/ai"; // Cloudflare Pages Function endpoint

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  model?: string;
}

interface EmbeddingsResponse {
  data?: Array<{ embedding: number[] }>;
}

/**
 * NVIDIA NIM provider using the OpenAI-compatible REST surface.
 *
 * ⚠️ PHASE-1 NOTE: this module is invoked directly from the browser for
 * local development only, per the current testing setup. In the Cloudflare
 * deployment the SAME class runs inside a Pages Function (`functions/api/ai`)
 * so the key never reaches the client — only the call site changes.
 */
export class NvidiaNimProvider implements AIProvider {
  readonly name = "nvidia-nim";
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly embedModel: string;
  private readonly useProxy: boolean;

  constructor(config?: { apiKey?: string; baseUrl?: string }) {
    this.apiKey =
      config?.apiKey ??
      (import.meta.env.VITE_NVIDIA_API_KEY as string | undefined) ??
      "";
    this.baseUrl =
      config?.baseUrl ?? (import.meta.env.VITE_NVIDIA_BASE_URL as string | undefined) ?? DEFAULT_BASE_URL;
    this.embedModel =
      (import.meta.env.VITE_NVIDIA_EMBED_MODEL as string | undefined) ?? DEFAULT_EMBED_MODEL;
    this.useProxy = (import.meta.env.VITE_AI_USE_PROXY as string | undefined) === "true" || this.apiKey.length === 0;
  }

  get isConfigured(): boolean {
    return this.apiKey.length > 0 || this.useProxy;
  }

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    const model = resolveChatModel(request.mode, request.messages, request.model);

    if (this.useProxy) {
      const res = await fetch(`${AI_PROXY_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
          mode: request.mode,
          model,
          projectContext: request as any,
        }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(
          `AI provider error (${res.status}). ${detail.slice(0, 200)}`,
        );
      }

      const json = (await res.json()) as ChatCompletionResponse & { model?: string };
      const content = json.choices?.[0]?.message?.content;
      if (!content) throw new Error("AI provider returned an empty response.");

      return { content, model: json.model ?? model, provider: this.name };
    }

    if (!this.isConfigured) {
      throw new Error("NVIDIA API key is not configured.");
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: request.temperature ?? 0.4,
        top_p: 0.9,
        max_tokens: request.maxTokens ?? 1024,
        stream: false,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `AI provider error (${res.status}). ${detail.slice(0, 200)}`,
      );
    }

    const json = (await res.json()) as ChatCompletionResponse;
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI provider returned an empty response.");

    return { content, model: json.model ?? model, provider: this.name };
  }

  async embed(texts: string[]): Promise<EmbeddingResponse> {
    if (this.useProxy) {
      throw new Error("Embeddings are not available in proxy mode (no server endpoint).");
    }
    if (!this.isConfigured) {
      throw new Error("NVIDIA API key is not configured.");
    }
    if (texts.length === 0) return { embeddings: [], model: this.embedModel };

    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.embedModel,
        input: texts,
        input_type: "query",
        encoding_format: "float",
        truncate: "END",
      }),
    });

    if (!res.ok) {
      throw new Error(`Embedding request failed (${res.status}).`);
    }

    const json = (await res.json()) as EmbeddingsResponse;
    const embeddings = (json.data ?? []).map((d) => d.embedding);
    return { embeddings, model: this.embedModel };
  }
}
