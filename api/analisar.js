export const config = { runtime: "edge" };

const DEFAULT_MODEL = "claude-sonnet-5-5";
const MAX_TOKENS = 16000;
const MAX_PROMPT_CHARS = 250000;

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function sameCode(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default async function handler(request) {
  if (request.method !== "POST") return json(405, { error: "method_not_allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const accessCode = process.env.ACCESS_CODE;
  if (!apiKey || !accessCode) return json(500, { error: "function_not_configured" });
  if (!sameCode(request.headers.get("x-access-code") || "", accessCode)) {
    return json(401, { error: "invalid_access_code" });
  }

  let body;
  try { body = await request.json(); } catch { return json(400, { error: "invalid_body" }); }
  const prompt = body && body.prompt;
  if (typeof prompt !== "string" || !prompt.trim()) return json(400, { error: "missing_prompt" });
  if (prompt.length > MAX_PROMPT_CHARS) return json(413, { error: "prompt_too_large" });

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.MODEL || DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      stream: true,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") || "text/event-stream",
      "cache-control": "no-store",
    },
  });
}
