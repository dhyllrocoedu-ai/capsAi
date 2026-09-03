/**
 * functions/api/[[path]].ts
 *
 * Catch-all Pages Function router for /api/*.
 * Delegates to handlers in ./_handlers/.
 *
 * Routes:
 *   GET  /api/health            -> { ok: true }
 *   POST /api/ai/chat           -> single-shot chat completion
 *   POST /api/ai/chat/stream    -> SSE token stream
 *   POST /api/ai/generate       -> chapter draft generation
 *   POST /api/ai/review         -> capstone review
 */

export const onRequestPost = async (ctx: {
  request: Request;
  env: Record<string, string | undefined>;
}): Promise<Response> => {
  const url = new URL(ctx.request.url);
  const path = url.pathname.replace(/\/+$/, "");

  if (path === "/api/ai/chat") {
    const { handleAIChat } = await import("./_handlers/ai");
    return handleAIChat(ctx.request, ctx.env);
  }

  if (path === "/api/ai/chat/stream") {
    const { handleAIChatStream } = await import("./_handlers/ai");
    return handleAIChatStream(ctx.request, ctx.env);
  }

  if (path === "/api/ai/generate") {
    const { handleAIGenerate } = await import("./_handlers/ai");
    return handleAIGenerate(ctx.request, ctx.env);
  }

  if (path === "/api/ai/review") {
    const { handleAIReview } = await import("./_handlers/ai");
    return handleAIReview(ctx.request, ctx.env);
  }

  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
};

export const onRequestGet = async (ctx: {
  request: Request;
  env: Record<string, string | undefined>;
}): Promise<Response> => {
  const url = new URL(ctx.request.url);
  const path = url.pathname.replace(/\/+$/, "");

  if (path === "/api/health") {
    return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (path === "/api/ai/usage") {
    const [{ handleGetUsage }, { requireUserId }] = await Promise.all([
      import("./_handlers/quota"),
      import("./_handlers/ai"),
    ]);
    const userId = await requireUserId(ctx.request, ctx.env);
    return handleGetUsage(ctx.request, ctx.env, userId);
  }

  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
};

// CORS preflight
export const onRequestOptions = async (): Promise<Response> =>
  new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
