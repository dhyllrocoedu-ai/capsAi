/**
 * functions/api/_handlers/quota.ts
 *
 * Weighted daily usage quotas, enforced server-side via Cloudflare KV.
 *
 *   chat = 1 credit · generate = 3 credits · review = 5 credits
 *   anonymous visitors: 10 credits/day · authenticated users: 100/day
 *
 * Identity resolution order:
 *   1. authenticated  -> "u:<userId>"
 *   2. device header  -> "d:<X-Device-Id>"
 *   3. IP fallback    -> "ip:<CF-Connecting-IP>"
 *
 * Counter keys embed the UTC date ("usage:2026-08-23:d:<id>") so entries
 * roll over naturally; a 48h TTL garbage-collects old days.
 *
 * NOTE (MVP): KV is eventually consistent — two simultaneous requests may
 * both slip past the check. Exact enforcement would need Durable Objects;
 * revisit before monetization.
 */

import type { UsageStatus } from "../../../src/types";

export const COSTS = { chat: 1, generate: 3, review: 5 } as const;
export type CostKey = keyof typeof COSTS;

export const LIMITS = { anon: 10, user: 100 } as const;

/** Minimal structural KV surface — avoids a workers-types dependency. */
type KVLike = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
};

export type QuotaEnv = { USAGE_KV?: KVLike };

const TTL_SECONDS = 60 * 60 * 48;

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function nextResetIso(): string {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
}

export function resolveIdentity(request: Request, userId: string | null): string {
  if (userId) return `u:${userId}`;
  const deviceId = request.headers.get("X-Device-Id");
  if (deviceId && deviceId.length <= 64) return `d:${deviceId}`;
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  return `ip:${ip}`;
}

function keyFor(request: Request, userId: string | null): string {
  return `usage:${todayUtc()}:${resolveIdentity(request, userId)}`;
}

export async function getUsage(
  env: QuotaEnv,
  request: Request,
  userId: string | null,
): Promise<UsageStatus> {
  const tier = userId ? "user" : "anon";
  const limit = LIMITS[tier];
  let used = 0;
  if (env.USAGE_KV) {
    const raw = await env.USAGE_KV.get(keyFor(request, userId));
    used = Number.parseInt(raw ?? "0", 10) || 0;
  }
  return {
    tier,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    resetsAt: nextResetIso(),
  };
}

/** Blind increment — call only after a pre-check passed. */
export async function addUsage(
  env: QuotaEnv,
  request: Request,
  userId: string | null,
  cost: number,
): Promise<UsageStatus> {
  const usage = await getUsage(env, request, userId);
  if (env.USAGE_KV) {
    await env.USAGE_KV.put(keyFor(request, userId), String(usage.used + cost), {
      expirationTtl: TTL_SECONDS,
    });
  }
  usage.used += cost;
  usage.remaining = Math.max(0, usage.limit - usage.used);
  return usage;
}

export function usageHeaders(usage: UsageStatus): Record<string, string> {
  return {
    "X-Usage-Tier": usage.tier,
    "X-Usage-Used": String(usage.used),
    "X-Usage-Limit": String(usage.limit),
    "X-Usage-Remaining": String(usage.remaining),
    "X-Usage-Resets-At": usage.resetsAt,
  };
}

export function quotaExceededResponse(usage: UsageStatus): Response {
  return new Response(
    JSON.stringify({
      error:
        usage.tier === "anon"
          ? "You've used your free daily quota. Sign up for 100 free credits a day."
          : "You've reached today's AI quota. It resets at UTC midnight.",
      code: "QUOTA_EXCEEDED",
      usage,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        ...usageHeaders(usage),
      },
    },
  );
}

/** Attaches X-Usage-* headers to any success response. */
export function withUsage(response: Response, usage: UsageStatus): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(usageHeaders(usage))) headers.set(k, v);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ---------------------------------------------------------------------------
// Handler: GET /api/ai/usage
// ---------------------------------------------------------------------------

export async function handleGetUsage(
  request: Request,
  env: QuotaEnv,
  userId: string | null,
): Promise<Response> {
  const usage = await getUsage(env, request, userId);
  return new Response(JSON.stringify(usage), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      ...usageHeaders(usage),
    },
  });
}
